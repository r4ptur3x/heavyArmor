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

## Source Format

Map source files should use JSON because it is structured, easy for GPT to edit, and easy for JavaScript to read.

A map spec should describe intent instead of every final tile by hand.

Example concepts:

```json
{
  "name": "room_Generated_Test",
  "grid": {
    "mode": "fixed",
    "width": 20,
    "height": 20,
    "padding": 1
  },
  "defaults": {
    "damage": "D99",
    "variant": "001"
  },
  "rooms": [
    {
      "id": "entry",
      "type": "entry",
      "size": "small"
    },
    {
      "id": "lab",
      "type": "laboratory",
      "size": "large",
      "contents": [
        {
          "id": "main_mcguffin",
          "assetType": "mcguffin",
          "placement": "center"
        }
      ]
    }
  ],
  "connections": [
    {
      "id": "entry_to_lab",
      "type": "door",
      "from": "entry",
      "to": "lab",
      "locked": true,
      "openedBy": "entry_lever"
    }
  ]
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

Doors should be treated as first-class map entities in the source JSON, even though they compile down to tile cells.

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

Later, the generator can write directly to a Google Sheet tab.

Recommended first output tab name:

```text
room_Generated_Test
```

Do not overwrite the working `room_Test` tab until the generator is trusted.

## First Milestone

Create a small generator that can:

1. Read one JSON map spec.
2. Create a fixed 20x20 grid.
3. Fill it with default floor.
4. Add room walls.
5. Add doors between rooms.
6. Add windows on exterior walls.
7. Place required items like a McGuffin, keypad, lever, or stairs.
8. Export the grid in Google Sheet-compatible cell format.
9. Quote every CSV cell value during CSV export.

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
