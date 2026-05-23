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
  const csv = gridToCsv(grid);
  const outputPath = resolveOutputPath(spec);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, "utf8");

  console.log(`Generated ${grid[0]?.length || 0}x${grid.length} map:`);
  console.log(path.relative(repoRoot, outputPath));
}

main();
