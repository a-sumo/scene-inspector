/**
 * main.js — Lens Studio Plugin Entry Point
 *
 * Registers two plugin classes:
 *   1. InspectorService (CoreService) — runs in background, manages servers + scene polling
 *   2. InspectorPanel (PanelPlugin) — dockable panel with WebEngineView showing the inspector
 *
 * Data flow:
 *   Editor API scene graph → scene-walker.js → WebSocket → WebEngineView (viewer)
 *   SceneInspector.ts (runtime) → WebSocket → forwarded to WebEngineView
 */

import CoreService from "LensStudio:CoreService";
import PanelPlugin from "LensStudio:PanelPlugin";
import * as Ui from "LensStudio:Ui";
import * as ws from "LensStudio:WebSocket";
import * as Network from "LensStudio:Network";
import { walkScene } from "./scene-walker.js";
import { startHttpServer, stopHttpServer } from "./http-server.js";

// ---- Shared state (module-level, accessible by both service and panel) ----
var wsPort = 0;
var httpPort = 0;
var serviceReady = false;

// WebSocket tracking
var webviewSockets = [];   // connections from the embedded WebEngineView
var runtimeSocket = null;  // connection from SceneInspector.ts at runtime
var allConnections = [];    // event connection refs (prevent GC)
var allSockets = [];        // socket refs (prevent GC)

// Scene data
var lastSnapshotJson = null;
var hasRuntimeSource = false;

// Polling
var pollTimer = null;
var entityConnections = [];

// ============================================================================
// CoreService — background lifecycle: servers + scene walking
// ============================================================================
export class InspectorService extends CoreService {
  static descriptor() {
    return {
      id: "com.scene-inspector.service",
      name: "Scene Inspector Service",
      description: "Background service for the Scene Inspector plugin",
      dependencies: [Editor.Model.IModel],
    };
  }

  constructor(pluginSystem) {
    super(pluginSystem);
    this.model = null;
    this.scene = null;
  }

  start() {
    // Get Editor model
    this.model = this.pluginSystem.findInterface(Editor.Model.IModel);

    // 1. Start HTTP server to serve viewer HTML
    httpPort = startHttpServer();

    // 2. Start WebSocket server
    this.startWsServer();

    // 3. Auto-configure any SceneInspector components with our WS port
    this.configureRuntimeInspectors();

    // 4. Start scene polling
    this.startPolling();

    serviceReady = true;
    console.log(
      "[scene-inspector] Plugin ready — WS:" + wsPort + " HTTP:" + httpPort
    );
  }

  stop() {
    serviceReady = false;

    // Stop polling
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    // Disconnect entity listeners
    entityConnections.forEach(function (c) {
      try { c.disconnect(); } catch (e) {}
    });
    entityConnections = [];

    // Close WebSocket connections
    allConnections.forEach(function (c) {
      try { c.disconnect(); } catch (e) {}
    });
    allConnections = [];
    allSockets = [];
    webviewSockets = [];
    runtimeSocket = null;

    if (this.wsServer) {
      try { this.wsServer.close(); } catch (e) {}
      this.wsServer = null;
    }

    // Stop HTTP server
    stopHttpServer();

    console.log("[scene-inspector] Plugin stopped");
  }

  // ---------- Auto-configure SceneInspector ----------

  configureRuntimeInspectors() {
    // Find all ScriptComponents with a SceneInspector script and set their
    // wsUrl to point at our WS server. This way users just add the script
    // to any object and the plugin handles the rest.
    try {
      var scene = this.model.project.scene;
      if (!scene) return;
      var roots = scene.rootSceneObjects || [];
      var targetUrl = "ws://127.0.0.1:" + wsPort;

      function scanObject(obj) {
        var comps = obj.components || [];
        for (var i = 0; i < comps.length; i++) {
          try {
            var comp = comps[i];
            var typeName = comp.name || "";
            if (typeName === "SceneInspector" || typeName === "SceneInspectorJS") {
              // Check if it has a wsUrl property
              if (comp.wsUrl !== undefined && comp.wsUrl !== targetUrl) {
                comp.wsUrl = targetUrl;
                console.log("[scene-inspector] Set SceneInspector wsUrl to " + targetUrl);
              }
            }
          } catch (e) {}
        }
        var children = obj.children || [];
        for (var c = 0; c < children.length; c++) {
          scanObject(children[c]);
        }
      }

      for (var r = 0; r < roots.length; r++) {
        scanObject(roots[r]);
      }
    } catch (e) {
      console.log("[scene-inspector] Could not auto-configure SceneInspector: " + e);
    }
  }

  // ---------- WebSocket server ----------

  startWsServer() {
    this.wsServer = ws.WebSocketServer.create();

    var addr = new Network.Address();
    addr.address = "127.0.0.1";
    addr.port = 0; // Auto-assign to avoid conflicts when multiple LS windows are open
    this.wsServer.listen(addr);
    wsPort = this.wsServer.port;

    var self = this;
    var connectConn = this.wsServer.onConnect.connect(function (socket) {
      allSockets.push(socket);

      var classified = false;
      var isRuntime = false;
      // Per-socket connections — cleaned up on disconnect to prevent leaks
      var socketConns = [];

      var classifyTimer = setTimeout(function () {
        if (!classified) {
          classified = true;
          isRuntime = false;
          webviewSockets.push(socket);
          console.log("[scene-inspector] Socket classified as viewer (timeout)");
          if (lastSnapshotJson) {
            try { socket.send(lastSnapshotJson); } catch (e) {}
          }
        }
      }, 2000);

      function cleanupSocket() {
        classified = true; // Prevent classify timer from pushing dead socket
        clearTimeout(classifyTimer);

        var idx = allSockets.indexOf(socket);
        if (idx !== -1) allSockets.splice(idx, 1);

        var wvIdx = webviewSockets.indexOf(socket);
        if (wvIdx !== -1) webviewSockets.splice(wvIdx, 1);

        // Remove per-socket connections from allConnections so they can be GC'd.
        // Don't call .disconnect() here — we may be inside a signal handler callback,
        // and disconnecting a signal from within its own handler crashes LS's native dispatch.
        for (var i = 0; i < socketConns.length; i++) {
          var ci = allConnections.indexOf(socketConns[i]);
          if (ci !== -1) allConnections.splice(ci, 1);
        }
        socketConns = [];
      }

      var dataConn = socket.onData.connect(function (buffer) {
        var str = buffer.toString();
        var parsed = null;
        try { parsed = JSON.parse(str); } catch (e) {}

        // Check for runtime identification on ANY message, not just the first.
        // The runtime may take >500ms to serialize a complex scene, so the
        // classify timer may have already fired and tagged this as a webview.
        // If we see a scene_snapshot, reclassify immediately.
        if (!isRuntime && parsed && parsed.event === "scene_snapshot" && parsed.roots) {
          // Remove from webview list if the timer already put it there
          var wvIdx = webviewSockets.indexOf(socket);
          if (wvIdx !== -1) webviewSockets.splice(wvIdx, 1);
          classified = true;
          isRuntime = true;
          runtimeSocket = socket;
          hasRuntimeSource = true;
          clearTimeout(classifyTimer);
          console.log("[scene-inspector] Runtime source connected (ws:" + wsPort + ")");
        }

        if (!classified) {
          // First non-runtime message → classify as webview
          classified = true;
          isRuntime = false;
          clearTimeout(classifyTimer);
          webviewSockets.push(socket);
          if (lastSnapshotJson) {
            try { socket.send(lastSnapshotJson); } catch (e) {}
          }
          return;
        }

        if (isRuntime) {
          lastSnapshotJson = str;
          for (var i = 0; i < webviewSockets.length; i++) {
            try { webviewSockets[i].send(str); } catch (e) {}
          }
        } else {
          if (parsed) {
            if (parsed.event === "set_transform") {
              self.applyTransformEdit(parsed);
            } else if (parsed.event === "set_enabled") {
              self.applyEnabledEdit(parsed);
            }
          }
        }
      });
      socketConns.push(dataConn);
      allConnections.push(dataConn);

      var endConn = socket.onEnd.connect(function () {
        if (socket === runtimeSocket) {
          runtimeSocket = null;
          hasRuntimeSource = false;
          console.log("[scene-inspector] Runtime source disconnected");
          self.sendEditorSnapshot();
        }
        cleanupSocket();
      });
      socketConns.push(endConn);
      allConnections.push(endConn);

      var errConn = socket.onError.connect(function () {
        if (socket === runtimeSocket) {
          runtimeSocket = null;
          hasRuntimeSource = false;
        }
        cleanupSocket();
      });
      socketConns.push(errConn);
      allConnections.push(errConn);
    });
    allConnections.push(connectConn);

    var errConn = this.wsServer.onError.connect(function (error) {
      console.error("[scene-inspector] WebSocket server error: " + error);
    });
    allConnections.push(errConn);
  }

  // ---------- Scene polling ----------

  startPolling() {
    var self = this;

    // Poll at ~2Hz, but suppress during active editing to avoid
    // scene walks competing with transform writes
    pollTimer = setInterval(function () {
      if (!hasRuntimeSource && (!self._lastEditTime || Date.now() - self._lastEditTime > 500)) {
        self.sendEditorSnapshot();
      }
    }, 500);

    // Also listen for scene entity changes for faster updates
    // All entity handlers go through debounce to avoid flooding during drags
    try {
      var project = this.model.project;
      if (project && project.onEntityUpdated) {
        var updConn = project.onEntityUpdated("SceneObject").connect(function () {
          if (!hasRuntimeSource) self.debouncedSnapshot();
        });
        entityConnections.push(updConn);
      }
      if (project && project.onEntityAdded) {
        var addConn = project.onEntityAdded("SceneObject").connect(function () {
          if (!hasRuntimeSource) self.debouncedSnapshot();
        });
        entityConnections.push(addConn);
      }
      if (project && project.onEntityRemoved) {
        var remConn = project.onEntityRemoved("SceneObject").connect(function () {
          if (!hasRuntimeSource) self.debouncedSnapshot();
        });
        entityConnections.push(remConn);
      }
    } catch (e) {
      console.log("[scene-inspector] Entity change listeners not available, using polling only");
    }
  }

  // ---------- Bidirectional editing ----------

  findObjectByPath(namePath) {
    if (!namePath) return null;
    var scene = this.model.project.scene;
    if (!scene) return null;

    var parts = namePath.split("/").filter(function (p) { return p.length > 0; });
    if (parts.length === 0) return null;

    var roots = scene.rootSceneObjects || [];
    var current = null;
    for (var i = 0; i < roots.length; i++) {
      if ((roots[i].name || "(unnamed)") === parts[0]) {
        current = roots[i];
        break;
      }
    }
    if (!current) return null;

    for (var p = 1; p < parts.length; p++) {
      var children = current.children || [];
      var found = false;
      for (var c = 0; c < children.length; c++) {
        if ((children[c].name || "(unnamed)") === parts[p]) {
          current = children[c];
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return current;
  }

  applyTransformEdit(msg) {
    // Buffer transform edits and only write to the editor scene after a quiet
    // period (no new edits for 300ms). Every obj.localTransform write triggers
    // an LS viewport redraw that can invalidate the WebEngineView compositor,
    // so during a continuous drag we buffer silently and apply once on release.
    this._pendingTransform = msg;
    this._lastEditTime = Date.now();
    if (this._transformApplyTimer) clearTimeout(this._transformApplyTimer);
    var self = this;
    this._transformApplyTimer = setTimeout(function () {
      self._transformApplyTimer = null;
      var pending = self._pendingTransform;
      if (!pending) return;
      self._pendingTransform = null;
      self._applyTransformNow(pending);
    }, 300);
  }

  _applyTransformNow(msg) {
    var obj = this.findObjectByPath(msg.namePath);
    if (!obj) return;

    try {
      var lt = obj.localTransform;
      if (msg.pos) {
        var p = lt.position;
        p.x = msg.pos[0]; p.y = msg.pos[1]; p.z = msg.pos[2];
        lt.position = p;
      }
      if (msg.scale) {
        var s = lt.scale;
        s.x = msg.scale[0]; s.y = msg.scale[1]; s.z = msg.scale[2];
        lt.scale = s;
      }
      if (msg.rot) {
        var r = lt.rotation;
        r.x = msg.rot[0]; r.y = msg.rot[1]; r.z = msg.rot[2];
        lt.rotation = r;
      }
      obj.localTransform = lt;
    } catch (e) {
      console.error("[scene-inspector] Transform edit failed: " + e);
    }

    this.debouncedSnapshot();
  }

  applyEnabledEdit(msg) {
    var obj = this.findObjectByPath(msg.namePath);
    if (!obj) return;

    try {
      obj.enabled = msg.enabled;
    } catch (e) {
      console.error("[scene-inspector] Enable edit failed: " + e);
    }

    this.debouncedSnapshot();
  }

  debouncedSnapshot() {
    if (hasRuntimeSource) return; // Runtime will send its own updated snapshot
    var self = this;
    if (this._editTimer) clearTimeout(this._editTimer);
    // 200ms debounce — during a drag, the timer resets on every edit so the
    // snapshot only fires after the user stops dragging
    this._editTimer = setTimeout(function () {
      self.sendEditorSnapshot();
    }, 200);
  }

  sendEditorSnapshot() {
    if (webviewSockets.length === 0) return;

    try {
      var scene = this.model.project.scene;
      if (!scene) return;

      var snapshot = walkScene(scene);
      var json = JSON.stringify(snapshot);

      // Only send if changed
      if (json === lastSnapshotJson) return;
      lastSnapshotJson = json;

      for (var i = 0; i < webviewSockets.length; i++) {
        try { webviewSockets[i].send(json); } catch (e) {}
      }
    } catch (e) {
      // Scene may not be loaded yet
    }
  }
}

// ============================================================================
// PanelPlugin — dockable panel with WebEngineView
// ============================================================================
export class InspectorPanel extends PanelPlugin {
  static descriptor() {
    return {
      id: "com.scene-inspector.panel",
      name: "Scene Inspector",
      description: "Live scene graph viewer with 3D viewport, hierarchy, and component inspector",
      dependencies: [Ui.IGui],
    };
  }

  constructor(pluginSystem) {
    super(pluginSystem);
  }

  createWidget(parent) {
    var mainWidget = new Ui.Widget(parent);
    var layout = new Ui.BoxLayout();
    layout.setDirection(Ui.Direction.TopToBottom);
    layout.setContentsMargins(0, 0, 0, 0);

    if (!serviceReady || httpPort === 0 || wsPort === 0) {
      // Service not ready yet — show loading message
      var label = new Ui.Label(mainWidget);
      label.text = "Scene Inspector is starting...";
      layout.addWidget(label);

      // Retry after a short delay
      var self = this;
      var retryTimer = setTimeout(function () {
        if (serviceReady && httpPort > 0 && wsPort > 0) {
          self.loadWebView(mainWidget, layout);
        }
      }, 1000);
      // Store to prevent GC
      this._retryTimer = retryTimer;
    } else {
      this.loadWebView(mainWidget, layout);
    }

    mainWidget.layout = layout;
    return mainWidget;
  }

  loadWebView(widget, layout) {
    var webview = new Ui.WebEngineView(widget);
    webview.setSizePolicy(
      Ui.SizePolicy.Policy.Expanding,
      Ui.SizePolicy.Policy.Expanding
    );

    var url =
      "http://127.0.0.1:" +
      httpPort +
      "/?wsPort=" +
      wsPort +
      "&embedded=true";

    webview.load(url);
    layout.addWidget(webview);

    // Store ref to prevent GC
    this._webview = webview;

    var loadConn = webview.onLoadFinished.connect(function (success) {
      if (!success) {
        console.error("[scene-inspector] WebEngineView failed to load: " + url);
      }
    });
    this._loadConn = loadConn;
  }
}
