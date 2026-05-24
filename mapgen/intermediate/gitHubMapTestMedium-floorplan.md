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
  - include a cleaner hallway network as floor regions
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
H  = hallway floor
```

## Floor-only draft grid

No walls, doors, or windows are placed here.

This revision uses fewer separated room islands and a cleaner central hallway to reduce comb-tooth wall fragments during wall derivation.

```text
...............
.MMMMMM.HAAA...
.MMMMMM.HAAA...
.MMMMMM.HAAA...
.......HHHH....
.BBB...H..C....
.BBB...H..C....
.BBB...H..C....
.......HHHH....
.DDD...H..EEE..
.DDD...H..EEE..
.DDD...H..EEE..
.......HHHH....
.FFF......EEE..
.FFF......EEE..
```

## Room size validation

- Medium room `M`: 6x3 = 18 floor tiles. Valid medium.
- Small room `A`: 3x3 = 9 floor tiles. Valid small.
- Small room `B`: 3x3 = 9 floor tiles. Valid small.
- Small room `C`: 1x3 = 3 floor tiles. Valid small.
- Small room `D`: 3x3 = 9 floor tiles. Valid small.
- Small room `E`: 3x5 = 15 floor tiles. This is medium by area, but intentionally serves as the second larger room cluster for hallway testing.
- Small room `F`: 3x2 = 6 floor tiles. Valid small.

## Hallway notes

- Hallway `H` is mostly 1 tile wide with short horizontal connectors.
- It bends/branches through the middle of the map.
- It connects near the medium room.
- It provides a central circulation spine so fewer direct room-to-room doors are needed.
- The previous draft created too many hallway edge teeth; this version reduces disconnected wall pockets.

## Planned connectivity notes

During door placement, prefer doors between rooms and hallway seams:

- `M` connects to hallway `H`.
- `A` connects to hallway `H`.
- `B` connects to hallway `H`.
- `C` connects to hallway `H`.
- `D` connects to hallway `H`.
- `E` connects to hallway `H`.
- `F` connects to hallway `H`.

Exterior doors are optional and should not count for room-to-room connectivity.

## Next pipeline step

After this floorplan is accepted:

1. Derive one wall layer from the union of all floor regions.
2. Clean derived wall fragments and comb teeth.
3. Place valid room-to-hallway doors.
4. Validate connectivity.
5. Validate no double walls.
6. Export final CSV.
