# gitHubMapTestMedium Door Placement Draft

Disposable intermediate door-placement draft.

This file is not final CSV. It follows the wall derivation draft and selects intended valid door locations before final CSV export.

## Source files

```text
mapgen/intermediate/gitHubMapTestMedium-floorplan.md
mapgen/intermediate/gitHubMapTestMedium-wall-draft.md
```

## Legend

```text
. = empty / outside
# = derived wall
D = planned door
M = medium room floor
A = small room A floor
B = small room B floor
C = small room C floor
E = small room E floor
F = small room F floor
G = small room G floor
H = hallway floor
```

## Door placement draft

Planned doors replace wall tiles only. This draft favors room-to-hallway doors.

```text
.#######.#####..
#MMMMMMDHAAA#..
#MMMMMM#HAAA#..
#MMMMMM#HAAA#..
.######HHHHH#..
#BBB##DH###C#..
#BBB###H##DC#..
#BBB###H###C#..
.######HHHHH#..
#DDD##DH##EEE#.
#DDD###H#DEEE#.
#DDD###H##EEE#.
.######H######.
#FFF##DH##GGG#.
#FFF###H#DGGG#.
.###...#..###..
```

## Planned door list

- `M` to `H`: row 2, column 7. Through-sides west/east are floor/floor.
- `B` to `H`: row 6, column 6. Through-sides west/east are floor/floor.
- `C` to `H`: row 7, column 11. Through-sides west/east are floor/floor.
- `D` to `H`: row 10, column 6. Through-sides west/east are floor/floor.
- `E` to `H`: row 11, column 10. Through-sides west/east are floor/floor.
- `F` to `H`: row 14, column 6. Through-sides west/east are floor/floor.
- `G` to `H`: row 15, column 10. Through-sides west/east are floor/floor.

## Validation checklist

- Doors replace wall tiles only.
- Interior doors have floor on opposite through-sides.
- No door opens into another door.
- No door is cardinally adjacent to another door.
- Medium room connects to hallway.
- Small rooms connect to hallway where useful.
- Exterior doors are not required for this draft.
- Final CSV must still validate no exposed floors and no double walls.

## Notes

This draft is still hand-authored. Before final CSV, compare each planned `D` against the derived wall draft and floorplan. If any planned door does not have floor on both through-sides, move or remove it.
