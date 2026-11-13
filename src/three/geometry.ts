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

function build(kind: ObjectKind, variant: number, outline?: [number, number][]): KindGeometry {
  const ext = buildExtended(kind, outline);
  if (ext) return ext;
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


/* ---------- extended shape helpers ---------- */

/** Normalize any geometry into the unit box (x,z ∈ [-0.5,0.5], y ∈ [0,1]). */
function normalize(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const sx = b.max.x - b.min.x || 1, sy = b.max.y - b.min.y || 1, sz = b.max.z - b.min.z || 1;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(1 / sx, 1 / sy, 1 / sz);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** Extrude a 2D outline (x, z in plan) upward into a deck. */
function extrudePlan(shape: THREE.Shape, segs = 48) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: segs });
  g.rotateX(-Math.PI / 2); // shape XY → plan XZ (shape y becomes -z), extrusion → +y
  return normalize(g);
}

function poly(points: [number, number][]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

function arcBand(r0: number, r1: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

function jitter(g: THREE.BufferGeometry, amt: number, seed: number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const map = new Map<string, [number, number, number]>();
  let k = seed;
  const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, [rnd() * amt, rnd() * amt * 0.6, rnd() * amt]);
    const d = map.get(key)!;
    if (pos.getY(i) > 0.02) pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  return g;
}

/** Bars along the edges of a geometry (lattice look). */
function latticeOf(g: THREE.BufferGeometry, t: number, filter?: (a: THREE.Vector3, b: THREE.Vector3) => boolean) {
  const e = new THREE.EdgesGeometry(g, 1);
  const p = e.getAttribute('position');
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < p.count; i += 2) {
    const a = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const b = new THREE.Vector3(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1));
    if (filter && !filter(a, b)) continue;
    if (a.distanceTo(b) < 1e-4) continue;
    parts.push(bar(a, b, t));
  }
  return merge(parts);
}

function ringTruss(arc = Math.PI * 2, n = 40) {
  const parts: THREE.BufferGeometry[] = [];
  const t = 0.012;
  const R = [0.5, 0.44];
  const Y = [0.05, 0.95];
  const pt = (r: number, a: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * arc, a1 = ((i + 1) / n) * arc;
    for (const r of R) for (const y of Y) parts.push(bar(pt(r, a0, y), pt(r, a1, y), t * 1.6));
    parts.push(bar(pt(R[0], a0, Y[0]), pt(R[0], a1, Y[1]), t));
    parts.push(bar(pt(R[1], a0, Y[1]), pt(R[1], a1, Y[0]), t));
    parts.push(bar(pt(R[0], a0, Y[0]), pt(R[1], a0, Y[0]), t));
    parts.push(bar(pt(R[0], a0, Y[1]), pt(R[1], a0, Y[1]), t));
  }
  return normalize(merge(parts));
}

function speakerBox(w: number, h: number, d: number, x: number, y: number, z: number, cones: number, tilt = 0) {
  const parts: THREE.BufferGeometry[] = [box(w, h, d, 0, 0, 0)];
  for (let i = 0; i < cones; i++) {
    const cx = cones === 1 ? 0 : (i / (cones - 1) - 0.5) * w * 0.5;
    const r = Math.min(w / (cones + 0.6), h) * 0.38;
    parts.push(new THREE.CylinderGeometry(r, r * 0.7, 0.04, 16).rotateX(Math.PI / 2).translate(cx, 0, d / 2 + 0.01));
  }
  const g = merge(parts);
  if (tilt) g.rotateX(tilt);
  g.translate(x, y, z);
  return g;
}

/** Simple outline smoothing for custom stages (Chaikin). */
export function smoothOutline(pts: [number, number][], iterations = 2): [number, number][] {
  let p = pts;
  for (let k = 0; k < iterations; k++) {
    const out: [number, number][] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

function buildExtended(kind: ObjectKind, outline?: [number, number][]): KindGeometry | null {
  switch (kind) {
    case 'ovalPlatform':
    case 'ledCylinder':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, 56).translate(0, 0.5, 0) };
    case 'octagon':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).rotateY(Math.PI / 8).translate(0, 0.5, 0) };
    case 'semicircle': {
      const s = new THREE.Shape();
      s.moveTo(-1, 0);
      s.absarc(0, 0, 1, Math.PI, 0, false);
      s.lineTo(-1, 0);
      return { main: extrudePlan(s) };
    }
    case 'trianglePlatform':
      return { main: extrudePlan(poly([[-0.5, 0.5], [0.5, 0.5], [0, -0.5]])) };
    case 'diamond':
      return { main: extrudePlan(poly([[0, 0.5], [0.5, 0], [0, -0.5], [-0.5, 0]])) };
    case 'crossStage': {
      const a = 0.16;
      return { main: extrudePlan(poly([[-a, 0.5], [a, 0.5], [a, a], [0.5, a], [0.5, -a], [a, -a], [a, -0.5], [-a, -0.5], [-a, -a], [-0.5, -a], [-0.5, a], [-a, a]])) };
    }
    case 'tStage': // wide bar at the back (shape y up = -z back), runway toward +z
      return { main: extrudePlan(poly([[-0.5, 0.5], [0.5, 0.5], [0.5, 0.15], [0.1, 0.15], [0.1, -0.5], [-0.1, -0.5], [-0.1, 0.15], [-0.5, 0.15]])) };
    case 'uStage':
      return { main: extrudePlan(poly([[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [0.25, -0.5], [0.25, 0.2], [-0.25, 0.2], [-0.25, -0.5], [-0.5, -0.5]])) };
    case 'lStage':
      return { main: extrudePlan(poly([[-0.5, 0.5], [0.5, 0.5], [0.5, 0.15], [-0.15, 0.15], [-0.15, -0.5], [-0.5, -0.5]])) };
    case 'hStage':
      return { main: extrudePlan(poly([[-0.5, 0.5], [-0.22, 0.5], [-0.22, 0.1], [0.22, 0.1], [0.22, 0.5], [0.5, 0.5], [0.5, -0.5], [0.22, -0.5], [0.22, -0.1], [-0.22, -0.1], [-0.22, -0.5], [-0.5, -0.5]])) };
    case 'ringStage': {
      const s = new THREE.Shape();
      s.absarc(0, 0, 1, 0, Math.PI * 2, false);
      const h = new THREE.Path();
      h.absarc(0, 0, 0.72, 0, Math.PI * 2, true);
      s.holes.push(h);
      return { main: extrudePlan(s, 64) };
    }
    case 'curvedRunway':
      return { main: extrudePlan(arcBand(0.82, 1, -Math.PI / 2, 0), 40) };
    case 'spiralRunway': {
      const parts: THREE.BufferGeometry[] = [];
      const n = 48;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const a = t * Math.PI * 3;
        const r = 0.42 - t * 0.12;
        const seg = new THREE.BoxGeometry(0.16, 0.05, ((Math.PI * 3 * r) / n) * 1.25);
        seg.rotateY(-a);
        seg.translate(Math.cos(a) * r, t * 0.95 + 0.025, Math.sin(a) * r);
        parts.push(seg);
      }
      parts.push(new THREE.CylinderGeometry(0.06, 0.06, 1, 12).translate(0, 0.5, 0));
      return { main: normalize(merge(parts)) };
    }
    case 'waveStage': {
      const s = new THREE.Shape();
      s.moveTo(-0.5, 0);
      for (let i = 0; i <= 40; i++) {
        const x = -0.5 + i / 40;
        s.lineTo(x, 0.7 + Math.sin(i / 40 * Math.PI * 3) * 0.3);
      }
      s.lineTo(0.5, 0);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.5);
      return { main: normalize(g) };
    }
    case 'halfSphere':
      return { main: normalize(new THREE.SphereGeometry(0.5, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2)) };
    case 'mountain':
      return { main: normalize(jitter(new THREE.ConeGeometry(0.5, 1, 9, 4).toNonIndexed(), 0.16, 7)) };
    case 'rotatingPlatform':
    case 'lift':
      return { main: new THREE.CylinderGeometry(0.5, 0.5, 1, kind === 'lift' ? 4 : 48).rotateY(kind === 'lift' ? Math.PI / 4 : 0).scale(kind === 'lift' ? Math.SQRT2 : 1, 1, kind === 'lift' ? Math.SQRT2 : 1).translate(0, 0.5, 0) };
    case 'custom': {
      const pts = outline && outline.length >= 3 ? outline : ([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] as [number, number][]);
      return { main: extrudePlan(poly(pts.map(([x, z]) => [x, -z] as [number, number])), 12) };
    }
    case 'circleTruss':
      return { main: ringTruss() };
    case 'curvedTruss':
      return { main: ringTruss(Math.PI * 0.6, 16) };
    case 'triangleTruss': {
      const parts: THREE.BufferGeometry[] = [];
      const t = 0.09;
      const c: [number, number][] = [[0.05, -0.45], [0.05, 0.45], [0.95, 0]];
      for (const [y, z] of c) parts.push(box(1, t, t, 0, y, z));
      const n = 14;
      for (let i = 0; i < n; i++) {
        const x0 = -0.5 + i / n, x1 = -0.5 + (i + 1) / n;
        for (let f = 0; f < 3; f++) {
          const p = c[f], q = c[(f + 1) % 3];
          parts.push(bar(new THREE.Vector3(x0, p[0], p[1]), new THREE.Vector3(x1, q[0], q[1]), t * 0.5));
        }
      }
      return { main: merge(parts) };
    }
    case 'trussGrid': {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i <= 5; i++) {
        parts.push(box(1, 0.5, 0.02, 0, 0.5, -0.5 + i / 5));
        parts.push(box(0.02, 0.5, 1, -0.5 + i / 5, 0.5, 0));
      }
      return { main: merge(parts) };
    }
    case 'cubeFrame':
      return { main: latticeOf(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), 0.04) };
    case 'geoDome': {
      const ico = new THREE.IcosahedronGeometry(0.5, 2).translate(0, 0, 0);
      const g = latticeOf(ico, 0.012, (a, b) => a.y > -0.01 && b.y > -0.01);
      return { main: normalize(g) };
    }
    case 'geoFrame':
      return { main: normalize(latticeOf(new THREE.IcosahedronGeometry(0.5, 1), 0.015)) };
    case 'sculpture':
      return { main: normalize(new THREE.TorusKnotGeometry(0.35, 0.1, 160, 16, 2, 3)) };
    case 'tree': {
      const parts = [new THREE.CylinderGeometry(0.05, 0.08, 0.35, 8).translate(0, 0.175, 0)];
      [0.3, 0.5, 0.68].forEach((y, i) => parts.push(new THREE.ConeGeometry(0.5 - i * 0.12, 0.42, 9).translate(0, y + 0.2, 0)));
      return { main: normalize(merge(parts)) };
    }
    case 'rock':
      return { main: normalize(jitter(new THREE.IcosahedronGeometry(0.5, 1).toNonIndexed(), 0.25, 31)) };
    case 'ribbedWall': {
      const parts = [box(1, 1, 0.2, 0, 0.5, -0.4)];
      for (let i = 0; i < 16; i++) parts.push(box(0.025, 1, 0.8, -0.48 + i * 0.064, 0.5, 0.05));
      return { main: merge(parts) };
    }
    case 'railing': {
      const parts = [box(1, 0.06, 1, 0, 0.97, 0), box(1, 0.04, 0.6, 0, 0.5, 0)];
      for (let i = 0; i <= 6; i++) parts.push(box(0.012, 1, 0.8, -0.5 + i / 6, 0.5, 0));
      return { main: merge(parts) };
    }
    case 'ledSphere':
      return { main: new THREE.SphereGeometry(0.5, 64, 40).translate(0, 0.5, 0) };
    case 'ledCube':
    case 'ledCeiling':
      return { main: box(1, 1, 1, 0, 0.5, 0) };
    case 'ledTunnel': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
      return { main: normalize(g), mainBack: false };
    }
    case 'ledArch': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
      return { main: normalize(g) };
    }
    case 'ledTransparent':
      return { main: new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0) };
    case 'lineArray': {
      const parts: THREE.BufferGeometry[] = [box(1, 0.04, 1, 0, 0.98, 0)];
      const n = 12;
      let y = 0.94;
      for (let i = 0; i < n; i++) {
        const tilt = (i / n) ** 2 * 0.5;
        parts.push(speakerBox(1, 1 / n - 0.006, 0.85, 0, y - 0.5 / n, -tilt * 0.3, 2, tilt));
        y -= 1 / n;
      }
      return { main: normalize(merge(parts)) };
    }
    case 'subwoofer':
      return { main: normalize(speakerBox(1, 1, 1, 0, 0.5, 0, 2)) };
    case 'groundStack': {
      const parts = [speakerBox(1, 0.3, 0.9, 0, 0.15, 0, 2), speakerBox(1, 0.3, 0.9, 0, 0.45, 0, 2), speakerBox(0.9, 0.18, 0.8, 0, 0.7, 0, 2, 0.05), speakerBox(0.9, 0.18, 0.8, 0, 0.88, 0, 2, 0.12)];
      return { main: normalize(merge(parts)) };
    }
    case 'speakerCab':
      return { main: normalize(speakerBox(1, 1, 1, 0, 0.5, 0, 1)) };
    case 'wedgeMonitor': {
      const w = wedge().toNonIndexed();
      return { main: normalize(merge([w, new THREE.CylinderGeometry(0.22, 0.16, 0.04, 16).rotateX(-Math.PI / 4).translate(0, 0.52, 0.02)])) };
    }
    case 'speakerTower': {
      const parts = [new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8).translate(0, 0.33, 0), box(0.6, 0.02, 0.6, 0, 0.01, 0), speakerBox(1, 0.18, 0.8, 0, 0.75, 0, 2), speakerBox(1, 0.18, 0.8, 0, 0.92, 0, 2, 0.1)];
      return { main: normalize(merge(parts)) };
    }
    case 'delayTower': {
      const tower = trussGeo(10, 0.09).rotateZ(Math.PI / 2).translate(0.5, 0.5, 0).scale(0.25, 0.75, 0.25);
      const array: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) array.push(speakerBox(0.55, 0.035, 0.45, 0, 0.95 - i * 0.04, 0.2, 2, i * 0.04));
      return { main: normalize(merge([tower, ...array, box(0.7, 0.02, 0.7, 0, 0.01, 0)])) };
    }
  }
  return null;
}

export function variantFor(kind: ObjectKind, size: Vec3) {
  if (kind === 'truss') return Math.max(2, Math.min(60, Math.round(size[0] / Math.max(0.2, size[1]))));
  if (kind === 'trussTower') return Math.max(2, Math.min(60, Math.round(size[1] / Math.max(0.2, size[0]))));
  return 0;
}

export function getGeometry(kind: ObjectKind, size: Vec3, outline?: [number, number][]): KindGeometry {
  const v = variantFor(kind, size);
  const key = kind === 'custom' ? `custom:${JSON.stringify(outline ?? [])}` : `${kind}:${v}`;
  let g = cache.get(key);
  if (!g) {
    g = build(kind, v, outline);
    cache.set(key, g);
  }
  return g;
}

/** Which UV-based LED face is used: whole surface for these */
const WHOLE = new Set<ObjectKind>(['ledPillar', 'ledFloor', 'ledSphere', 'ledCylinder', 'ledCube', 'ledTunnel', 'ledArch', 'ledCeiling', 'ledTransparent']);
export function ledWholeSurface(kind: ObjectKind) {
  return WHOLE.has(kind);
}
