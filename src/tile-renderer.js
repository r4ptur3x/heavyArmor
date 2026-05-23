import * as THREE from "three";

function applyTileUserData(obj, row, modelInfo, importedBounds) {
  const userData = {
    ...row,
    type: row.label,
    root: obj,
    modelBasePath: modelInfo.basePath || "cube",
    rule: modelInfo.rule,
    rotationY: modelInfo.rotationY,
    importedBounds,
  };

  obj.userData = userData;

  if (obj.traverse) {
    obj.traverse((node) => {
      node.userData = userData;
    });
  }
}

export async function createTileObjects({
  rows,
  grid,
  tileRules,
  tileSize,
  defaultModelColor,
  versioned,
  getModelPrototype,
  getDisplayColor,
  applyGenericRules,
  tintObject,
}) {
  const objects = [];
  const failed = [];
  let modelCount = 0;
  let cubeCount = 0;

  function applyTypeColorIfOverridden(obj, type) {
    tintObject(obj, getDisplayColor(type));
  }

  function colorFor(label) {
    const key = String(label || "")
      .trim()
      .toLowerCase();
    return getDisplayColor(key);
  }

  for (const row of rows) {
    let obj = null;
    const ruleDef = tileRules[row.label];
    const modelInfo = applyGenericRules(ruleDef, grid, row.x, row.y, row.label);

    if (modelInfo.basePath) {
      try {
        const proto = await getModelPrototype(
          modelInfo.basePath,
          versioned,
          defaultModelColor,
        );
        obj = proto.clone(true);
        obj.rotation.y += modelInfo.rotationY;
        applyTypeColorIfOverridden(obj, row.label);
        modelCount++;
      } catch (error) {
        failed.push(
          row.label + " " + modelInfo.basePath + ": " + error.message,
        );
      }
    }

    if (!obj) {
      const height = row.height || 1;
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, height, tileSize),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorFor(row.label)),
          roughness: 0.58,
          metalness: 0.06,
          side: THREE.DoubleSide,
        }),
      );
      obj.position.y = height / 2;
      applyTypeColorIfOverridden(obj, row.label);
      cubeCount++;
    }

    obj.position.x += row.x * tileSize;
    obj.position.z += row.y * tileSize;

    const importedBounds = obj.userData.importedBounds || null;
    applyTileUserData(obj, row, modelInfo, importedBounds);
    objects.push(obj);
  }

  return {
    objects,
    modelCount,
    cubeCount,
    failed,
  };
}
