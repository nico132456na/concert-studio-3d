import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ObjectKind, Vec3 } from '../types';

/**
 * Unit geometries (1×1×1, base at y=0) shared between all objects of the same kind.
 * Objects are scaled to their size in meters, so geometry is built once and reused (cheap on iPad).
 */
export interface KindGeometry {
  main: THREE.BufferGeometry;
  /** separate LED face (front screen) */
  screen?: THREE.BufferGeometry;
  /** render main with BackSide (curved screens) */
  mainBack?: boolean;
}

const cache = new Map<string, KindGeometry>();

function merge(geos: THREE.BufferGeometry[]) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  list.forEach((g) => {
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.getAttribute('position').count) * 2), 2));
  });
  const m = mergeGeometries(list, false)!;
  m.computeBoundingBox();
  m.computeBoundingSphere();
  return m;
}

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** a thin bar between two points (unit space) */
function bar(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(t, t, len);
  const m = new THREE.Matrix4().lookAt(a, b, Math.abs(b.x - a.x) < 1e-6 && Math.abs(b.z - a.z) < 1e-6 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
  g.applyMatrix4(m);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** box truss along X (x ∈ [-0.5,0.5], y ∈ [0,1], z ∈ [-0.5,0.5]) with n bays */
function trussGeo(n: number, t = 0.09) {
  const parts: THREE.BufferGeometry[] = [];
  const c = [
    [0.05, -0.45],
    [0.05, 0.45],
    [0.95, 0.45],
    [0.95, -0.45],
  ];
  for (const [y, z] of c) parts.push(box(1, t, t, 0, y, z));
  for (let i = 0; i < n; i++) {
    const x0 = -0.5 + i / n, x1 = -0.5 + (i + 1) / n;
    for (let f = 0; f < 4; f++) {
      const p = c[f], q = c[(f + 1) % 4];
      const flip = i % 2;
      parts.push(bar(new THREE.Vector3(x0, flip ? p[0] : q[0], flip ? p[1] : q[1]), new THREE.Vector3(x1, flip ? q[0] : p[0], flip ? q[1] : p[1]), t * 0.55));
    }
  }
  return merge(parts);
}

function wedge() {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.99 && pos.getZ(i) > 0.49) pos.setY(i, 0.001);
  g.computeVertexNormals();
  return g;
}

function curvedScreen(seg = 40, T = Math.PI / 3) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = -T + (2 * T * i) / seg;
    const x = Math.sin(t) / (2 * Math.sin(T));
    const z = 0.5 - (Math.cos(t) - Math.cos(T)) / (1 - Math.cos(T));
    pos.push(x, 0, z, x, 1, z);
    uv.push(i / seg, 0, i / seg, 1);
    if (i < seg) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function build(kind: ObjectKind, variant: number): KindGeometry {
  switch (kind) {
    case 'platform':
    case 'runway':
    case 'floating':
    case 'cube':
    case 'monolith':
    case 'glassPanel':
    case 'ledPillar':
    case 'ledFloor':
    case 'catwalk':
      return { main: box(1, 1, 1, 0, 0.5, 0) };
    case 'circlePlatform':
    case 'bstage':
    case 'cylinder':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, 56).translate(0, 0.5, 0) };
    case 'column':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, 24).translate(0, 0.5, 0) };
    case 'hexPlatform':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0) };
    case 'stairs': {
      const n = 6;
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        const h = (i + 1) / n;
        parts.push(box(1, h, 1 / n, 0, h / 2, 0.5 - (i + 0.5) / n));
      }
      return { main: merge(parts) };
    }
    case 'ramp':
    case 'wedge':
      return { main: wedge() };
    case 'ledWall':
    case 'ledVertical':
    case 'ledHorizontal':
    case 'ledHanging':
      return {
        main: box(1, 1, 1, 0, 0.5, 0),
        screen: new THREE.PlaneGeometry(0.985, 0.97).translate(0, 0.5, 0.502),
      };
    case 'ledCircle':
      return {
        main: new THREE.CylinderGeometry(0.5, 0.5, 1, 64).rotateX(Math.PI / 2).translate(0, 0.5, 0),
        screen: new THREE.CircleGeometry(0.485, 64).translate(0, 0.5, 0.502),
      };
    case 'ledCurved': {
      const s = curvedScreen();
      return { main: s.clone(), screen: s, mainBack: true };
    }
    case 'truss':
      return { main: trussGeo(variant) };
    case 'trussTower': {
      const g = trussGeo(variant).rotateZ(Math.PI / 2).translate(0.5, 0.5, 0);
      return { main: g };
    }
    case 'beam':
      return { main: merge([box(1, 0.14, 1, 0, 0.93, 0), box(1, 0.14, 1, 0, 0.07, 0), box(1, 0.75, 0.22, 0, 0.5, 0)]) };
    case 'lightTower': {
      const tower = trussGeo(14, 0.09).rotateZ(Math.PI / 2).translate(0.5, 0.5, 0).scale(0.22, 0.95, 0.4);
      const cross = trussGeo(4, 0.09).scale(1, 0.06, 0.35).translate(0, 0.92, 0);
      const base = box(0.6, 0.02, 0.9, 0, 0.01, 0);
      return { main: merge([tower, cross, base]) };
    }
    case 'frame':
      return { main: merge([box(0.05, 1, 1, -0.475, 0.5, 0), box(0.05, 1, 1, 0.475, 0.5, 0), box(1, 0.06, 1, 0, 0.97, 0)]) };
    case 'arch': {
      const a = new THREE.TorusGeometry(0.47, 0.03, 12, 48, Math.PI).scale(1, 2.05, 16);
      return { main: a };
    }
    case 'scaffold': {
      const parts: THREE.BufferGeometry[] = [];
      const t = 0.025;
      const xs = [-0.49, -0.165, 0.165, 0.49];
      for (const x of xs) for (const z of [-0.49, 0.49]) parts.push(box(t, 1, t * 3, x, 0.5, z));
      for (const y of [0.01, 0.34, 0.67, 0.99]) for (const z of [-0.49, 0.49]) parts.push(box(1, t, t * 3, 0, y, z));
      for (const y of [0.34, 0.67, 0.99]) for (const x of xs) parts.push(box(t, t, 1, x, y, 0));
      for (let i = 0; i < 3; i++) parts.push(bar(new THREE.Vector3(xs[i], 0.01, 0.49), new THREE.Vector3(xs[i + 1], 0.99, 0.49), t));
      parts.push(box(1, 0.02, 1, 0, 0.99, 0));
      return { main: merge(parts) };
    }
    case 'curtain': {
      const g = new THREE.PlaneGeometry(1, 1, 96, 1).translate(0, 0.5, 0);
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * Math.PI * 28) * 0.4);
      g.computeVertexNormals();
      return { main: g };
    }
    case 'fabric': {
      const g = new THREE.PlaneGeometry(1, 1, 24, 24).rotateX(-Math.PI / 2);
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, 0.5 + (x * x - z * z) * 2);
      }
      g.computeVertexNormals();
      return { main: g };
    }
    case 'sphere':
      return { main: new THREE.SphereGeometry(0.5, 40, 24).translate(0, 0.5, 0) };
    case 'ring':
      return { main: new THREE.TorusGeometry(0.46, 0.04, 16, 80).scale(1, 1, 12.5).translate(0, 0.5, 0) };
    case 'torus':
      return { main: new THREE.TorusGeometry(0.42, 0.08, 16, 72).rotateX(Math.PI / 2).scale(1, 6.25, 1).translate(0, 0.5, 0) };
    case 'pyramid':
      return { main: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0) };
    case 'cone':
      return { main: new THREE.ConeGeometry(0.5, 1, 32).translate(0, 0.5, 0) };
    default:
      return { main: box(1, 1, 1, 0, 0.5, 0) };
  }
}

export function variantFor(kind: ObjectKind, size: Vec3) {
  if (kind === 'truss') return Math.max(2, Math.min(60, Math.round(size[0] / Math.max(0.2, size[1]))));
  if (kind === 'trussTower') return Math.max(2, Math.min(60, Math.round(size[1] / Math.max(0.2, size[0]))));
  return 0;
}

export function getGeometry(kind: ObjectKind, size: Vec3): KindGeometry {
  const v = variantFor(kind, size);
  const key = `${kind}:${v}`;
  let g = cache.get(key);
  if (!g) {
    g = build(kind, v);
    cache.set(key, g);
  }
  return g;
}

/** Which UV-based LED face is used: whole surface for these */
export function ledWholeSurface(kind: ObjectKind) {
  return kind === 'ledPillar' || kind === 'ledFloor';
}
