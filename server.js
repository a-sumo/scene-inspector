#!/usr/bin/env node
/**
 * Lens Studio Scene Inspector - Dev Server
 *
 * Tiny server that bridges Lens Studio and the browser viewer.
 * LS connects via WebSocket and pushes the live scene graph.
 * Browser connects via WebSocket and receives it.
 * Also proxies LS MCP calls (design-time scene graph) to avoid CORS.
 *
 * Usage:
 *   node server.js                          # default port 8200
 *   node server.js --port 9000              # custom port
 *   node server.js --mcp http://host:8732   # custom MCP URL
 */

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync, watch } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function arg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(arg("--port", "8200"), 10);
const MCP_URL = arg("--mcp", "http://localhost:8732/mcp");
const MCP_TOKEN = arg("--mcp-token", "");
const NO_OPEN = args.includes("--no-open");

// Connected clients
const browsers = new Set();
let activeLS = null; // Only one LS connection at a time
let activeIsExample = false;

// Latest scene snapshot (so new browser tabs get it immediately)
let lastScene = null;

// --- HTTP server (re-reads index.html on every request for live editing) ---
const indexPath = join(__dirname, "index.html");

const http = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Serve viewer (re-read every time for live editing)
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" });
    res.end(readFileSync(indexPath));
    return;
  }

  // MCP proxy (avoids CORS when browser fetches design-time scene)
  if (req.method === "POST" && req.url.startsWith("/mcp")) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const mcpUrl = url.searchParams.get("url") || MCP_URL;
        const token = url.searchParams.get("token") || MCP_TOKEN;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;

        const resp = await fetch(mcpUrl, { method: "POST", headers, body });
        const result = await resp.text();
        res.writeHead(resp.status, { "Content-Type": "application/json" });
        res.end(result);
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve SceneInspector.ts for download
  if (req.method === "GET" && req.url === "/SceneInspector.ts") {
    const ts = readFileSync(join(__dirname, "SceneInspector.ts"));
    res.writeHead(200, { "Content-Type": "text/plain", "Content-Disposition": "attachment; filename=SceneInspector.ts" });
    res.end(ts);
    return;
  }

  // Health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ls: activeLS ? 1 : 0, lsType: activeIsExample ? 'example' : 'real', browsers: browsers.size, hasScene: !!lastScene }));
    return;
  }

  res.writeHead(404); res.end("Not found");
});

// --- WebSocket ---
const wss = new WebSocketServer({ server: http });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const role = url.searchParams.get("role");

  if (role === "ls") {
    const isExample = url.searchParams.get("source") === "example";

    // Only one LS connection at a time
    if (activeLS && activeLS.readyState === WebSocket.OPEN) {
      if (isExample) {
        // Example trying to connect while real LS is active: reject
        console.log(`[inspector] Rejecting example (real LS already connected)`);
        ws.close(1000, "replaced");
        return;
      }
      if (activeIsExample) {
        // Real LS connecting, kick the example
        console.log(`[inspector] Kicking example for real LS`);
        activeLS.close(1000, "replaced");
      } else {
        // Another real LS trying to connect: reject the new one
        console.log(`[inspector] Rejecting duplicate LS (one already connected)`);
        ws.close(1000, "duplicate");
        return;
      }
    }

    activeLS = ws;
    activeIsExample = isExample;
    if (!isExample) lastScene = null;
    console.log(`[inspector] LS connected (${isExample ? 'example' : 'real'})`);

    ws.on("message", (raw) => {
      if (ws !== activeLS) return; // ignore if superseded
      const str = raw.toString();
      lastScene = str;
      for (const b of browsers) {
        if (b.readyState === WebSocket.OPEN) b.send(str);
      }
    });

    ws.on("close", () => {
      if (ws === activeLS) {
        activeLS = null;
        activeIsExample = false;
        console.log(`[inspector] LS disconnected`);
      }
    });
  } else {
    // Browser viewer
    browsers.add(ws);
    console.log(`[inspector] Browser connected (${browsers.size} total)`);

    // Send last known scene immediately
    if (lastScene && ws.readyState === WebSocket.OPEN) {
      ws.send(lastScene);
    }

    ws.on("close", () => {
      browsers.delete(ws);
      console.log(`[inspector] Browser disconnected (${browsers.size} total)`);
    });
  }

  ws.on("error", (e) => console.error("[inspector] WS error:", e.message));
});

// --- Live reload: watch index.html and tell browsers to refresh ---
let reloadDebounce = null;
watch(indexPath, () => {
  clearTimeout(reloadDebounce);
  reloadDebounce = setTimeout(() => {
    console.log("[inspector] index.html changed, reloading browsers...");
    for (const b of browsers) {
      if (b.readyState === WebSocket.OPEN) b.send(JSON.stringify({ event: "reload" }));
    }
  }, 200);
});

http.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Lens Studio Scene Inspector running at ${url}`);
  console.log(`  Waiting for Lens Studio to connect...\n`);

  // Auto-open browser
  if (!NO_OPEN) {
    const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${url}`);
  }
});
