import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { Fixture } from '../types';
import { outputs, engine } from './lightingEngine';
import { glowTexture } from './textures';
import { handleItemClick, handleItemPointerDown } from './interaction';
import { useProject } from '../state/projectStore';
import { useUI } from '../state/uiStore';

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

/* ---------------- shared real-scale fixture geometry (metres) ---------------- */
const rounded = (w: number, h: number, d: number, r: number) => {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -d / 2);
  sh.lineTo(w / 2 - r, -d / 2);
  sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  sh.lineTo(w / 2, d / 2 - r);
  sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  sh.lineTo(-w / 2 + r, d / 2);
  sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  sh.lineTo(-w / 2, -d / 2 + r);
  sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, -h / 2, 0);
};
const G = {
  base: rounded(0.42, 0.15, 0.36, 0.05),
  display: new THREE.PlaneGeometry(0.12, 0.05),
  arm: new THREE.BoxGeometry(0.05, 0.36, 0.12),
  yokeBar: new THREE.BoxGeometry(0.46, 0.05, 0.12),
  // head body along -Y (rest direction), lens at the far end
  head: new THREE.CylinderGeometry(0.15, 0.18, 0.42, 20).translate(0, -0.06, 0),
  headCap: new THREE.SphereGeometry(0.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.15, 0),
  bezel: new THREE.TorusGeometry(0.155, 0.018, 8, 24).rotateX(Math.PI / 2).translate(0, -0.27, 0),
  lens: new THREE.CircleGeometry(0.135, 24).rotateX(Math.PI / 2).translate(0, -0.272, 0),
  washHead: new THREE.CylinderGeometry(0.2, 0.2, 0.3, 24).translate(0, -0.08, 0),
  washLens: new THREE.CircleGeometry(0.185, 24).rotateX(Math.PI / 2).translate(0, -0.232, 0),
  bar: rounded(1.0, 0.09, 0.11, 0.02),
  barCell: new THREE.PlaneGeometry(0.105, 0.075).rotateX(-Math.PI / 2),
  tube: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10).translate(0, 0.75, 0),
  tubeCap: new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10),
  strobe: rounded(0.62, 0.16, 0.22, 0.03),
  strobeLens: new THREE.PlaneGeometry(0.56, 0.13).rotateX(Math.PI / 2),
  blinder: rounded(0.62, 0.12, 0.62, 0.04),
  blinderLamp: new THREE.CircleGeometry(0.12, 18).rotateX(Math.PI / 2),
  laser: rounded(0.36, 0.16, 0.3, 0.03),
  aperture: new THREE.PlaneGeometry(0.2, 0.04),
  clamp: new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8),
};
const hitGeo = new THREE.SphereGeometry(0.75, 8, 6);
const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 6, 24);
const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#16171a', metalness: 0.35, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35 });
const trimMat = new THREE.MeshStandardMaterial({ color: '#4a4d52', metalness: 0.9, roughness: 0.3 });
const displayMat = new THREE.MeshBasicMaterial({ color: '#2a6cff', toneMapped: false });
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

/* ---------------- volumetric beam ---------------- */
// unit open cylinder from y=0 (lens) to y=-1 (far end); radii and length come from uniforms
const beamGeoCache = new Map<number, THREE.BufferGeometry>();
function getBeamGeo(segs: number) {
  let g = beamGeoCache.get(segs);
  if (!g) {
    g = new THREE.CylinderGeometry(1, 1, 1, segs, 12, true).translate(0, -0.5, 0);
    beamGeoCache.set(segs, g);
  }
  return g;
}

const beamVert = /* glsl */ `
uniform float uR0;
uniform float uR1;
uniform float uLen;
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
varying float vDepth;
varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  float t = -position.y;
  vAlong = t;
  vec3 p = vec3(position.x * mix(uR0, uR1, t), -t * uLen, position.z * mix(uR0, uR1, t));
  vN = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vV = normalize(-mv.xyz);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const beamFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFocus;
uniform float uTime;
uniform float uLen;
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
varying float vDepth;
varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_fragment>
float n3(vec3 p){ return sin(p.x * 1.7 + uTime * 0.6) * sin(p.y * 1.3 - uTime * 0.4) * sin(p.z * 1.9 + uTime * 0.5); }
void main(){
  #include <logdepthbuf_fragment>
  // brighter through the core of the cone, soft at the silhouette
  float edge = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(edge, mix(1.6, 4.0, uFocus));
  // physical-ish falloff: bright near the lens, fading with distance (metres)
  float dist = vAlong * uLen;
  float fall = exp(-dist * 0.05) * pow(clamp(1.0 - vAlong, 0.0, 1.0), 1.3);
  // drifting haze grain
  float grain = 0.75 + 0.25 * n3(vW * 0.35);
  float a = uIntensity * core * fall * grain * smoothstep(0.4, 4.0, vDepth);
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

function makeBeamMat() {
  return new THREE.ShaderMaterial({
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 0 }, uFocus: { value: 0.5 }, uR0: { value: 0.1 }, uR1: { value: 1 }, uLen: { value: 10 }, uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

const q = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

interface ViewProps {
  f: Fixture;
  selected: boolean;
  interactive: boolean;
  ceiling: number | null;
  segs: number;
  beamScale: number;
}

const LASER_N = 7;

const FixtureView = memo(function FixtureView({ f, selected, interactive, ceiling, segs, beamScale }: ViewProps) {
  const yoke = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const laserLines = useRef<THREE.LineSegments>(null);
  const beamMat = useMemo(makeBeamMat, []);
  const glowMat = useMemo(() => new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), []);
  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false }), []);
  const laserMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#0f0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }), []);
  const laserGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LASER_N * 6), 3));
    return g;
  }, []);
  useEffect(() => () => {
    [beamMat, glowMat, lensMat, laserMat].forEach((m) => m.dispose());
    laserGeo.dispose();
  }, [beamMat, glowMat, lensMat, laserMat, laserGeo]);

  const isBar = f.type === 'ledbar' || f.type === 'pixel';
  const isTube = f.type === 'ledtube';
  const isLaser = f.type === 'laser';
  const isBlinder = f.type === 'blinder';
  const isStrobe = f.type === 'strobe';
  const isWash = f.type === 'wash' || f.type === 'floor';
  const movingHead = !isBar && !isTube && !isLaser && !isBlinder && !isStrobe;
  const hasBeam = !isTube && !isLaser;
  const hung = f.pos[1] > 3;
  const m = hung ? -1 : 1; // rest direction of the head along the arms
  const lensDist = isWash ? 0.23 : 0.27;

  useFrame(({ camera, clock }) => {
    const o = outputs.get(f.id);
    if (!o) return;
    const I = o.intensity;
    const d = o.dir;
    // pan on the yoke, tilt on the head: the body really follows the beam
    if (movingHead && yoke.current && head.current) {
      const hlen = Math.hypot(d.x, d.z);
      yoke.current.rotation.y = hlen > 1e-4 ? Math.atan2(d.x, d.z) : yoke.current.rotation.y;
      head.current.rotation.x = m < 0 ? -Math.atan2(hlen, -d.y) : Math.atan2(hlen, d.y);
    } else if (head.current) {
      q.setFromUnitVectors(m < 0 ? DOWN : UP, d);
      head.current.quaternion.copy(q);
    }
    lensMat.color.copy(o.color).multiplyScalar(0.15 + I * (isTube ? 4 : 3.2));
    // glare only when the fixture is aimed toward the viewer
    if (glow.current) {
      const toCam = tmpV.copy(camera.position).sub(o.pos).normalize();
      const facing = isTube ? 1 : Math.max(0, d.dot(toCam));
      const base = isBlinder ? 2.4 : isStrobe ? 2 : isBar ? 1.1 : isWash ? 1.2 : 0.9;
      const s = base * (0.25 + 0.75 * facing * facing) * (0.3 + I);
      glowMat.color.copy(o.color).multiplyScalar(Math.min(2, I * (0.4 + facing * 1.2)));
      glow.current.scale.set(s, s, s);
      glow.current.position.copy(d).multiplyScalar(isBar || isTube ? 0 : lensDist + 0.02);
      if (isTube) glow.current.position.set(0, 0.75, 0);
      glow.current.visible = I > 0.01 && o.pos.distanceTo(camera.position) > s * 2;
    }
    if (beam.current && hasBeam) {
      let L = 60;
      const dy = d.y;
      if (dy < -0.02) L = Math.min(L, (f.pos[1] + 0.05) / -dy);
      else if (ceiling && dy > 0.02) L = Math.min(L, (ceiling - f.pos[1]) / dy);
      L = Math.max(0.5, L);
      const half = Math.min(1.3, o.beamAngle / 2);
      const r0 = isBar ? 0.4 : isBlinder ? 0.25 : isStrobe ? 0.12 : isWash ? 0.17 : 0.12;
      q.setFromUnitVectors(DOWN, d);
      beam.current.quaternion.copy(q);
      beam.current.position.copy(d).multiplyScalar(isBar ? 0.05 : lensDist);
      const u = beamMat.uniforms;
      u.uR0.value = r0;
      u.uR1.value = r0 + Math.tan(half) * L;
      u.uLen.value = L;
      u.uTime.value = clock.elapsedTime;
      // narrow, hard beams read strongly in haze; wide washes barely show
      const wide = THREE.MathUtils.smoothstep(THREE.MathUtils.radToDeg(o.beamAngle), 6, 50);
      // viewer standing inside the cone sees lit haze, not a solid wall of colour
      const toCam = tmpV.copy(camera.position).sub(o.pos);
      const inside = Math.acos(THREE.MathUtils.clamp(toCam.normalize().dot(d), -1, 1)) < half + 0.05 ? 0.2 : 1;
      const tight = 1 - wide;
      u.uIntensity.value = I * engine.haze * (0.025 + 0.8 * tight * tight) * (isStrobe || isBlinder ? 0.2 : 1) * beamScale * inside;
      u.uColor.value.copy(o.color);
      u.uFocus.value = o.focus;
      beam.current.visible = u.uIntensity.value > 0.004 && !(import.meta.env.DEV && (window as any).__noBeams);
    }
    if (laserLines.current) {
      laserMat.color.copy(o.color).multiplyScalar(I * 1.6);
      laserLines.current.visible = I > 0.01;
      const pos = laserGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < LASER_N; i++) {
        const off = (i / (LASER_N - 1) - 0.5) * o.beamAngle;
        const pan = o.pan + off;
        tmpV2.set(Math.sin(o.tilt) * Math.sin(pan), -Math.cos(o.tilt), Math.sin(o.tilt) * Math.cos(pan)).normalize();
        let L = 80;
        if (tmpV2.y < -0.02) L = Math.min(L, f.pos[1] / -tmpV2.y);
        if (ceiling && tmpV2.y > 0.02) L = Math.min(L, (ceiling - f.pos[1]) / tmpV2.y);
        pos.setXYZ(i * 2, 0, 0, 0);
        pos.setXYZ(i * 2 + 1, tmpV2.x * L, tmpV2.y * L, tmpV2.z * L);
      }
      pos.needsUpdate = true;
    }
  });

  const flip = hung ? 0 : Math.PI; // geometry rests pointing down; floor units are flipped up
  return (
    <group position={f.pos}>
      {movingHead ? (
        // base -> yoke (pan) -> head (tilt); hung fixtures are mounted upside down under the truss
        <group>
          <mesh geometry={G.clamp} material={trimMat} position={[0, hung ? 0.32 : -0.32, 0]} />
          <mesh geometry={G.base} material={bodyMat} position={[0, hung ? 0.22 : -0.22, 0]} />
          <mesh geometry={G.display} material={displayMat} position={[0, hung ? 0.22 : -0.22, 0.191]} />
          <group ref={yoke}>
            <mesh geometry={G.yokeBar} material={bodyMat} position={[0, hung ? 0.13 : -0.13, 0]} />
            {[-1, 1].map((sx) => (
              <mesh key={sx} geometry={G.arm} material={bodyMat} position={[sx * 0.21, hung ? -0.03 : 0.03, 0]} />
            ))}
            <group ref={head} position={[0, hung ? -0.08 : 0.08, 0]}>
              <group rotation={[flip, 0, 0]}>
                <mesh geometry={isWash ? G.washHead : G.head} material={bodyMat} />
                {!isWash && <mesh geometry={G.headCap} material={bodyMat} />}
                <mesh geometry={G.bezel} material={trimMat} position={[0, isWash ? 0.04 : 0, 0]} />
                <mesh geometry={isWash ? G.washLens : G.lens} material={lensMat} />
              </group>
            </group>
          </group>
        </group>
      ) : isBar ? (
        <group rotation={[0, f.yaw, 0]}>
          <group ref={head}>
            <mesh geometry={G.bar} material={bodyMat} />
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} geometry={G.barCell} material={lensMat} position={[-0.43 + i * 0.123, m < 0 ? -0.058 : 0.058, 0]} rotation={[m < 0 ? Math.PI : 0, 0, 0]} />
            ))}
          </group>
        </group>
      ) : isTube ? (
        <group>
          <mesh geometry={G.tube} material={lensMat} />
          <mesh geometry={G.tubeCap} material={bodyMat} />
          <mesh geometry={G.tubeCap} material={bodyMat} position={[0, 1.5, 0]} />
        </group>
      ) : isBlinder ? (
        <group ref={head}>
          <mesh geometry={G.blinder} material={bodyMat} />
          {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([x, z], i) => (
            <mesh key={i} geometry={G.blinderLamp} material={lensMat} position={[x, m < 0 ? -0.075 : 0.075, z]} rotation={[m < 0 ? 0 : Math.PI, 0, 0]} />
          ))}
        </group>
      ) : isStrobe ? (
        <group ref={head}>
          <mesh geometry={G.strobe} material={bodyMat} />
          <mesh geometry={G.strobeLens} material={lensMat} position={[0, m < 0 ? -0.09 : 0.09, 0]} rotation={[m < 0 ? 0 : Math.PI, 0, 0]} />
        </group>
      ) : (
        <group>
          <mesh geometry={G.laser} material={bodyMat} />
          <mesh geometry={G.aperture} material={lensMat} position={[0, 0, 0.16]} />
          <lineSegments ref={laserLines} geometry={laserGeo} material={laserMat} raycast={() => null} frustumCulled={false} />
        </group>
      )}
      {hasBeam && <mesh ref={beam} geometry={getBeamGeo(segs)} material={beamMat} raycast={() => null} frustumCulled={false} />}
      <sprite ref={glow} material={glowMat} raycast={() => null} />
      {interactive && (
        <mesh
          geometry={hitGeo}
          material={hitMat}
          onClick={(e) => handleItemClick(e, f.id)}
          onPointerDown={(e) => handleItemPointerDown(e, f.id)}
        />
      )}
      {selected && (
        <mesh geometry={ringGeo} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <meshBasicMaterial color={f.locked ? '#ff9a3c' : '#4da3ff'} depthTest={false} transparent />
        </mesh>
      )}
    </group>
  );
});

/** A fixed-size pool of real spot lights assigned to the brightest fixtures each frame. */
function LightPool({ count, shadows }: { count: number; shadows: boolean }) {
  const scene = useThree((s) => s.scene);
  const lights = useMemo(() => {
    const arr: THREE.SpotLight[] = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.SpotLight('#fff', 0, 0, 0.4, 0.6, 1);
      l.castShadow = shadows && i < 2;
      if (l.castShadow) {
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.bias = -0.0005;
        l.shadow.normalBias = 0.03;
      }
      arr.push(l);
    }
    return arr;
  }, [count, shadows]);
  useEffect(() => {
    lights.forEach((l) => {
      scene.add(l);
      scene.add(l.target);
    });
    return () =>
      lights.forEach((l) => {
        scene.remove(l);
        scene.remove(l.target);
        l.dispose();
      });
  }, [lights, scene]);

  const assigned = useRef<(string | null)[]>([]);

  useFrame(() => {
    const cands: { id: string; score: number }[] = [];
    outputs.forEach((o, id) => {
      if (o.hidden || o.type === 'laser' || o.type === 'ledtube') return;
      const wide = o.type === 'wash' || o.type === 'blinder' || o.type === 'strobe' || o.type === 'ledbar';
      const score = o.intensity * (wide ? 1.3 : 1);
      if (score > 0.02) cands.push({ id, score });
    });
    cands.sort((a, b) => b.score - a.score);
    const top = new Set(cands.slice(0, count + 2).map((c) => c.id));
    const next: (string | null)[] = new Array(count).fill(null);
    const used = new Set<string>();
    // keep stable assignments to avoid flicker
    assigned.current.forEach((id, i) => {
      if (i < count && id && top.has(id)) {
        next[i] = id;
        used.add(id);
      }
    });
    let ci = 0;
    for (let i = 0; i < count; i++) {
      if (next[i]) continue;
      while (ci < cands.length && used.has(cands[ci].id)) ci++;
      if (ci >= Math.min(cands.length, count + 2)) break;
      next[i] = cands[ci].id;
      used.add(cands[ci].id);
    }
    assigned.current = next;
    lights.forEach((l, i) => {
      const id = next[i];
      const o = id ? outputs.get(id) : undefined;
      // never toggle visibility: changing the light count would recompile every shader
      if (!o) {
        l.intensity = 0;
        return;
      }
      l.position.copy(o.pos);
      l.target.position.copy(o.pos).addScaledVector(o.dir, 20);
      l.target.updateMatrixWorld();
      l.color.copy(o.color);
      l.angle = Math.min(1.2, Math.max(0.03, (o.beamAngle / 2) * 1.1));
      l.penumbra = 1 - o.focus * 0.6;
      const narrow = 1 + (0.6 - Math.min(0.6, o.beamAngle)) * 2;
      // inverse-distance falloff (decay 1): ~same level at truss height, brighter up close, dimmer far away
      l.intensity = o.intensity * 5.5 * Math.min(1.6, narrow) * 14;
    });
  });
  return null;
}

export function FixtureRig({ hidden = false, interactive, lightCount, ceiling, shadows, segs }: { hidden?: boolean; interactive: boolean; lightCount: number; ceiling: number | null; shadows: boolean; segs: number }) {
  const fixtures = useProject((s) => s.project?.fixtures);
  const selection = useUI((s) => s.selection);
  const screen = useUI((s) => s.screen);
  const lightEnv = useUI((s) => s.lightEnv);
  const sel = useMemo(() => new Set(selection), [selection]);
  // keep beams subtle while building so they don't hide the structure
  const beamScale = screen === 'editor' && lightEnv === 'construction' ? 0.35 : 1;
  return (
    <group visible={!hidden}>
      {fixtures
        ?.filter((f) => !f.hidden)
        .map((f) => (
          <FixtureView key={f.id} f={f} selected={screen === 'editor' && sel.has(f.id)} interactive={interactive} ceiling={ceiling} segs={segs} beamScale={beamScale} />
        ))}
      <LightPool count={lightCount} shadows={shadows} />
    </group>
  );
}
