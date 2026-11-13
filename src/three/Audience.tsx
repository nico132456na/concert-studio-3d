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
  for (let i = 0; i < pos.count; i++) armW[i] = pos.getX(i) > 0.12 && pos.getY(i) > 1.15 ? 1 : 0;
  g.setAttribute('aArm', new THREE.BufferAttribute(armW, 1));
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

  const { mesh, uniforms } = useMemo(() => {
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
    const uniforms = { uTime: { value: 0 }, uEnergy: { value: 0.2 }, uBeat: { value: 0 } };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aPhase;\nattribute float aArm;\nuniform float uTime;\nuniform float uEnergy;\nuniform float uBeat;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float bounce = max(0.0, sin(uBeat * 6.2831 + aPhase * 0.3)) * 0.22 * uEnergy;
           float sway = sin(uTime * 1.3 + aPhase) * 0.04;
           transformed.y += bounce;
           transformed.x += sway * position.y;
           float raise = smoothstep(0.3, 0.9, sin(uTime * 0.4 + aPhase * 2.0)) * uEnergy;
           transformed.y += aArm * raise * 0.35;`,
        );
    };
    const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, n));
    mesh.count = n;
    const r2 = rng(77);
    const palette = ['#1b1d22', '#25211e', '#2c3038', '#3a3533', '#141416', '#4a4038', '#20283a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, mats[i]);
      mesh.setColorAt(i, palette[Math.floor(r2() * palette.length)]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    return { mesh, uniforms };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena, count, footKey]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  useFrame((state, dt) => {
    const show = useShow.getState();
    uniforms.uTime.value = state.clock.elapsedTime;
    const target = show.playing ? 1 : show.override ? 0.6 : 0.15;
    uniforms.uEnergy.value += (target * (1 - engine.blackout * 0.7) - uniforms.uEnergy.value) * Math.min(1, dt * 2);
    uniforms.uBeat.value = engine.beat;
  });

  return <primitive object={mesh} />;
}
