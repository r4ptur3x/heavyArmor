# GPT Map Generator Instructions

Load this file before helping create or edit Heavy Armor maps.

This file is the bootstrap file for map-generation work. After loading it, load the additional rule and reference files listed in the bootstrap checklist below.

## Bootstrap Checklist

When initializing a fresh chat for Heavy Armor map generation, do the following:

1. Load this file first.
2. Load `mapgen/mapgen-design.md` next. Treat it as the current design reference for map-generation architecture.
3. If `mapgen/catalogs/default-assets.json` exists, load it before choosing asset types, damage values, variants, or special item names.
4. If `mapgen/example-map-spec.json` exists, load it as the current example format for new map specs.
5. If `mapgen/generate-map.mjs` exists, load it before editing map specs or generator behavior so outputs match the current generator.
6. If the user asks about current viewer behavior, fetch relevant files from `src/` on `main` before answering or editing.

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

## Goal

Help the user describe a map in natural language, then convert that request into a structured map spec JSON file.

The JSON spec should preserve design intent such as rooms, contents, special items, locked doors, keypads, levers, stairs, and windows.

A generator script will later compile the JSON spec into the final Google Sheet-compatible grid.

## Working Principle

Do not make the viewer understand procedural rooms directly.

Instead:

```text
user request
  -> GPT-authored map spec JSON
  -> generator script
  -> Google Sheet grid cells
  -> existing Heavy Armor viewer
```

## Rule File Loading Order

Use this loading order for map-generation work:

```text
1. mapgen/GPT-MAPGEN-INSTRUCTIONS.md
2. mapgen/mapgen-design.md
3. mapgen/catalogs/default-assets.json
4. mapgen/example-map-spec.json
5. mapgen/generate-map.mjs
```

Expected roles:

```text
GPT-MAPGEN-INSTRUCTIONS.md = bootstrap and workflow rules
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

GPT should respond by creating or editing a JSON map spec, not by manually writing every final sheet cell unless specifically asked.

## Map Spec Requirements

A map spec should include:

- map name
- grid mode
- fixed or auto size
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

For early tests, prefer fixed 20x20 because the current test sheet is 20 rows by 20 columns.

Example:

```json
{
  "grid": {
    "mode": "fixed",
    "width": 20,
    "height": 20,
    "padding": 1
  }
}
```

For later maps, auto sizing may be used:

```json
{
  "grid": {
    "mode": "auto",
    "padding": 2
  }
}
```

## Room Sizes

Use named room sizes unless the user gives exact dimensions.

Suggested ranges:

```json
{
  "tiny": { "width": [3, 4], "height": [3, 4] },
  "small": { "width": [5, 7], "height": [5, 7] },
  "medium": { "width": [8, 11], "height": [7, 10] },
  "large": { "width": [12, 16], "height": [10, 14] }
}
```

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

When asked to create a map, produce a JSON map spec first.

Do not overwrite the live `room_Test` Google Sheet unless the user explicitly asks.

Prefer generating or targeting a test sheet/tab name such as:

```text
room_Generated_Test
```

## First Implementation Target

The first generator should:

1. Read a JSON map spec.
2. Create a fixed 20x20 grid.
3. Fill it with default floor.
4. Add room walls.
5. Add doors.
6. Add windows.
7. Place required items.
8. Export cells as `<asset type>, <damage>, <variant>`.

## Editing Rules For GPT

When editing repo files:

- work on `main` unless the user asks for a branch
- fetch the current file first
- use the current SHA when updating files
- avoid unnecessary refactors
- keep the viewer and generator separate
- prefer small incremental commits
