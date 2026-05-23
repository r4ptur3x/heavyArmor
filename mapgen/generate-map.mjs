import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function buildFixedBaseGrid(spec) {
  const width = Number(spec.grid?.width || 20);
  const height = Number(spec.grid?.height || 20);
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`Invalid grid width: ${spec.grid?.width}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid grid height: ${spec.grid?.height}`);
  }

  const defaults = spec.defaults || {};
  const fillTile = defaults.fill || { assetType: "floor" };
  const edgeTile = defaults.edge || { assetType: "wall" };
  const fillCell = tileToCell(fillTile, defaults);
  const edgeCell = tileToCell(edgeTile, defaults);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return isEdge ? edgeCell : fillCell;
    }),
  );
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
  const defaults = spec.defaults || {};
  const edgeCell = tileToCell(defaults.edge || { assetType: "wall" }, defaults);
  const windowCell = tileToCell({ assetType: "window" }, defaults);
  const width = grid[0]?.length || 0;
  const height = grid.length;

  for (const windowSpec of windows) {
    for (const point of windowSpec.positions || []) {
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (grid[y]?.[x] !== edgeCell) continue;
      const isNorthOrSouth = y === 0 || y === height - 1;
      const isEastOrWest = x === 0 || x === width - 1;
      if (!isNorthOrSouth && !isEastOrWest) continue;
      const orientation = isNorthOrSouth ? "horizontal" : "vertical";
      placeWindow(grid, x, y, windowCell, orientation);
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

  const grid = buildFixedBaseGrid(spec);
  applyWindows(grid, spec);
  const csv = gridToCsv(grid);
  const outputPath = resolveOutputPath(spec);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, "utf8");

  console.log(`Generated ${grid[0]?.length || 0}x${grid.length} map:`);
  console.log(path.relative(repoRoot, outputPath));
}

main();
