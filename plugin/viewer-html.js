export const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Lens Inspector</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/"
  }
}
</script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #f4f4f7;
  --panel: #fff;
  --surface: #eaeaef;
  --border: #d0d0d8;
  --border-bright: #b0b0ba;
  --text: #101018;
  --text-dim: #48485a;
  --text-muted: #70707e;
  --white: #fff;

  /* BRIGHT, PUNCHY. No purple, green, cyan, or washed-out steel blue. */
  --c-camera: #ff9500;
  --c-visual: #0090ff;
  --c-text: #0080ff;
  --c-script: #ff2d20;
  --c-audio: #ff6b00;
  --c-light: #ffc800;
  --c-physics: #ff1a1a;
  --c-vfx: #00a0ff;
  --c-interaction: #ff5500;
  --c-tracking: #99a;
  --c-animation: #ff8800;
  --c-ui: #0070ff;
  --c-ml: #5060ff;
  --c-empty: #99a;
  --c-prefab: #00aaff;

  --c-runtime: #0090ff;
  --c-selected: #0070ff;
  --c-enabled: #0090ff;
  --c-disabled: #ff2d20;

  --font: 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
  --mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;

  --transition: 0.15s ease;

  --label-shadow: 0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.5);
  --stats-bg: rgba(255,255,255,0.85);
  --selected-bg: #dde4f4;
  --viewport-bg: #f0f0f4;
  --badge-example-bg: #fff3e0;
  --badge-example-color: #c06000;
  --badge-example-border: #f0c880;
  --badge-live-bg: #e0f0ff;
  --badge-live-color: #0060c0;
  --badge-live-border: #80c0f0;
}

body { background: var(--bg); color: var(--text); font-family: var(--font); height: 100vh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }

/* --- Loading screen --- */
#loading-screen {
  position: fixed; inset: 0; z-index: 999; background: var(--panel);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; font-family: var(--mono); font-size: 11px; color: var(--text-dim);
  transition: opacity 0.3s ease;
}
#loading-screen.hidden { opacity: 0; pointer-events: none; }
.loading-spinner {
  width: 20px; height: 20px; border: 2px solid var(--border);
  border-top-color: var(--c-selected); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Toolbar --- */
#toolbar {
  height: 32px; background: var(--panel); border-bottom: 2px solid var(--border);
  display: flex; align-items: center; padding: 0 10px; gap: 6px; flex-shrink: 0;
  position: relative;
}
.toolbar-brand { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--text-dim); letter-spacing: 0.3px; }
.toolbar-brand b { color: var(--text); }
.sep { width: 1px; height: 14px; background: var(--border); }
#toolbar input {
  background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 2px 6px;
  font-family: var(--mono); font-size: 10px; border-radius: 3px; outline: none; transition: border-color var(--transition);
}
#toolbar input:focus { border-color: var(--c-selected); }
#toolbar button {
  background: var(--surface); color: var(--text-dim); border: 1px solid var(--border); padding: 2px 8px;
  font-family: var(--font); font-size: 10px; font-weight: 500; border-radius: 3px; cursor: pointer; transition: all var(--transition);
}
#toolbar button:hover { border-color: var(--border-bright); color: var(--text); background: var(--border); }
.status-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; transition: background 0.2s ease; }
.dot-off { background: #101018; }
.dot-live { background: var(--c-selected); }
.dot-example { background: var(--c-camera); }
#status-text { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
#source-badge {
  font-family: var(--mono); font-size: 9px; font-weight: 600; padding: 1px 7px;
  border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px;
}
.badge-example { background: var(--badge-example-bg); color: var(--badge-example-color); border: 1px solid var(--badge-example-border); }
.badge-live { background: var(--badge-live-bg); color: var(--badge-live-color); border: 1px solid var(--badge-live-border); }
.badge-editor { background: var(--badge-live-bg); color: var(--badge-live-color); border: 1px solid var(--badge-live-border); }
.badge-off { display: none; }
#project-name { font-family: var(--mono); font-size: 10px; color: var(--text); font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toolbar-spacer { flex: 1; }
/* --- Main layout: top row (hierarchy | inspector) + bottom (3D) --- */
#main { flex: 1; display: flex; flex-direction: column; min-height: 0; }
#top-row { display: flex; flex-direction: row; flex: 1; min-height: 0; }

/* --- Resize handles --- */
.resize-handle-h {
  height: 5px; cursor: row-resize; background: transparent;
  position: relative; flex-shrink: 0; z-index: 5;
  transition: background 0.15s;
}
.resize-handle-h:hover, .resize-handle-h.active { background: var(--c-selected); }
.resize-handle-h::after {
  content: ''; position: absolute; inset: 0; height: 1px; margin: auto;
  background: var(--border);
}
.resize-handle-h:hover::after, .resize-handle-h.active::after { background: transparent; }
.resize-handle-v {
  width: 5px; cursor: col-resize; background: transparent;
  position: relative; flex-shrink: 0; z-index: 5;
  transition: background 0.15s;
}
.resize-handle-v:hover, .resize-handle-v.active { background: var(--c-selected); }
.resize-handle-v::after {
  content: ''; position: absolute; inset: 0; width: 1px; margin: auto;
  background: var(--border);
}
.resize-handle-v:hover::after, .resize-handle-v.active::after { background: transparent; }
body.resizing-h { cursor: row-resize !important; user-select: none !important; }
body.resizing-h * { cursor: row-resize !important; user-select: none !important; pointer-events: none !important; }
body.resizing-h .resize-handle-h { pointer-events: auto !important; }
body.resizing-v { cursor: col-resize !important; user-select: none !important; }
body.resizing-v * { cursor: col-resize !important; user-select: none !important; pointer-events: none !important; }
body.resizing-v .resize-handle-v { pointer-events: auto !important; }

/* --- Tree panel (left column) --- */
#tree-panel {
  background: var(--panel);
  display: flex; flex-direction: column; flex: none; width: 50%; min-width: 80px; overflow: hidden;
}
#tree-header {
  padding: 4px 10px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
#tree-header h2 { font-family: var(--mono); font-size: 9px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
#tree-count { font-family: var(--mono); font-size: 9px; color: var(--text-dim); }
#tree-search {
  margin: 3px 6px; padding: 3px 7px; background: var(--surface); border: 1px solid var(--border);
  color: var(--text); font-family: var(--font); font-size: 11px; border-radius: 3px; outline: none; transition: border-color var(--transition);
}
#tree-search:focus { border-color: var(--c-selected); }
#tree-search::placeholder { color: var(--border-bright); }

/* --- Category filter chips --- */
#tree-filters { display: flex; flex-wrap: nowrap; gap: 2px; padding: 2px 6px 3px; overflow-x: auto; scrollbar-width: none; }
#tree-filters::-webkit-scrollbar { display: none; }
.filter-chip {
  font-family: var(--mono); font-size: 8px; padding: 1px 5px; border-radius: 3px;
  border: 1px solid var(--border); background: transparent; color: var(--text-dim);
  cursor: pointer; transition: all var(--transition); line-height: 1.4;
}
.filter-chip:hover { border-color: var(--border-bright); color: var(--text); }
.filter-chip.active { background: var(--text); color: var(--panel); border-color: var(--text); }

#theme-toggle {
  display: flex; align-items: center; gap: 2px; padding: 2px;
  background: var(--surface); border-radius: 5px;
  position: absolute; left: 50%; transform: translateX(-50%);
}
#theme-toggle .theme-opt {
  padding: 3px 10px; margin: 0; font-family: var(--mono); font-size: 9px; font-weight: 600;
  letter-spacing: 0.5px; text-transform: uppercase; border: none; border-radius: 3px;
  background: transparent; color: var(--text-muted); cursor: pointer; transition: all var(--transition);
  line-height: 1;
}
#theme-toggle .theme-opt:hover { color: var(--text); }
#theme-toggle .theme-opt.active { background: var(--text); color: var(--panel); }

#tree-list { flex: 1; overflow-y: auto; min-height: 0; padding: 1px 0; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
#tree-list::-webkit-scrollbar { width: 5px; }
#tree-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* Tree nodes */
.tree-node {
  display: flex; align-items: center; gap: 2px; padding: 0 4px; cursor: pointer;
  border-left: 3px solid transparent; font-size: 10.5px; min-height: 18px;
  transition: background var(--transition), border-color var(--transition);
}
.tree-node:hover { background: var(--surface); }
.tree-node.selected { background: var(--selected-bg); border-left-color: var(--c-selected); }
.tree-node.disabled { opacity: 0.3; }
.tree-node.hidden-vis { opacity: 0.35; }
.tree-node.hidden-vis .tree-name { text-decoration: line-through; }
.tree-node.inherited-hidden-vis { opacity: 0.45; }
.tree-arrow { width: 12px; font-size: 7px; color: var(--border-bright); text-align: center; flex-shrink: 0; cursor: pointer; user-select: none; transition: color var(--transition); }
.tree-arrow:hover { color: var(--text); }
.tree-icon { width: 13px; height: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.tree-icon svg { width: 11px; height: 11px; }
.tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; }
.tree-name-runtime { color: var(--c-runtime); }
.tree-text-preview { color: var(--text-dim); font-family: var(--mono); font-size: 9px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.tree-comp-count { font-family: var(--mono); font-size: 8px; color: var(--text-dim); flex-shrink: 0; padding: 0 2px; }

/* Eye (visibility) toggle */
.tree-vis {
  width: 14px; height: 14px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: center; cursor: pointer; color: var(--border-bright);
  opacity: 0; transition: opacity var(--transition), color var(--transition);
}
.tree-vis svg { width: 11px; height: 11px; }
.tree-node:hover .tree-vis { opacity: 0.6; }
.tree-vis:hover { color: var(--text); opacity: 1 !important; }
.tree-vis.vis-off { opacity: 0.7; color: var(--c-disabled); }
.tree-node:hover .tree-vis.vis-off { opacity: 1; }

/* --- 3D Viewport --- */
#viewport-bar {
  height: 22px; background: var(--surface); border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border); display: flex; align-items: center;
  padding: 0 8px; font-family: var(--mono); font-size: 9px;
  font-weight: 500; color: var(--text-dim); user-select: none; gap: 4px; flex-shrink: 0;
}
#viewport-wrapper { flex: none; height: 250px; min-height: 60px; overflow: hidden; }
#viewport { width: 100%; height: 100%; position: relative; background: var(--viewport-bg); overflow: hidden; user-select: none; -webkit-user-select: none; }
#viewport canvas { width: 100%; height: 100%; display: block; -webkit-user-drag: none; user-select: none; -webkit-user-select: none; touch-action: none; }
#scene-labels {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.scene-label {
  position: absolute; font-family: var(--mono); font-size: 9px; font-weight: 500;
  white-space: nowrap; pointer-events: auto; cursor: pointer;
  transform: translate(-50%, -100%) translateY(-8px);
  text-shadow: var(--label-shadow);
  opacity: 0.7; transition: opacity 0.15s;
}
.scene-label:hover { opacity: 1; }
.scene-label.selected { opacity: 1; font-weight: 600; font-size: 10px; }
.grad-label {
  position: absolute; font-family: var(--mono); font-size: 9px; font-weight: 500;
  white-space: nowrap; pointer-events: none;
  transform: translate(-50%, -50%);
  opacity: 0.6;
}
.grad-label-unit { font-weight: 600; font-size: 10px; opacity: 0.7; }

/* --- Gizmo --- */
#gizmo {
  position: absolute; top: 8px; right: 8px; width: 90px; height: 90px; z-index: 3;
}
#gizmo canvas { width: 100%; height: 100%; }
.gizmo-label {
  position: absolute; font-family: var(--mono); font-size: 11px; font-weight: 700;
  pointer-events: auto; cursor: pointer; user-select: none;
  transform: translate(-50%, -50%);
  width: 18px; height: 18px; line-height: 18px; text-align: center;
  border-radius: 50%;
}
.gizmo-label:hover { text-decoration: underline; }
.gizmo-back {
  font-size: 8px; font-weight: 500; opacity: 0.3;
}

/* --- Properties panel (right column) --- */
#props-panel {
  background: var(--panel);
  display: flex; flex-direction: column; flex: 1; overflow-y: auto; min-width: 80px;
  scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  border-left: 1px solid var(--border);
}
#props-panel::-webkit-scrollbar { width: 5px; }
#props-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
#props-header { padding: 4px 10px; border-bottom: 1px solid var(--border); }
#props-header h2 { font-family: var(--mono); font-size: 9px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
#props-content { padding: 6px 10px; }
.prop-section { margin-bottom: 8px; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.prop-section-title { font-family: var(--mono); font-size: 8px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.prop-row { display: flex; justify-content: space-between; align-items: center; padding: 1px 0; border-bottom: 1px solid var(--surface); }
.prop-key { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
.prop-val { font-family: var(--mono); font-size: 10px; color: var(--text); text-align: right; word-break: break-all; }
.prop-val-color { display: inline-block; width: 10px; height: 10px; border-radius: 2px; border: 1px solid var(--border); vertical-align: middle; margin-right: 4px; }
.prop-hint { font-size: 11px; color: var(--text-dim); padding: 16px 0; text-align: center; }

.comp-item { padding: 2px 0; border-bottom: 1px solid var(--surface); display: flex; align-items: center; gap: 4px; transition: background var(--transition); }
.comp-type { font-family: var(--mono); font-size: 10px; }
.comp-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.comp-on { background: var(--c-enabled); }
.comp-off { background: var(--c-disabled); }
.comp-detail { font-family: var(--mono); font-size: 9px; color: var(--text-dim); margin-left: auto; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* --- Editable transform fields --- */
.prop-row-edit { display: flex; gap: 2px; align-items: center; margin-left: auto; }
.prop-axis-label { font-family: var(--mono); font-size: 8px; font-weight: 600; width: 9px; text-align: center; cursor: ew-resize; user-select: none; }
.prop-val-input {
  width: 48px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 2px; font-family: var(--mono); font-size: 10px; color: var(--text);
  text-align: right; padding: 1px 3px; outline: none; transition: border-color var(--transition);
}
.prop-val-input:focus { border-color: var(--c-selected); background: var(--panel); }
.prop-toggle {
  cursor: pointer; padding: 1px 6px; border-radius: 2px;
  transition: background var(--transition), color var(--transition);
}
.prop-toggle:hover { background: var(--surface); }
.prop-toggle-on { color: var(--c-enabled); }
.prop-toggle-off { color: var(--c-disabled); }

/* --- Welcome --- */
#welcome {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  z-index: 10; background: var(--bg); animation: fadeIn 0.3s ease;
  overflow-y: auto; padding: 24px 0;
}
#welcome.hidden { display: none; }
.welcome-box {
  max-width: 420px; padding: 28px 36px; background: var(--panel); border: 1px solid var(--border);
  border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.welcome-box h1 { font-family: var(--font); font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 18px; }
.welcome-box .step { display: flex; gap: 10px; margin-bottom: 12px; font-size: 12px; line-height: 1.6; }
.welcome-box .step-num {
  width: 18px; height: 18px; background: var(--surface); color: var(--text-dim);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 9px; font-weight: 600; flex-shrink: 0; margin-top: 2px;
}
.welcome-box .step-text { color: var(--text-dim); }
.welcome-box .step-text code { background: var(--surface); padding: 1px 5px; border-radius: 3px; color: var(--text); font-family: var(--mono); font-size: 10px; }
.welcome-box .step-check {
  width: 18px; height: 18px; background: #e0eaf4; color: var(--c-selected);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
}
.welcome-status {
  margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border);
  font-family: var(--mono); font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;
}
.welcome-spinner {
  width: 10px; height: 10px; border: 1.5px solid var(--border); border-top-color: var(--c-selected);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

/* --- Tron Music Player --- */
#tron-player {
  display: none; position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
  height: 40px; background: rgba(10,0,0,0.92); border-top: 1px solid #3a0800;
  font-family: var(--mono); font-size: 10px; color: #ff2010;
  flex-direction: row; align-items: center; gap: 0; padding: 0 10px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
body.tron #tron-player { display: flex; }
#tron-player button {
  background: none; border: none; color: #ff2010; cursor: pointer; padding: 4px 6px;
  font-size: 14px; line-height: 1; opacity: 0.7; transition: opacity 0.15s;
}
#tron-player button:hover { opacity: 1; }
#tron-player button.tp-active { opacity: 1; color: #ff4400; }
#tp-track {
  flex: 1; min-width: 0; padding: 0 10px; font-size: 10px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8;
}
#tp-time { font-size: 9px; opacity: 0.5; padding: 0 8px; white-space: nowrap; }
#tp-progress-wrap {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: rgba(60,8,0,0.6); cursor: pointer;
}
#tp-progress {
  height: 100%; width: 0; background: #ff2010; transition: width 0.3s linear;
  pointer-events: none;
}
#tp-vol-wrap {
  display: flex; align-items: center; gap: 4px; padding: 0 4px;
}
#tp-vol {
  -webkit-appearance: none; appearance: none; width: 60px; height: 3px;
  background: #3a0800; border-radius: 2px; outline: none; cursor: pointer;
}
#tp-vol::-webkit-slider-thumb {
  -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%;
  background: #ff2010; cursor: pointer;
}
#tp-vol::-moz-range-thumb {
  width: 10px; height: 10px; border-radius: 50%; border: none;
  background: #ff2010; cursor: pointer;
}
#tp-iframe-wrap { position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none; }

/* --- Tron CSS effects: circuit-trace pulses --- */

/* Dim static border lines */
body.tron .resize-handle-h::after, body.tron .resize-handle-v::after { background: #2a0600; opacity: 1; }
body.tron .resize-handle-h:hover::after, body.tron .resize-handle-v:hover::after { background: transparent; }
body.tron #toolbar { border-bottom: 1px solid #2a0600; position: relative; overflow: visible; }
body.tron #tree-panel { border-right: 1px solid #2a0600; }
body.tron #props-panel { border-left: 1px solid #2a0600; }
body.tron #tree-header, body.tron #props-header { border-bottom: 1px solid #2a0600; position: relative; overflow: visible; }

</style>
</head>
<body>
<div id="loading-screen"><div class="loading-spinner"></div><span>Loading Inspector...</span></div>
<div id="welcome">
  <div class="welcome-box">
    <h1>Connect to Lens Studio</h1>
    <div class="step">
      <span class="step-check">&#10003;</span>
      <span class="step-text">Start the inspector: <code>npx scene-inspector</code></span>
    </div>
    <div class="step">
      <span class="step-num">2</span>
      <span class="step-text">
        Download <a href="/SceneInspector.ts" style="color: var(--c-selected);">SceneInspector.ts</a> and drag it into your Lens Studio project's <strong>Assets</strong> panel.
        Attach it to any SceneObject (e.g. Camera).
      </span>
    </div>
    <div class="step">
      <span class="step-num">3</span>
      <span class="step-text">
        In Lens Studio: <strong>Project Settings &gt; General &gt; Experimental APIs</strong> &rarr; enable.
      </span>
    </div>
    <div class="step">
      <span class="step-num">4</span>
      <span class="step-text">Hit <strong>Play</strong> in Lens Studio. The scene appears here automatically. Component details require LS MCP (AI Assistant &gt; MCP, port 8732).</span>
    </div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
      <div style="font-family:var(--mono);font-size:9px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Server</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" id="welcome-url" value="localhost:8200"
          style="flex:1;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:3px;font-family:var(--mono);font-size:11px;color:var(--text);outline:none;">
      </div>
      <div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Change this if your inspector runs on a different port or machine.</div>
      <div style="margin-top:8px;">
        <div style="font-family:var(--mono);font-size:9px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">MCP Config <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted)">(optional, for component details)</span></div>
        <textarea id="mcp-config" rows="3" placeholder='Paste MCP config JSON from Lens Studio (AI Assistant > MCP)'
          style="width:100%;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:3px;font-family:var(--mono);font-size:10px;color:var(--text);outline:none;resize:vertical;line-height:1.4;"></textarea>
        <div id="mcp-config-status" style="font-size:9px;color:var(--text-muted);margin-top:3px;">Copy from Lens Studio: AI Assistant > MCP config.</div>
      </div>
      <button id="server-connect-btn" style="margin-top:14px;width:100%;padding:8px 0;background:var(--c-selected);border:none;border-radius:4px;font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer;color:#fff;">Connect</button>
    </div>
    <div class="welcome-status" id="welcome-status">
      <div class="welcome-spinner"></div>
      <span>Waiting for Lens Studio...</span>
    </div>
    <div style="margin-top:10px;text-align:center;">
      <button id="demo-btn" style="padding:6px 16px;background:none;border:1px solid var(--border);border-radius:4px;font-family:var(--font);font-size:11px;color:var(--text-dim);cursor:pointer;">Try example scene</button>
    </div>
    <div class="welcome-status" id="welcome-example" style="display:none">
      <span style="color:var(--c-camera);font-weight:500">Viewing example scene.</span>
      <span>Connect Lens Studio to see your real project.</span>
    </div>
  </div>
</div>

<div id="toolbar">
  <span class="toolbar-brand"><b>lens</b>-inspector</span>
  <div class="sep"></div>
  <span class="status-dot dot-off" id="ws-dot"></span>
  <span id="status-text">connecting...</span>
  <span id="source-badge" class="badge-off"></span>
  <span id="project-name"></span>
  <div class="toolbar-spacer"></div>
  <span id="theme-toggle">
    <button class="theme-opt" data-theme="default">DEFAULT</button>
    <button class="theme-opt" data-theme="tron">TRON</button>
  </span>
</div>
<input type="hidden" id="ws-url" value="ws://localhost:8200">
<input type="hidden" id="mcp-base" value="http://localhost:8200">

<div id="main">
  <div id="top-row">
    <div id="tree-panel">
      <div id="tree-header">
        <h2>Hierarchy</h2>
        <span id="tree-count"></span>
      </div>
      <input type="text" id="tree-search" placeholder="Filter...">
      <div id="tree-filters">
        <button class="filter-chip active" data-cat="all">All</button>
        <button class="filter-chip" data-cat="camera">Camera</button>
        <button class="filter-chip" data-cat="visual">Visual</button>
        <button class="filter-chip" data-cat="script">Script</button>
        <button class="filter-chip" data-cat="light">Light</button>
        <button class="filter-chip" data-cat="physics">Physics</button>
        <button class="filter-chip" data-cat="audio">Audio</button>
        <button class="filter-chip" data-cat="animation">Anim</button>
        <button class="filter-chip" data-cat="ui">UI</button>
        <button class="filter-chip" data-cat="tracking">Track</button>
        <button class="filter-chip" data-cat="empty">Empty</button>
      </div>
      <div id="tree-list"></div>
    </div>
    <div class="resize-handle-v" id="resize-v1"></div>
    <div id="props-panel">
      <div id="props-header"><h2>Inspector</h2></div>
      <div id="props-content"><p class="prop-hint">Select a node</p></div>
    </div>
    <div id="tron-player">
      <button id="tp-prev" title="Previous">&#9198;</button>
      <button id="tp-play" title="Play/Pause">&#9654;</button>
      <button id="tp-next" title="Next">&#9197;</button>
      <span id="tp-track">NIN</span>
      <span id="tp-time"></span>
      <div id="tp-vol-wrap">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.6"><path d="M2 4.5h2l2.5-2v7l-2.5-2H2a.5.5 0 01-.5-.5v-2A.5.5 0 012 4.5z"/><path d="M8.5 3.5c.8.8 1.2 1.8 1.2 2.5s-.4 1.7-1.2 2.5" fill="none" stroke="currentColor" stroke-width="1"/></svg>
        <input type="range" id="tp-vol" min="0" max="100" value="30">
      </div>
      <button id="tp-shuffle" title="Shuffle">&#8645;</button>
      <div id="tp-progress-wrap"><div id="tp-progress"></div></div>
      <div id="tp-iframe-wrap"></div>
    </div>
  </div>
  <div class="resize-handle-h" id="resize-h1"></div>
  <div id="viewport-bar">
    3D Preview
    <span style="margin-left:auto;font-size:8px;opacity:0.5"><span id="stat-objects">0</span> obj</span>
  </div>
  <div id="viewport-wrapper">
    <div id="viewport">
      <canvas id="scene-canvas"></canvas>
      <div id="scene-labels"></div>
      <div id="gizmo"><canvas width="180" height="180"></canvas></div>
    </div>
  </div>
</div>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Embedded mode detection (Lens Studio plugin) ---
const _urlParams = new URLSearchParams(window.location.search);
const isEmbedded = _urlParams.get('embedded') === 'true';
const embeddedWsPort = _urlParams.get('wsPort');

// --- Icons ---
const ICONS = {
  camera: \`<svg viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M8 5l3-1.5v5L8 7" stroke="currentColor" stroke-width="1.2"/></svg>\`,
  visual: \`<svg viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.6"/></svg>\`,
  text: \`<svg viewBox="0 0 12 12" fill="none"><text x="3" y="9.5" font-size="9" font-weight="700" fill="currentColor" font-family="sans-serif">T</text></svg>\`,
  script: \`<svg viewBox="0 0 12 12" fill="none"><path d="M3 3l3 3-3 3M7 9h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>\`,
  audio: \`<svg viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="2" height="10" rx="1" fill="currentColor" opacity="0.5"/><rect x="1" y="3" width="2" height="6" rx="1" fill="currentColor" opacity="0.3"/><rect x="7" y="3" width="2" height="6" rx="1" fill="currentColor" opacity="0.3"/></svg>\`,
  light: \`<svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M2.5 9.5l1-1M8.5 3.5l1-1" stroke="currentColor" stroke-width="0.8"/></svg>\`,
  physics: \`<svg viewBox="0 0 12 12" fill="none"><path d="M6 1L1 4v4l5 3 5-3V4L6 1z" stroke="currentColor" stroke-width="1.1"/></svg>\`,
  vfx: \`<svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" fill="currentColor"/><circle cx="3" cy="3" r="1" fill="currentColor" opacity="0.4"/><circle cx="9" cy="4" r="0.8" fill="currentColor" opacity="0.3"/><circle cx="4" cy="9" r="0.7" fill="currentColor" opacity="0.25"/></svg>\`,
  interaction: \`<svg viewBox="0 0 12 12" fill="none"><path d="M4 1v7l2-2 1.5 3.5 1.5-.5-1.5-3.5H10L4 1z" fill="currentColor" opacity="0.6"/></svg>\`,
  tracking: \`<svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="0.8" fill="currentColor"/><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" stroke-width="0.8"/></svg>\`,
  animation: \`<svg viewBox="0 0 12 12" fill="none"><path d="M2 9l2-4 2 2 2-5 2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>\`,
  ui: \`<svg viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="8" rx="1" stroke="currentColor" stroke-width="1"/><line x1="1.5" y1="5" x2="10.5" y2="5" stroke="currentColor" stroke-width="0.7"/></svg>\`,
  ml: \`<svg viewBox="0 0 12 12" fill="none"><rect x="3" y="1" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1"/><rect x="3" y="7" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1"/><path d="M6 5v2M4 5v2M8 5v2" stroke="currentColor" stroke-width="0.8"/></svg>\`,
  utility: \`<svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="0.8"/></svg>\`,
  empty: \`<svg viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5"/></svg>\`,
  prefab: \`<svg viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1"/><path d="M4 4h4M4 6h4M4 8h2" stroke="currentColor" stroke-width="0.8" opacity="0.5"/></svg>\`,
  unknown: \`<svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1"/></svg>\`,
};

const ICON_EYE = \`<svg viewBox="0 0 12 12" fill="none"><path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>\`;
const ICON_EYE_OFF = \`<svg viewBox="0 0 12 12" fill="none"><path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z" stroke="currentColor" stroke-width="1" fill="none"/><line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" stroke-width="1.2"/></svg>\`;

const CAT_COLORS = {
  camera: '#ff9500', visual: '#0090ff', text: '#0080ff', script: '#ff2d20',
  audio: '#ff6b00', light: '#ffc800', physics: '#ff1a1a', vfx: '#00a0ff',
  interaction: '#ff5500', tracking: '#99a', animation: '#ff8800', ui: '#0070ff',
  ml: '#5060ff', utility: '#88889a', empty: '#99a', prefab: '#00aaff', unknown: '#99a',
};

// --- State ---
let liveTree = null, flatNodes = [], sceneNodes = [], allSceneNodes = [], selectedId = null;
let collapsedPaths = new Set(), hiddenPaths = new Set(), searchFilter = '', activeCategoryFilter = 'all', ws = null;
let dataSource = null; // 'editor' | 'example' | 'live' | null

// Check if a node (by id) or any of its ancestors is hidden
function isNodeHidden(id) {
  if (hiddenPaths.has(id)) return true;
  const colonIdx = id.indexOf(':');
  if (colonIdx < 0) return false;
  const prefix = id.substring(0, colonIdx + 1);
  const path = id.substring(colonIdx + 1);
  let pos = 0;
  while (true) {
    const slash = path.indexOf('/', pos);
    if (slash < 0) break;
    if (hiddenPaths.has(prefix + path.substring(0, slash))) return true;
    pos = slash + 1;
  }
  return false;
}

// --- Three.js ---
let scene3d, camera3d, renderer3d, controls3d, raycaster, pointer, gridMat, axisLines = [];
let sceneMeshes = []; // { group, boxMesh, node }
let labelEls = []; // { el, node }
const labelContainer = document.getElementById('scene-labels');
const tmpVec = new THREE.Vector3();

function initScene3D() {
  const container = document.getElementById('viewport');
  const canvas = document.getElementById('scene-canvas');

  scene3d = new THREE.Scene();

  // Gradient background (top: white, bottom: soft blue-gray)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2; bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d');
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#f0f2f8');
  grad.addColorStop(1, '#d8dce8');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.mapping = THREE.EquirectangularReflectionMapping;
  scene3d.background = bgTex;

  camera3d = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 2000);
  camera3d.position.set(25, 20, 25);

  renderer3d = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer3d.setSize(container.clientWidth, container.clientHeight);
  renderer3d.setPixelRatio(window.devicePixelRatio);

  controls3d = new OrbitControls(camera3d, canvas);
  controls3d.enableDamping = true;
  controls3d.dampingFactor = 0.08;
  controls3d.enablePan = true;
  controls3d.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  controls3d.target.set(0, 0, 0);

  // Infinite grid (multi-level shader, smooth transitions)
  gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCamDist: { value: 50.0 }, uGridColor: { value: new THREE.Vector3(0.55, 0.57, 0.63) } },
    vertexShader: \`
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    \`,
    fragmentShader: \`
      varying vec3 vWorld;
      uniform float uCamDist;
      uniform vec3 uGridColor;
      float gridLine(vec2 pos, float spacing) {
        vec2 coord = pos / spacing;
        vec2 g = abs(fract(coord - 0.5) - 0.5);
        vec2 line = g / fwidth(coord);
        return 1.0 - min(min(line.x, line.y), 1.0);
      }
      void main() {
        float dist = length(vWorld.xz);
        float fadeR = uCamDist * 3.0;
        float fade = 1.0 - smoothstep(fadeR * 0.5, fadeR, dist);
        if (fade < 0.01) discard;

        float logD = log(uCamDist) / log(10.0);
        float level = floor(logD);
        float frac = logD - level;

        float s0 = pow(10.0, level - 1.0);
        float s1 = pow(10.0, level);
        float s2 = pow(10.0, level + 1.0);

        float g0 = gridLine(vWorld.xz, s0);
        float g1 = gridLine(vWorld.xz, s1);
        float g2 = gridLine(vWorld.xz, s2);

        float a0 = g0 * 0.06 * (1.0 - frac);
        float a1 = g1 * 0.18;
        float a2 = g2 * (0.28 + 0.1 * frac);

        float a = max(max(a0, a1), a2) * fade;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uGridColor, a);
      }
    \`,
  });
  const gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), gridMat);
  gridPlane.rotation.x = -Math.PI / 2;
  scene3d.add(gridPlane);

  // Subtle axes at origin
  const axLen = 8;
  const axMat = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.8 });
  const mkAx = (dir, color) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir.clone().multiplyScalar(axLen)]);
    return new THREE.Line(g, axMat(color));
  };
  axisLines = [
    mkAx(new THREE.Vector3(1,0,0), 0xe03020),
    mkAx(new THREE.Vector3(0,1,0), 0xe0b010),
    mkAx(new THREE.Vector3(0,0,1), 0x1878e0),
  ];
  axisLines.forEach(l => scene3d.add(l));

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // Click to select
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  window.addEventListener('resize', onResize);
  onResize();

  animate();
}

function rebuildSceneBg(colors) {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2; bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d');
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.mapping = THREE.EquirectangularReflectionMapping;
  if (scene3d.background) scene3d.background.dispose();
  scene3d.background = bgTex;
}

let pointerDownPos = { x: 0, y: 0 };
function onPointerDown(e) {
  pointerDownPos = { x: e.clientX, y: e.clientY };
  const canvas = renderer3d.domElement;
  canvas.addEventListener('pointerup', onPointerUp, { once: true });
}

function onPointerUp(e) {
  const dx = e.clientX - pointerDownPos.x, dy = e.clientY - pointerDownPos.y;
  if (dx * dx + dy * dy > 25) return;

  const rect = renderer3d.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera3d);
  const meshes = sceneMeshes.map(m => m.boxMesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    const hit = sceneMeshes.find(m => m.boxMesh === hits[0].object);
    if (hit) {
      selectedId = hit.node.id;
      updateMeshStyles();
      renderTree();
      renderProps();
    }
  }
}

function onResize() {
  const container = document.getElementById('viewport');
  const w = container.clientWidth, h = container.clientHeight;
  if (w <= 0 || h <= 0) return;
  camera3d.aspect = w / h;
  camera3d.updateProjectionMatrix();
  renderer3d.setSize(w, h);
}

// --- Gizmo (navigation gnomon) ---
const gizmoEl = document.getElementById('gizmo');
const gizmoCanvas = gizmoEl.querySelector('canvas');
const gizmoCtx = gizmoCanvas.getContext('2d');
const gizmoDirs = [
  { label: 'X', dir: new THREE.Vector3(1,0,0), color: '#e03020' },
  { label: 'Y', dir: new THREE.Vector3(0,1,0), color: '#e0b010' },
  { label: 'Z', dir: new THREE.Vector3(0,0,1), color: '#1878e0' },
];
const gizmoLabels = [];

for (const d of gizmoDirs) {
  const pos = document.createElement('div');
  pos.className = 'gizmo-label';
  pos.style.color = d.color;
  pos.textContent = d.label;
  pos.addEventListener('click', () => snapToView(d.dir.clone()));
  gizmoEl.appendChild(pos);
  gizmoLabels.push({ el: pos, dir: d.dir, color: d.color, back: false });

  const neg = document.createElement('div');
  neg.className = 'gizmo-label gizmo-back';
  neg.style.color = d.color;
  neg.textContent = '-' + d.label;
  neg.addEventListener('click', () => snapToView(d.dir.clone().negate()));
  gizmoEl.appendChild(neg);
  gizmoLabels.push({ el: neg, dir: d.dir.clone().negate(), color: d.color, back: true });
}

let snapAnimId = null;
function snapToView(dir) {
  const dist = camera3d.position.distanceTo(controls3d.target);
  const target = controls3d.target.clone();
  const endPos = target.clone().add(dir.clone().multiplyScalar(dist));
  const startPos = camera3d.position.clone();
  const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(0, 0, dir.y > 0 ? -1 : 1) : new THREE.Vector3(0, 1, 0);
  const startTime = performance.now();
  if (snapAnimId) cancelAnimationFrame(snapAnimId);
  function step() {
    const t = Math.min((performance.now() - startTime) / 350, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera3d.position.lerpVectors(startPos, endPos, ease);
    camera3d.up.lerp(up, ease * 0.5 + 0.5);
    camera3d.lookAt(target);
    controls3d.update();
    if (t < 1) snapAnimId = requestAnimationFrame(step);
    else snapAnimId = null;
  }
  step();
}

// Pre-allocated vectors for per-frame functions (avoid GC churn)
const _gizmoQuat = new THREE.Quaternion();
const _gizmoP = new THREE.Vector3();
const _gizmoN = new THREE.Vector3();
const _flyForward = new THREE.Vector3();
const _flyRight = new THREE.Vector3();
const _flyUp = new THREE.Vector3(0, 1, 0);
const _flyMove = new THREE.Vector3();

function updateGizmo() {
  const cx = 90, cy = 90, r = 32;
  gizmoCtx.clearRect(0, 0, 180, 180);
  _gizmoQuat.copy(camera3d.quaternion).invert();

  for (const d of gizmoDirs) {
    _gizmoP.copy(d.dir).applyQuaternion(_gizmoQuat);
    _gizmoN.copy(d.dir).negate().applyQuaternion(_gizmoQuat);
    gizmoCtx.beginPath();
    gizmoCtx.moveTo(cx + _gizmoN.x * r, cy - _gizmoN.y * r);
    gizmoCtx.lineTo(cx + _gizmoP.x * r, cy - _gizmoP.y * r);
    gizmoCtx.strokeStyle = d.color;
    gizmoCtx.globalAlpha = 0.4;
    gizmoCtx.lineWidth = 2;
    gizmoCtx.stroke();
    gizmoCtx.globalAlpha = 1;
  }

  for (const gl of gizmoLabels) {
    _gizmoP.copy(gl.dir).applyQuaternion(_gizmoQuat);
    const x = 45 + _gizmoP.x * 34;
    const y = 45 - _gizmoP.y * 34;
    gl.el.style.left = x + 'px';
    gl.el.style.top = y + 'px';
    gl.el.style.opacity = gl.back ? (_gizmoP.z > 0 ? '0.15' : '0.4') : (_gizmoP.z > 0 ? '0.4' : '0.9');
    gl.el.style.zIndex = _gizmoP.z > 0 ? '0' : '1';
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateFlyMovement();
  controls3d.update();
  rebuildGraduations();
  renderer3d.render(scene3d, camera3d);
  updateLabelPositions();
  updateGradLabels();
  updateGizmo();
}

let hasAutoFit = false;

function autoFitCamera() {
  const nodes = sceneNodes.length ? sceneNodes : flatNodes;
  if (nodes.length === 0) return;
  // Compute scene extent to choose a good distance, but always orbit around origin
  const box = new THREE.Box3();
  for (const node of nodes) {
    const p = new THREE.Vector3(node.pos[0], node.pos[1], node.pos[2]);
    box.expandByPoint(p);
  }
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 20);
  const dist = maxDim * 0.8;

  controls3d.target.set(0, 0, 0);
  camera3d.position.set(dist * 0.6, dist * 0.4, dist * 0.6);
  controls3d.update();
}

// --- Build 3D scene from scene nodes (independent of tree collapse) ---
function buildScene3D() {
  // Build new meshes and labels FIRST, then swap atomically (no empty-scene frame)
  const visibleNodes = sceneNodes.filter(n => !isNodeHidden(n.id));
  const newMeshes = [];
  const newLabels = [];

  for (const node of visibleNodes) {
    const cat = node.isPrefab ? 'prefab' : node.category;
    const hexColor = CAT_COLORS[cat] || '#909098';
    const color = new THREE.Color(hexColor);
    const sel = node.id === selectedId;

    const group = new THREE.Group();
    group.position.set(node.pos[0], node.pos[1], node.pos[2]);

    const sx = Math.max(Math.abs(node.scale[0]), 0.3);
    const sy = Math.max(Math.abs(node.scale[1]), 0.3);
    const sz = Math.max(Math.abs(node.scale[2]), 0.3);

    const geom = new THREE.BoxGeometry(sx, sy, sz);

    const fillMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: sel ? 0.3 : 0.15, depthWrite: false, side: THREE.DoubleSide,
    });
    const boxMesh = new THREE.Mesh(geom, fillMat);
    group.add(boxMesh);

    const edges = new THREE.EdgesGeometry(geom);
    const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: sel ? 1.0 : 0.65 });
    const wire = new THREE.LineSegments(edges, edgeMat);
    group.add(wire);

    scene3d.add(group);
    newMeshes.push({ group, boxMesh, wire, fillMat, edgeMat, node });

    const label = document.createElement('div');
    label.className = 'scene-label' + (sel ? ' selected' : '');
    label.style.color = hexColor;
    label.textContent = node.name;
    label.dataset.id = node.id;
    label.addEventListener('click', () => {
      selectedId = node.id;
      updateMeshStyles();
      renderTree();
      renderProps();
    });
    labelContainer.appendChild(label);
    newLabels.push({ el: label, node });
  }

  // Now tear down old meshes (new ones are already in the scene)
  for (const m of sceneMeshes) {
    scene3d.remove(m.group);
    m.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  for (const l of labelEls) l.el.remove();

  sceneMeshes = newMeshes;
  labelEls = newLabels;

  if (!hasAutoFit && sceneNodes.length > 0) {
    hasAutoFit = true;
    autoFitCamera();
  }
}

// Fast in-place update of 3D positions/scales without teardown
function updateScene3D() {
  const visibleNodes = sceneNodes.filter(n => !isNodeHidden(n.id));
  // If node count changed, fall back to full rebuild
  if (visibleNodes.length !== sceneMeshes.length) { buildScene3D(); return; }
  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i];
    const m = sceneMeshes[i];
    if (!m || m.node.id !== node.id) { buildScene3D(); return; }
    // Update position
    m.group.position.set(node.pos[0], node.pos[1], node.pos[2]);
    // Update scale if geometry changed
    const sx = Math.max(Math.abs(node.scale[0]), 0.3);
    const sy = Math.max(Math.abs(node.scale[1]), 0.3);
    const sz = Math.max(Math.abs(node.scale[2]), 0.3);
    const oldGeom = m.boxMesh.geometry;
    const oldP = oldGeom.parameters;
    if (Math.abs(oldP.width - sx) > 0.01 || Math.abs(oldP.height - sy) > 0.01 || Math.abs(oldP.depth - sz) > 0.01) {
      const newGeom = new THREE.BoxGeometry(sx, sy, sz);
      const oldEdgeGeom = m.wire.geometry;
      m.boxMesh.geometry = newGeom;
      m.wire.geometry = new THREE.EdgesGeometry(newGeom);
      oldGeom.dispose();
      oldEdgeGeom.dispose();
    }
    m.node = node;
  }
  // Update labels
  for (let i = 0; i < labelEls.length && i < visibleNodes.length; i++) {
    labelEls[i].node = visibleNodes[i];
  }
}

function updateMeshStyles() {
  for (const m of sceneMeshes) {
    const sel = m.node.id === selectedId;
    m.fillMat.opacity = sel ? 0.25 : 0.1;
    m.edgeMat.opacity = sel ? 1.0 : 0.5;
  }
  for (const l of labelEls) {
    l.el.classList.toggle('selected', l.node.id === selectedId);
  }
}

const _labelData = [];
const _placed = [];
function updateLabelPositions() {
  if (!camera3d || !renderer3d) return;
  const w = renderer3d.domElement.clientWidth;
  const h = renderer3d.domElement.clientHeight;

  _labelData.length = 0;
  for (const { el, node } of labelEls) {
    const m = sceneMeshes.find(m => m.node.id === node.id);
    if (!m) { el.style.display = 'none'; continue; }

    tmpVec.copy(m.group.position);
    const sy = Math.max(Math.abs(node.scale[1]), 0.3);
    tmpVec.y += sy / 2;
    tmpVec.project(camera3d);

    if (tmpVec.z > 1) { el.style.display = 'none'; continue; }

    const x = (tmpVec.x * 0.5 + 0.5) * w;
    const y = (-tmpVec.y * 0.5 + 0.5) * h;
    const dist = camera3d.position.distanceTo(m.group.position);
    const maxDist = 150;

    if (dist > maxDist && node.id !== selectedId) { el.style.display = 'none'; continue; }

    _labelData.push({ el, node, x, y, dist, sel: node.id === selectedId });
  }

  _labelData.sort((a, b) => {
    if (a.sel !== b.sel) return a.sel ? -1 : 1;
    return a.dist - b.dist;
  });

  _placed.length = 0;
  const labelH = 14;
  const pad = 4;

  for (const d of _labelData) {
    const labelW = d.node.name.length * 6.5 + 8;
    const candidates = [
      { x: d.x - labelW / 2, y: d.y - labelH - 8 },
      { x: d.x - labelW - 4, y: d.y - labelH - 4 },
      { x: d.x + 4, y: d.y - labelH - 4 },
      { x: d.x - labelW / 2, y: d.y + 4 },
    ];

    let ok = false;
    for (const c of candidates) {
      const overlaps = _placed.some(p =>
        c.x < p.x + p.w + pad && c.x + labelW + pad > p.x &&
        c.y < p.y + p.h + pad && c.y + labelH + pad > p.y
      );
      if (!overlaps || d.sel) {
        d.el.style.display = '';
        d.el.style.left = (c.x + labelW / 2) + 'px';
        d.el.style.top = (c.y + labelH) + 'px';
        _placed.push({ x: c.x, y: c.y, w: labelW, h: labelH });
        ok = true;
        break;
      }
    }

    if (!ok) {
      d.el.style.display = d.sel ? '' : 'none';
      if (d.sel) {
        d.el.style.left = d.x + 'px';
        d.el.style.top = (d.y - labelH - 8) + 'px';
      }
    }
  }
}

// --- Adaptive Graduations ---
let gradLabelEls = [];
let gradGroup = null;
let lastGradSpacing = 0;

const GRAD_AXES = [
  { name: 'X', color: 0xe03020, css: '#e03020', dir: new THREE.Vector3(1,0,0), perp: new THREE.Vector3(0,1,0) },
  { name: 'Y', color: 0xe0b010, css: '#e0b010', dir: new THREE.Vector3(0,1,0), perp: new THREE.Vector3(1,0,0) },
  { name: 'Z', color: 0x1878e0, css: '#1878e0', dir: new THREE.Vector3(0,0,1), perp: new THREE.Vector3(0,1,0) },
];

function niceNum(v) {
  const exp = Math.floor(Math.log10(v));
  const frac = v / Math.pow(10, exp);
  const nice = frac < 1.5 ? 1 : frac < 3.5 ? 2 : frac < 7.5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

function formatCm(v, spacing) {
  if (v === 0) return '0';
  if (spacing >= 100) return (v / 100) + ' m';
  if (spacing < 1) return Math.round(v * 10) + ' mm';
  if (Number.isInteger(v)) return v + ' cm';
  return +v.toFixed(1) + ' cm';
}

function rebuildGraduations() {
  if (!camera3d || !controls3d) return;
  const dist = camera3d.position.distanceTo(controls3d.target);
  const majorSpacing = niceNum(dist * 0.25);

  if (gridMat) gridMat.uniforms.uCamDist.value = dist;

  if (majorSpacing === lastGradSpacing) return;
  lastGradSpacing = majorSpacing;

  if (gradGroup) {
    scene3d.remove(gradGroup);
    gradGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }
  for (const gl of gradLabelEls) gl.el.remove();
  gradLabelEls = [];
  gradGroup = new THREE.Group();

  const minorSpacing = majorSpacing / 5;
  const range = majorSpacing * 10;
  const nTicks = Math.round(range / minorSpacing);
  const majorTickSize = Math.max(majorSpacing * 0.06, 0.5);
  const minorTickSize = majorTickSize * 0.5;

  for (const ax of GRAD_AXES) {
    const lineMat = new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.2 });
    const majorTickMat = new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.5 });
    const minorTickMat = new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.2 });

    gradGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([ax.dir.clone().multiplyScalar(-range), ax.dir.clone().multiplyScalar(range)]),
      lineMat
    ));

    const majorPts = [], minorPts = [];
    for (let i = -nTicks; i <= nTicks; i++) {
      if (i === 0) continue;
      const v = i * minorSpacing;
      const isMajor = (i % 5) === 0;
      const ts = isMajor ? majorTickSize : minorTickSize;
      const center = ax.dir.clone().multiplyScalar(v);
      majorPts.push(
        ...(isMajor ? [center.clone().add(ax.perp.clone().multiplyScalar(ts)), center.clone().sub(ax.perp.clone().multiplyScalar(ts))] : [])
      );
      if (!isMajor) {
        minorPts.push(center.clone().add(ax.perp.clone().multiplyScalar(ts)), center.clone().sub(ax.perp.clone().multiplyScalar(ts)));
      }

      if (isMajor) {
        const label = document.createElement('div');
        label.className = 'grad-label';
        label.style.color = ax.css;
        label.textContent = formatCm(v, majorSpacing);
        labelContainer.appendChild(label);
        const lPos = center.clone().add(ax.perp.clone().multiplyScalar(ts + Math.max(majorSpacing * 0.04, 0.8)));
        gradLabelEls.push({ el: label, pos: lPos });
      }
    }

    if (majorPts.length) gradGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(majorPts), majorTickMat));
    if (minorPts.length) gradGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(minorPts), minorTickMat));

    const endLabel = document.createElement('div');
    endLabel.className = 'grad-label grad-label-unit';
    endLabel.style.color = ax.css;
    endLabel.textContent = ax.name;
    labelContainer.appendChild(endLabel);
    gradLabelEls.push({ el: endLabel, pos: ax.dir.clone().multiplyScalar(range + majorSpacing * 0.5) });
  }

  scene3d.add(gradGroup);
}

function updateGradLabels() {
  if (!camera3d || !renderer3d) return;
  const w = renderer3d.domElement.clientWidth;
  const h = renderer3d.domElement.clientHeight;

  const items = [];
  for (const gl of gradLabelEls) {
    tmpVec.copy(gl.pos);
    tmpVec.project(camera3d);
    if (tmpVec.z > 1) { gl.el.style.display = 'none'; continue; }
    const x = (tmpVec.x * 0.5 + 0.5) * w;
    const y = (-tmpVec.y * 0.5 + 0.5) * h;
    if (x < -30 || x > w + 30 || y < -30 || y > h + 30) { gl.el.style.display = 'none'; continue; }
    const dist = camera3d.position.distanceTo(gl.pos);
    items.push({ gl, x, y, dist });
  }
  items.sort((a, b) => a.dist - b.dist);

  const placed = [];
  const lh = 12, pad = 3;
  for (const it of items) {
    const lw = it.gl.el.textContent.length * 6 + 4;
    const rx = it.x - lw / 2, ry = it.y - lh / 2;
    const overlaps = placed.some(p =>
      rx < p.x + p.w + pad && rx + lw + pad > p.x &&
      ry < p.y + p.h + pad && ry + lh + pad > p.y
    );
    if (overlaps) { it.gl.el.style.display = 'none'; continue; }
    it.gl.el.style.display = '';
    it.gl.el.style.left = it.x + 'px';
    it.gl.el.style.top = it.y + 'px';
    placed.push({ x: rx, y: ry, w: lw, h: lh });
  }
}

// --- Classify a node from its components ---
// Priority order for node classification (highest wins)
const CAT_PRIORITY = { camera:10, light:9, visual:8, text:7, ui:6, tracking:5, vfx:4, audio:3, animation:3, physics:2, interaction:2, ml:2, script:1, utility:0, unknown:-1, empty:-2 };

function classifyComponent(t) {
  if (!t) return 'unknown';
  // Camera
  if (t.includes('Camera')) return 'camera';
  // Light
  if (t.includes('Light') || t === 'LightSource') return 'light';
  // Visual / mesh
  if (t.includes('RenderMeshVisual') || t.includes('Image') || t.includes('BaseMeshVisual') ||
      t.includes('FaceMask') || t.includes('FaceInset') || t.includes('SpriteVisual') ||
      t.includes('Cloth') || t.includes('PostEffect') || t.includes('Liquify') ||
      t.includes('Retouch') || t.includes('EyeColor') || t.includes('Hair') ||
      t.includes('ClearScreen') || t.includes('GaussianSplatting') || t.includes('FaceStretch') ||
      t.includes('Masking') || t.includes('MaterialMesh') || t.includes('RetouchVisual') ||
      t.includes('MeshVisual') || t.includes('SkinMeshVisual'))
    return 'visual';
  // Text
  if (t.includes('Text3D') || t.includes('Text')) return 'text';
  // UI
  if (t.includes('ScreenTransform') || t.includes('ScreenRegion') || t.includes('Canvas') ||
      t.includes('RectangleSetter') || t.includes('PinToFace') || t.includes('ScrollView'))
    return 'ui';
  // Tracking
  if (t.includes('Tracking') || t.includes('DeviceTracking') || t.includes('ObjectTracking') ||
      t.includes('Head') || t.includes('Landmarker') || t.includes('MarkerTracking') ||
      t.includes('LocatedAt') || t.includes('WorldQuery') || t.includes('PlanarTracker') ||
      t.includes('SpatialAnchor'))
    return 'tracking';
  // Audio
  if (t.includes('Audio')) return 'audio';
  // VFX
  if (t.includes('VFX') || t.includes('Particle')) return 'vfx';
  // Animation
  if (t.includes('Animation') || t.includes('AnimationMixer') || t.includes('AnimationPlayer') ||
      t.includes('BlendShapes') || t.includes('Tween'))
    return 'animation';
  // Physics
  if (t.includes('Body') || t.includes('Collider') || t.includes('Constraint') ||
      t.includes('WorldComponent') || t.includes('Physics') || t.includes('Matter'))
    return 'physics';
  // Interaction
  if (t.includes('Interaction') || t.includes('Manipulate') || t.includes('Interactor') ||
      t.includes('TouchComponent') || t.includes('Pinch'))
    return 'interaction';
  // ML
  if (t.includes('ML') || t.includes('SnapML') || t.includes('NeuralNetwork')) return 'ml';
  // Script (checked last — lowest priority among real types)
  if (t.includes('Script') || t.includes('Javascript') || t.includes('TypeScript'))
    return 'script';
  return 'unknown';
}

function classifyNode(node, components) {
  // If the data source already classified this node well, trust it
  let category = node.category || 'empty';
  let hasVisual = node.hasVisual || false;

  if (components.length > 0) {
    // Re-classify from components using priority — highest-priority component wins
    let bestCat = 'empty';
    let bestPri = -2;
    for (const c of components) {
      const t = c.type || c.typeName || '';
      const cat = classifyComponent(t);
      const pri = CAT_PRIORITY[cat] ?? -1;
      if (pri > bestPri) { bestPri = pri; bestCat = cat; }
      if (cat === 'visual') hasVisual = true;
    }
    // Only override if we found something better than what the source gave us
    if (bestPri > (CAT_PRIORITY[category] ?? -2)) {
      category = bestCat;
    }
    // Special case: if the only "real" components are scripts, use script
    if (category === 'empty' || category === 'unknown') {
      if (components.some(c => {
        const t = c.type || c.typeName || '';
        return t.includes('Script');
      })) category = 'script';
    }
  }
  return { category, hasVisual };
}

// --- Flatten tree ---
// respectCollapse=true for tree display, false for 3D scene (shows everything)
function flattenTree(roots, source, respectCollapse) {
  const result = [];
  function walk(node, depth, path) {
    const id = source + ':' + path;
    const hasChildren = node.children && node.children.length > 0;
    const collapsed = collapsedPaths.has(id);

    // Get components: live data first, MCP enrichment if empty
    let components = node.components || [];
    if (components.length === 0 && mcpComponentMap && mcpComponentMap[node.name]) {
      components = mcpComponentMap[node.name].components;
    }

    const { category, hasVisual } = classifyNode(node, components);

    const isPrefab = node.isPrefab || (node.name && node.name.startsWith('[Prefab]'));
    result.push({
      id, name: node.name || '(unnamed)', depth, hasChildren, collapsed,
      enabled: node.enabled !== false, category, source, isPrefab,
      text: node.text || null,
      pos: node.pos || [0,0,0], scale: node.scale || [1,1,1], rot: node.rot || [0,0,0,1],
      localPos: node.localPos || node.pos || [0,0,0],
      localScale: node.localScale || node.scale || [1,1,1],
      localRot: node.localRot || [0,0,0],
      path: node.path || path,
      components, hasVisual,
      color: node.color || null, layer: node.layer || null,
      childCount: node.children ? node.children.length : 0,
    });
    if (hasChildren && (!respectCollapse || !collapsed)) {
      for (let i = 0; i < node.children.length; i++) walk(node.children[i], depth+1, path+'/'+(node.children[i].name||i));
    }
  }
  for (let i = 0; i < roots.length; i++) walk(roots[i], 0, roots[i].name || String(i));
  return result;
}

function rebuildFlat() {
  const tree = liveTree;
  if (!tree) { flatNodes = []; sceneNodes = []; return; }
  const source = dataSource || (liveTree ? 'live' : 'mcp');

  // Full walk for 3D scene (ignores tree collapse state)
  allSceneNodes = flattenTree(tree, source, false);
  sceneNodes = allSceneNodes;

  // Tree walk (respects collapse for display)
  flatNodes = flattenTree(tree, source, true);

  // Apply text search + category filter to both tree and 3D scene
  if (searchFilter || activeCategoryFilter !== 'all') {
    const q = searchFilter.toLowerCase();
    const matchNode = n => {
      const matchSearch = !searchFilter ||
        n.name.toLowerCase().includes(q) || (n.text && n.text.toLowerCase().includes(q)) ||
        n.components.some(c => (c.type||'').toLowerCase().includes(q)) || n.category.includes(q);
      const matchCat = activeCategoryFilter === 'all' || n.category === activeCategoryFilter;
      return matchSearch && matchCat;
    };
    flatNodes = flatNodes.filter(matchNode);
    sceneNodes = sceneNodes.filter(matchNode);
  }

  document.getElementById('tree-count').textContent = flatNodes.length + ' / ' + allSceneNodes.length;
  const statObj = document.getElementById('stat-objects');
  if (statObj) statObj.textContent = allSceneNodes.length;
}

// --- Tree ---
function renderTree() {
  const list = document.getElementById('tree-list');
  const html = flatNodes.map(n => {
    const indent = n.depth * 12;
    const arrowChar = n.hasChildren ? (n.collapsed ? '&#9654;' : '&#9660;') : '';
    const cat = n.isPrefab ? 'prefab' : n.category;
    const iconColor = CAT_COLORS[cat] || CAT_COLORS.empty;
    const nameClass = n.source === 'live' && n.name.startsWith('[') ? 'tree-name tree-name-runtime' : 'tree-name';
    const textPreview = n.text ? \`<span class="tree-text-preview">"\${esc(n.text.substring(0,14))}"</span>\` : '';
    const sel = n.id === selectedId ? ' selected' : '';
    const dis = n.enabled ? '' : ' disabled';
    const directlyHidden = hiddenPaths.has(n.id);
    const inheritedHidden = !directlyHidden && isNodeHidden(n.id);
    const visClass = directlyHidden ? ' hidden-vis' : (inheritedHidden ? ' inherited-hidden-vis' : '');
    const cc = n.components.length > 1 ? \`<span class="tree-comp-count">\${n.components.length}</span>\` : '';
    const eye = \`<span class="tree-vis\${directlyHidden ? ' vis-off' : ''}" data-vis="\${esc(n.id)}">\${directlyHidden ? ICON_EYE_OFF : ICON_EYE}</span>\`;
    return \`<div class="tree-node\${sel}\${dis}\${visClass}" data-id="\${esc(n.id)}" style="padding-left:\${indent+4}px">
      <span class="tree-arrow" data-toggle="\${esc(n.id)}">\${arrowChar}</span>
      <span class="tree-icon" style="color:\${iconColor}">\${ICONS[cat]||ICONS.empty}</span>
      <span class="\${nameClass}">\${esc(n.name)}</span>\${textPreview}\${cc}\${eye}
    </div>\`;
  }).join('');
  list.innerHTML = html || '<p class="prop-hint">No scene data</p>';
  list.onclick = (e) => {
    // Eye toggle (visibility)
    const vis = e.target.closest('[data-vis]');
    if (vis) {
      const id = vis.dataset.vis;
      if (hiddenPaths.has(id)) hiddenPaths.delete(id); else hiddenPaths.add(id);
      renderTree();
      buildScene3D();
      return;
    }
    // Arrow toggle (collapse)
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const id = toggle.dataset.toggle;
      if (collapsedPaths.has(id)) collapsedPaths.delete(id); else collapsedPaths.add(id);
      rebuildFlat(); renderTree();
      // NOTE: collapsing no longer affects 3D scene
      return;
    }
    // Row click (select)
    const row = e.target.closest('.tree-node');
    if (row) { selectedId = row.dataset.id; updateMeshStyles(); renderTree(); renderProps(); }
  };
}

// --- Properties ---
function renderProps() {
  const el = document.getElementById('props-content');
  const node = flatNodes.find(n => n.id === selectedId) || allSceneNodes.find(n => n.id === selectedId);
  if (!node) { el.innerHTML = '<p class="prop-hint">Select a node</p>'; return; }

  // Don't overwrite focused inputs
  if (el.contains(document.activeElement) && document.activeElement.classList.contains('prop-val-input')) return;

  const cat = node.isPrefab ? 'prefab' : node.category;
  const cc = CAT_COLORS[cat] || CAT_COLORS.empty;
  const isEditor = isEmbedded || node.source === 'editor';
  const axC = ['#e03020','#e0b010','#1878e0'];
  const axL = ['X','Y','Z'];

  function vec3Inputs(field, vals) {
    if (!isEditor) return \`<span class="prop-val">\${vals.map(v=>v.toFixed(2)).join(', ')}</span>\`;
    return \`<div class="prop-row-edit">\${vals.map((v,i) =>
      \`<span class="prop-axis-label" style="color:\${axC[i]}">\${axL[i]}</span><input class="prop-val-input" data-field="\${field}" data-axis="\${i}" data-path="\${esc(node.path||'')}" value="\${v.toFixed(2)}">\`
    ).join('')}</div>\`;
  }

  let h = \`<div style="margin-bottom:8px;display:flex;align-items:center;gap:5px">
    <span class="tree-icon" style="color:\${cc}">\${ICONS[cat]||ICONS.empty}</span>
    <span style="font-weight:600;font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(node.name)}</span>
  </div>\`;

  // Transform (editable local transforms for editor source)
  h += \`<div class="prop-section"><div class="prop-section-title">Local Transform</div>
    <div class="prop-row"><span class="prop-key">pos <span style="opacity:.4;font-weight:400">cm</span></span>\${vec3Inputs('pos', node.localPos)}</div>
    <div class="prop-row"><span class="prop-key">scale</span>\${vec3Inputs('scale', node.localScale)}</div>
    <div class="prop-row"><span class="prop-key">rot <span style="opacity:.4;font-weight:400">deg</span></span>\${vec3Inputs('rot', node.localRot)}</div>
  </div>\`;

  // Object info
  h += \`<div class="prop-section"><div class="prop-section-title">Object</div>\`;
  if (isEditor) {
    h += \`<div class="prop-row"><span class="prop-key">enabled</span><span class="prop-val prop-toggle \${node.enabled?'prop-toggle-on':'prop-toggle-off'}" data-toggle-enabled="\${esc(node.path||'')}">\${node.enabled?'yes':'no'}</span></div>\`;
  } else {
    h += \`<div class="prop-row"><span class="prop-key">enabled</span><span class="prop-val">\${node.enabled?'yes':'no'}</span></div>\`;
  }
  h += \`<div class="prop-row"><span class="prop-key">children</span><span class="prop-val">\${node.childCount}</span></div>
    <div class="prop-row"><span class="prop-key">category</span><span class="prop-val" style="color:\${cc}">\${cat}</span></div>\`;
  if (node.layer) h += \`<div class="prop-row"><span class="prop-key">layer</span><span class="prop-val">\${esc(node.layer)}</span></div>\`;
  if (node.text) h += \`<div class="prop-row"><span class="prop-key">text</span><span class="prop-val" title="\${esc(node.text)}">\${esc(node.text)}</span></div>\`;
  if (node.color) { const [r,g,b,a]=node.color; h += \`<div class="prop-row"><span class="prop-key">color</span><span class="prop-val"><span class="prop-val-color" style="background:rgba(\${r},\${g},\${b},\${(a||255)/255})"></span>\${r},\${g},\${b}</span></div>\`; }
  h += \`</div>\`;

  // Components with richer detail
  if (node.components.length > 0) {
    h += \`<div class="prop-section"><div class="prop-section-title">Components (\${node.components.length})</div>\`;
    for (const c of node.components) {
      const compCat = c.category || 'unknown';
      const compC = CAT_COLORS[compCat] || CAT_COLORS.empty;
      let detail = c.text ? \`"\${esc(c.text.substring(0,14))}"\` : c.scriptName || c.meshName || c.materialName || c.cameraType || c.trackName || c.clipName || '';
      h += \`<div class="comp-item"><span class="comp-dot \${c.enabled!==false?'comp-on':'comp-off'}"></span><span class="comp-type" style="color:\${compC}">\${esc(c.type||'Unknown')}</span>\${detail?\`<span class="comp-detail">\${detail}</span>\`:''}</div>\`;
      // Show extra properties
      let extras = [];
      if (c.fov !== undefined) extras.push(\`fov: \${c.fov}\`);
      if (c.near !== undefined) extras.push(\`near: \${c.near}\`);
      if (c.far !== undefined) extras.push(\`far: \${c.far}\`);
      if (c.intensity !== undefined) extras.push(\`intensity: \${c.intensity}\`);
      if (c.volume !== undefined) extras.push(\`vol: \${c.volume}\`);
      if (c.mass !== undefined) extras.push(\`mass: \${c.mass}\`);
      if (c.renderOrder !== undefined) extras.push(\`order: \${c.renderOrder}\`);
      if (c.playbackSpeed !== undefined) extras.push(\`speed: \${c.playbackSpeed}\`);
      if (c.blendMode !== undefined) extras.push(\`blend: \${c.blendMode}\`);
      if (c.textSize !== undefined) extras.push(\`size: \${c.textSize}\`);
      if (extras.length) h += \`<div style="padding:0 0 2px 14px;font-family:var(--mono);font-size:9px;color:var(--text-muted)">\${extras.join(' · ')}</div>\`;
    }
    h += \`</div>\`;
  }
  el.innerHTML = h;
}

// --- Bidirectional editing: send changes back to plugin ---
document.getElementById('props-content').addEventListener('change', (e) => {
  if (!e.target.classList.contains('prop-val-input')) return;
  markEditing();
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const field = e.target.dataset.field;
  const axis = parseInt(e.target.dataset.axis);
  const path = e.target.dataset.path;
  const val = parseFloat(e.target.value);
  if (isNaN(val) || !path) return;

  const node = flatNodes.find(n => n.id === selectedId) || allSceneNodes.find(n => n.id === selectedId);
  if (!node) return;

  const msg = { event: 'set_transform', namePath: path };
  if (field === 'pos') { const v = [...node.localPos]; v[axis] = val; msg.pos = v; }
  else if (field === 'scale') { const v = [...node.localScale]; v[axis] = val; msg.scale = v; }
  else if (field === 'rot') { const v = [...node.localRot]; v[axis] = val; msg.rot = v; }
  ws.send(JSON.stringify(msg));
});

document.getElementById('props-content').addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-toggle-enabled]');
  if (!toggle || !ws || ws.readyState !== WebSocket.OPEN) return;
  const node = flatNodes.find(n => n.id === selectedId) || allSceneNodes.find(n => n.id === selectedId);
  if (!node) return;
  ws.send(JSON.stringify({ event: 'set_enabled', namePath: toggle.dataset.toggleEnabled, enabled: !node.enabled }));
});

// --- Snapshot diff: skip DOM rebuild when tree structure hasn't changed ---
let _lastNodeIds = '';

// --- Edit suppression: skip heavy rebuilds while user is actively editing ---
let _editingSince = 0;
let _editingTimer = null;
function markEditing() {
  _editingSince = Date.now();
  if (_editingTimer) clearTimeout(_editingTimer);
  _editingTimer = setTimeout(() => { _editingSince = 0; }, 800);
}
function isActivelyEditing() {
  if (_editingSince && Date.now() - _editingSince < 800) return true;
  const ae = document.activeElement;
  return ae && ae.classList.contains('prop-val-input');
}

// --- Drag-to-scrub on axis labels ---
{
  let scrubState = null;
  let scrubSendTimer = null;
  function sendScrubValue(input) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const field = input.dataset.field;
    const axis = parseInt(input.dataset.axis);
    const path = input.dataset.path;
    const val = parseFloat(input.value);
    if (isNaN(val) || !path) return;
    const node = flatNodes.find(n => n.id === selectedId) || allSceneNodes.find(n => n.id === selectedId);
    if (!node) return;
    const msg = { event: 'set_transform', namePath: path };
    if (field === 'pos') { const v = [...node.localPos]; v[axis] = val; msg.pos = v; }
    else if (field === 'scale') { const v = [...node.localScale]; v[axis] = val; msg.scale = v; }
    else if (field === 'rot') { const v = [...node.localRot]; v[axis] = val; msg.rot = v; }
    ws.send(JSON.stringify(msg));
  }

  document.getElementById('props-content').addEventListener('pointerdown', (e) => {
    const label = e.target.closest('.prop-axis-label');
    if (!label) return;
    const input = label.nextElementSibling;
    if (!input || !input.classList.contains('prop-val-input')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startVal = parseFloat(input.value) || 0;
    const field = input.dataset.field;
    const sensitivity = field === 'scale' ? 0.005 : 0.01;
    scrubState = { input, startX, startVal, sensitivity, field, axis: parseInt(input.dataset.axis) };
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    markEditing();
  });

  document.addEventListener('pointermove', (e) => {
    if (!scrubState) return;
    markEditing();
    const dx = e.clientX - scrubState.startX;
    const newVal = scrubState.startVal + dx * scrubState.sensitivity;
    scrubState.input.value = newVal.toFixed(2);
    // Throttle WS sends to ~30fps during scrub
    if (!scrubSendTimer) {
      scrubSendTimer = setTimeout(() => { scrubSendTimer = null; }, 33);
      sendScrubValue(scrubState.input);
    }
  });

  document.addEventListener('pointerup', () => {
    if (!scrubState) return;
    // Send final value
    sendScrubValue(scrubState.input);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    scrubState = null;
    scrubSendTimer = null;
  });
}

// --- Server URL ---
function getServerHost() {
  return localStorage.getItem('scene-inspector-host') || location.host || 'localhost:8200';
}
function applyServerUrl() {
  const input = document.getElementById('welcome-url');
  let host = input.value.trim().replace(/^https?:\\/\\//, '').replace(/\\/+\$/, '');
  if (!host) host = 'localhost:8200';
  localStorage.setItem('scene-inspector-host', host);
  applyMcpConfig();
  input.value = host;
  document.getElementById('ws-url').value = 'ws://' + host;
  document.getElementById('mcp-base').value = 'http://' + host;
  liveTree = null; mcpComponentMap = null; hasFetchedMCP = false;
  dataSource = null;
  connectWS();
}
// --- MCP enrichment ---
let mcpComponentMap = null;
let hasFetchedMCP = false;
let parsedMcpConfig = null;

// Set initial values from storage
if (!isEmbedded) {
  const h = getServerHost();
  document.getElementById('ws-url').value = 'ws://' + h;
  document.getElementById('mcp-base').value = 'http://' + h;
  const welcomeInput = document.getElementById('welcome-url');
  if (welcomeInput) welcomeInput.value = h;
  const savedConfig = localStorage.getItem('scene-inspector-mcp-config');
  const configArea = document.getElementById('mcp-config');
  if (savedConfig && configArea) {
    configArea.value = savedConfig;
    applyMcpConfig();
  }
}

function parseMcpConfig(raw) {
  try {
    const obj = JSON.parse(raw);
    const servers = obj.servers || obj;
    const key = Object.keys(servers)[0];
    if (!key) return null;
    const srv = servers[key];
    if (!srv.url) return null;
    return { url: srv.url, headers: srv.headers || {}, name: key };
  } catch (e) {
    return null;
  }
}

function applyMcpConfig() {
  const textarea = document.getElementById('mcp-config');
  const status = document.getElementById('mcp-config-status');
  const raw = textarea.value.trim();
  if (!raw) { parsedMcpConfig = null; status.style.color = 'var(--text-muted)'; status.textContent = 'Copy from Lens Studio: AI Assistant > MCP config.'; return; }
  const parsed = parseMcpConfig(raw);
  if (parsed) {
    parsedMcpConfig = parsed;
    localStorage.setItem('scene-inspector-mcp-config', raw);
    status.style.color = '#0070ff';
    status.textContent = 'MCP configured: ' + parsed.url;
    if (liveTree && hasFetchedMCP) { hasFetchedMCP = false; fetchMCPComponents(); }
  } else {
    parsedMcpConfig = null;
    status.style.color = '#c03020';
    status.textContent = 'Invalid config. Paste the full JSON from Lens Studio.';
  }
}

async function fetchMCPComponents() {
  if (hasFetchedMCP) return;
  hasFetchedMCP = true;

  let fetchUrl, fetchHeaders;
  if (parsedMcpConfig) {
    const base = document.getElementById('mcp-base').value;
    const params = new URLSearchParams();
    params.set('url', parsedMcpConfig.url);
    const authHeader = parsedMcpConfig.headers['Authorization'] || parsedMcpConfig.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\\s+/i, '');
    if (token) params.set('token', token);
    fetchUrl = base + '/mcp?' + params.toString();
    fetchHeaders = { 'Content-Type': 'application/json' };
  } else {
    const base = document.getElementById('mcp-base').value;
    fetchUrl = base + '/mcp';
    fetchHeaders = { 'Content-Type': 'application/json' };
  }

  try {
    const resp = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'GetLensStudioSceneGraph', arguments: {} }
      })
    });
    const data = await resp.json();
    const sceneText = data.result?.content?.[0]?.text;
    if (!sceneText) { console.log('[inspector] MCP returned no scene data'); return; }
    const scene = JSON.parse(sceneText);
    const roots = scene.sceneTree?.children || scene.children || [];

    // Extract project name from scene data
    const projName = scene.projectName || scene.name || (parsedMcpConfig ? parsedMcpConfig.name : '');
    if (projName) {
      document.getElementById('project-name').textContent = projName;
    }

    mcpComponentMap = {};
    function walkMcp(obj, path) {
      const name = obj.name || '';
      const key = path + '/' + name;
      const components = (obj.components || []).map(c => ({
        type: c.name || c.type || 'Unknown',
        enabled: c.enabled !== false,
        category: null,
        scriptName: c.properties?.scriptAsset?.name || null,
        meshName: c.properties?.mesh?.name || null,
        materialName: c.properties?.mainMaterial?.name || null,
        text: c.properties?.text || null,
      }));
      if (components.length > 0) {
        mcpComponentMap[name] = { components, path: key };
      }
      for (const child of (obj.children || [])) walkMcp(child, key);
    }
    for (const r of roots) walkMcp(r, '');
    console.log('[inspector] MCP enrichment: got components for', Object.keys(mcpComponentMap).length, 'objects');
    if (liveTree) { rebuildFlat(); renderTree(); buildScene3D(); if (selectedId) renderProps(); }
  } catch (e) {
    console.log('[inspector] MCP enrichment failed:', e.message);
  }
}

// --- WebSocket ---
function updateSourceUI() {
  const dot = document.getElementById('ws-dot');
  const text = document.getElementById('status-text');
  const badge = document.getElementById('source-badge');
  if (dataSource === 'example') {
    dot.className = 'status-dot dot-example';
    text.textContent = 'connected';
    badge.className = 'badge-example';
    badge.textContent = 'Example scene';
  } else if (dataSource === 'editor') {
    dot.className = 'status-dot dot-live';
    text.textContent = 'editor';
    badge.className = 'badge-editor';
    badge.textContent = 'Editor';
  } else if (dataSource === 'live') {
    dot.className = 'status-dot dot-live';
    text.textContent = 'live';
    badge.className = 'badge-live';
    badge.textContent = 'Lens Studio';
  } else {
    dot.className = 'status-dot dot-off';
    text.textContent = 'connecting...';
    badge.className = 'badge-off';
  }
}

// --- Built-in demo mode (works without server, e.g. static hosting) ---
let demoInterval = null;
let demoRunning = false;
{
  let _demoFrame = 0, _demoSpawned = [], _demoSpawnCount = 0;
  const _spawnInterval = 5, _maxBlocks = 10;

  function _dObj(name, opts = {}) {
    return { name, enabled: opts.enabled !== false, category: opts.category || 'empty',
      pos: opts.pos || [0,0,0], scale: opts.scale || [1,1,1], rot: opts.rot || [0,0,0,1],
      components: opts.components || [], text: opts.text || null, hasVisual: opts.hasVisual || false,
      color: opts.color || null, layer: opts.layer || null, children: opts.children || [] };
  }
  function _dComp(type, extra = {}) { return { type, enabled: true, category: null, ...extra }; }

  function _buildDemoScene() {
    const t = _demoFrame * 0.5;
    if (_demoFrame > 0 && _demoFrame % _spawnInterval === 0 && _demoSpawned.length < _maxBlocks) {
      _demoSpawnCount++;
      _demoSpawned.push({ name: \`Block_\${_demoSpawnCount}\`, x: (Math.random()-0.5)*30, z: 50+(Math.random()-0.5)*20,
        yTarget: -7+Math.random()*16, yStart: 20+Math.random()*10, born: t, w: 2+Math.random()*4, h: 1+Math.random()*6 });
    }
    while (_demoSpawned.length > _maxBlocks) _demoSpawned.shift();

    const spawnedNodes = _demoSpawned.map((b, i) => {
      const age = t - b.born, settle = Math.min(age*2, 1);
      const y = b.yStart + (b.yTarget - b.yStart) * settle;
      const rotY = (i === _demoSpawned.length-1) ? (t*15 % 360) : 0;
      return _dObj(b.name, { category: 'visual', pos: [+b.x.toFixed(2), +y.toFixed(2), +b.z.toFixed(2)],
        scale: [+b.w.toFixed(2), +b.h.toFixed(2), +b.w.toFixed(2)],
        rot: [0, +((rotY*Math.PI/180)*0.01).toFixed(3), 0, 1],
        components: [_dComp('RenderMeshVisual',{meshName:'Box'}), _dComp('BodyComponent',{dynamic:true,mass:1.0}), _dComp('ColliderComponent')],
        hasVisual: true });
    });

    const roots = [
      _dObj('Camera', { category:'camera', pos:[0,8,-20], rot:[-0.15,0,0,1], components:[
        _dComp('Camera',{cameraType:'perspective',fov:60,near:0.1,far:1000,renderOrder:0}),
        _dComp('ScriptComponent',{scriptName:'SceneInspector'}), _dComp('DeviceTracking')] }),
      _dObj('Ortho Camera', { category:'camera', components:[_dComp('Camera',{cameraType:'orthographic',orthoSize:20,renderOrder:1})],
        children:[_dObj('Screen Region',{category:'ui',components:[_dComp('ScreenTransform'),_dComp('ScreenRegionComponent')],
          children:[_dObj('Canvas',{category:'ui',components:[_dComp('Canvas')],
            children:[_dObj('Title',{category:'text',text:'Scene Inspector Demo',components:[_dComp('Text',{text:'Scene Inspector Demo',textSize:32}),_dComp('ScreenTransform')]}),
              _dObj('Score',{category:'text',text:'0',components:[_dComp('Text',{text:'0',textSize:24}),_dComp('ScreenTransform')]})]})]})]}),
      _dObj('Scene', { components:[_dComp('ScriptComponent',{scriptName:'RuntimeSpawner'})], children:[
        _dObj('Lights',{children:[
          _dObj('Sun',{category:'light',pos:[10,20,-5],rot:[-0.3,0.2,0,1],components:[_dComp('DirectionalLight')]}),
          _dObj('Fill',{category:'light',pos:[-8,5,10],components:[_dComp('PointLight')]}),
          _dObj('Ambient',{category:'light',components:[_dComp('AmbientLight')]})]}),
        _dObj('Ground',{category:'visual',pos:[0,-8,50],scale:[40,1,40],
          components:[_dComp('RenderMeshVisual',{meshName:'Plane',materialName:'PBR Ground'}),_dComp('ColliderComponent')],hasVisual:true,color:[60,65,70,255]}),
        _dObj('Architecture',{children:[
          _dObj('Tower',{pos:[-8,-7,50],children:[
            _dObj('Base Block',{category:'visual',pos:[0,0,0],scale:[8,6,8],components:[_dComp('RenderMeshVisual',{meshName:'Box'}),_dComp('ColliderComponent')],hasVisual:true}),
            _dObj('Mid Block',{category:'visual',pos:[1,6,0],scale:[6,5,6],components:[_dComp('RenderMeshVisual',{meshName:'Box'})],hasVisual:true}),
            _dObj('Top Block',{category:'visual',pos:[-1,11,1],scale:[4,4,4],components:[_dComp('RenderMeshVisual',{meshName:'Box'})],hasVisual:true})]}),
          _dObj('Bridge',{pos:[8,-7,50],children:[
            _dObj('Pillar L',{category:'visual',pos:[-4,0,0],scale:[2,8,2],components:[_dComp('RenderMeshVisual',{meshName:'Box'}),_dComp('ColliderComponent')],hasVisual:true}),
            _dObj('Pillar R',{category:'visual',pos:[4,0,0],scale:[2,8,2],components:[_dComp('RenderMeshVisual',{meshName:'Box'}),_dComp('ColliderComponent')],hasVisual:true}),
            _dObj('Beam',{category:'visual',pos:[0,8,0],scale:[10,1.5,3],components:[_dComp('RenderMeshVisual',{meshName:'Box'})],hasVisual:true})]})]}),
        _dObj('Interactables',{children:[
          _dObj('Grab Cube',{category:'interaction',pos:[0,0,45],scale:[3,3,3],hasVisual:true,color:[74,144,184,255],
            components:[_dComp('RenderMeshVisual',{meshName:'Box'}),_dComp('InteractionComponent'),_dComp('ManipulateComponent'),_dComp('BodyComponent',{dynamic:true,mass:0.5}),_dComp('ColliderComponent')]}),
          _dObj('Tap Sphere',{category:'interaction',pos:[6,2,48],scale:[2,2,2],hasVisual:true,color:[97,175,239,255],
            components:[_dComp('RenderMeshVisual',{meshName:'Sphere'}),_dComp('InteractionComponent'),_dComp('AnimationMixer')]})]}),
        _dObj('Audio Sources',{children:[
          _dObj('Background Music',{category:'audio',components:[_dComp('AudioComponent',{trackName:'ambient_loop.wav',volume:0.3})]}),
          _dObj('SFX Emitter',{category:'audio',pos:[0,0,50],components:[_dComp('AudioComponent',{trackName:'click.wav',volume:1.0}),_dComp('AudioListenerComponent')]})]}),
        _dObj('Particle Emitter',{category:'vfx',pos:[-1,14,51],components:[_dComp('VFXComponent')]}),
        _dObj('Hand Tracker',{category:'tracking',components:[_dComp('ObjectTracking3D')],
          children:[_dObj('Hand Visual',{category:'visual',components:[_dComp('RenderMeshVisual',{meshName:'HandMesh'})],hasVisual:true})]})]}),
      _dObj('[Spawned]', { children: spawnedNodes })
    ];
    function count(nodes) { let c = 0; for (const n of nodes) c += 1 + count(n.children || []); return c; }
    return { event: 'scene_snapshot', source: 'example', ts: Date.now(), roots, totalObjects: count(roots) };
  }

  window.startDemo = function() {
    if (demoRunning) return;
    demoRunning = true;
    if (ws) { ws.close(); ws = null; }
    demoInterval = setInterval(() => {
      const scene = _buildDemoScene();
      _demoFrame++;
      const wasEmpty = !liveTree;
      const oldCount = allSceneNodes.length;
      dataSource = 'example';
      liveTree = scene.roots;
      rebuildFlat(); renderTree(); buildScene3D();
      if (wasEmpty || Math.abs(allSceneNodes.length - oldCount) > oldCount * 0.5) {
        hasAutoFit = false; autoFitCamera(); hasAutoFit = true; lastGradSpacing = 0;
      }
      if (selectedId) renderProps();
      updateSourceUI();
      if (wasEmpty) hideWelcome();
      dismissLoading();
    }, 500);
  };
}

let wsEverConnected = false;
function connectWS() {
  if (demoRunning) return;
  const url = isEmbedded && embeddedWsPort
    ? 'ws://127.0.0.1:' + embeddedWsPort
    : document.getElementById('ws-url').value.trim();
  if (ws) { ws.close(); ws = null; }
  try { ws = new WebSocket(url); } catch (e) {
    console.log('[inspector] WebSocket blocked:', e.message);
    ws = null;
    if (!isEmbedded && !liveTree) window.startDemo();
    return;
  }
  ws.onopen = () => {
    wsEverConnected = true; updateSourceUI();
    // If no scene data arrives within 5s, the server has no Lens Studio connected.
    // Don't auto-start demo (user can click the button), but don't block either.
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === 'reload' && !isEmbedded) { location.reload(); return; }
      if (msg.event === 'scene_snapshot' && msg.roots) {
        // Live data from server stops demo mode
        if (demoRunning) { clearInterval(demoInterval); demoRunning = false; }
        const wasEmpty = !liveTree;
        const oldCount = allSceneNodes.length;
        const newSource = msg.source === 'editor' ? 'editor' : msg.source === 'example' ? 'example' : 'live';

        if (dataSource === 'example' && newSource !== 'example') {
          selectedId = null;
        }
        dataSource = newSource;
        liveTree = msg.roots;
        const oldIds = _lastNodeIds;
        rebuildFlat();
        // Build a quick fingerprint to detect structural changes (add/remove/reorder)
        const newIds = sceneNodes.map(n => n.id).join('|');
        const structureChanged = newIds !== oldIds;
        _lastNodeIds = newIds;
        if (isActivelyEditing()) {
          // Skip all rendering during drag — the input already shows the new value
          // and the 3D view will sync on the next snapshot after editing stops
        } else {
          // Only rebuild DOM tree if structure actually changed
          if (structureChanged) renderTree();
          updateScene3D();
          if (wasEmpty || Math.abs(allSceneNodes.length - oldCount) > oldCount * 0.5) {
            hasAutoFit = false;
            autoFitCamera();
            hasAutoFit = true;
            lastGradSpacing = 0;
          }
          if (selectedId) renderProps();
        }
        updateSourceUI();
        if (wasEmpty) hideWelcome();
        dismissLoading();
        if (newSource === 'live' && !hasFetchedMCP && !isEmbedded) fetchMCPComponents();
      }
    } catch (err) { console.warn('[inspector] WS message error:', err); }
  };
  ws.onerror = (e) => { console.warn('[inspector] WS error:', e.message || e); };
  ws.onclose = () => {
    if (demoRunning) return;
    // No server ever reached and not served by our server: auto-start demo
    if (!isEmbedded && !wsEverConnected && !liveTree) { window.startDemo(); return; }
    dataSource = null;
    updateSourceUI();
    ws = null; setTimeout(connectWS, isEmbedded ? 1000 : 2000);
  };
}

// --- Search ---
document.getElementById('tree-search').addEventListener('input', (e) => {
  searchFilter = e.target.value.trim(); rebuildFlat(); renderTree(); buildScene3D();
});

// --- Category filter chips ---
document.getElementById('tree-filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  activeCategoryFilter = chip.dataset.cat;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === activeCategoryFilter));
  rebuildFlat(); renderTree(); buildScene3D();
});

// --- Utils ---
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function dismissLoading() {
  const ls = document.getElementById('loading-screen');
  if (ls && !ls.classList.contains('hidden')) {
    ls.classList.add('hidden');
    setTimeout(() => { ls.style.display = 'none'; }, 300);
  }
}
function hideWelcome() {
  dismissLoading();
  const w = document.getElementById('welcome');
  if (dataSource === 'example') {
    document.getElementById('welcome-status').style.display = 'none';
    document.getElementById('welcome-example').style.display = 'flex';
  }
  w.classList.add('hidden');
  sessionStorage.setItem('scene-inspector-active', '1');
}
// --- Welcome screen (only for non-embedded mode) ---
if (!isEmbedded) {
  const serverBtn = document.getElementById('server-connect-btn');
  if (serverBtn) serverBtn.addEventListener('click', applyServerUrl);
  const welcomeUrl = document.getElementById('welcome-url');
  if (welcomeUrl) welcomeUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyServerUrl(); });
  const mcpConfig = document.getElementById('mcp-config');
  if (mcpConfig) mcpConfig.addEventListener('input', applyMcpConfig);
  const demoBtn = document.getElementById('demo-btn');
  if (demoBtn) demoBtn.addEventListener('click', () => window.startDemo());
  const welcomeEl = document.getElementById('welcome');
  if (welcomeEl) welcomeEl.addEventListener('click', (e) => { if (e.target === welcomeEl && dataSource) hideWelcome(); });
}

// --- Resizable panes ---
function initResizeH(handleId, belowId, minBelow) {
  // Horizontal handle: drag to resize height of the element BELOW the handle
  const handle = document.getElementById(handleId);
  if (!handle) return;
  const below = document.getElementById(belowId);
  if (!below) return;
  let startY, startH;
  function onDown(e) {
    e.preventDefault();
    startY = e.clientY;
    startH = below.offsetHeight;
    handle.classList.add('active');
    document.body.classList.add('resizing-h');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  function onMove(e) {
    const dy = startY - e.clientY; // dragging up = bigger bottom
    const mainH = document.getElementById('main').offsetHeight;
    const newH = Math.max(minBelow, Math.min(mainH - 120, startH + dy));
    below.style.flex = 'none';
    below.style.height = newH + 'px';
    if (typeof onResize === 'function') onResize();
  }
  function onUp() {
    handle.classList.remove('active');
    document.body.classList.remove('resizing-h');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  handle.addEventListener('mousedown', onDown);
}
function initResizeV(handleId, leftId, minLeft) {
  // Vertical handle: drag to resize width of element to the LEFT
  const handle = document.getElementById(handleId);
  if (!handle) return;
  const left = document.getElementById(leftId);
  if (!left) return;
  let startX, startW;
  function onDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startW = left.offsetWidth;
    handle.classList.add('active');
    document.body.classList.add('resizing-v');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  function onMove(e) {
    const dx = e.clientX - startX;
    const rowW = document.getElementById('top-row').offsetWidth;
    const newW = Math.max(minLeft, Math.min(rowW - 100, startW + dx));
    left.style.flex = 'none';
    left.style.width = newW + 'px';
  }
  function onUp() {
    handle.classList.remove('active');
    document.body.classList.remove('resizing-v');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  handle.addEventListener('mousedown', onDown);
}
function initResize() {
  initResizeV('resize-v1', 'tree-panel', 80);
  initResizeH('resize-h1', 'viewport-wrapper', 60);
}

// --- WASD fly controls (uses e.code for keyboard-layout independence) ---
const keysDown = new Set();
const flySpeed = { base: 0.5, shift: 2.5 };
const FLY_CODES = new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight']);

function initFlyControls() {
  const canvas = document.getElementById('scene-canvas');
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  canvas.addEventListener('mousedown', () => canvas.focus());

  canvas.addEventListener('keydown', (e) => {
    if (FLY_CODES.has(e.code)) {
      keysDown.add(e.code);
      e.preventDefault();
    }
  });
  canvas.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
  });
  canvas.addEventListener('blur', () => keysDown.clear());
}

function updateFlyMovement() {
  if (keysDown.size === 0) return;
  const speed = (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')) ? flySpeed.shift : flySpeed.base;
  const dist = camera3d.position.distanceTo(controls3d.target);
  const step = speed * dist * 0.01;

  camera3d.getWorldDirection(_flyForward);
  _flyRight.crossVectors(_flyForward, camera3d.up).normalize();
  _flyUp.set(0, 1, 0);
  _flyMove.set(0, 0, 0);
  if (keysDown.has('KeyW')) _flyMove.addScaledVector(_flyForward, step);
  if (keysDown.has('KeyS')) _flyMove.addScaledVector(_flyForward, -step);
  if (keysDown.has('KeyD')) _flyMove.addScaledVector(_flyRight, step);
  if (keysDown.has('KeyA')) _flyMove.addScaledVector(_flyRight, -step);
  if (keysDown.has('KeyE')) _flyMove.addScaledVector(_flyUp, step);
  if (keysDown.has('KeyQ')) _flyMove.addScaledVector(_flyUp, -step);

  camera3d.position.add(_flyMove);
  controls3d.target.add(_flyMove);
}

// --- Theme system ---
const THEMES = {
  default: {
    css: {},
    catColors: {
      camera: '#ff9500', visual: '#0090ff', text: '#0080ff', script: '#ff2d20',
      audio: '#ff6b00', light: '#ffc800', physics: '#ff1a1a', vfx: '#00a0ff',
      interaction: '#ff5500', tracking: '#99a', animation: '#ff8800', ui: '#0070ff',
      ml: '#5060ff', utility: '#88889a', empty: '#99a', prefab: '#00aaff', unknown: '#99a',
    },
    bgGradient: ['#ffffff', '#f0f2f8', '#d8dce8'],
    gridColor: [0.55, 0.57, 0.63],
    axisColors: [0xe03020, 0xe0b010, 0x1878e0],
    gizmoColors: ['#e03020', '#e0b010', '#1878e0'],
    gradAxes: [
      { color: 0xe03020, css: '#e03020' },
      { color: 0xe0b010, css: '#e0b010' },
      { color: 0x1878e0, css: '#1878e0' },
    ],
  },
  tron: {
    css: {
      '--bg': '#0a0000', '--panel': '#120000', '--surface': '#1a0500',
      '--border': '#3a0800', '--border-bright': '#5a1000',
      '--text': '#ff2010', '--text-dim': '#cc2818', '--text-muted': '#881808',
      '--white': '#ff2010',
      '--c-camera': '#ff4400', '--c-visual': '#ff2010', '--c-text': '#ff3018',
      '--c-script': '#ff1a0a', '--c-audio': '#cc3010', '--c-light': '#ff5510',
      '--c-physics': '#ff0800', '--c-vfx': '#ff3820', '--c-interaction': '#ff4a10',
      '--c-tracking': '#882010', '--c-animation': '#ff5500', '--c-ui': '#ff2818',
      '--c-ml': '#cc2010', '--c-empty': '#882010', '--c-prefab': '#ff3010',
      '--c-runtime': '#ff2010', '--c-selected': '#ff2010',
      '--c-enabled': '#ff2010', '--c-disabled': '#881808',
      '--label-shadow': '0 0 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5)',
      '--stats-bg': 'rgba(10,0,0,0.85)',
      '--selected-bg': '#2a0800', '--viewport-bg': '#0a0000',
      '--badge-example-bg': '#1a0500', '--badge-example-color': '#cc3010', '--badge-example-border': '#3a0800',
      '--badge-live-bg': '#1a0500', '--badge-live-color': '#ff2010', '--badge-live-border': '#3a0800',
    },
    catColors: {
      camera: '#ff4400', visual: '#ff2010', text: '#ff3018', script: '#ff1a0a',
      audio: '#cc3010', light: '#ff5510', physics: '#ff0800', vfx: '#ff3820',
      interaction: '#ff4a10', tracking: '#882010', animation: '#ff5500', ui: '#ff2818',
      ml: '#cc2010', utility: '#882010', empty: '#882010', prefab: '#ff3010', unknown: '#882010',
    },
    bgGradient: ['#000000', '#000000', '#000000'],
    gridColor: [0.35, 0.08, 0.02],
    axisColors: [0xff2010, 0xff4400, 0xcc2818],
    gizmoColors: ['#ff2010', '#ff4400', '#cc2818'],
    gradAxes: [
      { color: 0xff2010, css: '#ff2010' },
      { color: 0xff4400, css: '#ff4400' },
      { color: 0xcc2818, css: '#cc2818' },
    ],
  },
};

let currentTheme = 'default';

function updateThemeButton() {
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === currentTheme));
}

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return;
  currentTheme = name;
  localStorage.setItem('scene-inspector-theme', name);

  // CSS vars
  const root = document.documentElement;
  if (name === 'default') {
    const allKeys = new Set();
    Object.values(THEMES).forEach(t => Object.keys(t.css).forEach(k => allKeys.add(k)));
    allKeys.forEach(k => root.style.removeProperty(k));
  } else {
    Object.entries(theme.css).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // Update CAT_COLORS JS object
  Object.assign(CAT_COLORS, theme.catColors);

  // Grid color
  if (gridMat) gridMat.uniforms.uGridColor.value.set(...theme.gridColor);

  // Axis line colors
  axisLines.forEach((line, i) => line.material.color.setHex(theme.axisColors[i]));

  // Gizmo colors
  gizmoDirs.forEach((d, i) => { d.color = theme.gizmoColors[i]; });
  gizmoLabels.forEach((gl, i) => {
    const color = theme.gizmoColors[Math.floor(i / 2)];
    gl.color = color;
    gl.el.style.color = color;
  });

  // Graduation axis colors
  GRAD_AXES.forEach((ax, i) => {
    ax.color = theme.gradAxes[i].color;
    ax.css = theme.gradAxes[i].css;
  });

  // 3D background
  rebuildSceneBg(theme.bgGradient);

  // Force graduation rebuild
  lastGradSpacing = 0;

  // Rebuild scene with new colors
  if (sceneNodes.length > 0) {
    buildScene3D();
    renderTree();
  }
  renderProps();

  // Tron FX
  if (name === 'tron') startTronFX(); else stopTronFX();

  updateThemeButton();
}

function startTronFX() { document.body.classList.add('tron'); tronPlayerShow(); }
function stopTronFX() { document.body.classList.remove('tron'); tronPlayerHide(); }

// --- Tron Music Player (YouTube embed + postMessage) ---
const TRON_PLAYLIST = 'PLGaDDrFa8nmD8PzaEv_CTlSdwW_yTPNGJ';
const TRON_FIRST_VIDEO = 'f9D8gHY2OPE';
let tronPlaying = false;
let tronShuffle = true;
let tronIframe = null;
let tronReady = false;
let tronProgressRAF = null;
let tronDuration = 0;
let tronCurrentTime = 0;
let tronVolume = parseInt(localStorage.getItem('tron-player-vol') || '30', 10);
let tronErrorCount = 0;

function ytCmd(func, args) {
  if (!tronIframe || !tronIframe.contentWindow) return;
  tronIframe.contentWindow.postMessage(JSON.stringify({
    event: 'command', func, args: args || []
  }), '*');
}

let tronListeningInterval = null;

function createTronIframe() {
  if (tronIframe) return;
  const wrap = document.getElementById('tp-iframe-wrap');
  const iframe = document.createElement('iframe');
  iframe.id = 'tp-yt-target';
  iframe.width = '1'; iframe.height = '1';
  iframe.allow = 'autoplay; encrypted-media';
  iframe.src = 'https://www.youtube.com/embed/videoseries'
    + '?list=' + TRON_PLAYLIST
    + '&enablejsapi=1&autoplay=0&controls=0&disablekb=1'
    + '&fs=0&modestbranding=1&rel=0&iv_load_policy=3'
    + '&origin=' + encodeURIComponent(window.location.origin);
  wrap.appendChild(iframe);
  tronIframe = iframe;

  // YouTube embed needs a "listening" handshake before it sends events
  // or accepts commands. Send it repeatedly until we get onReady back.
  iframe.onload = function() {
    function sendListening() {
      if (!tronIframe || !tronIframe.contentWindow) return;
      tronIframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
    }
    // Send immediately and keep pinging until ready
    sendListening();
    tronListeningInterval = setInterval(() => {
      if (tronReady) { clearInterval(tronListeningInterval); tronListeningInterval = null; return; }
      sendListening();
    }, 250);
  };
}

function updateTrackTitle(title) {
  if (!title) return;
  document.getElementById('tp-track').textContent = title.replace(/\\s*\\(.*?\\)\\s*/g, '').replace(' - ', ' \\u2014 ');
}

window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'string') return;
  let msg;
  try { msg = JSON.parse(e.data); } catch (_) { return; }
  if (!msg.event && !msg.info) return;

  if (msg.event === 'onReady') {
    tronReady = true;
    if (tronListeningInterval) { clearInterval(tronListeningInterval); tronListeningInterval = null; }
    ytCmd('addEventListener', ['onStateChange']);
    ytCmd('addEventListener', ['onError']);
    ytCmd('addEventListener', ['onPlaybackQualityChange']);
    ytCmd('addEventListener', ['onApiChange']);
    ytCmd('setVolume', [tronVolume]);
    if (tronShuffle) ytCmd('setShuffle', [true]);
  }
  if (msg.event === 'onError') {
    tronErrorCount++;
    if (tronErrorCount < 10) {
      ytCmd('nextVideo');
    } else {
      document.getElementById('tp-track').textContent = 'Playback blocked — open playlist in browser';
    }
  }
  if (msg.event === 'onStateChange') {
    const state = msg.info;
    if (state === 1) tronErrorCount = 0;
    tronPlaying = (state === 1);
    updatePlayBtn();
    if (tronPlaying) startProgressLoop(); else stopProgressLoop();
  }

  // Extract title from ANY message that carries videoData
  const info = msg.info;
  if (info && typeof info === 'object') {
    if (info.videoData && info.videoData.title) updateTrackTitle(info.videoData.title);
    if (info.currentTime !== undefined) tronCurrentTime = info.currentTime;
    if (info.duration !== undefined) tronDuration = info.duration;
  }
});

function updatePlayBtn() {
  const btn = document.getElementById('tp-play');
  btn.innerHTML = tronPlaying ? '&#10074;&#10074;' : '&#9654;';
}

function formatTime(s) {
  if (!s || isNaN(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function updateProgress() {
  if (tronDuration > 0) {
    document.getElementById('tp-progress').style.width = ((tronCurrentTime / tronDuration) * 100) + '%';
    document.getElementById('tp-time').textContent = formatTime(tronCurrentTime) + ' / ' + formatTime(tronDuration);
  }
}

function startProgressLoop() {
  stopProgressLoop();
  function tick() { updateProgress(); tronProgressRAF = requestAnimationFrame(tick); }
  tronProgressRAF = requestAnimationFrame(tick);
}
function stopProgressLoop() {
  if (tronProgressRAF) { cancelAnimationFrame(tronProgressRAF); tronProgressRAF = null; }
}

function tronPlayerShow() {
  createTronIframe();
  document.getElementById('tp-vol').value = tronVolume;
}

function tronPlayerHide() {
  if (tronPlaying) {
    ytCmd('pauseVideo');
    tronPlaying = false;
    updatePlayBtn();
    stopProgressLoop();
  }
}

// Player controls
document.getElementById('tp-play').addEventListener('click', () => {
  if (!tronIframe) { createTronIframe(); return; }
  if (tronPlaying) ytCmd('pauseVideo'); else ytCmd('playVideo');
});
document.getElementById('tp-prev').addEventListener('click', () => ytCmd('previousVideo'));
document.getElementById('tp-next').addEventListener('click', () => ytCmd('nextVideo'));
document.getElementById('tp-vol').addEventListener('input', (e) => {
  tronVolume = parseInt(e.target.value, 10);
  ytCmd('setVolume', [tronVolume]);
  localStorage.setItem('tron-player-vol', tronVolume);
});
document.getElementById('tp-shuffle').addEventListener('click', (e) => {
  tronShuffle = !tronShuffle;
  e.currentTarget.classList.toggle('tp-active', tronShuffle);
  ytCmd('setShuffle', [tronShuffle]);
});
document.getElementById('tp-progress-wrap').addEventListener('click', (e) => {
  if (tronDuration <= 0) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  ytCmd('seekTo', [pct * tronDuration, true]);
});
document.getElementById('tp-shuffle').classList.add('tp-active');

document.getElementById('theme-toggle').addEventListener('click', (e) => {
  const opt = e.target.closest('.theme-opt');
  if (opt && opt.dataset.theme !== currentTheme) applyTheme(opt.dataset.theme);
});

// --- Init ---
initScene3D();
initResize();
initFlyControls();
setTimeout(dismissLoading, 5000);

// Apply saved theme
{
  const saved = localStorage.getItem('scene-inspector-theme');
  if (saved && THEMES[saved] && saved !== 'default') applyTheme(saved);
  updateThemeButton();
}

// Skip welcome on reload if we had an active session
if (isEmbedded) {
  // Embedded mode: hide setup UI, compact toolbar, auto-connect
  document.getElementById('welcome').style.display = 'none';
  const brand = document.querySelector('.toolbar-brand');
  if (brand) brand.style.display = 'none';
  const seps = document.querySelectorAll('.sep');
  seps.forEach(s => s.style.display = 'none');
  const spacer = document.querySelector('.toolbar-spacer');
  if (spacer) spacer.style.display = 'none';
  document.getElementById('toolbar').style.height = '24px';
  connectWS();
} else {
  const wasActive = sessionStorage.getItem('scene-inspector-active');
  if (wasActive) {
    document.getElementById('welcome').classList.add('hidden');
  }
  connectWS();
  // If we had an active session but WS doesn't deliver data quickly, start demo
  if (wasActive) {
    setTimeout(() => { if (!liveTree && !demoRunning) window.startDemo(); }, 1500);
  }
}
</script>
</body>
</html>
`;
