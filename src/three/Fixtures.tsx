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
const beamGeo = (segs: number) => new THREE.ConeGeometry(1, 1, segs, 1, true).translate(0, -0.5, 0);
const beamGeoCache = new Map<number, THREE.BufferGeometry>();
function getBeamGeo(segs: number) {
  let g = beamGeoCache.get(segs);
  if (!g) {
    g = beamGeo(segs);
    beamGeoCache.set(segs, g);
  }
  return g;
}
const headGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.55, 14).translate(0, -0.1, 0);
const baseGeo = new THREE.BoxGeometry(0.5, 0.18, 0.4);
const barGeo = new THREE.BoxGeometry(1.2, 0.14, 0.16);
const barLensGeo = new THREE.BoxGeometry(1.12, 0.04, 0.1);
const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8).translate(0, 0.75, 0);
const blinderGeo = new THREE.BoxGeometry(0.9, 0.9, 0.25);
const hitGeo = new THREE.SphereGeometry(0.75, 8, 6);
const laserGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 4).translate(0, -0.5, 0);
const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 6, 24);
const bodyMat = new THREE.MeshStandardMaterial({ color: '#1b1c1f', metalness: 0.6, roughness: 0.45 });
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

const beamVert = /* glsl */ `
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
varying float vDepth;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  vAlong = -position.y;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const beamFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFocus;
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
varying float vDepth;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  float edge = abs(dot(normalize(vN), normalize(vV)));
  float soft = pow(edge, mix(1.2, 3.5, uFocus));
  float fall = pow(clamp(1.0 - vAlong, 0.0, 1.0), 1.6);
  float a = uIntensity * soft * fall * smoothstep(0.6, 5.0, vDepth);
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

function makeBeamMat() {
  return new THREE.ShaderMaterial({
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 0 }, uFocus: { value: 0.5 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

const q = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

interface ViewProps {
  f: Fixture;
  selected: boolean;
  interactive: boolean;
  ceiling: number | null;
  segs: number;
}

const FixtureView = memo(function FixtureView({ f, selected, interactive, ceiling, segs }: ViewProps) {
  const head = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const lens = useRef<THREE.Mesh>(null);
  const lasers = useRef<THREE.Group>(null);
  const beamMat = useMemo(makeBeamMat, []);
  const glowMat = useMemo(() => new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), []);
  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false }), []);
  const laserMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0f0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }), []);
  useEffect(() => () => [beamMat, glowMat, lensMat, laserMat].forEach((m) => m.dispose()), [beamMat, glowMat, lensMat, laserMat]);

  const isBar = f.type === 'ledbar';
  const isTube = f.type === 'ledtube';
  const isLaser = f.type === 'laser';
  const isBlinder = f.type === 'blinder';
  const isStrobe = f.type === 'strobe';
  const hasBeam = !isTube;

  useFrame(({ camera }) => {
    const o = outputs.get(f.id);
    if (!o) return;
    const I = o.intensity;
    q.setFromUnitVectors(DOWN, o.dir);
    if (head.current) head.current.quaternion.copy(q);
    // light emitted from the lens
    lensMat.color.copy(o.color).multiplyScalar(0.3 + I * (isTube ? 4 : 3));
    if (glow.current) {
      glowMat.color.copy(o.color).multiplyScalar(Math.min(2, I * 1.4));
      const s = (isBlinder ? 4 : isStrobe ? 3.5 : isBar ? 1.6 : 1.6) * (0.4 + I);
      glow.current.scale.set(s, s, s);
      glow.current.visible = I > 0.01 && glow.current.getWorldPosition(tmpV).distanceTo(camera.position) > s * 1.6;
    }
    if (beam.current && hasBeam && !isLaser) {
      let L = 55;
      const dy = o.dir.y;
      if (dy < -0.02) L = Math.min(L, (f.pos[1] + 0.05) / -dy);
      else if (ceiling && dy > 0.02) L = Math.min(L, (ceiling - f.pos[1]) / dy);
      L = Math.max(0.5, L);
      const half = Math.min(1.3, o.beamAngle / 2);
      const r = Math.tan(half) * L + 0.12;
      beam.current.quaternion.copy(q);
      beam.current.scale.set(r + (isBar ? 0.55 : 0), L, r);
      const wide = THREE.MathUtils.smoothstep(THREE.MathUtils.radToDeg(o.beamAngle), 8, 60);
      beamMat.uniforms.uIntensity.value = I * engine.haze * (0.9 - wide * 0.78) * (isStrobe ? 0.5 : 1);
      beamMat.uniforms.uColor.value.copy(o.color);
      beamMat.uniforms.uFocus.value = o.focus;
      beam.current.visible = I * engine.haze > 0.004;
    }
    if (lasers.current) {
      laserMat.color.copy(o.color).multiplyScalar(I * 2.2);
      lasers.current.visible = I > 0.01;
      const n = lasers.current.children.length;
      lasers.current.children.forEach((c, i) => {
        const off = ((i / (n - 1)) - 0.5) * o.beamAngle;
        const pan = o.pan + off;
        tmpV.set(Math.sin(o.tilt) * Math.sin(pan), -Math.cos(o.tilt), Math.sin(o.tilt) * Math.cos(pan)).normalize();
        c.quaternion.setFromUnitVectors(DOWN, tmpV);
        let L = 70;
        if (tmpV.y < -0.02) L = Math.min(L, f.pos[1] / -tmpV.y);
        c.scale.set(1, L, 1);
      });
    }
  });

  return (
    <group position={f.pos}>
      {/* body */}
      {isBar ? (
        <group rotation={[0, f.yaw, 0]}>
          <mesh geometry={barGeo} material={bodyMat} />
          <mesh ref={lens} geometry={barLensGeo} material={lensMat} position={[0, 0.06, 0]} />
        </group>
      ) : isTube ? (
        <mesh ref={lens} geometry={tubeGeo} material={lensMat} />
      ) : isBlinder ? (
        <group ref={head}>
          <mesh geometry={blinderGeo} material={bodyMat} rotation={[Math.PI / 2, 0, 0]} />
          <mesh ref={lens} position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
            <planeGeometry args={[0.8, 0.8]} />
          </mesh>
        </group>
      ) : (
        <>
          <mesh geometry={baseGeo} material={bodyMat} position={[0, f.pos[1] > 3 ? 0.25 : -0.15, 0]} />
          <group ref={head}>
            <mesh geometry={headGeo} material={bodyMat} />
            <mesh ref={lens} position={[0, -0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
              <circleGeometry args={[0.2, 14]} />
            </mesh>
          </group>
        </>
      )}
      {hasBeam && !isLaser && <mesh ref={beam} geometry={getBeamGeo(segs)} material={beamMat} raycast={() => null} frustumCulled={false} />}
      {isLaser && (
        <group ref={lasers}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} geometry={laserGeo} material={laserMat} raycast={() => null} frustumCulled={false} />
          ))}
        </group>
      )}
      <sprite ref={glow} material={glowMat} position={[0, isTube ? 0.75 : -0.2, 0]} raycast={() => null} />
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
      const l = new THREE.SpotLight('#fff', 0, 0, 0.4, 0.6, 0);
      l.castShadow = shadows && i < 2;
      if (l.castShadow) {
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.bias = -0.0005;
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
      l.intensity = o.intensity * 5.5 * Math.min(1.6, narrow);
    });
  });
  return null;
}

export function FixtureRig({ hidden = false, interactive, lightCount, ceiling, shadows, segs }: { hidden?: boolean; interactive: boolean; lightCount: number; ceiling: number | null; shadows: boolean; segs: number }) {
  const fixtures = useProject((s) => s.project?.fixtures);
  const selection = useUI((s) => s.selection);
  const screen = useUI((s) => s.screen);
  const sel = useMemo(() => new Set(selection), [selection]);
  return (
    <group visible={!hidden}>
      {fixtures
        ?.filter((f) => !f.hidden)
        .map((f) => (
          <FixtureView key={f.id} f={f} selected={screen === 'editor' && sel.has(f.id)} interactive={interactive} ceiling={ceiling} segs={segs} />
        ))}
      <LightPool count={lightCount} shadows={shadows} />
    </group>
  );
}
