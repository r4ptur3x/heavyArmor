import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { APP_CONFIG } from "./config.js";
import {
  buildRenderStatus,
  buildSelectedTileStatus,
} from "./status-builders.js";
import { parseGridCSV } from "./csv-parser.js";
import { applyGenericRules, buildGrid } from "./rule-engine.js";
import { getModelPrototype, tintObject } from "./model-loader.js";
import { createTileObjects } from "./tile-renderer.js";
const ASSET_VERSION = APP_CONFIG.ASSET_VERSION;
const CACHE_BUST = ASSET_VERSION + "-" + Date.now();
const DEFAULT_MAP_SHEET_NAME = "room_Test";
let currentSpreadsheetId = "1A4THHf9Z5o5iXKxSrT8IvJT8pWM1nj2QjyEOVV_jsPQ";
let currentSheetName = DEFAULT_MAP_SHEET_NAME;
let currentMapSourceType = "googleSheet";
let currentCsvSource = "";
let CSV_URL = "";
const RULE_MANIFEST_URL = "./rules/manifest.json";
const TILE_SIZE = APP_CONFIG.TILE_SIZE;
const DEFAULT_MODEL_COLOR = "#808080";
let tileRules = {};
const colorByType = {};
const typeColorOverrides = {};
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
function isCsvSource(value) {
  const v = String(value || "").trim();
  return /\.csv(?:$|[?#])/i.test(v);
}
function normalizeCsvSource(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const githubBlobMatch = v.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.csv)(?:[?#].*)?$/i,
  );
  if (githubBlobMatch) {
    return (
      "https://raw.githubusercontent.com/" +
      githubBlobMatch[1] +
      "/" +
      githubBlobMatch[2] +
      "/" +
      githubBlobMatch[3] +
      "/" +
      githubBlobMatch[4]
    );
  }
  return v;
}
function updateCsvUrl() {
  if (currentMapSourceType === "csv") {
    CSV_URL = currentCsvSource;
  } else {
    CSV_URL =
      "https://docs.google.com/spreadsheets/d/" +
      currentSpreadsheetId +
      "/gviz/tq?tqx=out:csv&sheet=" +
      encodeURIComponent(currentSheetName);
  }
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
  const tileResult = await createTileObjects({
    rows: valid,
    grid,
    tileRules,
    tileSize: TILE_SIZE,
    defaultModelColor: DEFAULT_MODEL_COLOR,
    versioned,
    getModelPrototype,
    getDisplayColor,
    applyGenericRules,
    tintObject,
  });
  for (const obj of tileResult.objects) {
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
      modelCount: tileResult.modelCount,
      cubeCount: tileResult.cubeCount,
      failed: tileResult.failed,
    }),
  );
}

async function loadGoogleSheet() {
  try {
    currentMapSourceType = "googleSheet";
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
    await renderRows(
      parseGridCSV(csv, DEFAULT_MODEL_COLOR),
      "map sheet: " + currentSheetName,
    );
  } catch (e) {
    setStatus(
      "Map load failed.\nSpreadsheet ID: " +
        currentSpreadsheetId +
        "\nMap: " +
        currentSheetName +
        "\n" +
        (e.message || String(e)) +
        "\nNo map was rendered.",
    );
  }
}
async function loadRawCsv() {
  try {
    currentMapSourceType = "csv";
    updateCsvUrl();
    setStatus("Loading CSV map: " + CSV_URL + "...");
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const csv = await res.text();
    if (csv.trim().startsWith("<"))
      throw new Error("Source returned HTML, not CSV. Check the CSV URL/path.");
    await renderRows(parseGridCSV(csv, DEFAULT_MODEL_COLOR), "CSV: " + CSV_URL);
  } catch (e) {
    setStatus(
      "CSV map load failed.\nCSV source: " +
        CSV_URL +
        "\n" +
        (e.message || String(e)) +
        "\nNo map was rendered.",
    );
  }
}
function loadCurrentMapSource() {
  if (currentMapSourceType === "csv") loadRawCsv();
  else loadGoogleSheet();
}
function loadMapFromInput() {
  const rawValue = String(spreadsheetInput.value || "").trim();
  if (!rawValue) {
    setStatus(
      "Enter a spreadsheet URL/ID or CSV URL/path first.\nApp version: " +
        ASSET_VERSION,
    );
    return;
  }
  if (isCsvSource(rawValue)) {
    currentCsvSource = normalizeCsvSource(rawValue);
    currentMapSourceType = "csv";
    loadRawCsv();
    return;
  }
  const id = extractSpreadsheetId(rawValue);
  if (!id) {
    setStatus(
      "Enter a spreadsheet URL/ID or CSV URL/path first.\nApp version: " +
        ASSET_VERSION,
    );
    return;
  }
  currentSpreadsheetId = id;
  currentSheetName = DEFAULT_MAP_SHEET_NAME;
  currentMapSourceType = "googleSheet";
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
  const colorMode = typeColorOverrides[selectedType]
    ? "picker override"
    : defaultColorsEnabled
      ? "json default color"
      : "50% grey default";
  setStatus(
    buildSelectedTileStatus({
      selectedType,
      tile: hit.userData,
      importedBounds: b,
      assetVersion: ASSET_VERSION,
      tileSize: TILE_SIZE,
      worldNearClip: getWorldNearClip(),
      shadowNearClip: getShadowNearClip(),
      directionIconSize: getDirectionIconSize(),
      modelPlacementText:
        "Model placement: raw imported scale, imported origin/pivot, no Y normalization.",
      defaultColorsEnabled,
      colorMode,
      cacheBust: CACHE_BUST,
    }),
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
    await loadCurrentMapSource();
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
  .addEventListener("click", loadCurrentMapSource);
loadMapButton.addEventListener("click", loadMapFromInput);
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