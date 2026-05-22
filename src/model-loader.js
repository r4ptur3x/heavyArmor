import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const modelCache = {};

function loadGLB(path, versioned) {
  return new Promise((res, rej) =>
    gltfLoader.load(versioned(path), (g) => res(g.scene), undefined, rej),
  );
}

function loadFBX(path, versioned) {
  return new Promise((res, rej) =>
    fbxLoader.load(versioned(path), (o) => res(o), undefined, rej),
  );
}

async function loadModelWithFallback(basePath, versioned) {
  try {
    return await loadGLB(basePath + ".glb", versioned);
  } catch (e) {
    return await loadFBX(basePath + ".fbx", versioned);
  }
}

function prepareImportedModel(obj, defaultModelColor) {
  const box = new THREE.Box3().setFromObject(obj),
    size = new THREE.Vector3();
  box.getSize(size);
  obj.userData.importedBounds = {
    sourceX: size.x,
    sourceY: size.y,
    sourceZ: size.z,
    usesRawScale: true,
    usesImportedOrigin: true,
  };
  obj.traverse((n) => {
    if (!n.isMesh) return;
    n.castShadow = true;
    n.receiveShadow = true;
    n.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaultModelColor),
      roughness: 0.58,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
  });
  return obj;
}

export async function getModelPrototype(basePath, versioned, defaultModelColor) {
  if (modelCache[basePath]) return modelCache[basePath];
  const model = await loadModelWithFallback(basePath, versioned);
  prepareImportedModel(model, defaultModelColor);
  modelCache[basePath] = model;
  return model;
}

export function tintObject(obj, hex) {
  obj.traverse((n) => {
    if (n.isMesh) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.vertexColors = false;
        if (mat.color) mat.color.set(hex);
        mat.needsUpdate = true;
      }
    }
  });
}
