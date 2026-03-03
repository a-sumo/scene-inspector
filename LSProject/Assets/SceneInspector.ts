/**
 * SceneInspector - Runtime scene graph walker.
 * Connects to a WebSocket relay and publishes live snapshots
 * of the runtime scene graph, including objects created by scripts.
 *
 * Default: connects to the spectacles WS relay on channel "inspector".
 * scene-debug.html subscribes to this channel to visualize the scene.
 * Also works with the standalone scene-inspector server (server.js).
 */

@component
export class SceneInspector extends BaseScriptComponent {
  @input
  @hint("WebSocket URL. Use relay with ?channel=inspector, or scene-inspector server directly.")
  public wsUrl: string = "ws://localhost:8766?channel=inspector";

  @input
  @hint("Frames between snapshot updates")
  public updateInterval: number = 15;

  @input
  @hint("Max tree depth")
  public maxDepth: number = 20;

  private ws: WebSocket;
  private connected: boolean = false;
  private frameCounter: number = 0;

  // Cache editor-time scales before SIK components reset them at runtime
  private editorScales: Map<SceneObject, any> = new Map();

  onAwake() {
    // Capture all scales NOW, before SIK/other components initialize
    this.cacheEditorScales();

    this.createEvent("OnStartEvent").bind(() => {
      this.connect();
    });

    this.createEvent("UpdateEvent").bind(() => {
      if (!this.connected) return;
      this.frameCounter++;
      if (this.frameCounter >= this.updateInterval) {
        this.frameCounter = 0;
        this.sendSnapshot();
      }
    });
  }

  private cacheEditorScales() {
    var rootCount = global.scene.getRootObjectsCount();
    for (var i = 0; i < rootCount; i++) {
      this.cacheScalesRecursive(global.scene.getRootObject(i), 0);
    }
    print("[SceneInspector] Cached editor scales for " + this.editorScales.size + " objects");
  }

  private cacheScalesRecursive(obj: SceneObject, depth: number) {
    if (depth > this.maxDepth) return;
    var s = obj.getTransform().getLocalScale();
    this.editorScales.set(obj, { x: s.x, y: s.y, z: s.z });
    var childCount = obj.getChildrenCount();
    for (var i = 0; i < childCount; i++) {
      this.cacheScalesRecursive(obj.getChild(i), depth + 1);
    }
  }

  private connect() {
    print("[SceneInspector] Connecting to " + this.wsUrl);
    try {
      var internetModule = require("LensStudio:InternetModule") as any;
      this.ws = internetModule.createWebSocket(this.wsUrl);
    } catch (e) {
      print("[SceneInspector] Failed to create WebSocket: " + e);
      return;
    }
    var self = this;

    this.ws.addEventListener("open", function () {
      self.connected = true;
      print("[SceneInspector] Connected");
      self.sendSnapshot();
    });

    this.ws.addEventListener("close", function () {
      self.connected = false;
      print("[SceneInspector] Disconnected, retrying in 3s");
      var delay = self.createEvent("DelayedCallbackEvent") as any;
      delay.bind(function () { self.connect(); });
      delay.reset(3.0);
    });

    this.ws.addEventListener("error", function (err: any) {
      print("[SceneInspector] Error: " + err);
    });
  }

  private sendSnapshot() {
    if (!this.ws || !this.connected) return;
    var roots: any[] = [];
    var rootCount = global.scene.getRootObjectsCount();
    for (var i = 0; i < rootCount; i++) {
      var node = this.walkObject(global.scene.getRootObject(i), 0);
      if (node) roots.push(node);
    }
    var payload = JSON.stringify({
      event: "scene_snapshot",
      ts: Date.now(),
      roots: roots,
      totalObjects: this.countNodes(roots),
    });
    try { this.ws.send(payload); } catch (e) {}
  }

  private walkObject(obj: SceneObject, depth: number): any {
    if (depth > this.maxDepth) return null;
    var t = obj.getTransform();
    var pos = t.getLocalPosition();
    var rot = t.getLocalRotation();

    // Use editor-time scale if cached (before SIK resets), fall back to current
    var cached = this.editorScales.get(obj);
    var sclX: number, sclY: number, sclZ: number;
    if (cached) {
      sclX = cached.x; sclY = cached.y; sclZ = cached.z;
    } else {
      var scl = t.getLocalScale();
      sclX = scl.x; sclY = scl.y; sclZ = scl.z;
    }

    var components: any[] = [];
    var text: string | null = null;
    var hasVisual = false;
    var color: number[] | null = null;

    var compCount = obj.getComponentCount("Component");
    for (var ci = 0; ci < compCount; ci++) {
      try {
        var comp = obj.getComponentByIndex("Component", ci) as any;
        var typeName = comp.getTypeName ? comp.getTypeName() : "Unknown";
        var compInfo: any = { type: typeName, enabled: comp.enabled !== false };
        if (typeName === "Text" || typeName === "Component.Text") {
          text = comp.text || null;
        }
        if (typeName === "RenderMeshVisual" || typeName === "Component.RenderMeshVisual") {
          hasVisual = true;
          try {
            var mat = comp.mainMaterial;
            if (mat && mat.mainPass) {
              var bc = mat.mainPass["baseColor"];
              if (bc) color = [
                Math.round(bc.x * 255), Math.round(bc.y * 255),
                Math.round(bc.z * 255), Math.round(bc.w * 255)
              ];
            }
          } catch (e) {}
        }
        if (typeName === "Image" || typeName === "Component.Image") hasVisual = true;
        components.push(compInfo);
      } catch (e) {}
    }

    var children: any[] = [];
    var childCount = obj.getChildrenCount();
    for (var ci2 = 0; ci2 < childCount; ci2++) {
      var child = this.walkObject(obj.getChild(ci2), depth + 1);
      if (child) children.push(child);
    }

    return {
      name: obj.name,
      enabled: obj.enabled,
      pos: [+pos.x.toFixed(3), +pos.y.toFixed(3), +pos.z.toFixed(3)],
      scale: [+sclX.toFixed(3), +sclY.toFixed(3), +sclZ.toFixed(3)],
      rot: [+rot.x.toFixed(3), +rot.y.toFixed(3), +rot.z.toFixed(3), +rot.w.toFixed(3)],
      components: components,
      text: text,
      hasVisual: hasVisual,
      color: color,
      children: children,
    };
  }

  private countNodes(nodes: any[]): number {
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      count += 1 + this.countNodes(nodes[i].children || []);
    }
    return count;
  }
}
