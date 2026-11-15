import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AvatarLook } from '../../types';
import { player } from '../../performer/state';
import { Avatar, type AvatarDriver } from '../Avatar';
import { kit as loadedKit, loadPeople, type Body, type PeopleKit } from './kit';

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

const STYLE: Record<AvatarLook['top'], number> = { tee: 0, hoodie: 1, jacket: 2, tank: 3, suit: 4, jersey: 5 };

/** Skin tone: pick the light or dark albedo and a tint so the whole UI swatch range is covered. */
function skinFor(hex: string) {
  const c = new THREE.Color(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear
  if (lum > 0.32) return { light: true, tint: new THREE.Color().setScalar(Math.min(1.08, 0.72 + lum * 0.55)) };
  if (lum > 0.14) return { light: true, tint: new THREE.Color(0.78, 0.66, 0.56).multiplyScalar(0.7 + lum) };
  return { light: false, tint: new THREE.Color().setScalar(Math.max(0.55, 0.62 + lum * 2.5)) };
}

/** Clothing painted on the base body in rest-pose (T-pose) space: top + sleeves, trousers/shorts, shoes, details. */
function bodyMaterial(src: THREE.MeshStandardMaterial, look: AvatarLook, body: Body, k: PeopleKit, span: number, height: number) {
  const m = src.clone();
  const skin = skinFor(look.skin);
  if (skin.light) m.map = k.skinLight[body];
  m.color.copy(skin.tint);
  const u = {
    uTop: { value: new THREE.Color(look.topColor) },
    uBottom: { value: new THREE.Color(look.bottomColor) },
    uShoe: { value: new THREE.Color(look.shoes) },
    uStyle: { value: STYLE[look.top] ?? 0 },
    uShorts: { value: look.bottom === 'shorts' || look.bottom === 'skirt' ? 1 : 0 },
    uSkirt: { value: look.bottom === 'skirt' ? 1 : 0 },
    uGloves: { value: look.gloves ? 1 : 0 },
    uSpan: { value: span },
    uH: { value: height },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vRest;
uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uShoe;
uniform float uStyle; uniform float uShorts; uniform float uSkirt; uniform float uGloves; uniform float uSpan; uniform float uH;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float h = vRest.y / uH;
  float ax = abs(vRest.x);
  float aw = 0.004;
  float onArm = smoothstep(0.205 - aw, 0.205 + aw, ax) * step(0.66, h);
  float sleeveF = uStyle > 2.5 && uStyle < 3.5 ? 0.0 : (uStyle < 0.5 || uStyle > 4.5 ? 0.43 : 0.8);
  float sleeve = onArm * (1.0 - smoothstep(uSpan * sleeveF - aw, uSpan * sleeveF + aw, ax));
  // neckline: shoulders are covered up to the neck column; tees/tanks/jerseys get a front scoop
  float collar = uStyle > 0.5 && uStyle < 2.5 || uStyle > 3.5 && uStyle < 4.5 ? 0.835 : 0.815;
  float neckCol = (1.0 - smoothstep(0.062, 0.07, ax)) * smoothstep(collar - 0.004, collar + 0.004, h);
  float scoopOn = uStyle < 0.5 || (uStyle > 2.5 && uStyle < 3.5) || uStyle > 4.5 ? 1.0 : 0.0;
  float scoop = scoopOn * step(0.0, vRest.z) * (1.0 - smoothstep(0.075, 0.085, ax)) * smoothstep(collar - 0.035, collar - 0.025, h);
  float torso = (1.0 - onArm) * smoothstep(0.53 - 0.004, 0.53 + 0.004, h) * (1.0 - smoothstep(0.865, 0.875, h)) * (1.0 - neckCol) * (1.0 - scoop);
  float topK = max(torso, sleeve);
  float legs = (1.0 - onArm) * (1.0 - smoothstep(0.535 - 0.004, 0.535 + 0.004, h)) * smoothstep(0.052, 0.058, h);
  float bare = uShorts * (1.0 - smoothstep(0.285, 0.295, h));
  float skirtGap = uSkirt * step(ax, 0.14) * step(0.3, h); // skirt hangs between the legs
  float botK = max(legs * (1.0 - bare), skirtGap * (1.0 - smoothstep(0.53, 0.54, h)));
  float shoeK = 1.0 - smoothstep(0.052, 0.058, h);
  float gloveK = uGloves * onArm * smoothstep(uSpan * 0.8, uSpan * 0.81, ax);
  vec3 top = uTop;
  // details: jacket zip, suit shirt + tie, hoodie pocket, jersey stripes
  if (uStyle > 1.5 && uStyle < 2.5 && vRest.z > 0.0) top *= 1.0 - 0.45 * (1.0 - smoothstep(0.006, 0.012, ax));
  if (uStyle > 3.5 && uStyle < 4.5 && vRest.z > 0.0) {
    float shirt = step(0.64, h) * (1.0 - smoothstep((h - 0.64) * 0.55, (h - 0.64) * 0.55 + 0.004, ax));
    top = mix(top, vec3(0.92), shirt);
    top = mix(top, vec3(0.03), shirt * (1.0 - smoothstep(0.01, 0.014, ax)) * step(h, 0.79));
  }
  if (uStyle > 0.5 && uStyle < 1.5 && vRest.z > 0.06) top *= 1.0 - 0.18 * step(0.57, h) * step(h, 0.635) * step(ax, 0.11);
  if (uStyle > 4.5) top = mix(top, vec3(0.95), onArm * step(abs(ax - uSpan * 0.35), 0.012));
  // fabric weave
  float weave = 1.0 + 0.05 * sin((vRest.x + vRest.y) * 1400.0) * sin((vRest.x - vRest.y) * 1300.0);
  vec3 cloth = top * topK + uBottom * botK + uShoe * shoeK + vec3(0.03) * gloveK;
  float clothK = clamp(topK + botK + shoeK + gloveK, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, cloth * weave, clothK);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.82 - shoeK * 0.35, clothK);')
      .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - 0.7 * clothK);');
  };
  m.customProgramCacheKey = () => 'ubc-cloth-v1';
  return m;
}

function hairMaterial(src: THREE.MeshStandardMaterial, color: string) {
  const m = src.clone();
  const c = { value: new THREE.Color(color) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHair = c;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHair;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n float hl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));\n diffuseColor.rgb = uHair * clamp(hl * 3.2, 0.25, 1.7);');
  };
  m.customProgramCacheKey = () => 'ubc-hair-v1';
  return m;
}

/* ------------------------------------------------------------------ */
/* rig                                                                 */
/* ------------------------------------------------------------------ */

export type Gesture = 'none' | 'handsUp' | 'wave' | 'point' | 'pose' | 'bow' | 'clap' | 'phone';
export type Role = 'free' | 'talk' | 'phone' | 'arms' | 'sit' | 'drive' | 'dance' | 'fan';

const HAIR_FOR: Record<AvatarLook['hair'], (b: Body) => string | null> = {
  short: () => 'Hair_SimpleParted',
  buzz: (b) => (b === 'female' ? 'Hair_BuzzedFemale' : 'Hair_Buzzed'),
  long: () => 'Hair_Long',
  curly: () => 'Hair_Buns',
  braids: () => 'Hair_Long',
  bun: () => 'Hair_Buns',
  bald: () => null,
};

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();

class PersonRig {
  root = new THREE.Group();
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction> = {};
  current = '';
  bones: Record<string, THREE.Bone> = {};
  side = 1;
  weights: Record<string, number> = {};
  mats: THREE.Material[] = [];
  extras: THREE.BufferGeometry[] = [];
  t = Math.random() * 10;

  constructor(k: PeopleKit, look: AvatarLook) {
    const body: Body = look.body ?? 'male';
    const g = k.bodies[body];
    const scene = cloneSkinned(g.scene);
    this.root.add(scene);
    scene.updateMatrixWorld(true);
    let span = 0.9, height = 1.8;
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if ((o as THREE.Bone).isBone) this.bones[o.name] = o as THREE.Bone;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (/superhero/i.test(src.name) || /superhero/i.test(mesh.name)) {
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        span = Math.max(Math.abs(bb.min.x), bb.max.x);
        height = bb.max.y;
      }
    });
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      let m: THREE.Material;
      if (/superhero/i.test(src.name) || /superhero/i.test(mesh.name)) m = bodyMaterial(src, look, body, k, span, height);
      else if (/hair/i.test(src.name)) m = hairMaterial(src, look.hairColor);
      else m = src.clone();
      mesh.material = m;
      this.mats.push(m);
    });
    const ul = this.bones.upperarm_l;
    if (ul) this.side = Math.sign(ul.getWorldPosition(tmpA).x) || 1;
    // hair & accessories ride on the head bone (built in rest-pose model space)
    const head = this.bones.Head;
    if (head) {
      const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
      const delta = k.headRest[body].clone().sub(k.headRest.female);
      const attach = (obj: THREE.Object3D, modelSpace: THREE.Matrix4) => {
        obj.matrixAutoUpdate = false;
        obj.matrix.copy(inv).multiply(modelSpace);
        head.add(obj);
      };
      const hairName = HAIR_FOR[look.hair]?.(body);
      for (const name of [hairName, look.beard && body === 'male' ? 'Hair_Beard' : null]) {
        const src = name ? k.hair[name] : null;
        if (!src) continue;
        const hm = new THREE.Mesh(src.geometry, hairMaterial(src.material as THREE.MeshStandardMaterial, look.hairColor));
        hm.castShadow = true;
        this.mats.push(hm.material as THREE.Material);
        attach(hm, new THREE.Matrix4().makeTranslation(delta.x, delta.y, delta.z));
      }
      const hp = k.headRest[body];
      if (look.glasses) {
        const geo = new THREE.BoxGeometry(0.15, 0.04, 0.012);
        const mat = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.08, metalness: 0.4, clearcoat: 1 });
        const gm = new THREE.Mesh(geo, mat);
        this.extras.push(geo);
        this.mats.push(mat);
        attach(gm, new THREE.Matrix4().makeTranslation(0, hp.y + (body === 'male' ? 0.115 : 0.095), hp.z + 0.105));
      }
      if (look.cap) {
        const geo = new THREE.SphereGeometry(0.112, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const brim = new THREE.BoxGeometry(0.19, 0.012, 0.13).translate(0, 0, 0.13);
        const mat = new THREE.MeshStandardMaterial({ color: look.topColor === '#111111' ? '#d9a740' : '#141414', roughness: 0.8 });
        const cap = new THREE.Group();
        cap.add(new THREE.Mesh(geo, mat), new THREE.Mesh(brim, mat));
        this.extras.push(geo, brim);
        this.mats.push(mat);
        attach(cap, new THREE.Matrix4().makeTranslation(0, hp.y + (body === 'male' ? 0.15 : 0.13), hp.z - 0.005));
      }
    }
    const neck = this.bones.spine_03;
    if (neck && look.chain) {
      const geo = new THREE.TorusGeometry(0.085, 0.008, 6, 28);
      const mat = new THREE.MeshStandardMaterial({ color: '#d9a740', metalness: 1, roughness: 0.2 });
      const ch = new THREE.Mesh(geo, mat);
      this.extras.push(geo);
      this.mats.push(mat);
      ch.matrixAutoUpdate = false;
      ch.matrix.copy(new THREE.Matrix4().copy(neck.matrixWorld).invert()).multiply(new THREE.Matrix4().makeRotationX(1.25).setPosition(0, height * 0.79, 0.07));
      neck.add(ch);
    }
    this.root.scale.setScalar(look.height || 1);
    this.mixer = new THREE.AnimationMixer(scene);
    for (const [name, clip] of Object.entries(k.clips[body])) this.actions[name] = this.mixer.clipAction(clip);
    this.play('Idle_Loop', 0);
  }

  play(name: string, fade = 0.25, timeScale = 1) {
    const a = this.actions[name];
    if (!a) return;
    a.timeScale = timeScale;
    if (this.current === name) return;
    const prev = this.actions[this.current];
    a.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (name.startsWith('Jump_Start') || name.startsWith('Jump_Land')) {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    }
    if (prev) prev.fadeOut(fade);
    this.current = name;
  }

  /** Bend a bone so its child points along a direction given in the person's local frame. */
  aim(name: string, child: string, local: THREE.Vector3, w: number) {
    const b = this.bones[name], c = this.bones[child];
    if (!b || !c || w < 0.001 || !b.parent) return;
    const dir = tmpA.copy(local).applyQuaternion(this.root.getWorldQuaternion(tmpQ2)).normalize();
    const bp = b.getWorldPosition(new THREE.Vector3());
    const cur = c.getWorldPosition(tmpB).sub(bp).normalize();
    const delta = tmpQ.setFromUnitVectors(cur, dir);
    const world = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
    const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    b.quaternion.slerp(parentQ.multiply(world), Math.min(1, w));
    b.updateMatrixWorld(true);
  }

  gestures(active: Gesture, dt: number) {
    for (const g of ['handsUp', 'wave', 'point', 'pose', 'bow', 'clap', 'phone'] as Gesture[]) {
      const target = g === active ? 1 : 0;
      this.weights[g] = (this.weights[g] ?? 0) + (target - (this.weights[g] ?? 0)) * Math.min(1, dt * 7);
    }
    const t = this.t;
    const s = this.side; // +x local is the "_l" side when s = 1
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.root.updateMatrixWorld(true);
    const w = this.weights;
    if (w.bow > 0.01) this.aim('spine_01', 'spine_03', V(0, Math.cos(0.8), Math.sin(0.8)), w.bow);
    if (w.handsUp > 0.01) {
      this.aim('upperarm_l', 'lowerarm_l', V(0.3 * s, 1, 0.12), w.handsUp);
      this.aim('lowerarm_l', 'hand_l', V(0.12 * s, 1, 0.05), w.handsUp);
      this.aim('upperarm_r', 'lowerarm_r', V(-0.3 * s, 1, 0.12), w.handsUp);
      this.aim('lowerarm_r', 'hand_r', V(-0.12 * s, 1, 0.05), w.handsUp);
    }
    if (w.pose > 0.01) {
      this.aim('upperarm_l', 'lowerarm_l', V(1 * s, 0.18, 0.15), w.pose);
      this.aim('lowerarm_l', 'hand_l', V(1 * s, 0.4, 0.2), w.pose);
      this.aim('upperarm_r', 'lowerarm_r', V(-1 * s, 0.18, 0.15), w.pose);
      this.aim('lowerarm_r', 'hand_r', V(-1 * s, 0.4, 0.2), w.pose);
    }
    if (w.wave > 0.01) {
      this.aim('upperarm_r', 'lowerarm_r', V(-0.6 * s, 0.75, 0.2), w.wave);
      this.aim('lowerarm_r', 'hand_r', V((-0.15 + Math.sin(t * 9) * 0.45) * s, 1, 0.15), w.wave);
    }
    if (w.point > 0.01) {
      this.aim('upperarm_r', 'lowerarm_r', V(-0.15 * s, 0.25, 1), w.point);
      this.aim('lowerarm_r', 'hand_r', V(-0.05 * s, 0.3, 1), w.point);
    }
    if (w.clap > 0.01) {
      const o = 0.25 + Math.abs(Math.sin(t * 7)) * 0.45;
      this.aim('upperarm_l', 'lowerarm_l', V(0.3 * s, -0.25, 0.9), w.clap);
      this.aim('lowerarm_l', 'hand_l', V(-o * s, 0.55, 0.8), w.clap);
      this.aim('upperarm_r', 'lowerarm_r', V(-0.3 * s, -0.25, 0.9), w.clap);
      this.aim('lowerarm_r', 'hand_r', V(o * s, 0.55, 0.8), w.clap);
    }
    if (w.phone > 0.01) {
      this.aim('upperarm_r', 'lowerarm_r', V(-0.15 * s, 0.35, 1), w.phone);
      this.aim('lowerarm_r', 'hand_r', V(0.1 * s, 0.75, 0.6), w.phone);
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mats.forEach((m) => m.dispose());
    this.extras.forEach((g) => g.dispose());
  }
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

const GESTURE_OF: Record<string, Gesture> = { handsUp: 'handsUp', wave: 'wave', point: 'point', pose: 'pose', bow: 'bow' };
const ROLE_CLIP: Record<Role, string> = { free: 'Idle_Loop', talk: 'Idle_Talking_Loop', phone: 'Idle_TalkingPhone_Loop', arms: 'Idle_FoldArms_Loop', sit: 'Sitting_Idle_Loop', drive: 'Driving_Loop', dance: 'Dance_Loop', fan: 'Idle_Loop' };

export function usePeopleKit() {
  const [k, setK] = useState<PeopleKit | null>(loadedKit);
  useEffect(() => {
    if (k) return;
    let alive = true;
    loadPeople()
      .then((v) => alive && setK(v))
      .catch((e) => console.warn('people kit failed to load', e));
    return () => {
      alive = false;
    };
  }, [k]);
  return k;
}

/** A realistic animated person. Falls back to the procedural avatar until the models have loaded. */
export function Person({ look, followPlayer = true, driver, role = 'free', gesture, position, yaw }: { look: AvatarLook; followPlayer?: boolean; driver?: AvatarDriver; role?: Role; gesture?: () => Gesture; position?: [number, number, number]; yaw?: number }) {
  const k = usePeopleKit();
  const key = JSON.stringify(look);
  const rig = useMemo(() => (k ? new PersonRig(k, look) : null), [k, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => rig?.dispose(), [rig]);
  const air = useMemo(() => ({ was: true }), []);

  useFrame((_, rawDt) => {
    if (!rig) return;
    const dt = Math.min(0.05, rawDt);
    rig.t += dt;
    const p = followPlayer ? driver ?? player : null;
    if (p) {
      rig.root.position.copy(p.pos);
      rig.root.rotation.y = p.yaw;
    } else if (position) {
      rig.root.position.set(...position);
      rig.root.rotation.y = yaw ?? 0;
    }
    // locomotion / role clip
    const s = p ? p.speed : 0;
    const act = p?.action ?? 'none';
    if (p && !p.onGround) {
      if (air.was) rig.play('Jump_Loop', 0.15);
      air.was = true;
    } else {
      if (air.was && p) rig.play('Jump_Land', 0.1);
      air.was = false;
      if (s > 1.75) rig.play('Sprint_Loop', 0.25, Math.min(1.4, s / 2));
      else if (s > 1.12) rig.play('Jog_Fwd_Loop', 0.25, Math.min(1.3, s / 1.4));
      else if (s > 0.06) rig.play(role === 'talk' || role === 'arms' ? 'Walk_Formal_Loop' : 'Walk_Loop', 0.25, Math.max(0.6, Math.min(1.3, s)));
      else if (act === 'dance' || role === 'dance') rig.play('Dance_Loop', 0.3);
      else if (rig.current !== 'Jump_Land' || (rig.actions.Jump_Land?.time ?? 1) >= (rig.actions.Jump_Land?.getClip().duration ?? 0) - 0.05) rig.play(ROLE_CLIP[role], 0.3);
    }
    rig.mixer.update(dt);
    rig.gestures(gesture ? gesture() : s < 0.06 ? GESTURE_OF[act] ?? 'none' : 'none', dt);
  });

  if (!rig) return driver || followPlayer ? <Avatar look={look} followPlayer={followPlayer} driver={driver} /> : null;
  return <primitive object={rig.root} />;
}
