import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShow } from '../state/showStore';
import { useProject } from '../state/projectStore';
import { getArena } from '../data/arenas';
import { rng } from '../util/misc';

/** Simulated (safe, visual-only) production effects: paper confetti, streamers, cold sparks, fireworks. */

const noRay = () => null;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

function lastFx(type: string) {
  const fx = useShow.getState().fx;
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].type === type) return performance.now() / 1000 - fx[i].t;
  return 99;
}

function front() {
  const p = useProject.getState().project;
  let w = 20, z = 0, y = 1.6, cx = 0;
  const main = p?.objects.filter((o) => o.tag === 'main' && o.kind !== 'stairs');
  if (main && main.length) {
    const m = main.reduce((a, b) => (b.size[0] * b.size[2] > a.size[0] * a.size[2] ? b : a));
    w = m.size[0];
    z = m.pos[2] + m.size[2] / 2;
    y = m.pos[1] + m.size[1];
    cx = m.pos[0];
  }
  return { w, z, y, cx };
}

/* ---------------- paper confetti ---------------- */
const CONF = 1500;
function PaperConfetti() {
  const mesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.16, 0.22);
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.6, roughness: 0.35 });
    const im = new THREE.InstancedMesh(g, m, CONF);
    const r = rng(81);
    const pal = ['#ffffff', '#ffd24a', '#ff2a8a', '#2ae0ff', '#d9a740', '#c0c0c8', '#ff5a1a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < CONF; i++) im.setColorAt(i, pal[Math.floor(r() * pal.length)]);
    im.frustumCulled = false;
    im.raycast = () => {};
    im.visible = false;
    return im;
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  const seeds = useMemo(() => {
    const r = rng(22);
    return Array.from({ length: CONF }, (_, i) => ({ cannon: i % 4, vx: (r() - 0.5) * 8, vy: 10 + r() * 7, vz: 5 + r() * 12, spin: 2 + r() * 8, ph: r() * 6.28, drag: 0.7 + r() * 0.6 }));
  }, []);
  useFrame(() => {
    const t = lastFx('confetti');
    mesh.visible = t < 14;
    if (t >= 14) return;
    const f = front();
    for (let i = 0; i < CONF; i++) {
      const s = seeds[i];
      const x0 = f.cx + ((s.cannon / 3) - 0.5) * f.w * 0.85;
      // fast launch, then paper drag: terminal velocity ~1 m/s with flutter
      const ta = s.vy / 14;
      let y: number, h: number;
      if (t < ta) {
        y = f.y + s.vy * t - 7 * t * t;
        h = t;
      } else {
        const apex = f.y + s.vy * ta - 7 * ta * ta;
        y = apex - (t - ta) * s.drag;
        h = ta;
      }
      const x = x0 + s.vx * h + Math.sin(t * 1.7 + s.ph) * 0.5 * Math.min(1, t / ta);
      const z = f.z + s.vz * h * 0.8 + Math.cos(t * 1.3 + s.ph) * 0.4 + Math.max(0, t - ta) * 0.3;
      tmpE.set(t * s.spin + s.ph, t * s.spin * 0.7, s.ph);
      tmpQ.setFromEuler(tmpE);
      tmpM.compose(tmpP.set(x, Math.max(0.02, y), z), tmpQ, tmpS.setScalar(y <= 0.03 ? 0.8 : 1));
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/* ---------------- streamers ---------------- */
const STR = 60;
function Streamers() {
  const mesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.09, 2.6, 1, 8);
    // gentle S-curve so ribbons don't look like flat sticks
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getY(i) * 2.2) * 0.12);
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.8, roughness: 0.25 });
    const im = new THREE.InstancedMesh(g, m, STR);
    const r = rng(5);
    const pal = ['#ffd24a', '#c0c0c8', '#ff2a8a', '#ffffff'].map((c) => new THREE.Color(c));
    for (let i = 0; i < STR; i++) im.setColorAt(i, pal[Math.floor(r() * pal.length)]);
    im.frustumCulled = false;
    im.raycast = () => {};
    im.visible = false;
    return im;
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  const seeds = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: STR }, (_, i) => ({ side: i % 2 ? 1 : -1, vx: (r() - 0.5) * 6, vy: 12 + r() * 6, vz: 8 + r() * 12, ph: r() * 6.28, fall: 0.9 + r() * 0.6 }));
  }, []);
  useFrame(() => {
    const t = lastFx('streamers');
    mesh.visible = t < 16;
    if (t >= 16) return;
    const f = front();
    for (let i = 0; i < STR; i++) {
      const s = seeds[i];
      const ta = s.vy / 12;
      const h = Math.min(t, ta);
      const apex = f.y + s.vy * ta - 6 * ta * ta;
      const y = t < ta ? f.y + s.vy * t - 6 * t * t : Math.max(1.3, apex - (t - ta) * s.fall);
      const x = f.cx + s.side * f.w * 0.3 + s.vx * h + Math.sin(t * 0.9 + s.ph) * 0.6;
      const z = f.z + s.vz * h * 0.8;
      tmpE.set(Math.sin(t * 1.4 + s.ph) * 0.5, t * 0.6 + s.ph, Math.cos(t * 1.1 + s.ph) * 0.4);
      tmpQ.setFromEuler(tmpE);
      tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.setScalar(1));
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/* ---------------- cold-spark fountains & fireworks (particle points) ---------------- */
function sparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,230,180,0.7)');
  grd.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const FOUNT = 6, PER = 140;
function ColdSparks() {
  const { pts, tex } = useMemo(() => {
    const tex = sparkTexture();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FOUNT * PER * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, color: '#ffd9a0', size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    p.frustumCulled = false;
    p.raycast = () => {};
    p.visible = false;
    return { pts: p, tex };
  }, []);
  useEffect(() => () => {
    pts.geometry.dispose();
    (pts.material as THREE.Material).dispose();
    tex.dispose();
  }, [pts, tex]);
  const seeds = useMemo(() => {
    const r = rng(33);
    return Array.from({ length: FOUNT * PER }, () => ({ life: 0.9 + r() * 0.8, off: r(), vx: (r() - 0.5) * 1.6, vz: (r() - 0.5) * 1.6, vy: 6 + r() * 3 }));
  }, []);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = lastFx('sparks');
    const on = t < 8;
    pts.visible = on;
    if (light.current) light.current.intensity = on ? 25 * Math.min(1, t * 4) * Math.min(1, (8 - t) / 1.5) : 0;
    if (!on) return;
    const f = front();
    if (light.current) light.current.position.set(f.cx, f.y + 2, f.z - 0.5);
    const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const emitting = t < 6.5;
    for (let i = 0; i < FOUNT * PER; i++) {
      const s = seeds[i];
      const e = Math.floor(i / PER);
      const x0 = f.cx + (e / (FOUNT - 1) - 0.5) * f.w * 0.9;
      const age = (t + s.off * s.life) % s.life;
      const born = t - age;
      if (!emitting && born > 6.5) {
        pos.setXYZ(i, 0, -50, 0);
        continue;
      }
      pos.setXYZ(i, x0 + s.vx * age, f.y + s.vy * age - 4.9 * age * age, f.z - 0.4 + s.vz * age);
    }
    pos.needsUpdate = true;
  });
  return (
    <>
      <primitive object={pts} />
      <pointLight ref={light} color="#ffcf8a" intensity={0} distance={30} decay={1.5} />
    </>
  );
}

const SHELLS = 7, BURST = 160;
function Fireworks() {
  const arenaId = useProject((s) => s.project?.arenaId);
  const ceiling = arenaId ? getArena(arenaId).ceiling : null;
  const { pts, tex } = useMemo(() => {
    const tex = sparkTexture();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHELLS * BURST * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SHELLS * BURST * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, vertexColors: true, size: ceiling ? 0.35 : 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    p.frustumCulled = false;
    p.raycast = () => {};
    p.visible = false;
    return { pts: p, tex };
  }, [ceiling]);
  useEffect(() => () => {
    pts.geometry.dispose();
    (pts.material as THREE.Material).dispose();
    tex.dispose();
  }, [pts, tex]);
  const shells = useMemo(() => {
    const r = rng(71);
    const pal = ['#ff3b4e', '#ffd24a', '#2ae0ff', '#c08aff', '#7dff4d', '#ffffff', '#ff8a2a'].map((c) => new THREE.Color(c));
    return Array.from({ length: SHELLS }, (_, k) => ({
      delay: k * 0.45 + r() * 0.3,
      x: (r() - 0.5) * 1.6,
      y: 0.65 + r() * 0.3,
      z: r() * 0.6,
      col: pal[Math.floor(r() * pal.length)],
      dirs: Array.from({ length: BURST }, () => {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        return new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(0.8 + r() * 0.3);
      }),
    }));
  }, []);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = lastFx('fireworks');
    pts.visible = t < 7;
    if (!pts.visible) {
      if (light.current) light.current.intensity = 0;
      return;
    }
    const f = front();
    const top = ceiling ? ceiling * 0.75 : 34;
    const spread = ceiling ? 9 : 18;
    const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = pts.geometry.getAttribute('color') as THREE.BufferAttribute;
    let flash = 0;
    shells.forEach((s, k) => {
      const age = t - s.delay;
      const cx = f.cx + s.x * f.w, cy = top * s.y, cz = f.z + s.z * 30 - 6;
      for (let j = 0; j < BURST; j++) {
        const i = k * BURST + j;
        if (age < 0) {
          pos.setXYZ(i, 0, -80, 0);
          continue;
        }
        if (age < 0.6) {
          // rising shell trail
          pos.setXYZ(i, cx, f.y + (cy - f.y) * (age / 0.6) - (j % 12) * 0.25, cz);
          col.setXYZ(i, 1, 0.75, 0.4);
          continue;
        }
        const b = age - 0.6;
        const d = s.dirs[j];
        const k2 = 1 - Math.exp(-b * 2.2);
        pos.setXYZ(i, cx + d.x * spread * k2, cy + d.y * spread * k2 - 1.6 * b * b, cz + d.z * spread * k2);
        const fade = Math.max(0, 1 - b / 2.6) * (0.6 + 0.4 * Math.sin(b * 30 + j));
        col.setXYZ(i, s.col.r * fade, s.col.g * fade, s.col.b * fade);
        if (b < 0.3) flash = Math.max(flash, 1 - b / 0.3);
      }
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
    if (light.current) {
      light.current.intensity = flash * (ceiling ? 120 : 600);
      light.current.position.set(f.cx, top * 0.8, f.z + 4);
    }
  });
  return (
    <>
      <primitive object={pts} />
      <pointLight ref={light} color="#ffe0c0" intensity={0} distance={ceiling ? 80 : 300} decay={1} />
    </>
  );
}

export function FxPlus() {
  return (
    <>
      <PaperConfetti />
      <Streamers />
      <ColdSparks />
      <Fireworks />
    </>
  );
}
