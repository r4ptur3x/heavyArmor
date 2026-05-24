# gitHubMapTestMedium Wall Derivation Draft

Disposable intermediate wall-derivation draft.

This file is not final CSV. It shows the next pipeline stage after `gitHubMapTestMedium-floorplan.md`: derive one wall layer from the union of all floor regions, then identify possible door seams.

## Source floorplan

Source file:

```text
mapgen/intermediate/gitHubMapTestMedium-floorplan.md
```

## Legend

```text
. = empty / outside
# = derived wall
M = medium room floor
A = small room A floor
B = small room B floor
C = small room C floor
D = small room D floor
E = small room E floor
F = small room F floor
G = small room G floor
H = hallway floor
? = possible future door candidate
```

## Derived wall draft

Walls are derived from the union of all floor regions. No final doors are committed yet.

```text
.#######.#####..
#MMMMMM#HAAA#..
#MMMMMM#HAAA#..
#MMMMMM#HAAA#..
.######HHHHH#..
#BBB###H###C#..
#BBB###H###C#..
#BBB###H###C#..
.######HHHHH#..
#DDD###H##EEE#.
#DDD###H##EEE#.
#DDD###H##EEE#.
.######H######.
#FFF###H##GGG#.
#FFF###H##GGG#.
.###...#..###..
```

## Door candidate notes

Door candidates should be chosen only where a derived wall has floor on both through-sides.

Preferred room-to-hallway door candidates:

- `M` to `H`: east wall of `M`, near the hallway.
- `A` to `H`: west or south seam touching hallway.
- `B` to `H`: east seam touching hallway.
- `C` to `H`: west seam touching hallway.
- `D` to `H`: east seam touching hallway.
- `E` to `H`: west seam touching hallway.
- `F` to `H`: east seam touching hallway.
- `G` to `H`: west seam touching hallway.

## Validation notes

Before producing final CSV:

1. Replace selected `#` wall tiles with doors only where through-sides are floor/floor.
2. Ensure no door is cardinally adjacent to another door.
3. Ensure every room is reachable through hallway/interior doors.
4. Ensure no floor touches outside/missing space.
5. Ensure no double wall layers exist.

## Known issue to inspect

This draft should be visually checked before final CSV because the wall derivation is hand-authored from the floorplan. The next improvement should be script-assisted derivation to reduce human placement mistakes.
