#!/usr/bin/env node
/**
 * Example: simulated Lens Studio scene for the inspector.
 *
 * Sends a scene graph with a representative mix of LS component types:
 * cameras, lights, scripts, physics, audio, visuals, UI, and runtime-
 * spawned objects. This lets you try the viewer without Lens Studio.
 *
 * Usage:
 *   node server.js          # terminal 1
 *   node example.js         # terminal 2
 */

import WebSocket from "ws";

const URL = process.argv[2] || "ws://localhost:8200?role=ls&source=example";

let frame = 0;
let spawned = [];
const spawnInterval = 5;
const maxBlocks = 10;
let spawnCount = 0;

function obj(name, opts = {}) {
  return {
    name,
    enabled: opts.enabled !== false,
    category: opts.category || "empty",
    pos: opts.pos || [0, 0, 0],
    scale: opts.scale || [1, 1, 1],
    rot: opts.rot || [0, 0, 0, 1],
    components: opts.components || [],
    text: opts.text || null,
    hasVisual: opts.hasVisual || false,
    color: opts.color || null,
    layer: opts.layer || null,
    children: opts.children || [],
  };
}

function comp(type, extra = {}) {
  return { type, enabled: true, category: null, ...extra };
}

function buildScene() {
  const t = frame * 0.5;

  // Spawn runtime blocks
  if (frame > 0 && frame % spawnInterval === 0 && spawned.length < maxBlocks) {
    spawnCount++;
    spawned.push({
      name: `Block_${spawnCount}`,
      x: (Math.random() - 0.5) * 30,
      z: 50 + (Math.random() - 0.5) * 20,
      yTarget: -7 + Math.random() * 16,
      yStart: 20 + Math.random() * 10,
      born: t,
      w: 2 + Math.random() * 4,
      h: 1 + Math.random() * 6,
    });
  }
  while (spawned.length > maxBlocks) spawned.shift();

  const spawnedNodes = spawned.map((b, i) => {
    const age = t - b.born;
    const settle = Math.min(age * 2, 1);
    const y = b.yStart + (b.yTarget - b.yStart) * settle;
    const isNewest = i === spawned.length - 1;
    const rotY = isNewest ? (t * 15 % 360) : 0;

    return obj(b.name, {
      category: "visual",
      pos: [+b.x.toFixed(2), +y.toFixed(2), +b.z.toFixed(2)],
      scale: [+b.w.toFixed(2), +b.h.toFixed(2), +b.w.toFixed(2)],
      rot: [0, +((rotY * Math.PI / 180) * 0.01).toFixed(3), 0, 1],
      components: [
        comp("RenderMeshVisual", { meshName: "Box" }),
        comp("BodyComponent", { dynamic: true, mass: 1.0 }),
        comp("ColliderComponent"),
      ],
      hasVisual: true,
    });
  });

  const scene = {
    event: "scene_snapshot",
    source: "example",
    ts: Date.now(),
    roots: [
      // Perspective Camera with scripts
      obj("Camera", {
        category: "camera",
        pos: [0, 8, -20],
        rot: [-0.15, 0, 0, 1],
        components: [
          comp("Camera", { cameraType: "perspective", fov: 60, near: 0.1, far: 1000, renderOrder: 0 }),
          comp("ScriptComponent", { scriptName: "SceneInspector" }),
          comp("DeviceTracking"),
        ],
      }),

      // Orthographic camera for UI
      obj("Ortho Camera", {
        category: "camera",
        components: [
          comp("Camera", { cameraType: "orthographic", orthoSize: 20, renderOrder: 1 }),
        ],
        children: [
          obj("Screen Region", {
            category: "ui",
            components: [comp("ScreenTransform"), comp("ScreenRegionComponent")],
            children: [
              obj("Canvas", {
                category: "ui",
                components: [comp("Canvas")],
                children: [
                  obj("Title", {
                    category: "text",
                    text: "Scene Inspector Demo",
                    components: [comp("Text", { text: "Scene Inspector Demo", textSize: 32 }), comp("ScreenTransform")],
                  }),
                  obj("Score", {
                    category: "text",
                    text: "0",
                    components: [comp("Text", { text: "0", textSize: 24 }), comp("ScreenTransform")],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Main scene content
      obj("Scene", {
        components: [comp("ScriptComponent", { scriptName: "RuntimeSpawner" })],
        children: [
          // Lighting
          obj("Lights", {
            children: [
              obj("Sun", {
                category: "light",
                pos: [10, 20, -5],
                rot: [-0.3, 0.2, 0, 1],
                components: [comp("DirectionalLight")],
              }),
              obj("Fill", {
                category: "light",
                pos: [-8, 5, 10],
                components: [comp("PointLight")],
              }),
              obj("Ambient", {
                category: "light",
                components: [comp("AmbientLight")],
              }),
            ],
          }),

          // Ground with physics
          obj("Ground", {
            category: "visual",
            pos: [0, -8, 50],
            scale: [40, 1, 40],
            components: [
              comp("RenderMeshVisual", { meshName: "Plane", materialName: "PBR Ground" }),
              comp("ColliderComponent"),
            ],
            hasVisual: true,
            color: [60, 65, 70, 255],
          }),

          // Architecture group
          obj("Architecture", {
            children: [
              obj("Tower", {
                pos: [-8, -7, 50],
                children: [
                  obj("Base Block", {
                    category: "visual",
                    pos: [0, 0, 0], scale: [8, 6, 8],
                    components: [comp("RenderMeshVisual", { meshName: "Box" }), comp("ColliderComponent")],
                    hasVisual: true,
                  }),
                  obj("Mid Block", {
                    category: "visual",
                    pos: [1, 6, 0], scale: [6, 5, 6],
                    components: [comp("RenderMeshVisual", { meshName: "Box" })],
                    hasVisual: true,
                  }),
                  obj("Top Block", {
                    category: "visual",
                    pos: [-1, 11, 1], scale: [4, 4, 4],
                    components: [comp("RenderMeshVisual", { meshName: "Box" })],
                    hasVisual: true,
                  }),
                ],
              }),

              obj("Bridge", {
                pos: [8, -7, 50],
                children: [
                  obj("Pillar L", {
                    category: "visual",
                    pos: [-4, 0, 0], scale: [2, 8, 2],
                    components: [comp("RenderMeshVisual", { meshName: "Box" }), comp("ColliderComponent")],
                    hasVisual: true,
                  }),
                  obj("Pillar R", {
                    category: "visual",
                    pos: [4, 0, 0], scale: [2, 8, 2],
                    components: [comp("RenderMeshVisual", { meshName: "Box" }), comp("ColliderComponent")],
                    hasVisual: true,
                  }),
                  obj("Beam", {
                    category: "visual",
                    pos: [0, 8, 0], scale: [10, 1.5, 3],
                    components: [comp("RenderMeshVisual", { meshName: "Box" })],
                    hasVisual: true,
                  }),
                ],
              }),
            ],
          }),

          // Interactive objects
          obj("Interactables", {
            children: [
              obj("Grab Cube", {
                category: "interaction",
                pos: [0, 0, 45],
                scale: [3, 3, 3],
                components: [
                  comp("RenderMeshVisual", { meshName: "Box" }),
                  comp("InteractionComponent"),
                  comp("ManipulateComponent"),
                  comp("BodyComponent", { dynamic: true, mass: 0.5 }),
                  comp("ColliderComponent"),
                ],
                hasVisual: true,
                color: [74, 144, 184, 255],
              }),
              obj("Tap Sphere", {
                category: "interaction",
                pos: [6, 2, 48],
                scale: [2, 2, 2],
                components: [
                  comp("RenderMeshVisual", { meshName: "Sphere" }),
                  comp("InteractionComponent"),
                  comp("AnimationMixer"),
                ],
                hasVisual: true,
                color: [97, 175, 239, 255],
              }),
            ],
          }),

          // Audio
          obj("Audio Sources", {
            children: [
              obj("Background Music", {
                category: "audio",
                components: [comp("AudioComponent", { trackName: "ambient_loop.wav", volume: 0.3 })],
              }),
              obj("SFX Emitter", {
                category: "audio",
                pos: [0, 0, 50],
                components: [comp("AudioComponent", { trackName: "click.wav", volume: 1.0 }), comp("AudioListenerComponent")],
              }),
            ],
          }),

          // VFX
          obj("Particle Emitter", {
            category: "vfx",
            pos: [-1, 14, 51],
            components: [comp("VFXComponent")],
          }),

          // Tracking
          obj("Hand Tracker", {
            category: "tracking",
            components: [comp("ObjectTracking3D")],
            children: [
              obj("Hand Visual", {
                category: "visual",
                components: [comp("RenderMeshVisual", { meshName: "HandMesh" })],
                hasVisual: true,
              }),
            ],
          }),
        ],
      }),

      // Runtime container
      obj("[Spawned]", {
        children: spawnedNodes,
      }),
    ],
    totalObjects: 0,
  };

  function count(nodes) {
    let c = 0;
    for (const n of nodes) c += 1 + count(n.children || []);
    return c;
  }
  scene.totalObjects = count(scene.roots);
  return scene;
}

function connect() {
  const ws = new WebSocket(URL);

  ws.on("open", () => {
    console.log("Connected to inspector server");
    console.log("Open http://localhost:8200 to see the scene");
    console.log("Streaming scene graph... (Ctrl+C to stop)\n");

    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) { clearInterval(interval); return; }
      const scene = buildScene();
      ws.send(JSON.stringify(scene));
      frame++;
      if (frame % 30 === 0) {
        console.log(`  frame ${frame} | ${scene.totalObjects} objects (${spawned.length} spawned)`);
      }
    }, 1000 / 2);
  });

  ws.on("close", (code, reason) => {
    const msg = reason?.toString() || '';
    if (code === 1000 && msg === 'replaced') {
      console.log("Real Lens Studio connected. Example exiting.");
      process.exit(0);
    }
    console.log("Disconnected, reconnecting in 2s...");
    setTimeout(connect, 2000);
  });

  ws.on("error", (e) => {
    console.error("Connection error:", e.message);
  });
}

connect();
