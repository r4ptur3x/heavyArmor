import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TILE_SIZE_FEET = 10;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const defaultSpecPath = path.join(__dirname, "example-map-spec.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sanitizeFileName(name) {
  return String(name || "generated-map")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "generated-map";
}

function createSeededRandom(seedValue) {
  let seed = 0;
  for (const char of String(seedValue || "heavy-armor-mapgen")) {
    seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  }
  return function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function pickRandom(items, random) {
  if (!items.length) return null;
  return items[Math.floor(random() * items.length)];
}

function feetToTiles(feet) {
  return Math.max(1, Math.ceil(Number(feet) / TILE_SIZE_FEET));
}

function dimensionToTiles(tileValue, feetValue, fallbackValue) {
  if (tileValue !== undefined) return Number(tileValue);
  if (feetValue !== undefined) return feetToTiles(feetValue);
  return fallbackValue;
}

function tileToCell(tile, defaults) {
  const assetType = tile?.assetType || "floor";
  const damage = tile?.damage || defaults.damage || "D99";
  const variant = String(tile?.variant || defaults.variant || "001").padStart(3, "0");
  return `${assetType}, ${damage}, ${variant}`;
}

function csvQuote(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function gridToCsv(grid) {
  return grid.map((row) => row.map(csvQuote).join(",")).join("\n") + "\n";
}

function getCells(spec) {
  const defaults = spec.defaults || {};
  return {
    fill: tileToCell(defaults.fill || { assetType: "floor" }, defaults),
    wall: tileToCell(defaults.edge || { assetType: "wall" }, defaults),
    window: tileToCell({ assetType: "window" }, defaults),
    door: tileToCell({ assetType: "door" }, defaults),
  };
}

function buildFixedBaseGrid(spec) {
  const width = dimensionToTiles(spec.grid?.width, spec.grid?.widthFeet, 20);
  const height = dimensionToTiles(spec.grid?.height, spec.grid?.heightFeet, 20);
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`Invalid grid width: ${spec.grid?.width ?? spec.grid?.widthFeet}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid grid height: ${spec.grid?.height ?? spec.grid?.heightFeet}`);
  }

  const cells = getCells(spec);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return isEdge ? cells.wall : cells.fill;
    }),
  );
}

function getRoomBounds(room, fallbackWidth, fallbackHeight) {
  return {
    x: dimensionToTiles(room.x, room.xFeet, 0),
    y: dimensionToTiles(room.y, room.yFeet, 0),
    width: dimensionToTiles(room.width, room.widthFeet, fallbackWidth),
    height: dimensionToTiles(room.height, room.heightFeet, fallbackHeight),
  };
}

function drawRectRoom(grid, room, cells) {
  const bounds = getRoomBounds(room, grid[0]?.length || 0, grid.length);
  const maxY = grid.length - 1;
  const maxX = (grid[0]?.length || 1) - 1;

  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
      const isRoomEdge =
        x === bounds.x ||
        y === bounds.y ||
        x === bounds.x + bounds.width - 1 ||
        y === bounds.y + bounds.height - 1;
      grid[y][x] = isRoomEdge ? cells.wall : cells.fill;
    }
  }
}

function getDoorCandidates(grid, room, cells) {
  const bounds = getRoomBounds(room, grid[0]?.length || 0, grid.length);
  const candidates = [];
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = bounds.x + bounds.width - 1;
  const maxY = bounds.y + bounds.height - 1;

  for (let x = minX + 1; x < maxX; x++) {
    if (grid[minY]?.[x] === cells.wall) candidates.push({ x, y: minY });
    if (grid[maxY]?.[x] === cells.wall) candidates.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    if (grid[y]?.[minX] === cells.wall) candidates.push({ x: minX, y });
    if (grid[y]?.[maxX] === cells.wall) candidates.push({ x: maxX, y });
  }

  return candidates;
}

function placeRoomDoor(grid, room, cells, random) {
  const requestedDoors = Math.max(1, Number(room.doors ?? 1));
  const placed = [];

  for (let i = 0; i < requestedDoors; i++) {
    const candidates = getDoorCandidates(grid, room, cells).filter(
      (candidate) => !placed.some((p) => p.x === candidate.x && p.y === candidate.y),
    );
    const point = pickRandom(candidates, random);
    if (!point) break;
    grid[point.y][point.x] = cells.door;
    placed.push(point);
  }

  return placed;
}

function applyRooms(grid, spec, random) {
  const rooms = Array.isArray(spec.rooms) ? spec.rooms : [];
  if (!rooms.length) return;
  const cells = getCells(spec);

  for (const room of rooms) {
    drawRectRoom(grid, room, cells);
    placeRoomDoor(grid, room, cells, random);
  }
}

function wouldCreateWindowRun(grid, x, y, dx, dy, windowCell) {
  let count = 1;
  for (const direction of [-1, 1]) {
    let cx = x + dx * direction;
    let cy = y + dy * direction;
    while (grid[cy]?.[cx] === windowCell) {
      count++;
      cx += dx * direction;
      cy += dy * direction;
    }
  }
  return count > 2;
}

function placeWindow(grid, x, y, windowCell, orientation) {
  const dx = orientation === "horizontal" ? 1 : 0;
  const dy = orientation === "vertical" ? 1 : 0;
  if (wouldCreateWindowRun(grid, x, y, dx, dy, windowCell)) return false;
  grid[y][x] = windowCell;
  return true;
}

function applyWindows(grid, spec) {
  const windows = Array.isArray(spec.windows) ? spec.windows : [];
  if (!windows.length) return;
  const cells = getCells(spec);
  const width = grid[0]?.length || 0;
  const height = grid.length;

  for (const windowSpec of windows) {
    for (const point of windowSpec.positions || []) {
      const x = dimensionToTiles(point.x, point.xFeet, NaN);
      const y = dimensionToTiles(point.y, point.yFeet, NaN);
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (grid[y]?.[x] !== cells.wall) continue;
      const isNorthOrSouth = y === 0 || y === height - 1;
      const isEastOrWest = x === 0 || x === width - 1;
      if (!isNorthOrSouth && !isEastOrWest) continue;
      const orientation = isNorthOrSouth ? "horizontal" : "vertical";
      placeWindow(grid, x, y, cells.window, orientation);
    }
  }
}

function resolveOutputPath(spec) {
  const mapName = sanitizeFileName(spec.name);
  const outputFolder = spec.output?.folder || "maps";
  return path.join(repoRoot, outputFolder, `${mapName}.csv`);
}

function main() {
  const specPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultSpecPath;
  const spec = readJson(specPath);

  if (spec.grid?.mode !== "fixed") {
    throw new Error("Only fixed grid mode is supported by the first generator.");
  }

  const random = createSeededRandom(spec.seed || spec.name);
  const grid = buildFixedBaseGrid(spec);
  applyRooms(grid, spec, random);
  applyWindows(grid, spec);
  const csv = gridToCsv(grid);
  const outputPath = resolveOutputPath(spec);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, "utf8");

  console.log(`Generated ${grid[0]?.length || 0}x${grid.length} map:`);
  console.log(path.relative(repoRoot, outputPath));
}

main();
