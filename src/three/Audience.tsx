import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ArenaDef } from '../data/arenas';
import { getArenaBuild } from './arenaGeometry';
import { useProject } from '../state/projectStore';
import { useShow } from '../state/showStore';
import { rng } from '../util/misc';
import { engine } from './lightingEngine';
import { player } from '../performer/state';

function personGeo() {
  const body = new THREE.CylinderGeometry(0.15, 0.2, 1.1, 5, 1, true).translate(0, 0.55, 0);
  const head = new THREE.SphereGeometry(0.13, 5, 3).translate(0, 1.28, 0);
  const arm = new THREE.BoxGeometry(0.08, 0.55, 0.08).translate(0.2, 1.45, 0);
  const g = mergeGeometries([body.toNonIndexed(), head.toNonIndexed(), arm.toNonIndexed()].map((x) => {
    x.deleteAttribute('uv');
    return x;
  }))!;
  // mark arm vertices (y > 1.15 and x > 0.12) so the shader can raise hands
  const pos = g.getAttribute('position');
  const armW = new Float32Array(pos.count);
  const headW = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    armW[i] = pos.getX(i) > 0.12 && pos.getY(i) > 1.15 ? 1 : 0;
    headW[i] = !armW[i] && pos.getY(i) > 1.14 ? 1 : 0;
  }
  g.setAttribute('aArm', new THREE.BufferAttribute(armW, 1));
  g.setAttribute('aHead', new THREE.BufferAttribute(headW, 1));
  return g;
}

const geo = personGeo();

interface Props {
  arena: ArenaDef;
  count: number;
}

export function Audience({ arena, count }: Props) {
  const objects = useProject((s) => s.project?.objects);
  // coarse footprint key so moving things a little doesn't regenerate the crowd
  const footKey = useMemo(
    () =>
      (objects ?? [])
        .filter((o) => o.pos[1] < 3 && !o.hidden)
        .map((o) => `${Math.round(o.pos[0])},${Math.round(o.pos[2])},${Math.round(o.size[0])},${Math.round(o.size[2])},${Math.round(o.rot[1] * 10)}`)
        .join('|'),
    [objects],
  );

  const { mesh, uniforms, phones, flash } = useMemo(() => {
    const build = getArenaBuild(arena);
    const r = rng(1234);
    const footprints = (objects ?? [])
      .filter((o) => o.pos[1] < 3 && !o.hidden)
      .map((o) => {
        const c = Math.cos(o.rot[1]), s = Math.sin(o.rot[1]);
        return { x: o.pos[0], z: o.pos[2], hw: o.size[0] / 2 + 1.2, hd: o.size[2] / 2 + 1.2, c, s };
      });
    const blocked = (x: number, z: number) =>
      footprints.some((f) => {
        const dx = x - f.x, dz = z - f.z;
        const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
        return Math.abs(lx) < f.hw && Math.abs(lz) < f.hd;
      });
    const seatsWanted = build.seats.count ? Math.min(build.seats.count, Math.round(count * 0.55)) : 0;
    const standWanted = count - seatsWanted;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const mats: THREE.Matrix4[] = [];
    const phases: number[] = [];
    const st = arena.standing;
    let tries = 0;
    while (mats.length < standWanted && tries < standWanted * 4) {
      tries++;
      // denser toward the stage
      const x = st.xMin + r() * (st.xMax - st.xMin);
      const z = st.zMin + Math.pow(r(), 1.4) * (st.zMax - st.zMin);
      if (blocked(x, z)) continue;
      q.setFromAxisAngle(up, Math.PI + (r() - 0.5) * 0.8 + Math.atan2(-x, 40) * 0.5);
      const s = 0.92 + r() * 0.18;
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
      mats.push(m.clone());
      phases.push(r() * Math.PI * 2);
    }
    if (seatsWanted) {
      const step = build.seats.count / seatsWanted;
      for (let i = 0; i < seatsWanted; i++) {
        const k = Math.floor(i * step);
        const x = build.seats.pos[k * 3], y = build.seats.pos[k * 3 + 1], z = build.seats.pos[k * 3 + 2];
        if (blocked(x, z)) continue;
        q.setFromAxisAngle(up, build.seats.yaw[k]);
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(0.95, 0.95, 0.95));
        mats.push(m.clone());
        phases.push(r() * Math.PI * 2);
      }
    }
    const n = mats.length;
    const g = geo.clone();
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
    const rs = rng(4242);
    const skinTones = ['#f2d0b5', '#e0b08a', '#c68a5e', '#9a6340', '#6b4128', '#3f2617'].map((c) => new THREE.Color(c));
    const skin = new Float32Array(Math.max(1, n) * 3);
    for (let i = 0; i < n; i++) {
      const c = skinTones[Math.floor(rs() * skinTones.length)];
      skin.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3));
    const uniforms = { uTime: { value: 0 }, uEnergy: { value: 0.2 }, uBeat: { value: 0 }, uPerf: { value: new THREE.Vector4(0, 0, 0, 0) } };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aPhase;\nattribute float aArm;\nattribute float aHead;\nattribute vec3 aSkin;\nuniform float uTime;\nuniform float uEnergy;\nuniform float uBeat;\nuniform vec4 uPerf;\nvarying float vHead;\nvarying vec3 vSkin;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 wpos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
           // fans closest to the performer (on the stage / runway) go wild
           float near = uPerf.w * (1.0 - smoothstep(4.0, 22.0, distance(wpos.xz, uPerf.xz)));
           float e = min(1.6, uEnergy + near * 0.9);
           float clapT = sin(uTime * 7.0 + aPhase) ;
           float bounce = max(0.0, sin(uBeat * 6.2831 + aPhase * 0.3)) * 0.22 * e + near * max(0.0, sin(uTime * 9.0 + aPhase)) * 0.25;
           float sway = sin(uTime * 1.3 + aPhase) * 0.04;
           transformed.y += bounce;
           transformed.x += sway * position.y;
           float raise = max(smoothstep(0.3, 0.9, sin(uTime * 0.4 + aPhase * 2.0)) * e, near);
           transformed.y += aArm * (raise * 0.35 + clapT * 0.05 * e);
           vHead = aHead; vSkin = aSkin;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vHead;\nvarying vec3 vSkin;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vSkin * 0.8, vHead);');
    };
    const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, n));
    mesh.count = n;
    const r2 = rng(77);
    // mostly dark concert clothes with some colour, merch whites and team jerseys
    const palette = ['#1b1d22', '#25211e', '#2c3038', '#3a3533', '#141416', '#4a4038', '#20283a', '#1b1d22', '#2c3038', '#5a1a22', '#1a3a5a', '#d8d4cc', '#7a5a2a', '#3a1a4a', '#1a4a3a', '#8a2a3a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, mats[i]);
      mesh.setColorAt(i, palette[Math.floor(r2() * palette.length)]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    // phone lights held up by ~35% of the crowd
    const pp: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (r2() > 0.35) continue;
      v.setFromMatrixPosition(mats[i]);
      pp.push(v.x + (r2() - 0.5) * 0.3, v.y + 1.95 + r2() * 0.3, v.z + (r2() - 0.5) * 0.3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const phones = new THREE.Points(pg, pm);
    phones.frustumCulled = false;
    phones.raycast = () => {};
    phones.visible = false;
    // camera flashes: a handful of points re-seeded among the phones
    const FL = 28;
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(FL * 3), 3));
    const fc = document.createElement('canvas');
    fc.width = fc.height = 64;
    const fx = fc.getContext('2d')!;
    const grd = fx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(235,242,255,0.9)');
    grd.addColorStop(0.45, 'rgba(200,220,255,0.25)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    fx.fillStyle = grd;
    fx.fillRect(0, 0, 64, 64);
    const flash = new THREE.Points(fg, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(fc), color: '#ffffff', size: 1.1, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flash.frustumCulled = false;
    flash.raycast = () => {};
    flash.userData.src = pp;
    return { mesh, uniforms, phones, flash };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena, count, footKey]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
      phones.geometry.dispose();
      (phones.material as THREE.Material).dispose();
      flash.geometry.dispose();
      (flash.material as THREE.PointsMaterial).map?.dispose();
      (flash.material as THREE.Material).dispose();
    },
    [mesh, phones, flash],
  );

  useFrame((state, dt) => {
    const show = useShow.getState();
    uniforms.uTime.value = state.clock.elapsedTime;
    const target = Math.max(show.playing ? 1 : show.override ? 0.6 : 0.15, show.hype * 1.1);
    uniforms.uEnergy.value += (target * (1 - engine.blackout * 0.7) - uniforms.uEnergy.value) * Math.min(1, dt * 2);
    uniforms.uBeat.value = engine.beat;
    phones.visible = show.phoneLights;
    // performer proximity (only while someone is on stage in performer mode)
    const onStage = player.active && player.pos.y > 0.3;
    uniforms.uPerf.value.set(player.pos.x, 0, player.pos.z, onStage ? 1 : 0);
    // random camera flashes when the show is hot
    const heat = Math.max(show.hype, show.playing ? 0.6 : 0);
    const src = flash.userData.src as number[];
    const fpos = flash.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (src.length && heat > 0.35) {
      for (let i = 0; i < fpos.count; i++) {
        if (Math.random() < dt * (2 + heat * 4)) {
          const k = Math.floor(Math.random() * (src.length / 3)) * 3;
          fpos.setXYZ(i, src[k], src[k + 1], src[k + 2]);
        } else if (Math.random() < dt * 20) fpos.setXYZ(i, 0, -50, 0);
      }
      fpos.needsUpdate = true;
      flash.visible = true;
    } else flash.visible = false;
    if (show.phoneLights) (phones.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(state.clock.elapsedTime * 1.7);
  });

  return (
    <>
      <primitive object={mesh} />
      <primitive object={phones} />
      <primitive object={flash} />
    </>
  );
}
