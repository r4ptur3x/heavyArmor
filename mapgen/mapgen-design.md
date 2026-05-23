# Heavy Armor Map Generator Design

This document describes the planned map-generation system for the Heavy Armor 3D Viewer.

## Goal

Create maps from a human/GPT-friendly source format, then compile them into the same Google Sheet grid format the viewer already reads.

The viewer should continue to load sheet cells like:

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

## CSV Export Rule

Because each map cell value contains commas, CSV exports must quote every cell value.

Correct CSV cell export:

```csv
"wall, D99, 001","floor, D99, 001"
```

Incorrect CSV cell export:

```csv
wall, D99, 001,floor, D99, 001
```

The incorrect format creates extra columns because the commas inside each cell are treated as CSV delimiters.

When exporting CSV, each tile cell should be serialized as one quoted field containing the full viewer cell value.

## Design Principle

The map generator owns authoring logic.

The 3D viewer owns rendering logic.

This means the generator can understand rooms, doors, keypads, levers, stairs, special items, and procedural placement, but the final output should still be a simple grid of sheet cells that the current app can read.

## Generator Workflow

The intended workflow is:

```text
user request
  -> GPT interprets request using map-generation rules
  -> generator logic creates grid
  -> generator exports CSV directly into maps/
  -> viewer loads CSV map
```

The long-term goal is to avoid accumulating one-off JSON spec files for every generated map.

Small reusable rule/config files are acceptable, but generated playable maps should primarily exist as CSV outputs in:

```text
maps/
```

## Source Format

Generator rules and reusable configuration data may still use JSON because it is structured, easy for GPT to edit, and easy for JavaScript to read.

However, generated maps themselves should generally be emitted directly as CSV outputs instead of storing temporary per-map JSON files.

Example concepts:

```json
{
  "grid": {
    "mode": "fixed",
    "width": 20,
    "height": 20,
    "padding": 1
  },
  "defaults": {
    "damage": "D99",
    "variant": "001"
  }
}
```

## Grid Sizing

The generator should eventually support both fixed and automatic grid sizing.

### Fixed Size

Use fixed size when the map must fit a known sheet size.

Example:

```json
{
  "grid": {
    "mode": "fixed",
    "width": 20,
    "height": 20
  }
}
```

### Auto Size

Use auto size when the user describes rooms and contents, and the generator decides the needed map dimensions.

Example:

```json
{
  "grid": {
    "mode": "auto",
    "padding": 2
  }
}
```

Initial implementation should support fixed 20x20 output first because the current test Google Sheet tab is 20x20.

Auto sizing can be added after the fixed generator works.

## Room Sizes

Named room sizes should resolve to tile dimensions.

Initial suggested ranges:

```json
{
  "tiny": { "width": [3, 4], "height": [3, 4] },
  "small": { "width": [5, 7], "height": [5, 7] },
  "medium": { "width": [8, 11], "height": [7, 10] },
  "large": { "width": [12, 16], "height": [10, 14] }
}
```

Rooms may also provide exact dimensions later.

## Doors and Controls

Doors should be treated as first-class generator entities even though they compile down to tile cells.

This allows special logic like:

- locked doors
- doors opened by keypads
- doors opened by levers
- doors that require keycards
- story-critical door relationships

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

Example control item:

```json
{
  "id": "vault_keypad",
  "assetType": "keypad",
  "placement": "near door vault_door"
}
```

## Required Items

Required items should be placed before random filler items.

Examples:

- McGuffin
- keypad
- lever
- keycard
- stairs
- boss object
- mission console

The generator should avoid placing random objects on top of required items.

## Procedural Filler

Rooms may define filler rules instead of exact item coordinates.

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

GPT can help choose what belongs in a room. The generator should decide where items fit.

## Output

The first output target should be CSV or a generated 2D array using the existing cell format.

CSV files must quote each cell value because the viewer cell values contain commas.

Generated maps should be written directly into:

```text
maps/
```

Do not overwrite the working `room_Test` Google Sheet until the generator is trusted.

## First Milestone

Create a small generator that can:

1. Generate a fixed-size grid.
2. Fill it with default floor.
3. Add room walls.
4. Add doors between rooms.
5. Add windows on exterior walls.
6. Place required items like a McGuffin, keypad, lever, or stairs.
7. Export the grid in Google Sheet-compatible CSV format.
8. Quote every CSV cell value during export.
9. Write generated maps directly into `maps/`.

## Later Milestones

Possible future improvements:

- automatic grid sizing
- better room packing
- hallways
- overlapping validation
- direct Google Sheet writing
- generated map previews
- multiple room shapes
- weighted random item placement
- damage themes such as D99, D60, D20
- seed-based deterministic generation
