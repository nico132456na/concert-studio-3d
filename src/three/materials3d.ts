import * as THREE from 'three';
import type { MaterialSpec, Vec3 } from '../types';
import { detailTexture } from './textures';

/** Builds a PBR material from a spec. Detail textures are cloned so each object can tile them to its own size. */
export function buildMaterial(spec: MaterialSpec, size: Vec3, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial {
  const transparent = spec.opacity < 0.999;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: Math.max(0.02, spec.roughness),
    envMapIntensity: 0.15 + spec.reflect * 1.6,
    transparent,
    opacity: spec.opacity,
    depthWrite: !transparent,
    emissive: new THREE.Color(spec.emissive),
    emissiveIntensity: spec.emissiveIntensity,
    side: transparent ? THREE.DoubleSide : side,
  });
  const tex = detailTexture(spec.texture);
  if (tex) {
    const t = tex.clone();
    t.needsUpdate = true;
    const rx = Math.max(1, Math.round(Math.max(size[0], size[2]) / 3));
    const ry = Math.max(1, Math.round(Math.max(size[1], size[2]) / 3));
    t.repeat.set(rx, ry);
    m.map = t;
    if (spec.texture === 'brushed' || spec.texture === 'diamond' || spec.texture === 'grid' || spec.texture === 'carbon') m.roughnessMap = t;
  }
  return m;
}

export function disposeMaterial(m: THREE.Material | THREE.Material[] | undefined) {
  if (!m) return;
  const list = Array.isArray(m) ? m : [m];
  for (const x of list) {
    const anyM = x as any;
    if (anyM.map && anyM.map.isTexture && anyM.map.source && !anyM.map.isCanvasShared) anyM.map.dispose?.();
    x.dispose();
  }
}

/** Shared edges geometry for selection boxes */
export const unitBoxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
