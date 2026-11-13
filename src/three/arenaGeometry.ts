import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ArenaDef } from '../data/arenas';
import { rng } from '../util/misc';

/** Seats where audience members can be placed: x,y,z + facing yaw. */
export interface SeatSet {
  pos: Float32Array; // xyz triples
  yaw: Float32Array;
  count: number;
}

export interface ArenaBuild {
  /** concrete / structure geometry */
  structure: THREE.BufferGeometry | null;
  /** seating treads with vertex colors */
  seating: THREE.BufferGeometry | null;
  /** emissive ribbon boards & practical lights */
  glow: THREE.BufferGeometry | null;
  /** roof / ceiling / walls (dark) */
  shell: THREE.BufferGeometry | null;
  seats: SeatSet;
  /** glass barriers / suite fronts */
  glass?: THREE.BufferGeometry | null;
  /** every seat (for instanced seat meshes on Ultra) */
  allSeats?: SeatSet;
}

const cache = new Map<string, ArenaBuild>();

class Builder {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: THREE.Color) {
    const i = this.pos.length / 3;
    for (const v of [a, b, c, d]) {
      this.pos.push(v.x, v.y, v.z);
      this.col.push(color.r, color.g, color.b);
    }
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  build(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    // flat-ish normals: non-indexed is heavier; vertex normals are fine for stepped quads since vertices aren't shared
    return g;
  }
}

function seList(n: number) {
  return (t: number) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
  };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function withColor(g: THREE.BufferGeometry, color: THREE.Color) {
  const ng = g.index ? g.toNonIndexed() : g;
  const n = ng.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  ng.deleteAttribute('uv');
  return ng;
}

function mergeList(list: THREE.BufferGeometry[]) {
  const clean = list.filter(Boolean).map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
    return ng;
  });
  if (!clean.length) return null;
  return mergeGeometries(clean, false);
}

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return withColor(g, new THREE.Color(color));
}

/* ------------------------------ bowl arenas ------------------------------ */

function buildBowl(a: ArenaDef): ArenaBuild {
  const b = a.bowl!;
  const se = seList(b.n);
  const segs = 140;
  const seat = new Builder();
  const glowB = new Builder();
  const struct: THREE.BufferGeometry[] = [];
  const seatPos: number[] = [];
  const seatYaw: number[] = [];
  const r = rng(42);
  const seatA = new THREE.Color('#2b2f38');
  const seatB = new THREE.Color('#23262d');
  const riser = new THREE.Color('#15161a');
  const ribbon = new THREE.Color('#3355ff');
  let outer = 0;
  let topH = 0;

  const pt = (t: number, d: number, y: number) => {
    const [ex, ez] = se(t);
    return V(b.cx + ex * (b.a + d), y, b.cz + ez * (b.b + d));
  };
  const glassB = new Builder();
  const glassC = new THREE.Color('#9fc4ff');
  const allPos: number[] = [];
  const allYaw: number[] = [];
  // entrance tunnels (vomitories) through the lower tier
  const tunnelEvery = Math.floor(segs / 10);
  const isTunnel = (i: number, row: number, k: number) => k === 0 && row < 7 && i % tunnelEvery < 3;

  for (let k = 0; k < b.tiers; k++) {
    const d0 = k * b.rows * b.rowDepth * 0.72 + k * 1.5;
    const h0 = 1.4 + k * (b.rows * b.rise + 3.2);
    for (let row = 0; row < b.rows; row++) {
      const d = d0 + row * b.rowDepth;
      const h = h0 + row * b.rise;
      const col = row % 2 ? seatA : seatB;
      for (let i = 0; i < segs; i++) {
        const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
        const p0 = pt(t0, d, h), p1 = pt(t1, d, h);
        if (p0.z < b.cut || p1.z < b.cut) continue;
        if (isTunnel(i, row, k)) continue;
        const q0 = pt(t0, d + b.rowDepth, h), q1 = pt(t1, d + b.rowDepth, h);
        for (let s3 = 0; s3 < 3; s3++) {
          const sp = pt(t0 + ((t1 - t0) * (s3 + 0.5)) / 3, d + b.rowDepth * 0.55, h);
          allPos.push(sp.x, sp.y, sp.z);
          allYaw.push(Math.atan2(b.cx - sp.x, b.cz - sp.z));
        }
        seat.quad(p0, q0, q1, p1, col);
        const u0 = pt(t0, d + b.rowDepth, h + b.rise), u1 = pt(t1, d + b.rowDepth, h + b.rise);
        seat.quad(q0, u0, u1, q1, riser);
        if (r() < 0.5) {
          const tm = (t0 + t1) / 2;
          const sp = pt(tm, d + b.rowDepth * 0.55, h);
          seatPos.push(sp.x, sp.y, sp.z);
          seatYaw.push(Math.atan2(b.cx - sp.x, b.cz - sp.z) + (r() - 0.5) * 0.4);
        }
      }
    }
    // tier fascia with LED ribbon board
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
      const p0 = pt(t0, d0, 0), p1 = pt(t1, d0, 0);
      if (p0.z < b.cut || p1.z < b.cut) continue;
      const base = k === 0 ? 0 : h0 - 2.2;
      seat.quad(pt(t0, d0, base), pt(t1, d0, base), pt(t1, d0, h0 - 0.5), pt(t0, d0, h0 - 0.5), riser);
      glowB.quad(pt(t0, d0 - 0.02, h0 - 0.5), pt(t1, d0 - 0.02, h0 - 0.5), pt(t1, d0 - 0.02, h0), pt(t0, d0 - 0.02, h0), ribbon);
      // glass barrier + handrail on the tier front
      glassB.quad(pt(t0, d0 + 0.05, h0), pt(t1, d0 + 0.05, h0), pt(t1, d0 + 0.05, h0 + 1.05), pt(t0, d0 + 0.05, h0 + 1.05), glassC);
      if (i % 2 === 0) {
        const a = pt(t0, d0 + 0.05, h0 + 1.08), c2 = pt(t1, d0 + 0.05, h0 + 1.08);
        const g = new THREE.BoxGeometry(a.distanceTo(c2) * 2.05, 0.06, 0.06);
        g.rotateY(-Math.atan2(c2.z - a.z, c2.x - a.x));
        g.translate((a.x + c2.x) / 2, a.y, (a.z + c2.z) / 2);
        struct.push(withColor(g, new THREE.Color('#b8bcc4')));
      }
      // tunnel mouths with exit signs
      if (k === 0 && i % tunnelEvery === 1) {
        const m0 = pt(t0, d0 - 0.01, 0), m1 = pt(t1 + (t1 - t0), d0 - 0.01, 0);
        seat.quad(m0, m1, V(m1.x, 3.2, m1.z), V(m0.x, 3.2, m0.z), new THREE.Color('#030304'));
        const sc = pt(t1, d0 - 0.06, 3.5);
        glowB.quad(V(sc.x - 0.5, 3.4, sc.z), V(sc.x + 0.5, 3.4, sc.z), V(sc.x + 0.5, 3.75, sc.z), V(sc.x - 0.5, 3.75, sc.z), new THREE.Color('#1aff6a'));
      }
      // VIP suite windows between the tiers
      if (k === 1) {
        glowB.quad(pt(t0, d0 - 0.3, h0 - 2.1), pt(t1, d0 - 0.3, h0 - 2.1), pt(t1, d0 - 0.3, h0 - 0.9), pt(t0, d0 - 0.3, h0 - 0.9), i % 3 === 0 ? new THREE.Color('#2a1d10') : new THREE.Color('#ffcf8a').multiplyScalar(0.55));
      }
    }
    outer = d0 + b.rows * b.rowDepth;
    topH = h0 + b.rows * b.rise;
  }

  // back wall + roof
  const shell = new Builder();
  const wall = new THREE.Color('#0d0e11');
  const ceil = a.ceiling ?? topH + 6;
  for (let i = 0; i < segs; i++) {
    const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
    shell.quad(pt(t0, outer, 0), pt(t0, outer, a.ceiling ? ceil : topH + 3), pt(t1, outer, a.ceiling ? ceil : topH + 3), pt(t1, outer, 0), wall);
    if (a.ceiling && a.id === 'modern') {
      const wave = (t: number) => Math.sin(t * 5) * 3.5;
      const roofC = new THREE.Color('#d9dde3');
      for (let r = 0; r < 6; r++) {
        const f0 = r / 6, f1 = (r + 1) / 6;
        const ring = (t: number, f: number) => {
          const p = pt(t, outer * (1 - f) - (b.a * 0.75) * f, 0);
          return V(p.x * (1 - f * 0.25) + b.cx * f * 0.25, ceil + wave(t) * (1 - f) + f * 6, p.z * (1 - f * 0.25) + b.cz * f * 0.25);
        };
        shell.quad(ring(t0, f0), ring(t0, f1), ring(t1, f1), ring(t1, f0), roofC.clone().multiplyScalar(0.55 + f1 * 0.2));
      }
      const o0 = pt(t0, -b.a * 0.75, 0), o1 = pt(t1, -b.a * 0.75, 0);
      const oc = (p: THREE.Vector3) => V(p.x * 0.75 + b.cx * 0.25, ceil + 6, p.z * 0.75 + b.cz * 0.25);
      glowB.quad(oc(o0), oc(o1), V(oc(o1).x, ceil + 6.6, oc(o1).z), V(oc(o0).x, ceil + 6.6, oc(o0).z), new THREE.Color('#9ec9ff'));
    } else if (a.ceiling) {
      const c = V(b.cx, ceil + 4, b.cz);
      shell.quad(pt(t0, outer, ceil), c, c, pt(t1, outer, ceil), wall);
    }
  }
  // roof truss grid
  if (a.ceiling) {
    const ext = Math.max(b.a, b.b) + outer;
    const steel = '#3a3d44';
    for (let x = -b.a; x <= b.a; x += 8) struct.push(boxAt(0.7, 1.4, (b.b + outer) * 1.8, x, ceil - 1.5, b.cz, steel));
    for (let z = b.cz - b.b; z <= b.cz + b.b; z += 10) struct.push(boxAt((b.a + outer) * 1.8, 1.0, 0.6, 0, ceil - 2.6, z, steel));
    void ext;
    // center-hung scoreboard style cube (pushed back behind audience area for end-stage layout)
    struct.push(boxAt(8, 5, 8, 0, ceil - 9, b.cz + b.b * 0.35, '#111216'));
    // house PA clusters
    for (const [sx, sz] of [[-1, 0.2], [1, 0.2], [-0.6, 0.75], [0.6, 0.75]]) {
      for (let j = 0; j < 6; j++) struct.push(boxAt(1.2, 0.45, 1, sx * b.a * 0.55, ceil - 6 - j * 0.48, b.cz + sz * b.b, '#0d0d0f'));
    }
    glowB.pos.length; // keep
  }
  // concourse lights (small glowing dots along the top)
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const p = pt(t, outer - 0.1, topH + 1.5);
    if (p.z < b.cut) continue;
    struct.push(boxAt(0.6, 0.3, 0.6, p.x, p.y, p.z, '#ffffff'));
  }

  // open-air stadiums: roof canopy ring
  if (!a.ceiling) {
    const cano = new THREE.Color('#1a1c22');
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
      if (pt(t0, 0, 0).z < b.cut - 8) continue;
      shell.quad(pt(t0, outer, topH + 3), pt(t0, outer - 18, topH + 6), pt(t1, outer - 18, topH + 6), pt(t1, outer, topH + 3), cano);
      shell.quad(pt(t1, outer, topH + 3), pt(t1, outer - 18, topH + 6), pt(t0, outer - 18, topH + 6), pt(t0, outer, topH + 3), cano);
    }
    // floodlight masts
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * (b.a + outer - 4), z = b.cz + sz * (b.b + outer - 4);
      struct.push(boxAt(1.2, topH + 18, 1.2, x, (topH + 18) / 2, z, '#2a2c31'));
      glowB.quad(V(x - 4, topH + 16, z - sz * 0.8), V(x + 4, topH + 16, z - sz * 0.8), V(x + 4, topH + 20, z - sz * 0.8), V(x - 4, topH + 20, z - sz * 0.8), new THREE.Color('#fff4d6'));
    }
  }

  return {
    structure: mergeList(struct),
    seating: seat.build(),
    glow: glowB.build(),
    shell: shell.build(),
    seats: { pos: new Float32Array(seatPos), yaw: new Float32Array(seatYaw), count: seatYaw.length },
    glass: glassB.build(),
    allSeats: { pos: new Float32Array(allPos), yaw: new Float32Array(allYaw), count: allYaw.length },
  };
}

/* ------------------------------ theater ------------------------------ */

function buildTheater(a: ArenaDef): ArenaBuild {
  const seat = new Builder();
  const glowB = new Builder();
  const struct: THREE.BufferGeometry[] = [];
  const seatPos: number[] = [], seatYaw: number[] = [];
  const red = new THREE.Color('#5a1015'), red2 = new THREE.Color('#4a0c10'), riser = new THREE.Color('#1a0e0c');
  const W = 26;
  // raked stalls
  for (let row = 0; row < 18; row++) {
    const z = 12 + row * 0.95, h = row * 0.22;
    seat.quad(V(-W / 2, h, z), V(-W / 2, h, z + 0.95), V(W / 2, h, z + 0.95), V(W / 2, h, z), row % 2 ? red : red2);
    seat.quad(V(-W / 2, h, z + 0.95), V(-W / 2, h + 0.22, z + 0.95), V(W / 2, h + 0.22, z + 0.95), V(W / 2, h, z + 0.95), riser);
    for (let x = -W / 2 + 0.6; x < W / 2; x += 0.6) {
      if (Math.abs(x) < 0.8) continue;
      seatPos.push(x, h, z + 0.5);
      seatYaw.push(Math.PI);
    }
  }
  // balcony
  for (let row = 0; row < 8; row++) {
    const z = 22 + row * 0.95, h = 7 + row * 0.45;
    seat.quad(V(-14, h, z), V(-14, h, z + 0.95), V(14, h, z + 0.95), V(14, h, z), row % 2 ? red : red2);
    seat.quad(V(-14, h, z + 0.95), V(-14, h + 0.45, z + 0.95), V(14, h + 0.45, z + 0.95), V(14, h, z + 0.95), riser);
    for (let x = -13.4; x < 14; x += 0.6) {
      seatPos.push(x, h, z + 0.5);
      seatYaw.push(Math.PI);
    }
  }
  struct.push(boxAt(28, 1.2, 0.4, 0, 6.6, 22, '#2b1a14'));
  glowB.quad(V(-14, 7.25, 21.78), V(14, 7.25, 21.78), V(14, 7.35, 21.78), V(-14, 7.35, 21.78), new THREE.Color('#ffb070'));
  // proscenium
  const pc = '#2a1a16';
  struct.push(boxAt(5, 18, 2, -13.5, 9, 1.5, pc), boxAt(5, 18, 2, 13.5, 9, 1.5, pc), boxAt(22, 5, 2, 0, 15.5, 1.5, pc));
  glowB.quad(V(-11, 13.2, 2.55), V(11, 13.2, 2.55), V(11, 13.4, 2.55), V(-11, 13.4, 2.55), new THREE.Color('#d9a740'));
  // wall sconces
  for (let z = 6; z < 28; z += 5) {
    struct.push(boxAt(0.3, 0.6, 0.3, -15.8, 5, z, '#ffd7a3'), boxAt(0.3, 0.6, 0.3, 15.8, 5, z, '#ffd7a3'));
  }
  // room shell (inside faces)
  const shell = new Builder();
  const wall = new THREE.Color('#1c1311');
  const [x0, x1, z0, z1, h] = [-16, 16, -14, 31, 18];
  shell.quad(V(x0, 0, z0), V(x0, h, z0), V(x0, h, z1), V(x0, 0, z1), wall);
  shell.quad(V(x1, 0, z1), V(x1, h, z1), V(x1, h, z0), V(x1, 0, z0), wall);
  shell.quad(V(x0, 0, z1), V(x0, h, z1), V(x1, h, z1), V(x1, 0, z1), wall);
  shell.quad(V(x1, 0, z0), V(x1, h, z0), V(x0, h, z0), V(x0, 0, z0), wall);
  shell.quad(V(x0, h, z0), V(x1, h, z0), V(x1, h, z1), V(x0, h, z1), new THREE.Color('#140d0c'));
  return { structure: mergeList(struct), seating: seat.build(), glow: glowB.build(), shell: shell.build(), seats: { pos: new Float32Array(seatPos), yaw: new Float32Array(seatYaw), count: seatYaw.length } };
}

/* ------------------------------ amphitheater ------------------------------ */

function buildAmphi(): ArenaBuild {
  const seat = new Builder();
  const struct: THREE.BufferGeometry[] = [];
  const seatPos: number[] = [], seatYaw: number[] = [];
  const stone = new THREE.Color('#4a463e'), stone2 = new THREE.Color('#403c35'), riser = new THREE.Color('#2a2722');
  const segs = 72;
  const A = (Math.PI / 180) * 105;
  const r = rng(5);
  const p = (t: number, rad: number, y: number) => V(Math.sin(t) * rad, y, Math.cos(t) * rad);
  for (let row = 0; row < 36; row++) {
    const rad = 14 + row * 0.95, h = row * 0.48;
    for (let i = 0; i < segs; i++) {
      const t0 = -A + (2 * A * i) / segs, t1 = -A + (2 * A * (i + 1)) / segs;
      seat.quad(p(t0, rad, h), p(t0, rad + 0.95, h), p(t1, rad + 0.95, h), p(t1, rad, h), row % 2 ? stone : stone2);
      seat.quad(p(t0, rad + 0.95, h), p(t0, rad + 0.95, h + 0.48), p(t1, rad + 0.95, h + 0.48), p(t1, rad + 0.95, h), riser);
      if (r() < 0.7) {
        const sp = p((t0 + t1) / 2, rad + 0.5, h);
        seatPos.push(sp.x, sp.y, sp.z);
        seatYaw.push(Math.atan2(-sp.x, -sp.z));
      }
    }
  }
  // lawn slope above
  const lawn = new THREE.Color('#1c2a17');
  for (let i = 0; i < segs; i++) {
    const t0 = -A + (2 * A * i) / segs, t1 = -A + (2 * A * (i + 1)) / segs;
    seat.quad(p(t0, 48.2, 17.3), p(t0, 70, 26), p(t1, 70, 26), p(t1, 48.2, 17.3), lawn);
  }
  // stage shell (quarter sphere behind stage)
  const sh = new THREE.SphereGeometry(20, 32, 16, Math.PI / 2, Math.PI, 0, Math.PI / 2);
  sh.scale(1.1, 0.75, 0.75);
  sh.translate(0, 0, -6);
  struct.push(withColor(sh, new THREE.Color('#d8d4cc')));
  return { structure: mergeList(struct), seating: seat.build(), glow: null, shell: null, seats: { pos: new Float32Array(seatPos), yaw: new Float32Array(seatYaw), count: seatYaw.length } };
}

/* ------------------------------ warehouse ------------------------------ */

function buildWarehouse(a: ArenaDef): ArenaBuild {
  const struct: THREE.BufferGeometry[] = [];
  const glowB = new Builder();
  const steel = '#2e3036';
  const h = a.ceiling!;
  const hall = a.id === 'hall';
  const [x0, x1, z0, z1] = [a.floor.xMin, a.floor.xMax, a.floor.zMin - 2, a.floor.zMax + 4];
  const W = x1 - x0;
  const colX = hall ? [-26, 26] : [-12, 12];
  for (const x of colX) for (let z = 8; z <= z1 - 6; z += hall ? 16 : 12) struct.push(boxAt(hall ? 1 : 0.6, h, hall ? 1 : 0.6, x, h / 2, z, steel));
  for (let z = z0 + 2; z <= z1 - 2; z += 6) {
    struct.push(boxAt(W, 0.5, 0.4, 0, h - 1.2, z, steel));
    struct.push(boxAt(W, 0.25, 0.25, 0, h - 2.6, z, steel));
    for (let x = x0 + 2; x <= x1 - 2; x += 4) struct.push(boxAt(0.15, 1.4, 0.15, x, h - 1.9, z, steel));
  }
  const win = hall ? new THREE.Color('#2a3a5a') : new THREE.Color('#1a2a4a');
  for (let z = 0; z < z1 - 4; z += 8) {
    glowB.quad(V(x0 + 0.05, h * 0.62, z), V(x0 + 0.05, h * 0.78, z), V(x0 + 0.05, h * 0.78, z + 5), V(x0 + 0.05, h * 0.62, z + 5), win);
    glowB.quad(V(x1 - 0.05, h * 0.62, z + 5), V(x1 - 0.05, h * 0.78, z + 5), V(x1 - 0.05, h * 0.78, z), V(x1 - 0.05, h * 0.62, z), win);
  }
  if (hall) {
    // skylights and a raised VIP deck at the back
    for (let z = 4; z < z1 - 8; z += 14) glowB.quad(V(-10, h - 0.05, z), V(10, h - 0.05, z), V(10, h - 0.05, z + 4), V(-10, h - 0.05, z + 4), new THREE.Color('#33415e'));
    struct.push(boxAt(30, 2.5, 10, 0, 1.25, z1 - 10, '#26272b'));
    glowB.quad(V(-15, 2.55, z1 - 15.02), V(15, 2.55, z1 - 15.02), V(15, 2.7, z1 - 15.02), V(-15, 2.7, z1 - 15.02), new THREE.Color('#ffcf8a'));
  }
  // exit signs on the back wall
  for (const x of [-W / 4, W / 4]) glowB.quad(V(x - 1, 3, z1 - 0.1), V(x + 1, 3, z1 - 0.1), V(x + 1, 3.6, z1 - 0.1), V(x - 1, 3.6, z1 - 0.1), new THREE.Color('#1aff6a'));
  const shell = new Builder();
  const wall = new THREE.Color(hall ? '#33322f' : '#2a2826');
  shell.quad(V(x0, 0, z0), V(x0, h, z0), V(x0, h, z1), V(x0, 0, z1), wall);
  shell.quad(V(x1, 0, z1), V(x1, h, z1), V(x1, h, z0), V(x1, 0, z0), wall);
  shell.quad(V(x0, 0, z1), V(x0, h, z1), V(x1, h, z1), V(x1, 0, z1), wall);
  shell.quad(V(x1, 0, z0), V(x1, h, z0), V(x0, h, z0), V(x0, 0, z0), wall);
  shell.quad(V(x0, h, z0), V(x1, h, z0), V(x1, h, z1), V(x0, h, z1), new THREE.Color('#121214'));
  return { structure: mergeList(struct), seating: null, glow: glowB.build(), shell: shell.build(), seats: { pos: new Float32Array(), yaw: new Float32Array(), count: 0 } };
}

/* ------------------------------ festival ------------------------------ */

function buildFestival(): ArenaBuild {
  const struct: THREE.BufferGeometry[] = [];
  const glowB = new Builder();
  const r = rng(9);
  // tree line
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2;
    const rad = 190 + r() * 40;
    const hgt = 12 + r() * 14;
    const g = new THREE.ConeGeometry(4 + r() * 3, hgt, 6).translate(Math.sin(a) * rad, hgt / 2, 40 + Math.cos(a) * rad);
    struct.push(withColor(g, new THREE.Color('#0b120b')));
  }
  // mix tent
  struct.push(boxAt(10, 0.3, 8, 0, 3.2, 62, '#202226'), boxAt(10, 3, 0.2, 0, 1.5, 66, '#18191c'));
  glowB.quad(V(-3, 1.1, 58.1), V(3, 1.1, 58.1), V(3, 1.3, 58.1), V(-3, 1.3, 58.1), new THREE.Color('#ff7a1a'));
  // delay towers
  for (const x of [-30, 30]) {
    struct.push(boxAt(1.2, 16, 1.2, x, 8, 75, '#2a2c31'));
    struct.push(boxAt(3, 5, 1.5, x, 14, 75, '#111'));
  }
  // barriers
  struct.push(boxAt(60, 1.2, 0.3, 0, 0.6, 7, '#5a5d61'));
  // stalls at the back
  for (let i = 0; i < 10; i++) {
    const x = -60 + i * 13;
    struct.push(boxAt(8, 4, 5, x, 2, 135, '#2a2a2e'));
    glowB.quad(V(x - 3.5, 3, 132.4), V(x + 3.5, 3, 132.4), V(x + 3.5, 3.6, 132.4), V(x - 3.5, 3.6, 132.4), new THREE.Color(['#ff7a1a', '#ff2ad4', '#1ae0ff', '#ffc21a'][i % 4]));
  }
  return { structure: mergeList(struct), seating: null, glow: glowB.build(), shell: null, seats: { pos: new Float32Array(), yaw: new Float32Array(), count: 0 } };
}

export function getArenaBuild(a: ArenaDef): ArenaBuild {
  const hit = cache.get(a.id);
  if (hit) return hit;
  let b: ArenaBuild;
  try {
    switch (a.kind) {
      case 'bowl':
      case 'stadium':
        b = buildBowl(a);
        break;
      case 'theater':
        b = buildTheater(a);
        break;
      case 'amphi':
        b = buildAmphi();
        break;
      case 'warehouse':
        b = buildWarehouse(a);
        break;
      case 'festival':
        b = buildFestival();
        break;
      default:
        b = { structure: null, seating: null, glow: null, shell: null, seats: { pos: new Float32Array(), yaw: new Float32Array(), count: 0 } };
    }
  } catch (e) {
    console.error('Arena build failed', e);
    b = { structure: null, seating: null, glow: null, shell: null, seats: { pos: new Float32Array(), yaw: new Float32Array(), count: 0 } };
  }
  cache.set(a.id, b);
  return b;
}
