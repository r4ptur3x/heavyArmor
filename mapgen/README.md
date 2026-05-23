# Heavy Armor Map Generator

This folder is for map-generation tools and source data.

Planned flow:

```text
map spec JSON
  -> generator script
  -> Google Sheet-compatible grid using cells like "<asset type>, <damage>, <variant>"
  -> Heavy Armor 3D Viewer
```

The viewer should continue reading the compiled sheet format. The files in this folder are for authoring and generating maps, not for rendering the scene directly.
