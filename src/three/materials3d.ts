import * as THREE from 'three';
import type { MaterialSpec, TextureKind, Vec3 } from '../types';
import { pbrSet, tiled } from './pbrTextures';

/** Physical properties that the simple spec doesn't carry, keyed by preset. */
const PHYS: Record<string, { clearcoat?: number; ccRough?: number; sheen?: number; ior?: number; auto?: TextureKind }> = {
  matteBlack: { auto: 'paint' },
  glossBlack: { clearcoat: 1, ccRough: 0.04 },
  white: { auto: 'paint' },
  paintedMetal: { clearcoat: 0.35, ccRough: 0.25, auto: 'paint' },
  aluminum: {},
  steel: { auto: 'brushed' },
  chrome: {},
  glass: { ior: 1.5 },
  frosted: { ior: 1.5 },
  acrylic: { clearcoat: 1, ccRough: 0.02, ior: 1.49 },
  plastic: { clearcoat: 0.15, ccRough: 0.4, auto: 'plastic' },
  fabric: { sheen: 0.5 },
  redVelvet: { sheen: 0.9 },
  carbon: { clearcoat: 1, ccRough: 0.05 },
  gold: { clearcoat: 0.2, ccRough: 0.1 },
  stageDeck: { auto: 'deck' },
  rubber: {},
};

/** Builds a physically based material from a spec, with procedural detail maps tiled to the object's real size. */
export function buildMaterial(spec: MaterialSpec, size: Vec3, side: THREE.Side = THREE.FrontSide): THREE.MeshPhysicalMaterial {
  const transparent = spec.opacity < 0.999;
  const ph = PHYS[spec.preset] ?? {};
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: Math.max(0.02, spec.roughness),
    envMapIntensity: 0.2 + spec.reflect * 1.4,
    transparent,
    opacity: spec.opacity,
    depthWrite: !transparent,
    emissive: new THREE.Color(spec.emissive),
    emissiveIntensity: spec.emissiveIntensity,
    side: transparent ? THREE.DoubleSide : side,
    clearcoat: ph.clearcoat ?? 0,
    clearcoatRoughness: ph.ccRough ?? 0.1,
    sheen: ph.sheen ?? 0,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(spec.color).lerp(new THREE.Color('#ffffff'), 0.35),
    ior: ph.ior ?? 1.5,
    specularIntensity: transparent ? 1 : 0.6,
  });
  const kind = spec.texture !== 'none' ? spec.texture : ph.auto ?? 'none';
  const set = pbrSet(kind);
  if (set) {
    const rx = Math.max(1, Math.round(Math.max(size[0], size[2]) / set.tile));
    const ry = Math.max(1, Math.round(Math.max(size[1], Math.min(size[0], size[2])) / set.tile));
    const map = tiled(set.map, rx, ry);
    const nrm = tiled(set.normal, rx, ry);
    const rough = tiled(set.rough, rx, ry);
    if (map) m.map = map;
    if (nrm) {
      m.normalMap = nrm;
      m.normalScale.setScalar(set.normalScale);
    }
    if (rough) m.roughnessMap = rough;
  }
  return m;
}

export function disposeMaterial(m: THREE.Material | THREE.Material[] | undefined) {
  if (!m) return;
  const list = Array.isArray(m) ? m : [m];
  for (const x of list) {
    const anyM = x as any;
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (anyM[k]?.isTexture) anyM[k].dispose();
    x.dispose();
  }
}

/** Shared edges geometry for selection boxes */
export const unitBoxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
