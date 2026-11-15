import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StageObject } from '../types';
import { pbrSet } from './pbrTextures';

/**
 * Real-scale construction detail drawn around stage decks (never scaled with the object):
 * deck panel seams, edge nosing, pleated skirting for floor-standing decks, support legs and bracing
 * for raised decks, and handrails on stairs. Shared materials keep this cheap.
 */

const BOX_DECKS = new Set(['platform', 'runway', 'catwalk', 'floating']);
const ROUND_DECKS = new Set(['circlePlatform', 'bstage', 'rotatingPlatform', 'lift']);
const noRay = () => null;

let shared: { seams: THREE.MeshStandardMaterial; nosing: THREE.MeshStandardMaterial; skirt: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial } | null = null;
function mats() {
  if (shared) return shared;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#fff';
  // 2.44 m x 1.22 m panels: tile is 2.44 m square -> lines at 0 and half
  g.fillRect(0, 0, 256, 2);
  g.fillRect(0, 128, 256, 2);
  g.fillRect(0, 0, 2, 256);
  const seamTex = new THREE.CanvasTexture(c);
  seamTex.wrapS = seamTex.wrapT = THREE.RepeatWrapping;
  seamTex.anisotropy = 8;
  const pleat = pbrSet('pleat')!;
  shared = {
    seams: new THREE.MeshStandardMaterial({ color: '#000000', alphaMap: seamTex, transparent: true, opacity: 0.85, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    nosing: new THREE.MeshStandardMaterial({ color: '#3a3c40', metalness: 0.85, roughness: 0.35, envMapIntensity: 1.2 }),
    skirt: new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.92, map: pleat.map ?? null, normalMap: pleat.normal ?? null, normalScale: new THREE.Vector2(1.4, 1.4) }),
    steel: new THREE.MeshStandardMaterial({ color: '#6c7076', metalness: 0.9, roughness: 0.4 }),
  };
  return shared;
}

function tubesBetween(pairs: [THREE.Vector3, THREE.Vector3][], r: number) {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const [a, b] of pairs) {
    const len = a.distanceTo(b);
    if (len < 0.01) continue;
    const g = new THREE.CylinderGeometry(r, r, len, 6, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
    g.applyQuaternion(q).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    parts.push(g.toNonIndexed());
  }
  return parts.length ? mergeGeometries(parts) : null;
}

export function StageDetail({ obj }: { obj: StageObject }) {
  const [w, h, d] = obj.size;
  const box = BOX_DECKS.has(obj.kind);
  const round = ROUND_DECKS.has(obj.kind);
  const stairs = obj.kind === 'stairs';
  const raised = obj.pos[1] > 0.4 && obj.kind !== 'floating' && obj.kind !== 'catwalk';
  const grounded = obj.pos[1] <= 0.4 && h > 0.3;
  const isLedTop = obj.material.preset === 'led' || obj.material.opacity < 0.95;
  const hexSides = obj.kind === 'hexPlatform' ? 6 : 56;

  const geos = useMemo(() => {
    if (!box && !round && !stairs) return null;
    const m = mats();
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material; pos?: [number, number, number]; rot?: [number, number, number] }[] = [];
    if (stairs) {
      // handrails each side, rising toward -z
      const pairs: [THREE.Vector3, THREE.Vector3][] = [];
      for (const s of [-1, 1]) {
        const x = (s * w) / 2 - s * 0.06;
        const a = new THREE.Vector3(x, 0.95, d / 2), b = new THREE.Vector3(x, h + 0.95, -d / 2);
        pairs.push([a, b], [new THREE.Vector3(x, 0, d / 2 - 0.1), new THREE.Vector3(x, 0.95, d / 2 - 0.1)], [new THREE.Vector3(x, h, -d / 2 + 0.1), new THREE.Vector3(x, h + 0.95, -d / 2 + 0.1)]);
        pairs.push([new THREE.Vector3(x, 0.5, d / 2), new THREE.Vector3(x, h + 0.5, -d / 2)]);
      }
      const g = tubesBetween(pairs, 0.022);
      if (g) out.push({ geo: g, mat: m.steel });
      return out;
    }
    const top = h;
    if (!isLedTop && obj.kind !== 'catwalk') {
      if (box) {
        const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(0, top + 0.003, 0);
        const uv = g.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 2.44, (uv.getY(i) * d) / 2.44);
        out.push({ geo: g, mat: m.seams });
      } else {
        const g = new THREE.CircleGeometry(w / 2, hexSides).rotateX(-Math.PI / 2).translate(0, top + 0.003, 0);
        const uv = g.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 2.44, (uv.getY(i) * d) / 2.44);
        g.scale(1, 1, d / w);
        out.push({ geo: g, mat: m.seams });
      }
    }
    // edge nosing
    const nh = 0.06, nt = 0.035;
    if (box) {
      const parts = [
        new THREE.BoxGeometry(w + nt * 2, nh, nt).translate(0, top - nh / 2 + 0.005, d / 2 + nt / 2),
        new THREE.BoxGeometry(w + nt * 2, nh, nt).translate(0, top - nh / 2 + 0.005, -d / 2 - nt / 2),
        new THREE.BoxGeometry(nt, nh, d).translate(w / 2 + nt / 2, top - nh / 2 + 0.005, 0),
        new THREE.BoxGeometry(nt, nh, d).translate(-w / 2 - nt / 2, top - nh / 2 + 0.005, 0),
      ].map((x) => x.toNonIndexed());
      out.push({ geo: mergeGeometries(parts)!, mat: m.nosing });
    } else {
      const g = new THREE.CylinderGeometry(w / 2 + nt, w / 2 + nt, nh, hexSides, 1, true).translate(0, top - nh / 2 + 0.005, 0);
      g.scale(1, 1, d / w);
      out.push({ geo: g, mat: m.nosing });
    }
    // pleated skirting on floor-standing decks
    if (grounded && obj.kind !== 'catwalk') {
      const sh = top - nh;
      if (box) {
        const mk = (len: number) => {
          const g = new THREE.PlaneGeometry(len, sh);
          const uv = g.getAttribute('uv');
          for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / 1.6, uv.getY(i));
          return g;
        };
        const o = 0.02;
        const parts = [
          mk(w).translate(0, sh / 2, d / 2 + o),
          mk(w).rotateY(Math.PI).translate(0, sh / 2, -d / 2 - o),
          mk(d).rotateY(Math.PI / 2).translate(w / 2 + o, sh / 2, 0),
          mk(d).rotateY(-Math.PI / 2).translate(-w / 2 - o, sh / 2, 0),
        ];
        out.push({ geo: mergeGeometries(parts.map((x) => x.toNonIndexed()))!, mat: m.skirt });
      } else {
        const g = new THREE.CylinderGeometry(w / 2 + 0.02, w / 2 + 0.02, sh, hexSides, 1, true).translate(0, sh / 2, 0);
        const uv = g.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * Math.PI * w) / 1.6);
        g.scale(1, 1, d / w);
        out.push({ geo: g, mat: m.skirt });
      }
    }
    // understructure for raised decks: legs every ~2.4 m with diagonal braces
    if (raised) {
      const legH = obj.pos[1];
      const pairs: [THREE.Vector3, THREE.Vector3][] = [];
      const nx = Math.max(2, Math.round(w / 2.4) + 1), nz = Math.max(2, Math.round(d / 2.4) + 1);
      const pts: [number, number][] = [];
      if (box) {
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) pts.push([-w / 2 + 0.15 + (i / (nx - 1)) * (w - 0.3), -d / 2 + 0.15 + (j / (nz - 1)) * (d - 0.3)]);
      } else {
        const n = Math.max(6, Math.round((Math.PI * w) / 2.6));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          pts.push([Math.cos(a) * (w / 2 - 0.2), Math.sin(a) * (d / 2 - 0.2)]);
        }
        pts.push([0, 0]);
      }
      for (const [x, z] of pts) pairs.push([new THREE.Vector3(x, -legH, z), new THREE.Vector3(x, 0, z)]);
      if (box)
        for (let i = 0; i < nx - 1; i++)
          for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) {
            const x0 = -w / 2 + 0.15 + (i / (nx - 1)) * (w - 0.3), x1 = -w / 2 + 0.15 + ((i + 1) / (nx - 1)) * (w - 0.3);
            pairs.push([new THREE.Vector3(x0, -legH + 0.2, z), new THREE.Vector3(x1, -0.15, z)]);
          }
      const g = tubesBetween(pairs, 0.045);
      if (g) out.push({ geo: g, mat: m.steel });
      // dark underside so raised decks don't look paper thin
    }
    return out;
  }, [box, round, stairs, w, h, d, raised, grounded, isLedTop, obj.kind, obj.pos[1], hexSides]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => geos?.forEach((g) => g.geo.dispose()), [geos]);
  if (!geos) return null;
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g.geo} material={g.mat} raycast={noRay} receiveShadow castShadow={g.mat !== mats().seams} />
      ))}
    </>
  );
}
