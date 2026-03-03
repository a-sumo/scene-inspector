/**
 * scene-walker.js
 *
 * Walks the Lens Studio Editor scene graph via the Editor API and produces
 * a snapshot in the EXACT same format as SceneInspector.ts (runtime walker).
 * This means the browser viewer needs zero changes to render it.
 */

const MAX_DEPTH = 20;

// ---------------------------------------------------------------------------
// Component classification — mirrors SceneInspector.ts lines 116-146 exactly
// ---------------------------------------------------------------------------
function classifyComponent(typeName) {
  if (typeName.includes("Camera")) return "camera";
  if (typeName.includes("Light") || typeName === "LightSource") return "light";
  if (
    typeName.includes("RenderMeshVisual") ||
    typeName.includes("Image") ||
    typeName.includes("FaceMask") ||
    typeName.includes("FaceInset") ||
    typeName.includes("Cloth") ||
    typeName.includes("PostEffect") ||
    typeName.includes("Liquify") ||
    typeName.includes("Retouch") ||
    typeName.includes("EyeColor") ||
    typeName.includes("Hair") ||
    typeName.includes("SpriteVisual") ||
    typeName.includes("ClearScreen") ||
    typeName.includes("GaussianSplatting") ||
    typeName.includes("FaceStretch") ||
    typeName.includes("Masking") ||
    typeName.includes("MaterialMesh")
  )
    return "visual";
  if (typeName.includes("Text3D") || typeName.includes("Text")) return "text";
  if (typeName.includes("Script")) return "script";
  if (typeName.includes("Audio")) return "audio";
  if (
    typeName.includes("Animation") ||
    typeName.includes("AnimationMixer") ||
    typeName.includes("AnimationPlayer") ||
    typeName.includes("BlendShapes")
  )
    return "animation";
  if (
    typeName.includes("Body") ||
    typeName.includes("Collider") ||
    typeName.includes("Constraint") ||
    typeName.includes("WorldComponent") ||
    typeName.includes("Physics")
  )
    return "physics";
  if (typeName.includes("VFX") || typeName.includes("Particle")) return "vfx";
  if (typeName.includes("Interaction") || typeName.includes("Manipulate"))
    return "interaction";
  if (
    typeName.includes("Tracking") ||
    typeName.includes("DeviceTracking") ||
    typeName.includes("Head") ||
    typeName.includes("Landmarker") ||
    typeName.includes("MarkerTracking") ||
    typeName.includes("ObjectTracking") ||
    typeName.includes("LocatedAt")
  )
    return "tracking";
  if (
    typeName.includes("ScreenTransform") ||
    typeName.includes("ScreenRegion") ||
    typeName.includes("Canvas") ||
    typeName.includes("RectangleSetter")
  )
    return "ui";
  if (typeName.includes("ML") || typeName.includes("SnapML")) return "ml";
  if (
    typeName.includes("LookAt") ||
    typeName.includes("PinToMesh") ||
    typeName.includes("Hints") ||
    typeName.includes("Skin") ||
    typeName.includes("RenderLayerOwner")
  )
    return "utility";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Euler (degrees) → quaternion conversion
// Editor API gives worldTransform.rotation as Euler vec3 (degrees).
// SceneInspector.ts sends quaternion [x, y, z, w]. We convert to match.
// ---------------------------------------------------------------------------
function eulerDegreesToQuat(ex, ey, ez) {
  var rx = (ex * Math.PI) / 180;
  var ry = (ey * Math.PI) / 180;
  var rz = (ez * Math.PI) / 180;

  var cx = Math.cos(rx * 0.5);
  var sx = Math.sin(rx * 0.5);
  var cy = Math.cos(ry * 0.5);
  var sy = Math.sin(ry * 0.5);
  var cz = Math.cos(rz * 0.5);
  var sz = Math.sin(rz * 0.5);

  // XYZ order (matches LS convention)
  var qx = sx * cy * cz + cx * sy * sz;
  var qy = cx * sy * cz - sx * cy * sz;
  var qz = cx * cy * sz + sx * sy * cz;
  var qw = cx * cy * cz - sx * sy * sz;

  return [+qx.toFixed(3), +qy.toFixed(3), +qz.toFixed(3), +qw.toFixed(3)];
}

// ---------------------------------------------------------------------------
// Round a vec3 to 3 decimal places
// ---------------------------------------------------------------------------
function roundVec3(v) {
  return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
}

// ---------------------------------------------------------------------------
// Process a single Editor component into the viewer's expected format
// ---------------------------------------------------------------------------
function processComponent(comp) {
  // Editor API: comp.name gives the component type string (e.g. "Camera")
  // comp.getTypeName() is the static method; instance uses .name
  var typeName = "Unknown";
  try {
    typeName = comp.constructor.getTypeName
      ? comp.constructor.getTypeName()
      : comp.name || "Unknown";
  } catch (e) {
    try {
      typeName = comp.name || "Unknown";
    } catch (e2) {}
  }

  var category = classifyComponent(typeName);
  var compInfo = {
    type: typeName,
    enabled: comp.enabled !== false,
    category: category,
  };

  // Extract type-specific properties (best-effort, matching SceneInspector.ts)
  try {
    // Text
    if (typeName.includes("Text") && !typeName.includes("ScreenTransform")) {
      if (comp.text !== undefined) compInfo.text = comp.text;
      if (comp.size !== undefined) compInfo.textSize = comp.size;
    }

    // Camera
    if (category === "camera") {
      if (comp.cameraType !== undefined)
        compInfo.cameraType =
          comp.cameraType === 1 ? "orthographic" : "perspective";
      if (comp.fov !== undefined) compInfo.fov = comp.fov;
      if (comp.size !== undefined) compInfo.orthoSize = comp.size;
      if (comp.near !== undefined) compInfo.near = comp.near;
      if (comp.far !== undefined) compInfo.far = comp.far;
      if (comp.renderOrder !== undefined) compInfo.renderOrder = comp.renderOrder;
    }

    // Script
    if (category === "script") {
      try {
        if (comp.scriptAsset) compInfo.scriptName = comp.scriptAsset.name || null;
      } catch (e) {}
    }

    // Visual
    if (category === "visual") {
      try {
        if (comp.mainMaterial) compInfo.materialName = comp.mainMaterial.name || null;
      } catch (e) {}
      try {
        if (comp.mesh) compInfo.meshName = comp.mesh.name || null;
      } catch (e) {}
    }

    // Audio
    if (category === "audio") {
      if (comp.volume !== undefined) compInfo.volume = comp.volume;
      try {
        if (comp.audioTrack) compInfo.trackName = comp.audioTrack.name || null;
      } catch (e) {}
    }

    // Physics
    if (category === "physics") {
      if (comp.dynamic !== undefined) compInfo.dynamic = comp.dynamic;
      if (comp.mass !== undefined) compInfo.mass = comp.mass;
    }

    // Light
    if (category === "light") {
      if (comp.intensity !== undefined) compInfo.intensity = comp.intensity;
      if (comp.renderOrder !== undefined) compInfo.renderOrder = comp.renderOrder;
      try {
        if (comp.color) compInfo.lightColor = [+comp.color.r.toFixed(3), +comp.color.g.toFixed(3), +comp.color.b.toFixed(3)];
      } catch (e3) {}
    }

    // Animation
    if (category === "animation") {
      try { if (comp.clip) compInfo.clipName = comp.clip.name || null; } catch (e3) {}
      if (comp.playbackSpeed !== undefined) compInfo.playbackSpeed = comp.playbackSpeed;
    }

    // Tracking
    if (category === "tracking") {
      try { if (comp.trackingMode !== undefined) compInfo.trackingMode = comp.trackingMode; } catch (e3) {}
    }

    // UI / ScreenTransform
    if (typeName.includes("ScreenTransform")) {
      compInfo.isScreenTransform = true;
    }

    // Visual — render order + blend mode
    if (category === "visual") {
      if (comp.renderOrder !== undefined) compInfo.renderOrder = comp.renderOrder;
      try {
        if (comp.mainMaterial && comp.mainMaterial.blendMode !== undefined) compInfo.blendMode = comp.mainMaterial.blendMode;
      } catch (e3) {}
    }
  } catch (e) {
    // Silently skip property extraction failures
  }

  return compInfo;
}

// ---------------------------------------------------------------------------
// Walk a single SceneObject recursively
// ---------------------------------------------------------------------------
function walkObject(obj, depth, parentPath) {
  if (depth > MAX_DEPTH) return null;

  var objName = obj.name || "(unnamed)";
  var myPath = parentPath ? (parentPath + "/" + objName) : objName;

  // World transform (for 3D viewport positioning)
  var pos = [0, 0, 0];
  var scl = [1, 1, 1];
  var rot = [0, 0, 0, 1]; // quaternion identity

  // Local transform (for inspector editing)
  var localPos = [0, 0, 0];
  var localScl = [1, 1, 1];
  var localRot = [0, 0, 0]; // Euler degrees

  try {
    var wt = obj.worldTransform;
    if (wt) {
      pos = roundVec3(wt.position);
      scl = roundVec3(wt.scale);
      var er = wt.rotation;
      rot = eulerDegreesToQuat(er.x, er.y, er.z);
    }
  } catch (e) {}

  try {
    var lt = obj.localTransform;
    if (lt) {
      localPos = roundVec3(lt.position);
      localScl = roundVec3(lt.scale);
      var lr = lt.rotation;
      localRot = [+lr.x.toFixed(3), +lr.y.toFixed(3), +lr.z.toFixed(3)];
    }
  } catch (e) {
    // If local transform fails, use world as fallback
    localPos = pos;
    localScl = scl;
  }

  // Components
  var components = [];
  var text = null;
  var hasVisual = false;
  var color = null;
  var primaryCategory = "empty";

  try {
    var comps = obj.components || [];
    for (var i = 0; i < comps.length; i++) {
      var compInfo = processComponent(comps[i]);
      components.push(compInfo);

      if (compInfo.text) text = compInfo.text;
      if (compInfo.category === "visual") hasVisual = true;

      // Primary category logic — matches SceneInspector.ts lines 321-327
      if (primaryCategory === "empty" || primaryCategory === "unknown") {
        if (compInfo.category !== "unknown") primaryCategory = compInfo.category;
      }
      if (
        compInfo.category === "camera" ||
        compInfo.category === "script" ||
        compInfo.category === "visual" ||
        compInfo.category === "text"
      ) {
        if (primaryCategory !== "camera") primaryCategory = compInfo.category;
      }
    }
  } catch (e) {}

  // Layer
  var layerName = null;
  try {
    if (obj.layers) layerName = obj.layers.toString();
  } catch (e) {}

  // Children
  var childNodes = [];
  try {
    var children = obj.children || [];
    for (var ci = 0; ci < children.length; ci++) {
      var childNode = walkObject(children[ci], depth + 1, myPath);
      if (childNode) childNodes.push(childNode);
    }
  } catch (e) {}

  return {
    name: objName,
    path: myPath,
    enabled: obj.enabled !== false,
    category: primaryCategory,
    pos: pos,
    scale: scl,
    rot: rot,
    localPos: localPos,
    localScale: localScl,
    localRot: localRot,
    components: components,
    text: text,
    hasVisual: hasVisual,
    color: color,
    layer: layerName,
    children: childNodes,
  };
}

// ---------------------------------------------------------------------------
// Count total nodes in a tree
// ---------------------------------------------------------------------------
function countNodes(nodes) {
  var count = 0;
  for (var i = 0; i < nodes.length; i++) {
    count += 1 + countNodes(nodes[i].children || []);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Walk the entire Editor scene graph.
// Returns a payload in the exact same shape as SceneInspector.ts sends.
//
// @param {Editor.Assets.Scene} scene — from model.project.scene
// @returns {object} scene_snapshot payload
// ---------------------------------------------------------------------------
export function walkScene(scene) {
  var roots = [];

  try {
    // Editor API: Scene extends ObjectOwner which has rootSceneObjects
    var rootObjects = scene.rootSceneObjects || [];
    for (var i = 0; i < rootObjects.length; i++) {
      var node = walkObject(rootObjects[i], 0, "");
      if (node) roots.push(node);
    }
  } catch (e) {
    console.error("[scene-inspector] Scene walk failed: " + e);
  }

  return {
    event: "scene_snapshot",
    source: "editor",
    ts: Date.now(),
    roots: roots,
    totalObjects: countNodes(roots),
  };
}
