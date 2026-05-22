export function buildRenderStatus({
  validCount,
  sourceLabel,
  currentSpreadsheetId,
  currentSheetName,
  assetVersion,
  tileSize,
  worldNearClip,
  shadowNearClip,
  directionIconSize,
  modelPlacementText,
  mapBounds,
  defaultColorsEnabled,
  lightAngle,
  lightHeight,
  lightIntensity,
  shadowsEnabled,
  ruleNames,
  cacheBust,
  modelCount,
  cubeCount,
  failed,
}) {
  return (
    "Rendered " +
    validCount +
    " grid tiles from " +
    sourceLabel +
    ".\nSpreadsheet ID: " +
    currentSpreadsheetId +
    "\nCurrent map: " +
    currentSheetName +
    "\nApp version: " +
    assetVersion +
    "\nTile spacing: " +
    tileSize +
    " world units.\nWorld near clip: " +
    worldNearClip +
    "\nShadow near clip: " +
    shadowNearClip +
    "\nDirection icon size: " +
    directionIconSize +
    "\n" +
    modelPlacementText +
    "\nMap bounds: " +
    mapBounds.width +
    " x " +
    mapBounds.depth +
    "\nCoordinates shown as sheet positions starting at 1,1." +
    "\nDefault colors: " +
    (defaultColorsEnabled ? "On" : "Off") +
    "\nLighting angle: " +
    lightAngle +
    "° height: " +
    lightHeight +
    " intensity: " +
    lightIntensity +
    "\nShadows: " +
    (shadowsEnabled ? "On" : "Off") +
    "\nRules loaded from manifest: " +
    ruleNames.join(", ") +
    "\nCache bust: " +
    cacheBust +
    "\nModels: " +
    modelCount +
    " | Cubes: " +
    cubeCount +
    (failed.length ? "\nModel load failures:\n" + failed.join("\n") : "")
  );
}

export function buildSelectedTileStatus({
  selectedType,
  tile,
  importedBounds,
  assetVersion,
  tileSize,
  worldNearClip,
  shadowNearClip,
  directionIconSize,
  modelPlacementText,
  defaultColorsEnabled,
  colorMode,
  cacheBust,
}) {
  return (
    "Selected type: " +
    selectedType +
    "\nSheet X/Y: " +
    tile.sheetX +
    ", " +
    tile.sheetY +
    "\nInternal X/Y: " +
    tile.x +
    ", " +
    tile.y +
    "\nDamage: " +
    tile.damageToken +
    "\nVariant: " +
    tile.variant +
    "\nModel: " +
    (tile.modelBasePath || "cube") +
    "\nApp version: " +
    assetVersion +
    "\nTile spacing: " +
    tileSize +
    " world units.\nWorld near clip: " +
    worldNearClip +
    "\nShadow near clip: " +
    shadowNearClip +
    "\nDirection icon size: " +
    directionIconSize +
    "\n" +
    modelPlacementText +
    "\nDefault colors: " +
    (defaultColorsEnabled ? "On" : "Off") +
    "\nColor mode: " +
    colorMode +
    "\nRule: " +
    (tile.rule || "") +
    "\nRotationY: " +
    Math.round(((tile.rotationY || 0) * 180) / Math.PI) +
    "°\nCache bust: " +
    cacheBust +
    (importedBounds
      ? "\nImported bounds X/Y/Z: " +
        importedBounds.sourceX.toFixed(3) +
        " / " +
        importedBounds.sourceY.toFixed(3) +
        " / " +
        importedBounds.sourceZ.toFixed(3)
      : "")
  );
}
