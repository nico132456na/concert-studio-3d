import * as THREE from 'three';
import type { AvatarLook } from '../../types';
import { pbrSet } from '../pbrTextures';

/**
 * Loose 3D clothing generated from the skinned body itself: the garment region is copied,
 * smoothed (removing muscle definition so cloth drapes over it), pushed out to a garment thickness
 * and kept on the same skin weights so it moves with the body. Cached per body + style.
 */

type Region = 'top' | 'bottom';

const cache = new Map<string, THREE.BufferGeometry>();

function regionMask(pos: THREE.BufferAttribute, i: number, region: Region, look: AvatarLook, span: number, height: number) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  const h = y / height, ax = Math.abs(x);
  const onArm = ax > 0.205 && h > 0.66;
  if (region === 'top') {
    const sleeveF = look.top === 'tank' ? 0 : look.top === 'tee' || look.top === 'jersey' ? 0.43 : 0.8;
    if (onArm) return ax < span * sleeveF;
    const collar = look.top === 'tee' || look.top === 'tank' || look.top === 'jersey' ? 0.815 : 0.835;
    if (h > collar && ax < 0.07) return false; // neck
    if ((look.top === 'tee' || look.top === 'tank' || look.top === 'jersey') && z > 0 && ax < 0.08 && h > collar - 0.03) return false; // front scoop
    // open fronts: suit V (shows the shirt and tie painted on the body) and jacket zip line
    if (look.top === 'suit' && z > 0 && h > 0.64 && ax < (h - 0.64) * 0.55) return false;
    if (look.top === 'jacket' && z > 0 && ax < 0.014 && h > 0.55) return false;
    const hem = look.top === 'hoodie' || look.top === 'jacket' ? 0.5 : 0.53;
    return h >= hem && h < 0.87;
  }
  if (onArm || h < 0.056) return false;
  const shorts = look.bottom === 'shorts' || look.bottom === 'skirt';
  return h < 0.545 && (!shorts || h > 0.285);
}

function thickness(region: Region, look: AvatarLook) {
  if (region === 'top') return look.top === 'hoodie' ? 0.034 : look.top === 'jacket' || look.top === 'suit' ? 0.026 : look.top === 'tank' ? 0.008 : 0.014;
  return look.bottom === 'cargo' ? 0.03 : look.bottom === 'suit' ? 0.02 : look.bottom === 'skirt' ? 0.05 : 0.016;
}

export function garmentGeometry(body: THREE.BufferGeometry, region: Region, look: AvatarLook, key: string, span: number, height: number): THREE.BufferGeometry | null {
  const ck = `${key}|${region}|${region === 'top' ? look.top : look.bottom}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const pos = body.getAttribute('position') as THREE.BufferAttribute;
  const nor = body.getAttribute('normal') as THREE.BufferAttribute;
  const uv = body.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const si = body.getAttribute('skinIndex') as THREE.BufferAttribute;
  const sw = body.getAttribute('skinWeight') as THREE.BufferAttribute;
  const index = body.index ? Array.from(body.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const n = pos.count;

  // weld by position so UV seams don't crack when smoothing/offsetting
  const canon = new Int32Array(n);
  const keyMap = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const c = keyMap.get(k);
    canon[i] = c === undefined ? (keyMap.set(k, i), i) : c;
  }
  const inMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) inMask[i] = regionMask(pos, canon[i], region, look, span, height) ? 1 : 0;

  // triangles fully inside the garment
  const tris: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (inMask[a] && inMask[b] && inMask[c]) tris.push(a, b, c);
  }
  if (!tris.length) return null;

  // adjacency on welded vertices
  const nb = new Map<number, Set<number>>();
  const link = (p: number, q: number) => {
    const cp = canon[p], cq = canon[q];
    if (!nb.has(cp)) nb.set(cp, new Set());
    nb.get(cp)!.add(cq);
  };
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    link(a, b); link(b, a); link(b, c); link(c, b); link(a, c); link(c, a);
  }
  // boundary vertices (have a neighbour outside the garment) stay pinned so hems sit on the body
  const boundary = new Set<number>();
  for (let t = 0; t < index.length; t += 3) {
    const v = [index[t], index[t + 1], index[t + 2]];
    const ins = v.filter((x) => inMask[x]).length;
    if (ins > 0 && ins < 3) v.forEach((x) => inMask[x] && boundary.add(canon[x]));
  }

  // Laplacian smoothing (drape over muscle definition)
  const P = new Map<number, THREE.Vector3>();
  nb.forEach((_, c) => P.set(c, new THREE.Vector3(pos.getX(c), pos.getY(c), pos.getZ(c))));
  for (let it = 0; it < 6; it++) {
    const next = new Map<number, THREE.Vector3>();
    nb.forEach((set, c) => {
      const p = P.get(c)!;
      if (boundary.has(c)) {
        next.set(c, p.clone());
        return;
      }
      const avg = new THREE.Vector3();
      set.forEach((q) => avg.add(P.get(q) ?? p));
      avg.multiplyScalar(1 / set.size);
      next.set(c, p.clone().lerp(avg, 0.55));
    });
    next.forEach((v, c) => P.set(c, v));
  }

  // build the garment geometry
  const used = Array.from(new Set(tris));
  const remap = new Map<number, number>();
  used.forEach((v, i) => remap.set(v, i));
  const m = used.length;
  const oPos = new Float32Array(m * 3), oUv = new Float32Array(m * 2), oSi = new Float32Array(m * 4), oSw = new Float32Array(m * 4);
  const t = thickness(region, look);
  used.forEach((v, i) => {
    const c = canon[v];
    const p = P.get(c) ?? new THREE.Vector3(pos.getX(v), pos.getY(v), pos.getZ(v));
    const off = boundary.has(c) ? t * 0.35 : t;
    oPos.set([p.x + nor.getX(v) * off, p.y + nor.getY(v) * off, p.z + nor.getZ(v) * off], i * 3);
    if (uv) oUv.set([uv.getX(v), uv.getY(v)], i * 2);
    oSi.set([si.getX(v), si.getY(v), si.getZ(v), si.getW(v)], i * 4);
    oSw.set([sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)], i * 4);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(oPos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(oUv, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(oSi, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(oSw, 4));
  g.setIndex(tris.map((v) => remap.get(v)!));
  g.computeVertexNormals();
  // smooth normals across UV seams (same position -> averaged normal)
  const nAttr = g.getAttribute('normal') as THREE.BufferAttribute;
  const acc = new Map<number, THREE.Vector3>();
  used.forEach((v, i) => {
    const c = canon[v];
    const a = acc.get(c) ?? new THREE.Vector3();
    a.add(new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)));
    acc.set(c, a);
  });
  used.forEach((v, i) => {
    const a = acc.get(canon[v])!.clone().normalize();
    nAttr.setXYZ(i, a.x, a.y, a.z);
  });
  cache.set(ck, g);
  return g;
}

let fabric: { map: THREE.Texture | null; normal: THREE.Texture | null } | null = null;
export function fabricMaterial(color: string, region: Region, look: AvatarLook) {
  if (!fabric) {
    const set = pbrSet('fabric');
    const tile = (t?: THREE.Texture) => {
      if (!t) return null;
      const c = t.clone();
      c.repeat.set(36, 36);
      c.needsUpdate = true;
      return c;
    };
    fabric = { map: tile(set?.map), normal: tile(set?.normal) };
  }
  const denim = region === 'bottom' && look.bottom === 'jeans';
  const leather = region === 'top' && look.top === 'jacket';
  return new THREE.MeshStandardMaterial({
    color,
    map: fabric.map,
    normalMap: fabric.normal,
    normalScale: new THREE.Vector2(denim ? 0.9 : 0.5, denim ? 0.9 : 0.5),
    roughness: leather ? 0.45 : 0.88,
    metalness: leather ? 0.1 : 0,
    side: THREE.DoubleSide,
  });
}
