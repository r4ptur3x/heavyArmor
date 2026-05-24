# GPT Map Generator Instructions

Load this file before helping create or edit Heavy Armor maps.

This file is the bootstrap file for map-generation work. After loading it, immediately load `mapgen/rules/generation-pipeline.json`. Treat `generation-pipeline.json` as the source of truth for map creation. Older mapgen rule files are reference only unless the pipeline explicitly points to them.

## Bootstrap Checklist

When initializing a fresh chat for Heavy Armor map generation, do the following:

1. Load this file first.
2. Load `mapgen/rules/generation-pipeline.json` immediately after this file. Treat it as the active checklist and source of truth for map generation.
3. Load `mapgen/mapgen-design.md` next if it exists. Treat it as architecture/design reference only where it does not conflict with the generation pipeline.
4. If `mapgen/catalogs/default-assets.json` exists, load it before choosing asset types, damage values, variants, or special item names.
5. If `mapgen/example-map-spec.json` exists, load it as the current example format for new map specs.
6. If `mapgen/generate-map.mjs` exists, load it before editing map specs or generator behavior so outputs match the current generator.
7. If the user asks about current viewer behavior, fetch relevant files from `src/` on `main` before answering or editing.

If one of these files does not exist yet, say so briefly and continue using the available files.

## Project Context

This repository contains the Heavy Armor 3D Viewer, a Three.js app that renders maps from a Google Sheet grid.

The current working Google Sheet is named `room_Test`, and the current app defaults to the sheet tab `room_Test`.

The viewer reads each map cell as:

```text
<asset type>, <damage>, <variant>
```

Examples:

```text
wall, D99, 001
floor, D99, 001
door, D99, 001
window, D99, 001
```

Meaning:

```text
asset type = wall / floor / door / window / etc.
damage = D99 / D60 / D20 / etc.
variant = 001 / 002 / etc.
```

## CSV Export Rule

When generating CSV map files, every cell value must be quoted because the cell values themselves contain commas.

Correct:

```csv
"wall, D99, 001","floor, D99, 001"
```

Incorrect:

```csv
wall, D99, 001,floor, D99, 001
```

The incorrect format causes spreadsheet programs to split each tile into multiple columns.

## Active Generation Source Of Truth

For actual map generation, follow:

```text
mapgen/rules/generation-pipeline.json
```

That file supersedes older mapgen rule files when conflicts exist.

Most important current principle:

```text
Generate floor regions first, then derive one wall layer from the final floor union.
Do not generate walls room-by-room.
```

## Goal

Help the user describe a map in natural language, then convert that request into a structured map spec JSON file or final CSV map, depending on the current task.

The map-generation pipeline should preserve design intent such as rooms, contents, special items, locked doors, keypads, levers, stairs, and windows.

## Working Principle

Do not make the viewer understand procedural rooms directly.

Instead:

```text
user request
  -> GPT-authored map spec JSON or pipeline-generated CSV
  -> generator script / mapgen process
  -> Google Sheet-compatible grid cells
  -> existing Heavy Armor viewer
```

## Rule File Loading Order

Use this loading order for map-generation work:

```text
1. mapgen/GPT-MAPGEN-INSTRUCTIONS.md
2. mapgen/rules/generation-pipeline.json
3. mapgen/mapgen-design.md
4. mapgen/catalogs/default-assets.json
5. mapgen/example-map-spec.json
6. mapgen/generate-map.mjs
```

Expected roles:

```text
GPT-MAPGEN-INSTRUCTIONS.md = bootstrap and workflow rules
generation-pipeline.json = active map-generation checklist and source of truth
mapgen-design.md = architecture and design intent
default-assets.json = valid asset types and defaults
example-map-spec.json = example map source structure
generate-map.mjs = current compiler behavior
```

Some of these may not exist yet.

## Preferred User Interaction

The user should be able to say things like:

```text
Make me a small bunker map with an entry room, a lab, a storage room, and a locked vault. Put a McGuffin in the vault. Put a keypad outside the vault door. Add stairs down in the lab.
```

GPT should respond by creating or editing a JSON map spec or final CSV, depending on what the user asks for.

## Map Spec Requirements

A map spec should include:

- map name
- grid mode
- fixed or auto size
- raggedness if relevant
- default damage value
- default variant value
- rooms
- room sizes
- room contents
- special required items
- connections between rooms
- doors
- locked-door controls
- windows
- stairs

## Grid Sizing

Support both fixed and auto sizing conceptually.

Requested dimensions are interpreted through `generation-pipeline.json`.

For raggedness 0, preserve requested dimensions as closely as possible.

For higher raggedness, requested dimensions become a target or maximum canvas depending on the raggedness level.

Example:

```json
{
  "grid": {
    "mode": "fixed",
    "width": 20,
    "height": 20,
    "raggedness": 3
  }
}
```

For later maps, auto sizing may be used:

```json
{
  "grid": {
    "mode": "auto",
    "padding": 2,
    "raggedness": 5
  }
}
```

## Room Sizes

Use named room sizes unless the user gives exact dimensions.

Active room-size rules come from `mapgen/rules/generation-pipeline.json`.

Current room sizes are based on interior floor tile area only:

```text
small = 1-9 floor tiles
medium = 9-18 floor tiles
large = 18-30 floor tiles
```

Walls are derived after floor interiors are placed and do not count toward room size.

## Required Items

Required items must be represented explicitly in the map spec.

Examples:

```json
{
  "id": "main_mcguffin",
  "assetType": "mcguffin",
  "placement": "center"
}
```

```json
{
  "id": "vault_keypad",
  "assetType": "keypad",
  "placement": "near door vault_door"
}
```

## Doors and Controls

Doors should be explicit entities in `connections`.

Example:

```json
{
  "id": "vault_door",
  "type": "door",
  "from": "hallway",
  "to": "vault",
  "locked": true,
  "openedBy": "vault_keypad"
}
```

Controls should appear as room contents or required items.

Door validity is controlled by `generation-pipeline.json`.

## Procedural Room Filling

GPT should help define what belongs in a room. The generator should decide exact valid placement.

Example:

```json
{
  "id": "storage",
  "type": "storage",
  "size": "medium",
  "fill": {
    "density": "cluttered",
    "allowedItems": ["crate", "barrel", "shelf"],
    "rareItems": ["ammo_box"]
  }
}
```

## Output Rules

When asked to create a map spec, produce a JSON map spec first.

When asked to directly create or remake a CSV map, write the CSV directly to `maps/` using the active generation pipeline.

Do not overwrite the live `room_Test` Google Sheet unless the user explicitly asks.

CSV map outputs must quote every cell value.

## First Implementation Target

The first generator should:

1. Read a JSON map spec.
2. Place floor interiors first.
3. Derive one wall layer from the final floor union.
4. Add valid doors.
5. Add windows.
6. Place required items.
7. Validate borders, connectivity, and no-double-wall constraints.
8. Export cells as `<asset type>, <damage>, <variant>`.
9. Quote every CSV cell value during CSV export.

## Editing Rules For GPT

When editing repo files:

- work on `main` unless the user asks for a branch
- fetch the current file first
- use the current SHA when updating files
- avoid unnecessary refactors
- keep the viewer and generator separate
- prefer small incremental commits
