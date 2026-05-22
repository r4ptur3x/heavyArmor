import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { APP_CONFIG } from "./config.js";
import { buildRenderStatus } from "./status-builders.js";
const ASSET_VERSION = APP_CONFIG.ASSET_VERSION;
const CACHE_BUST = ASSET_VERSION + "-" + Date.now();
let currentSpreadsheetId = "1A4THHf9Z5o5iXKxSrT8IvJT8pWM1nj2QjyEOVV_jsPQ";
let currentSheetName = "room_Test";
let CSV_URL = "";
const RULE_MANIFEST_URL = "./rules/manifest.json";
const TILE_SIZE = APP_CONFIG.TILE_SIZE;
const DEFAULT_MODEL_COLOR = "#808080";
let tileRules = {};
const colorByType = {};
const typeColorOverrides = {};
const modelCache = {};
let scene,
  camera,
  renderer,
  controls,
  tileGroup,
  selectedType = null,
  sun = null,
  sunTarget = null,
  shadowsEnabled = true,
  defaultColorsEnabled = APP_CONFIG.DEFAULT_COLORS_ENABLED;
let pickables = [];
let gridHelper = null,
  groundMesh = null,
  directionGroup = null,
  lastMapBounds = {
    centerX: 4.5,
    centerZ: 4.5,
    width: 10,
    depth: 10,
    radius: 10,
  };
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
const gltfLoader = new GLTFLoader(),
  fbxLoader = new FBXLoader();
const viewport = document.querySelector("#viewport"),
  statusEl = document.querySelector("#status"),
  tooltip = document.querySelector("#tooltip"),
  selectedTypeEl = document.querySelector("#selectedType"),
  colorPicker = document.querySelector("#colorPicker"),
  versionBadge = document.querySelector("#versionBadge"),
  lightAngle = document.querySelector("#lightAngle"),
  lightHeight = document.querySelector("#lightHeight"),
  lightIntensity = document.querySelector("#lightIntensity"),
  lightAngleText = document.querySelector("#lightAngleText"),
  lightHeightText = document.querySelector("#lightHeightText"),
  lightIntensityText = document.querySelector("#lightIntensityText"),
  shadowToggleButton = document.querySelector("#shadowToggleButton"),
  defaultColorsToggleButton = document.querySelector(
    "#defaultColorsToggleButton",
  ),
  directionIconSize = document.querySelector("#directionIconSize"),
  directionIconSizeText = document.querySelector("#directionIconSizeText"),
  worldNearClip = document.querySelector("#worldNearClip"),
  worldNearClipText = document.querySelector("#worldNearClipText"),
  shadowNearClip = document.querySelector("#shadowNearClip"),
  shadowNearClipText = document.querySelector("#shadowNearClipText"),
  spreadsheetInput = document.querySelector("#spreadsheetInput"),
  mapNameInput = document.querySelector("#mapNameInput"),
  loadMapButton = document.querySelector("#loadMapButton"),
  sourceUrlEl = document.querySelector("#sourceUrl");
function applyConfigDefaultsToControls() {
  if (lightAngle) lightAngle.value = APP_CONFIG.DEFAULT_LIGHT_ANGLE;
  if (lightHeight) lightHeight.value = APP_CONFIG.DEFAULT_LIGHT_HEIGHT;
  if (lightIntensity) lightIntensity.value = APP_CONFIG.DEFAULT_LIGHT_INTENSITY;
  if (worldNearClip) worldNearClip.value = APP_CONFIG.DEFAULT_WORLD_NEAR_CLIP;
  if (shadowNearClip)
    shadowNearClip.value = APP_CONFIG.DEFAULT_SHADOW_NEAR_CLIP;
  if (directionIconSize)
    directionIconSize.value = APP_CONFIG.DEFAULT_DIRECTION_ICON_SIZE;
}

function getWorldNearClip() {
  return Number(worldNearClip?.value || APP_CONFIG.DEFAULT_WORLD_NEAR_CLIP);
}

function getShadowNearClip() {
  return Number(shadowNearClip?.value || APP_CONFIG.DEFAULT_SHADOW_NEAR_CLIP);
}

function getDirectionIconSize() {
  return Number(
    directionIconSize?.value || APP_CONFIG.DEFAULT_DIRECTION_ICON_SIZE,
  );
}

function getLightAngle() {
  return Number(lightAngle?.value || APP_CONFIG.DEFAULT_LIGHT_ANGLE);
}

function getLightHeight() {
  return Number(lightHeight?.value || APP_CONFIG.DEFAULT_LIGHT_HEIGHT);
}

function getLightIntensity() {
  return Number(lightIntensity?.value || APP_CONFIG.DEFAULT_LIGHT_INTENSITY);
}
document.querySelector("#assetVersionText").textContent = CACHE_BUST;
versionBadge.textContent = "v " + ASSET_VERSION;
function extractSpreadsheetId(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const match = v.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return v.replace(/[#?].*$/, "").trim();
}
function updateCsvUrl() {
  CSV_URL =
    "https://docs.google.com/spreadsheets/d/" +
    currentSpreadsheetId +
    "/gviz/tq?tqx=out:csv&sheet=" +
    encodeURIComponent(currentSheetName);
  sourceUrlEl.textContent = CSV_URL;
}
updateCsvUrl();
function versioned(p) {
  return p + "?v=" + encodeURIComponent(CACHE_BUST);
}
function setStatus(m) {
  statusEl.textContent = m;
}
function getRuleColor(type) {
  return tileRules[type]?.color || DEFAULT_MODEL_COLOR;
}
function getDisplayColor(type) {
  if (typeColorOverrides[type]) return typeColorOverrides[type];
  return defaultColorsEnabled ? getRuleColor(type) : DEFAULT_MODEL_COLOR;
}
function applyCurrentColors() {
  for (const obj of pickables) {
    const type = obj.userData.type || obj.userData.label;
    tintObject(obj, getDisplayColor(type));
  }
  defaultColorsToggleButton.textContent = defaultColorsEnabled
    ? "Default Colors: On"
    : "Default Colors: Off";
}
function toggleDefaultColors() {
  defaultColorsEnabled = !defaultColorsEnabled;
  applyCurrentColors();
  setStatus(
    "Default colors " +
      (defaultColorsEnabled ? "enabled" : "disabled") +
      ".\nApp version: " +
      ASSET_VERSION,
  );
}
function updateDirectionIconSize() {
  const v = getDirectionIconSize();
  if (directionIconSizeText) directionIconSizeText.textContent = String(v);
  if (directionGroup) {
    directionGroup.traverse((n) => {
      if (n.isSprite) n.scale.set(v, v, v);
    });
  }
}
function updateWorldNearClip() {
  if (!camera) return;
  const v = getWorldNearClip();
  camera.near = v;
  camera.updateProjectionMatrix();
  if (worldNearClipText) worldNearClipText.textContent = v.toFixed(2);
}
function updateLight() {
  if (!sun) return;
  const angle = getLightAngle(),
    height = getLightHeight(),
    intensity = getLightIntensity();
  const radius = Math.max(lastMapBounds.radius * 1.25, 12),
    rad = (angle * Math.PI) / 180;
  sun.position.set(
    lastMapBounds.centerX + Math.cos(rad) * radius,
    height,
    lastMapBounds.centerZ + Math.sin(rad) * radius,
  );
  if (sunTarget) {
    sunTarget.position.set(lastMapBounds.centerX, 0, lastMapBounds.centerZ);
    sun.target = sunTarget;
  }
  sun.intensity = intensity;
  lightAngleText.textContent = angle + "°";
  lightHeightText.textContent = String(height);
  lightIntensityText.textContent = intensity.toFixed(2);
  configureShadows();
}
function configureShadows() {
  if (!sun || !renderer) return;
  renderer.shadowMap.enabled = shadowsEnabled;
  sun.castShadow = shadowsEnabled;
  if (shadowsEnabled) {
    const pad = Math.max(6, lastMapBounds.radius * 0.35),
      half = Math.max(lastMapBounds.width, lastMapBounds.depth) / 2 + pad,
      near = getShadowNearClip();
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.radius = 8;
    sun.shadow.bias = -0.0001;
    sun.shadow.camera.left = -half;
    sun.shadow.camera.right = half;
    sun.shadow.camera.top = half;
    sun.shadow.camera.bottom = -half;
    sun.shadow.camera.near = near;
    sun.shadow.camera.far = Math.max(400, lastMapBounds.radius * 8);
    sun.shadow.camera.updateProjectionMatrix();
    if (shadowNearClipText) shadowNearClipText.textContent = near.toFixed(2);
  }
  shadowToggleButton.textContent = shadowsEnabled
    ? "Shadows: On"
    : "Shadows: Off";
}
function updateShadowNearClip() {
  configureShadows();
}
function toggleShadows() {
  shadowsEnabled = !shadowsEnabled;
  configureShadows();
  setStatus(
    (shadowsEnabled ? "Shadows enabled." : "Shadows disabled.") +
      "\nApp version: " +
      ASSET_VERSION,
  );
}
async function loadRuleFiles() {
  const manifestResponse = await fetch(versioned(RULE_MANIFEST_URL), {
    cache: "no-store",
  });
  if (!manifestResponse.ok)
    throw new Error(
      "Manifest load failed: " +
        manifestResponse.status +
        " " +
        manifestResponse.statusText,
    );
  const manifest = await manifestResponse.json();
  const files = Array.isArray(manifest.rules) ? manifest.rules : [];
  const loaded = {};
  for (const file of files) {
    try {
      const r = await fetch(versioned("./rules/" + file), {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      const json = await r.json();
      loaded[json.type] = json;
    } catch (e) {
      console.warn("Rule load failed", file, e);
    }
  }
  tileRules = loaded;
  return files;
}
function parseCSV(text) {
  const rows = [];
  let cur = "",
    row = [],
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (c === '"' && q && n === '"') {
      cur += '"';
      i++;
    } else if (c === '"') q = !q;
    else if (c === "," && !q) {
      row.push(cur.trim());
      cur = "";
    } else if ((c === "\n" || c === "\r") && !q) {
      if (cur || row.length) {
        row.push(cur.trim());
        rows.push(row);
        row = [];
        cur = "";
      }
      if (c === "\r" && n === "\n") i++;
    } else cur += c;
  }
  if (cur || row.length) rows.push(row.concat([cur.trim()]));
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}
function combineLegacyTriples(row) {
  const combined = [];
  for (let i = 0; i < row.length; ) {
    const a = String(row[i] || "").trim(),
      b = String(row[i + 1] || "").trim(),
      c = String(row[i + 2] || "").trim();
    if (/^D\d{1,2}$/i.test(b) && /^\d{1,3}$/.test(c)) {
      combined.push(a + ", " + b + ", " + c);
      i += 3;
    } else {
      combined.push(a);
      i++;
    }
  }
  return combined;
}
function parseTileCell(cell, x, y) {
  const raw = String(cell || "").trim();
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const assetName = (parts[0] || "").toLowerCase();
  if (
    !assetName ||
    /^D\d{1,2}$/i.test(assetName) ||
    /^\d{1,3}$/.test(assetName)
  )
    return null;
  const damageToken = (parts[1] || "D99").toUpperCase();
  const variant = (parts[2] || "001").padStart(3, "0");
  const damageMatch = damageToken.match(/^D(\d{1,2})$/);
  const damage = damageMatch
    ? Math.max(0, Math.min(99, Number(damageMatch[1])))
    : 99;
  return {
    x: x,
    y: y,
    sheetX: x + 1,
    sheetY: y + 1,
    height: 1,
    label: assetName,
    assetName: assetName,
    damageToken: "D" + String(damage).padStart(2, "0"),
    damage: damage,
    variant: variant,
    color: DEFAULT_MODEL_COLOR,
    rawCell: raw,
  };
}
function parseGridCSV(text) {
  const rawRows = parseCSV(text);
  const out = [];
  for (let y = 0; y < rawRows.length; y++) {
    const row = combineLegacyTriples(rawRows[y]);
    for (let x = 0; x < row.length; x++) {
      const tile = parseTileCell(row[x], x, y);
      if (tile) out.push(tile);
    }
  }
  return out;
}
function computeBounds(rows) {
  if (!rows.length)
    return {
      minX: 0,
      maxX: 9,
      minY: 0,
      maxY: 9,
      width: 10,
      depth: 10,
      centerX: 4.5,
      centerZ: 4.5,
      radius: 10,
    };
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const r of rows) {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y);
  }
  const width = (maxX - minX + 1) * TILE_SIZE,
    depth = (maxY - minY + 1) * TILE_SIZE,
    centerX = (minX + maxX) * 0.5 * TILE_SIZE,
    centerZ = (minY + maxY) * 0.5 * TILE_SIZE;
  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    depth,
    centerX,
    centerZ,
    radius: Math.sqrt(width * width + depth * depth) * 0.5,
  };
}
function updateSceneBounds(rows) {
  lastMapBounds = computeBounds(rows);
  if (gridHelper) scene.remove(gridHelper);
  if (groundMesh) scene.remove(groundMesh);
  const gridSize = Math.ceil(
    Math.max(lastMapBounds.width, lastMapBounds.depth) + TILE_SIZE * 2,
  );
  gridHelper = new THREE.GridHelper(
    gridSize,
    Math.max(1, Math.round(gridSize / TILE_SIZE)),
    0x777777,
    0x333333,
  );
  gridHelper.position.set(lastMapBounds.centerX, 0.006, lastMapBounds.centerZ);
  scene.add(gridHelper);
  groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(
      lastMapBounds.width + TILE_SIZE * 4,
      lastMapBounds.depth + TILE_SIZE * 4,
    ),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(lastMapBounds.centerX, -0.012, lastMapBounds.centerZ);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  addDirectionMarkers();
  controls.target.set(lastMapBounds.centerX, 0, lastMapBounds.centerZ);
  const dist = Math.max(16, lastMapBounds.radius * 1.7);
  camera.position.set(
    lastMapBounds.centerX + dist,
    lastMapBounds.radius * 0.9 + 8,
    lastMapBounds.centerZ + dist,
  );
  camera.near = getWorldNearClip();
  camera.far = Math.max(1000, lastMapBounds.radius * 20);
  camera.updateProjectionMatrix();
  controls.update();
  updateLight();
  updateWorldNearClip();
}
function colorFor(label, color) {
  const key = String(label || "")
    .trim()
    .toLowerCase();
  return getDisplayColor(key);
}
function buildGrid(rows) {
  const grid = new Map();
  for (const r of rows) grid.set(r.x + "," + r.y, r.label);
  return grid;
}
function neighbors(grid, x, y, type) {
  const dirs = [
      [0, -1, "N"],
      [1, 0, "E"],
      [0, 1, "S"],
      [-1, 0, "W"],
    ],
    hits = [];
  for (const d of dirs) {
    if (grid.get(x + d[0] + "," + (y + d[1])) === type) hits.push(d[2]);
  }
  return hits;
}
function neighborIsAny(grid, x, y, direction, types) {
  const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const o = offsets[direction];
  if (!o) return false;
  const t = grid.get(x + o[0] + "," + (y + o[1]));
  return (types || []).includes(t);
}
function ruleMatches(rule, hits, grid, x, y) {
  const required = rule.requires || [];
  if (!required.every((d) => hits.includes(d))) return false;
  if (Array.isArray(rule.requiresAnyType)) {
    for (const check of rule.requiresAnyType) {
      if (!neighborIsAny(grid, x, y, check.direction, check.types || []))
        return false;
    }
  }
  if (
    rule.requiresExactCount !== undefined &&
    hits.length !== rule.requiresExactCount
  )
    return false;
  if (
    rule.requiresMinimumCount !== undefined &&
    hits.length < rule.requiresMinimumCount
  )
    return false;
  return true;
}
function applyGenericRules(ruleDef, grid, x, y, type) {
  if (!ruleDef || !ruleDef.usesModel)
    return { basePath: null, rotationY: 0, rule: "cube" };
  const hits = neighbors(grid, x, y, type);
  if (Array.isArray(ruleDef.rules)) {
    const fallback = ruleDef.rules.find((r) => r.default) || null;
    for (const rule of ruleDef.rules) {
      if (rule.default) continue;
      if (ruleMatches(rule, hits, grid, x, y))
        return {
          basePath: ruleDef.models?.[rule.model] || null,
          rotationY: ((rule.rotationDegrees || 0) * Math.PI) / 180,
          rule: rule.name || "json rule",
        };
    }
    if (fallback && ruleMatches(fallback, hits, grid, x, y))
      return {
        basePath: ruleDef.models?.[fallback.model] || null,
        rotationY: ((fallback.rotationDegrees || 0) * Math.PI) / 180,
        rule: fallback.name || "json default",
      };
  }
  const modelKey = ruleDef.models?.default
    ? "default"
    : Object.keys(ruleDef.models || {})[0];
  return {
    basePath: ruleDef.models?.[modelKey] || null,
    rotationY: 0,
    rule: "json default model",
  };
}
function createTextSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.font = "bold 128px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 138);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  const size = getDirectionIconSize();
  sprite.scale.set(size, size, size);
  return sprite;
}
function addDirectionMarkers() {
  if (directionGroup) scene.remove(directionGroup);
  directionGroup = new THREE.Group();
  const y = 0.18,
    pad = Math.max(TILE_SIZE * 1.25, lastMapBounds.radius * 0.12);
  for (const m of [
    {
      label: "N",
      pos: [lastMapBounds.centerX, y, lastMapBounds.minY * TILE_SIZE - pad],
    },
    {
      label: "S",
      pos: [lastMapBounds.centerX, y, lastMapBounds.maxY * TILE_SIZE + pad],
    },
    {
      label: "E",
      pos: [lastMapBounds.maxX * TILE_SIZE + pad, y, lastMapBounds.centerZ],
    },
    {
      label: "W",
      pos: [lastMapBounds.minX * TILE_SIZE - pad, y, lastMapBounds.centerZ],
    },
  ]) {
    const s = createTextSprite(m.label);
    s.position.set(...m.pos);
    directionGroup.add(s);
  }
  scene.add(directionGroup);
  updateDirectionIconSize();
}
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151515);
  camera = new THREE.PerspectiveCamera(55, 1, getWorldNearClip(), 1000);
  camera.position.set(12, 11, 14);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.target.set(4.5, 0, 4.5);
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN,
  };
  scene.add(new THREE.AmbientLight(0xffffff, 0.82));
  sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  scene.add(sun);
  configureShadows();
  updateLight();
  updateWorldNearClip();
  tileGroup = new THREE.Group();
  scene.add(tileGroup);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  renderer.domElement.addEventListener("contextmenu", (e) =>
    e.preventDefault(),
  );
  window.addEventListener("resize", resize);
  resize();
}
function resize() {
  const w = viewport.clientWidth,
    h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
function loadGLB(path) {
  return new Promise((res, rej) =>
    gltfLoader.load(versioned(path), (g) => res(g.scene), undefined, rej),
  );
}
function loadFBX(path) {
  return new Promise((res, rej) =>
    fbxLoader.load(versioned(path), (o) => res(o), undefined, rej),
  );
}
async function loadModelWithFallback(basePath) {
  try {
    return await loadGLB(basePath + ".glb");
  } catch (e) {
    return await loadFBX(basePath + ".fbx");
  }
}
function prepareImportedModel(obj) {
  const box = new THREE.Box3().setFromObject(obj),
    size = new THREE.Vector3();
  box.getSize(size);
  obj.userData.importedBounds = {
    sourceX: size.x,
    sourceY: size.y,
    sourceZ: size.z,
    usesRawScale: true,
    usesImportedOrigin: true,
  };
  obj.traverse((n) => {
    if (!n.isMesh) return;
    n.castShadow = true;
    n.receiveShadow = true;
    n.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(DEFAULT_MODEL_COLOR),
      roughness: 0.58,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
  });
  return obj;
}
async function getModelPrototype(basePath) {
  if (modelCache[basePath]) return modelCache[basePath];
  const model = await loadModelWithFallback(basePath);
  prepareImportedModel(model);
  modelCache[basePath] = model;
  return model;
}
function tintObject(obj, hex) {
  obj.traverse((n) => {
    if (n.isMesh) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.vertexColors = false;
        if (mat.color) mat.color.set(hex);
        mat.needsUpdate = true;
      }
    }
  });
}
function applyTypeColorIfOverridden(obj, type) {
  tintObject(obj, getDisplayColor(type));
}
function clearTiles() {
  while (tileGroup.children.length) tileGroup.remove(tileGroup.children[0]);
  pickables = [];
  selectedType = null;
  selectedTypeEl.textContent = "None — click a tile/model";
  colorPicker.disabled = true;
}
async function renderRows(rows, sourceLabel) {
  clearTiles();
  setStatus("Rendering " + sourceLabel + "...");
  const valid = rows.filter(
    (r) => Number.isFinite(r.x) && Number.isFinite(r.y) && r.label,
  );
  updateSceneBounds(valid);
  const grid = buildGrid(valid);
  let modelCount = 0,
    cubeCount = 0,
    failed = [];
  for (const r of valid) {
    let obj = null;
    const ruleDef = tileRules[r.label];
    let modelInfo = applyGenericRules(ruleDef, grid, r.x, r.y, r.label);
    if (modelInfo.basePath) {
      try {
        const proto = await getModelPrototype(modelInfo.basePath);
        obj = proto.clone(true);
        obj.rotation.y += modelInfo.rotationY;
        applyTypeColorIfOverridden(obj, r.label);
        modelCount++;
      } catch (e) {
        failed.push(r.label + " " + modelInfo.basePath + ": " + e.message);
      }
    }
    if (!obj) {
      const h = r.height || 1;
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE, h, TILE_SIZE),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorFor(r.label, r.color)),
          roughness: 0.58,
          metalness: 0.06,
          side: THREE.DoubleSide,
        }),
      );
      obj.position.y = h / 2;
      applyTypeColorIfOverridden(obj, r.label);
      cubeCount++;
    }
    obj.position.x += r.x * TILE_SIZE;
    obj.position.z += r.y * TILE_SIZE;
    const importedBounds = obj.userData.importedBounds || null;
    obj.userData = {
      ...r,
      type: r.label,
      root: obj,
      modelBasePath: modelInfo.basePath || "cube",
      rule: modelInfo.rule,
      rotationY: modelInfo.rotationY,
      importedBounds: importedBounds,
    };
    if (obj.traverse)
      obj.traverse((n) => {
        n.userData = {
          ...r,
          type: r.label,
          root: obj,
          modelBasePath: modelInfo.basePath || "cube",
          rule: modelInfo.rule,
          rotationY: modelInfo.rotationY,
          importedBounds: importedBounds,
        };
      });
    tileGroup.add(obj);
    pickables.push(obj);
  }
 setStatus(
    buildRenderStatus({
      validCount: valid.length,
      sourceLabel,
      currentSpreadsheetId,
      currentSheetName,
      assetVersion: ASSET_VERSION,
      tileSize: TILE_SIZE,
      worldNearClip: getWorldNearClip(),
      shadowNearClip: getShadowNearClip(),
      directionIconSize: getDirectionIconSize(),
      modelPlacementText:
        "Model placement: raw imported scale, imported origin/pivot, no Y normalization.",
      mapBounds: lastMapBounds,
      defaultColorsEnabled,
      lightAngle: getLightAngle(),
      lightHeight: getLightHeight(),
      lightIntensity: getLightIntensity(),
      shadowsEnabled,
      ruleNames: Object.keys(tileRules),
      cacheBust: CACHE_BUST,
      modelCount,
      cubeCount,
      failed,
    }),
  );
async function loadGoogleSheet() {
  try {
    updateCsvUrl();
    setStatus(
      "Loading spreadsheet: " +
        currentSpreadsheetId +
        "\nMap sheet: " +
        currentSheetName +
        "...",
    );
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const csv = await res.text();
    if (csv.trim().startsWith("<"))
      throw new Error(
        "Google returned HTML, not CSV. Check spreadsheet sharing, URL/ID, and map sheet name.",
      );
    await renderRows(parseGridCSV(csv), "map sheet: " + currentSheetName);
  } catch (e) {
    setStatus(
      "Map load failed.\nSpreadsheet ID: " +
        currentSpreadsheetId +
        "\nMap: " +
        currentSheetName +
        "\n" +
        (e.message || String(e)) +
        "\nEmbedded map not auto-rendered. Click Render Embedded Data if needed.",
    );
  }
}
function loadMapFromInput() {
  const id = extractSpreadsheetId(spreadsheetInput.value),
    name = mapNameInput.value.trim();
  if (!id) {
    setStatus(
      "Enter a spreadsheet URL or ID first.\nApp version: " + ASSET_VERSION,
    );
    return;
  }
  if (!name) {
    setStatus("Enter a map sheet name first.\nApp version: " + ASSET_VERSION);
    return;
  }
  currentSpreadsheetId = id;
  currentSheetName = name;
  loadGoogleSheet();
}
function getHit(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  return hits.length ? hits[0].object.userData.root || hits[0].object : null;
}
function onClick(e) {
  const hit = getHit(e);
  if (!hit) return;
  selectedType = hit.userData.type || hit.userData.label;
  selectedTypeEl.textContent = selectedType;
  colorPicker.disabled = false;
  colorPicker.value = getDisplayColor(selectedType);
  const b = hit.userData.importedBounds;
  setStatus(
    "Selected type: " +
      selectedType +
      "\nSheet X/Y: " +
      hit.userData.sheetX +
      ", " +
      hit.userData.sheetY +
      "\nInternal X/Y: " +
      hit.userData.x +
      ", " +
      hit.userData.y +
      "\nDamage: " +
      hit.userData.damageToken +
      "\nVariant: " +
      hit.userData.variant +
      "\nModel: " +
      (hit.userData.modelBasePath || "cube") +
      "\nApp version: " +
      ASSET_VERSION +
      "\nTile spacing: " +
      TILE_SIZE +
      " world units.\nWorld near clip: " +
      getWorldNearClip() +
      "\nShadow near clip: " +
      getShadowNearClip() +
      "\nDirection icon size: " +
      getDirectionIconSize() +
      "\nModel placement: raw imported scale, imported origin/pivot, no Y normalization.\nDefault colors: " +
      (defaultColorsEnabled ? "On" : "Off") +
      "\nColor mode: " +
      (typeColorOverrides[selectedType]
        ? "picker override"
        : defaultColorsEnabled
          ? "json default color"
          : "50% grey default") +
      "\nRule: " +
      (hit.userData.rule || "") +
      "\nRotationY: " +
      Math.round(((hit.userData.rotationY || 0) * 180) / Math.PI) +
      "°\nCache bust: " +
      CACHE_BUST +
      (b
        ? "\nImported bounds X/Y/Z: " +
          b.sourceX.toFixed(3) +
          " / " +
          b.sourceY.toFixed(3) +
          " / " +
          b.sourceZ.toFixed(3)
        : ""),
  );
}
function onPointerMove(e) {
  const hit = getHit(e),
    rect = renderer.domElement.getBoundingClientRect();
  if (hit) {
    const d = hit.userData;
    tooltip.style.display = "block";
    tooltip.style.left = e.clientX - rect.left + 14 + "px";
    tooltip.style.top = e.clientY - rect.top + 14 + "px";
    tooltip.innerHTML =
      "<strong>" +
      d.label +
      "</strong><br>sheet x/y: " +
      d.sheetX +
      ", " +
      d.sheetY +
      "<br>damage: " +
      d.damageToken +
      "<br>variant: " +
      d.variant +
      "<br>model: " +
      (d.modelBasePath || "cube") +
      "<br>rule: " +
      (d.rule || "") +
      "<br><em>Click to select this type</em>";
  } else tooltip.style.display = "none";
}
colorPicker.addEventListener("input", (e) => {
  if (!selectedType) return;
  typeColorOverrides[selectedType] = e.target.value;
  colorByType[selectedType] = e.target.value;
  let count = 0;
  for (const obj of pickables) {
    if ((obj.userData.type || obj.userData.label) === selectedType) {
      tintObject(obj, e.target.value);
      count++;
    }
  }
  setStatus(
    "Changed " +
      count +
      " " +
      selectedType +
      " tile(s) to " +
      e.target.value +
      ".\nApp version: " +
      ASSET_VERSION,
  );
});
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
async function main() {
  try {
    setStatus("Starting app...\nApp version: " + ASSET_VERSION);
    applyConfigDefaultsToControls();
    initScene();
    await loadRuleFiles();
    await loadGoogleSheet();
    animate();
  } catch (e) {
    setStatus(
      "Startup failed:\n" +
        (e.message || String(e)) +
        "\nApp version: " +
        ASSET_VERSION,
    );
    console.error(e);
  }
}
document
  .querySelector("#reloadButton")
  .addEventListener("click", loadGoogleSheet);
loadMapButton.addEventListener("click", loadMapFromInput);
mapNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadMapFromInput();
});
spreadsheetInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadMapFromInput();
});
defaultColorsToggleButton.addEventListener("click", toggleDefaultColors);
lightAngle.addEventListener("input", updateLight);
lightHeight.addEventListener("input", updateLight);
lightIntensity.addEventListener("input", updateLight);
shadowToggleButton.addEventListener("click", toggleShadows);
directionIconSize.addEventListener("input", updateDirectionIconSize);
worldNearClip.addEventListener("input", updateWorldNearClip);
shadowNearClip.addEventListener("input", updateShadowNearClip);
main();
