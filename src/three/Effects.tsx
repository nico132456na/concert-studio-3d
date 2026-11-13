import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, N8AO, SMAA, DepthOfField } from '@react-three/postprocessing';
import { engine, outputs } from './lightingEngine';
import { glowTexture, smokeTexture } from './textures';
import { useShow } from '../state/showStore';
import { useProject } from '../state/projectStore';
import { rng } from '../util/misc';

const noRay = () => null;
const avg = new THREE.Color();

/** Average color of all lit fixtures; tints haze & low fog so the room "takes" the light. */
function sampleAmbientColor(out: THREE.Color) {
  out.setRGB(0, 0, 0);
  let w = 0;
  outputs.forEach((o) => {
    if (o.intensity <= 0.01) return;
    out.r += o.color.r * o.intensity;
    out.g += o.color.g * o.intensity;
    out.b += o.color.b * o.intensity;
    w += o.intensity;
  });
  if (w > 0) out.multiplyScalar(1 / w);
  return Math.min(1, w / 8);
}

function stageFront() {
  const p = useProject.getState().project;
  let w = 20;
  let z = 0;
  let y = 1.6;
  const main = p?.objects.filter((o) => o.tag === 'main' || o.kind === 'platform' || o.kind === 'circlePlatform');
  if (main && main.length) {
    const m = main.reduce((a, b) => (b.size[0] * b.size[2] > a.size[0] * a.size[2] ? b : a));
    w = m.size[0];
    z = m.pos[2] + m.size[2] / 2;
    y = m.pos[1] + m.size[1];
  }
  return { w, z, y };
}

export function LowFog({ count = 22 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: smokeTexture(), transparent: true, depthWrite: false, opacity: 0.2, color: '#888' }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const seeds = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * 2, z: r(), s: 8 + r() * 10, sp: 0.2 + r() * 0.4, ph: r() * 10 }));
  }, [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const front = stageFront();
    const lvl = sampleAmbientColor(avg);
    mat.color.setRGB(0.25, 0.25, 0.28).lerp(avg, 0.65).multiplyScalar(Math.min(0.85, 0.45 + lvl * 0.6 + engine.house * 0.25));
    // thinner when the camera is down at fog level (performer / crowd views)
    const low = state.camera.position.y < 4 ? 0.45 : 1;
    mat.opacity = engine.fog * 0.32 * low;
    if (!group.current) return;
    group.current.visible = engine.fog > 0.02;
    group.current.children.forEach((c, i) => {
      const s = seeds[i];
      c.position.set(s.x * (front.w * 0.6 + 6) + Math.sin(t * s.sp + s.ph) * 2, 0.8 + Math.sin(t * 0.3 + s.ph) * 0.3, front.z - 6 + s.z * 16);
      c.scale.set(s.s, s.s * 0.45, 1);
      // never let a fog puff fill the lens when the camera is right inside it
      c.visible = c.position.distanceTo(state.camera.position) > s.s * 1.5;
    });
  });
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <sprite key={i} material={mat} raycast={noRay} />
      ))}
    </group>
  );
}

const CONFETTI = 1400;

function Confetti() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONFETTI * 3), 3));
    const col = new Float32Array(CONFETTI * 3);
    const r = rng(8);
    const pal = ['#ffffff', '#ffc21a', '#ff2ad4', '#1ae0ff', '#d9a740'].map((c) => new THREE.Color(c));
    for (let i = 0; i < CONFETTI; i++) {
      const c = pal[Math.floor(r() * pal.length)];
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const seeds = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: CONFETTI }, () => ({ vx: (r() - 0.5) * 18, vy: 14 + r() * 14, vz: 4 + r() * 22, ph: r() * 6, x0: (r() - 0.5) * 2 }));
  }, []);
  const pts = useRef<THREE.Points>(null);
  useFrame(() => {
    const fx = useShow.getState().fx.filter((f) => f.type === 'confetti');
    const last = fx[fx.length - 1];
    const now = performance.now() / 1000;
    const t = last ? now - last.t : 99;
    if (!pts.current) return;
    pts.current.visible = t < 9;
    if (t >= 9) return;
    const front = stageFront();
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < CONFETTI; i++) {
      const s = seeds[i];
      const ta = s.vy / 9.8;
      const tb = Math.min(t, ta);
      const apex = front.y + s.vy * ta - 4.9 * ta * ta;
      const y = t < ta ? front.y + s.vy * t - 4.9 * t * t : Math.max(0.05, apex - (t - ta) * 1.6);
      const x = s.x0 * front.w * 0.4 + s.vx * tb * 0.6 + Math.sin(t * 3 + s.ph) * 0.6 * Math.min(1, t);
      const z = front.z + s.vz * tb * 0.6 + Math.max(0, t - ta) * 0.4;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={pts} geometry={geom} frustumCulled={false} raycast={noRay}>
      <pointsMaterial size={0.18} vertexColors sizeAttenuation />
    </points>
  );
}

function Pyro() {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a2a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), []);
  const smoke = useMemo(() => new THREE.SpriteMaterial({ map: smokeTexture(), color: '#dddddd', transparent: true, depthWrite: false, opacity: 0.6 }), []);
  useEffect(() => () => {
    mat.dispose();
    smoke.dispose();
  }, [mat, smoke]);
  const group = useRef<THREE.Group>(null);
  const jets = useRef<THREE.Group>(null);
  const EMIT = 6, PER = 9;
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const now = performance.now() / 1000;
    const fx = useShow.getState().fx;
    const pyro = [...fx].reverse().find((f) => f.type === 'pyro');
    const co2 = [...fx].reverse().find((f) => f.type === 'smoke');
    const tp = pyro ? now - pyro.t : 99;
    const tc = co2 ? now - co2.t : 99;
    const front = stageFront();
    if (group.current) {
      group.current.visible = tp < 2;
      group.current.children.forEach((c, k) => {
        const e = Math.floor(k / PER), j = k % PER;
        const x = (e / (EMIT - 1) - 0.5) * front.w * 0.9;
        const h = Math.min(1, tp * 5) * (1 - Math.max(0, tp - 0.9));
        c.position.set(x, front.y + j * 1.1 * h, front.z - 0.6);
        const s = (2.6 - j * 0.15) * Math.max(0, h);
        c.scale.set(s, s * 1.4, 1);
      });
    }
    if (light.current) {
      light.current.intensity = tp < 1.5 ? 60 * Math.max(0, 1 - tp / 1.5) : 0;
      light.current.position.set(0, front.y + 3, front.z + 2);
    }
    mat.opacity = Math.max(0, 1 - Math.max(0, tp - 1) * 1.4);
    if (jets.current) {
      jets.current.visible = tc < 4;
      smoke.opacity = Math.max(0, 0.7 - Math.max(0, tc - 0.6) * 0.25);
      jets.current.children.forEach((c, k) => {
        const e = Math.floor(k / 6), j = k % 6;
        const x = (e / 3 - 0.5) * front.w * 0.7;
        const rise = Math.min(1, tc * 2.5);
        c.position.set(x, front.y + j * 1.6 * rise, front.z - 0.3);
        const s = (1.4 + j * 0.6) * rise * (1 + tc * 0.4);
        c.scale.set(s, s * 1.3, 1);
      });
    }
  });
  return (
    <>
      <pointLight ref={light} color="#ff8a2a" intensity={0} distance={0} decay={0} />
      <group ref={group} visible={false}>
        {Array.from({ length: EMIT * PER }, (_, i) => (
          <sprite key={i} material={mat} raycast={noRay} />
        ))}
      </group>
      <group ref={jets} visible={false}>
        {Array.from({ length: 4 * 6 }, (_, i) => (
          <sprite key={i} material={smoke} raycast={noRay} />
        ))}
      </group>
    </>
  );
}

export function StageFx() {
  return (
    <>
      <Confetti />
      <Pyro />
    </>
  );
}

export function PostFX({ bloom, ao, smaa, cinematic, ultra }: { bloom: boolean; ao: boolean; smaa: boolean; cinematic: boolean; ultra: boolean }) {
  if (!bloom && !ao && !smaa && !cinematic) return null;
  const fx: JSX.Element[] = [];
  if (ao) fx.push(<N8AO key="ao" halfRes={!ultra} quality={ultra ? 'medium' : 'performance'} aoRadius={2.5} intensity={2.2} distanceFalloff={1} />);
  if (bloom) fx.push(<Bloom key="bloom" mipmapBlur intensity={cinematic ? 1.2 : 0.9} luminanceThreshold={0.75} luminanceSmoothing={0.2} radius={0.7} />);
  if (cinematic) fx.push(<DepthOfField key="dof" focusDistance={0.015} focalLength={0.06} bokehScale={3} />);
  if (smaa) fx.push(<SMAA key="smaa" />);
  fx.push(<Vignette key="vig" eskil={false} offset={0.25} darkness={cinematic ? 0.8 : 0.5} />);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {fx}
    </EffectComposer>
  );
}
