# gitHubMapTestMedium Floorplan Draft

Disposable intermediate floorplan draft for map generation.

This file is not final CSV. It defines floor regions only so the layout can be checked before deriving walls, placing doors, and exporting to `maps/gitHubMapTestMedium.csv`.

## Request

- Map name: `gitHubMapTestMedium`
- Target canvas: 15x15
- Raggedness: 3
- Required rooms:
  - 1 medium room
  - remaining useful space filled with small rooms
- Hallway concept:
  - include a hallway network as floor regions
  - hallway should connect to the medium room
  - hallway may connect to small rooms where useful

## Legend

```text
.  = empty / outside / future derived wall area
M  = medium room floor
A  = small room A floor
B  = small room B floor
C  = small room C floor
D  = small room D floor
E  = small room E floor
F  = small room F floor
G  = small room G floor
H  = hallway floor
```

## Floor-only draft grid

No walls, doors, or windows are placed here.

```text
...............
.MMMMMM.HAAA...
.MMMMMM.HAAA...
.MMMMMM.HAAA...
.......HHHHH...
.BBB...H...C...
.BBB...H...C...
.BBB...H...C...
.......HHHHH...
.DDD...H...EEE.
.DDD...H...EEE.
.DDD...H...EEE.
.......H.......
.FFF...H...GGG.
.FFF...H...GGG.
```

## Room size validation

- Medium room `M`: 6x3 = 18 floor tiles. Valid medium.
- Small room `A`: 3x3 = 9 floor tiles. Valid small.
- Small room `B`: 3x3 = 9 floor tiles. Valid small.
- Small room `C`: 1x3 = 3 floor tiles. Valid small.
- Small room `D`: 3x3 = 9 floor tiles. Valid small.
- Small room `E`: 3x3 = 9 floor tiles. Valid small.
- Small room `F`: 3x2 = 6 floor tiles. Valid small.
- Small room `G`: 3x2 = 6 floor tiles. Valid small.

## Hallway notes

- Hallway `H` is a 1-tile-wide floor corridor.
- It bends/branches through the middle of the map.
- It connects near the medium room.
- It provides a central circulation spine so fewer direct room-to-room doors are needed.

## Planned connectivity notes

During door placement, prefer doors between rooms and hallway seams:

- `M` connects to hallway `H`.
- `A` connects to hallway `H`.
- `B` connects to hallway `H`.
- `C` connects to hallway `H`.
- `D` connects to hallway `H`.
- `E` connects to hallway `H`.
- `F` connects to hallway `H`.
- `G` connects to hallway `H`.

Exterior doors are optional and should not count for room-to-room connectivity.

## Next pipeline step

After this floorplan is accepted:

1. Derive one wall layer from the union of all floor regions.
2. Place valid room-to-hallway doors.
3. Validate connectivity.
4. Validate no double walls.
5. Export final CSV.
