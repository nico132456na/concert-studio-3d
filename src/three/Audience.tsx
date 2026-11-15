import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ArenaDef } from '../data/arenas';
import { getArenaBuild } from './arenaGeometry';
import { useProject } from '../state/projectStore';
import { useShow, type CrowdMoment } from '../state/showStore';
import { rng } from '../util/misc';
import { engine } from './lightingEngine';
import { player } from '../performer/state';

/*
 * Instanced audience. Each person is a low-poly humanoid (legs, shoes, torso, sleeves, forearms, hands,
 * neck, head, three hair styles, optional cap and phone) whose limbs are posed in the vertex shader from
 * per-instance traits (style, energy, front-row factor, clothing/skin/hair colours, body proportions).
 * Seated sections use a cheaper LOD of the same rig.
 */

// part ids (colour / animation channels)
const P = { bottom: 1, top: 2, skin: 3, hair: 4, cap: 5, shoe: 6, sleeve: 7, phone: 8 } as const;

function tag(g: THREE.BufferGeometry, part: number, side = 0, hairKind = -1) {
  const n = g.getAttribute('position').count;
  const meta = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) meta.set([part, side, hairKind], i * 3);
  g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 3));
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

const cyl = (rt: number, rb: number, h: number, seg: number) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);

function personGeo(lod: 'hi' | 'lo') {
  const seg = lod === 'hi' ? 6 : 5;
  const parts: THREE.BufferGeometry[] = [];
  if (lod === 'hi') {
    for (const sx of [-1, 1]) {
      parts.push(tag(cyl(0.07, 0.06, 0.82, seg).translate(sx * 0.095, 0.47, 0), P.bottom));
      parts.push(tag(new THREE.BoxGeometry(0.11, 0.08, 0.26).translate(sx * 0.095, 0.04, 0.04), P.shoe));
    }
    parts.push(tag(cyl(0.17, 0.16, 0.16, seg + 1).scale(1, 1, 0.7).translate(0, 0.9, 0), P.bottom));
  } else {
    parts.push(tag(cyl(0.16, 0.13, 0.9, seg).scale(1, 1, 0.7).translate(0, 0.45, 0), P.bottom));
  }
  // torso: slightly wider at the shoulders
  parts.push(tag(cyl(0.2, 0.165, 0.5, seg + 1).scale(1, 1, 0.62).translate(0, 1.2, 0), P.top));
  parts.push(tag(new THREE.SphereGeometry(0.2, seg + 1, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 0.62).translate(0, 1.45, 0), P.top));
  // neck + head
  parts.push(tag(cyl(0.045, 0.05, 0.1, 5).translate(0, 1.52, 0), P.skin));
  parts.push(tag(new THREE.SphereGeometry(0.105, lod === 'hi' ? 8 : 6, lod === 'hi' ? 6 : 4).scale(0.95, 1.12, 1).translate(0, 1.65, 0), P.skin));
  // hair: 0 short, 1 long, 2 cap (hidden per instance in the shader when not selected)
  parts.push(tag(new THREE.SphereGeometry(0.112, lod === 'hi' ? 8 : 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.97, 1.05, 1.03).translate(0, 1.67, -0.005), P.hair, 0, 0));
  parts.push(tag(new THREE.SphereGeometry(0.118, lod === 'hi' ? 8 : 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1, 1.08, 1.05).translate(0, 1.665, -0.01), P.hair, 0, 1));
  if (lod === 'hi') parts.push(tag(new THREE.BoxGeometry(0.2, 0.3, 0.08).translate(0, 1.5, -0.08), P.hair, 0, 1));
  parts.push(tag(new THREE.SphereGeometry(0.115, lod === 'hi' ? 8 : 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, 1.68, 0), P.cap, 0, 2));
  if (lod === 'hi') parts.push(tag(new THREE.BoxGeometry(0.17, 0.015, 0.12).translate(0, 1.69, 0.12), P.cap, 0, 2));
  // arms hang from shoulder pivots (±0.22, 1.42)
  for (const sx of [-1, 1]) {
    parts.push(tag(cyl(0.05, 0.045, 0.3, seg - 1).translate(sx * 0.225, 1.27, 0), P.sleeve, sx));
    parts.push(tag(cyl(0.042, 0.036, 0.27, seg - 1).translate(sx * 0.225, 0.985, 0), P.skin, sx));
    if (lod === 'hi') parts.push(tag(new THREE.SphereGeometry(0.045, 5, 4).translate(sx * 0.225, 0.83, 0), P.skin, sx));
  }
  // phone in the right hand (only visible for filming fans)
  if (lod === 'hi') parts.push(tag(new THREE.BoxGeometry(0.075, 0.14, 0.012).translate(0.225, 0.8, 0.05), P.phone, 1));
  const g = mergeGeometries(parts)!;
  g.computeBoundingSphere();
  return g;
}

const crowdVert = /* glsl */ `
attribute vec3 aMeta;     // part, arm side, hair kind
attribute vec4 aTraits;   // phase, style, front, hair style
attribute vec3 aShape;    // phone, body width, body height
attribute vec4 aColors;   // skin, top, bottom, hair palette indices
uniform vec3 uSkins[6];
uniform vec3 uTops[14];
uniform vec3 uBottoms[8];
uniform vec3 uHairs[9];
uniform float uTime;
uniform float uEnergy;
uniform float uBeat;
uniform float uMoment;
uniform float uMomentK;
uniform vec4 uPerf;
varying vec3 vCol;
varying float vEmit;

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,s,0.0, -s,c,0.0, 0.0,0.0,1.0); }
`;

const crowdBegin = /* glsl */ `
  float aPart = aMeta.x, aSide = aMeta.y, aHairKind = aMeta.z;
  float aPhase = aTraits.x, aStyle = aTraits.y, aFront = aTraits.z, aHairStyle = aTraits.w;
  float aPhone = aShape.x;
  vec2 aBody = aShape.yz;
  vec3 aSkin = uSkins[int(aColors.x)], aTop = uTops[int(aColors.y)], aBottom = uBottoms[int(aColors.z)], aHair = uHairs[int(aColors.w)];
  vec3 transformed = vec3(position);
  vec3 wpos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float near = uPerf.w * (1.0 - smoothstep(3.0, 20.0, distance(wpos.xz, uPerf.xz)));
  float e = clamp(uEnergy * (0.55 + 0.55 * aFront) + near * 0.9, 0.0, 1.6);
  float t = uTime + aPhase * 3.0;
  float act = smoothstep(0.12, 0.55, e);
  float style = aStyle;
  // crowd moments override personal style
  float mk = uMomentK;
  if (mk > 0.01) {
    if (uMoment < 1.5) style = 1.0;          // hands up / cheer
    else if (uMoment < 2.5) style = 2.0;     // wave
    else if (uMoment < 3.5) style = 5.0;     // sing along
    else if (uMoment < 4.5) style = aPhone > 0.5 ? 3.0 : style; // phones up
    else style = 0.0;                         // clap
    act = max(act, mk);
  }
  float rz = 0.12, rx = 0.06;               // arm side raise / forward raise
  float bodyY = 0.0, sway = sin(t * 1.1) * 0.035, headTilt = 0.0;
  float beat = max(0.0, sin(uBeat * 6.2831 + aPhase * 0.4));
  if (style < 0.5) {                         // clapper
    rx = mix(0.06, 1.25, act);
    rz = mix(0.12, -0.42 + sin(t * 9.0) * 0.18, act);
    bodyY = beat * 0.05 * e;
  } else if (style < 1.5) {                  // jumper / hands up
    rz = mix(0.12, 2.65 + sin(t * 4.0) * 0.12, act);
    bodyY = beat * 0.28 * e;
  } else if (style < 2.5) {                  // waver
    float wv = uMoment > 1.5 && uMoment < 2.5 && mk > 0.01 ? sin(wpos.x * 0.12 - uTime * 3.0) : sin(t * 1.6);
    rz = mix(0.12, 2.55 + wv * 0.3, act);
    sway = wv * 0.18 * act + sway;
  } else if (style < 3.5) {                  // filming
    rx = mix(0.06, 2.0, act);
    rz = 0.12;
  } else if (style < 4.5) {                  // calm
    sway *= 0.5;
    bodyY = beat * 0.02 * e;
  } else {                                   // singing along
    rz = mix(0.12, 0.9 + sin(t * 2.0) * 0.4, act);
    headTilt = -0.35 * act;
    sway = sin(t * 1.4) * 0.12 * act;
  }
  // arms
  if (abs(aSide) > 0.5) {
    float side = aSide;
    float arx = rx, arz = rz;
    if (style > 2.5 && style < 3.5 && side < 0.0) { arx = 0.06; arz = 0.12; }   // only the right hand films
    if (style < 0.5 && side < 0.0) arz = mix(0.12, -0.42 - sin(t * 9.0) * 0.18, act);
    vec3 piv = vec3(side * 0.225, 1.42, 0.0);
    vec3 v = transformed - piv;
    v = rotX(-arx) * v;
    v = rotZ(side * arz) * v;
    transformed = piv + v;
  }
  // phones are only visible in filming hands
  if (aPart > 7.5 && (aPhone < 0.5 || style < 2.5 || style > 3.5)) transformed = vec3(0.225, 1.4, 0.0);
  // hair style selection
  if (aHairKind > -0.5 && abs(aHairKind - aHairStyle) > 0.1) transformed = vec3(0.0, 1.62, 0.0);
  // head tilt (singing)
  if (transformed.y > 1.5 && abs(aSide) < 0.5) {
    vec3 hp = vec3(0.0, 1.52, 0.0);
    transformed = hp + rotX(headTilt) * (transformed - hp);
  }
  // proportions, sway and bounce
  transformed.xz *= aBody.x;
  transformed.y *= aBody.y;
  transformed.x += sway * transformed.y * 0.6;
  transformed.y += bodyY;
  // colour by part
  vec3 c = aTop;
  if (aPart < 1.5) c = aBottom;
  else if (aPart < 2.5) c = aTop;
  else if (aPart < 3.5) c = aSkin;
  else if (aPart < 4.5) c = aHair;
  else if (aPart < 5.5) c = mix(aTop, vec3(0.05), 0.5);
  else if (aPart < 6.5) c = fract(aPhase * 7.3) > 0.5 ? vec3(0.85) : vec3(0.04);
  else if (aPart < 7.5) c = fract(aPhase * 3.1) > 0.7 ? aSkin : aTop;
  else c = vec3(0.02);
  vCol = c;
  vEmit = aPart > 7.5 ? 1.0 : 0.0;
`;

let sharedGeo: { hi: THREE.BufferGeometry; lo: THREE.BufferGeometry } | null = null;
function geos() {
  if (!sharedGeo) sharedGeo = { hi: personGeo('hi'), lo: personGeo('lo') };
  return sharedGeo;
}

const pal = (list: string[]) => list.map((c) => new THREE.Color(c));

function crowdMaterial(uniforms: Record<string, THREE.IUniform>) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uSkins: { value: pal(SKINS) }, uTops: { value: pal(TOPS) }, uBottoms: { value: pal(BOTTOMS) }, uHairs: { value: pal(HAIRS) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + crowdVert).replace('#include <begin_vertex>', crowdBegin);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCol;\nvarying float vEmit;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = vCol;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.55, 0.65, 0.9) * vEmit * 1.6;');
  };
  m.customProgramCacheKey = () => 'crowd-v2';
  return m;
}

const SKINS = ['#f3d5bf', '#e6b896', '#c99067', '#a06a45', '#71472c', '#46291a'];
const HAIRS = ['#0f0c0a', '#2a1a10', '#4a2e1a', '#7a5230', '#b88a50', '#d8c08a', '#9a9a9a', '#5a1a2a', '#202a5a'];
// mostly dark concert wear with some colour, white merch tees and denim
const TOPS = ['#121214', '#1b1d22', '#22252c', '#e6e3dc', '#2a3550', '#5a1a22', '#1a4a3a', '#3a1a4a', '#7a5a2a', '#141416', '#c03a3a', '#2a6a9a', '#d8c060', '#6a6a70'];
const BOTTOMS = ['#1a2032', '#202a40', '#141416', '#2a2a2e', '#3a3a3e', '#4a3a2a', '#1c2a4a', '#5a5a60'];


interface Placement {
  mats: THREE.Matrix4[];
  front: number[];
}

function buildInstances(p: Placement, lod: 'hi' | 'lo', seed: number, mat: THREE.Material) {
  const n = p.mats.length;
  const base = lod === 'hi' ? geos().hi : geos().lo;
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.getAttribute(k));
  const r = rng(seed);
  const A = (k: number) => new Float32Array(Math.max(1, n) * k);
  const traits = A(4), shape = A(3), colors = A(4);
  const style = new Float32Array(Math.max(1, n));
  for (let i = 0; i < n; i++) {
    const st = r();
    // 0 clap, 1 jump/hands, 2 wave, 3 film, 4 calm, 5 sing
    style[i] = st < 0.24 ? 0 : st < 0.44 ? 1 : st < 0.56 ? 2 : st < 0.68 ? 3 : st < 0.84 ? 4 : 5;
    const hairStyle = r() < 0.45 ? 0 : r() < 0.7 ? 1 : 2;
    traits.set([r() * 6.283, style[i], p.front[i], hairStyle], i * 4);
    shape.set([style[i] === 3 || r() < 0.4 ? 1 : 0, 0.88 + r() * 0.26, 0.9 + r() * 0.2], i * 3);
    colors.set([Math.floor(r() * SKINS.length), Math.floor(r() * TOPS.length), Math.floor(r() * BOTTOMS.length), Math.floor(r() * HAIRS.length)], i * 4);
  }
  const I = (arr: Float32Array, k: number) => new THREE.InstancedBufferAttribute(arr, k);
  g.setAttribute('aTraits', I(traits, 4));
  g.setAttribute('aShape', I(shape, 3));
  g.setAttribute('aColors', I(colors, 4));
  const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, n));
  mesh.count = n;
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, p.mats[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return { mesh, style };
}

/* ---------------- fan signs (original generic messages) ---------------- */
const SIGN_TEXT = ['BEST NIGHT EVER', 'WE LOVE YOU', 'FIRST SHOW!', 'PLAY ONE MORE', 'DROVE 9 HOURS', 'HI FROM ROW A', 'ENCORE!', 'SING WITH ME'];
let signTex: THREE.CanvasTexture | null = null;
function signTexture() {
  if (signTex) return signTex;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  const cols = ['#ff2a8a', '#ffe14a', '#2ae0ff', '#ffffff', '#7dff4d', '#ff7a1a', '#c08aff', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 256;
    g.fillStyle = i % 3 === 0 ? '#111' : '#f4f1ea';
    g.fillRect(x + 4, y + 40, 248, 176);
    g.fillStyle = i % 3 === 0 ? cols[i] : '#111';
    g.font = '900 34px system-ui, sans-serif';
    g.textAlign = 'center';
    const words = SIGN_TEXT[i].split(' ');
    const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [SIGN_TEXT[i]];
    lines.forEach((l, k) => g.fillText(l, x + 128, y + 120 + k * 40 - (lines.length - 1) * 20, 236));
    if (i % 3 !== 0) {
      g.fillStyle = cols[i];
      g.fillRect(x + 4, y + 200, 248, 16);
    }
  }
  signTex = new THREE.CanvasTexture(c);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 8;
  return signTex;
}

function buildSigns(mats: THREE.Matrix4[], seed: number) {
  const r = rng(seed);
  const n = mats.length;
  const board = new THREE.PlaneGeometry(0.75, 0.52).translate(0, 2.35, 0.12);
  const stick = new THREE.BoxGeometry(0.02, 0.6, 0.02).translate(0, 1.95, 0.12);
  const g = mergeGeometries([board, stick])!;
  const ig = new THREE.InstancedBufferGeometry();
  ig.index = g.index;
  for (const k of Object.keys(g.attributes)) ig.setAttribute(k, g.getAttribute(k));
  const cell = new Float32Array(Math.max(1, n));
  const ph = new Float32Array(Math.max(1, n));
  for (let i = 0; i < n; i++) {
    cell[i] = Math.floor(r() * 8);
    ph[i] = r() * 6.28;
  }
  ig.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
  ig.setAttribute('aSPhase', new THREE.InstancedBufferAttribute(ph, 1));
  const uTime = { value: 0 };
  const m = new THREE.MeshStandardMaterial({ map: signTexture(), side: THREE.DoubleSide, roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCell;\nattribute float aSPhase;\nuniform float uTime;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vec2((mod(aCell, 4.0) + uv.x) / 4.0, (1.0 - floor(aCell / 4.0) + uv.y) / 2.0);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(uTime * 2.0 + aSPhase) * 0.06;\n transformed.x += sin(uTime * 1.3 + aSPhase) * 0.05 * (transformed.y - 1.6);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.75, 0.68, 0.55);');
  };
  m.customProgramCacheKey = () => 'signs-v1';
  const mesh = new THREE.InstancedMesh(ig, m, Math.max(1, n));
  mesh.count = n;
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, mats[i]);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return { mesh, uTime };
}

/* ---------------- energy from the show ---------------- */
const PHASE_ENERGY: [RegExp, number][] = [
  [/intro|open/i, 0.45],
  [/verse/i, 0.55],
  [/chorus|drop|hook/i, 1.0],
  [/bridge|ballad|quiet|acoustic/i, 0.3],
  [/outro|finale|encore/i, 0.9],
  [/blackout/i, 0.15],
];
const MOMENT_ID: Record<CrowdMoment, number> = { none: 0, handsUp: 1, cheer: 1, wave: 2, sing: 3, phones: 4, clap: 5 };

interface Props {
  arena: ArenaDef;
  count: number;
}

export function Audience({ arena, count }: Props) {
  const objects = useProject((s) => s.project?.objects);
  const footKey = useMemo(
    () =>
      (objects ?? [])
        .filter((o) => o.pos[1] < 3 && !o.hidden)
        .map((o) => `${Math.round(o.pos[0])},${Math.round(o.pos[2])},${Math.round(o.size[0])},${Math.round(o.size[2])},${Math.round(o.rot[1] * 10)}`)
        .join('|'),
    [objects],
  );

  const built = useMemo(() => {
    const build = getArenaBuild(arena);
    const r = rng(1234);
    const footprints = (objects ?? [])
      .filter((o) => o.pos[1] < 3 && !o.hidden)
      .map((o) => {
        const c = Math.cos(o.rot[1]), s = Math.sin(o.rot[1]);
        return { x: o.pos[0], z: o.pos[2], hw: o.size[0] / 2 + 1.4, hd: o.size[2] / 2 + 1.4, c, s };
      });
    const blocked = (x: number, z: number) =>
      footprints.some((f) => {
        const dx = x - f.x, dz = z - f.z;
        const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
        return Math.abs(lx) < f.hw && Math.abs(lz) < f.hd;
      });
    const seatsWanted = build.seats.count ? Math.min(build.seats.count, Math.round(count * 0.55)) : 0;
    const standWanted = count - seatsWanted;
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const stand: Placement = { mats: [], front: [] };
    const seated: Placement = { mats: [], front: [] };
    const signMats: THREE.Matrix4[] = [];
    const phonePts: number[] = [];
    const st = arena.standing;
    let tries = 0;
    // stage focus point: centroid of floor-level stage decks
    const decks = (objects ?? []).filter((o) => o.tag === 'main' && o.pos[1] < 3);
    const fx = decks.length ? decks.reduce((a, o) => a + o.pos[0], 0) / decks.length : 0;
    const fz = decks.length ? decks.reduce((a, o) => a + o.pos[2], 0) / decks.length : -6;
    while (stand.mats.length < standWanted && tries < standWanted * 5) {
      tries++;
      const x = st.xMin + r() * (st.xMax - st.xMin);
      // denser toward the stage
      const z = st.zMin + Math.pow(r(), 1.5) * (st.zMax - st.zMin);
      if (blocked(x, z)) continue;
      const yaw = Math.atan2(fx - x, fz - z) + (r() - 0.5) * 0.5;
      q.setFromAxisAngle(up, yaw);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
      const distToStage = Math.hypot(x - fx, z - fz);
      const front = THREE.MathUtils.clamp(1 - (distToStage - 6) / 40, 0, 1);
      stand.mats.push(m);
      stand.front.push(front);
      if (front > 0.6 && r() < 0.035) signMats.push(m);
      if (r() < 0.35) phonePts.push(x + Math.sin(yaw) * 0.2, 1.95 + r() * 0.3, z + Math.cos(yaw) * 0.2);
    }
    if (seatsWanted) {
      const step = build.seats.count / seatsWanted;
      for (let i = 0; i < seatsWanted; i++) {
        const k = Math.floor(i * step);
        const x = build.seats.pos[k * 3], y = build.seats.pos[k * 3 + 1], z = build.seats.pos[k * 3 + 2];
        if (blocked(x, z)) continue;
        q.setFromAxisAngle(up, build.seats.yaw[k]);
        seated.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(0.97, 0.97, 0.97)));
        seated.front.push(THREE.MathUtils.clamp(0.45 - y / 60, 0.05, 0.45));
        if (r() < 0.25) phonePts.push(x, y + 1.95, z);
      }
    }
    const uniforms = { uTime: { value: 0 }, uEnergy: { value: 0.2 }, uBeat: { value: 0 }, uMoment: { value: 0 }, uMomentK: { value: 0 }, uPerf: { value: new THREE.Vector4() } };
    const mat = crowdMaterial(uniforms);
    const hi = buildInstances(stand, 'hi', 77, mat);
    const lo = buildInstances(seated, 'lo', 78, mat);
    const signs = buildSigns(signMats, 91);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(phonePts, 3));
    const phones = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    phones.frustumCulled = false;
    phones.raycast = () => {};
    phones.visible = false;
    // camera flashes re-seeded among the phones
    const FL = 28;
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(FL * 3), 3));
    const fc = document.createElement('canvas');
    fc.width = fc.height = 64;
    const fx2 = fc.getContext('2d')!;
    const grd = fx2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(235,242,255,0.9)');
    grd.addColorStop(0.45, 'rgba(200,220,255,0.25)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    fx2.fillStyle = grd;
    fx2.fillRect(0, 0, 64, 64);
    const flash = new THREE.Points(fg, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(fc), color: '#ffffff', size: 1.1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flash.frustumCulled = false;
    flash.raycast = () => {};
    return { hi, lo, signs, phones, flash, phonePts, uniforms, mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena, count, footKey]);

  useEffect(
    () => () => {
      const { hi, lo, signs, phones, flash, mat } = built;
      for (const x of [hi.mesh, lo.mesh, signs.mesh]) {
        // base attributes are shared with the cached person geometry and get re-uploaded on next use
        x.geometry.dispose();
        x.dispose();
      }
      (signs.mesh.material as THREE.Material).dispose();
      mat.dispose();
      phones.geometry.dispose();
      (phones.material as THREE.Material).dispose();
      flash.geometry.dispose();
      (flash.material as THREE.PointsMaterial).map?.dispose();
      (flash.material as THREE.Material).dispose();
    },
    [built],
  );

  useFrame((state, dt) => {
    const { uniforms, phones, flash, phonePts, signs } = built;
    const show = useShow.getState();
    uniforms.uTime.value = state.clock.elapsedTime;
    signs.uTime.value = state.clock.elapsedTime;
    // energy: show section, playback, performer hype, blackout
    let phaseE = show.playing ? 0.7 : show.override ? 0.55 : 0.18;
    if (show.activeSceneId) {
      const sc = useProject.getState().project?.scenes.find((s) => s.id === show.activeSceneId);
      if (sc) for (const [re, v] of PHASE_ENERGY) if (re.test(sc.name)) { phaseE = v; break; }
    }
    const recentFx = show.fx.some((f) => performance.now() / 1000 - f.t < 3) ? 0.35 : 0;
    const target = Math.max(phaseE + recentFx, show.hype * 1.1) * (1 - engine.blackout * 0.6);
    uniforms.uEnergy.value += (target - uniforms.uEnergy.value) * Math.min(1, dt * 1.2);
    uniforms.uBeat.value = engine.beat;
    // crowd moment: ramps in, holds, fades over ~7 s
    const cm = show.crowdMoment;
    const age = performance.now() / 1000 - cm.t;
    uniforms.uMoment.value = MOMENT_ID[cm.kind];
    uniforms.uMomentK.value = cm.kind === 'none' ? 0 : Math.max(0, Math.min(1, age * 2) * (1 - THREE.MathUtils.smoothstep(age, 5, 7)));
    const onStage = player.active && player.pos.y > 0.3;
    uniforms.uPerf.value.set(player.pos.x, 0, player.pos.z, onStage ? 1 : 0);
    const phonesOn = show.phoneLights || (cm.kind === 'phones' && uniforms.uMomentK.value > 0.2);
    phones.visible = phonesOn;
    if (phonesOn) (phones.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(state.clock.elapsedTime * 1.7);
    const heat = Math.max(show.hype, uniforms.uEnergy.value * 0.8);
    const fpos = flash.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (phonePts.length && heat > 0.4) {
      for (let i = 0; i < fpos.count; i++) {
        if (Math.random() < dt * (1.5 + heat * 4)) {
          const k = Math.floor(Math.random() * (phonePts.length / 3)) * 3;
          fpos.setXYZ(i, phonePts[k], phonePts[k + 1], phonePts[k + 2]);
        } else if (Math.random() < dt * 20) fpos.setXYZ(i, 0, -50, 0);
      }
      fpos.needsUpdate = true;
      flash.visible = true;
    } else flash.visible = false;
  });

  return (
    <>
      <primitive object={built.hi.mesh} />
      <primitive object={built.lo.mesh} />
      <primitive object={built.signs.mesh} />
      <primitive object={built.phones} />
      <primitive object={built.flash} />
    </>
  );
}
