import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useLife, interactables, walkArea, car } from '../../life/state';
import { useCareer } from '../../life/careerStore';
import { player, input } from '../../performer/state';
import { useSettings, QUALITY } from '../../state/settingsStore';
import { Avatar } from '../Avatar';
import { Home, roomAt } from './Home';
import { City } from './City';
import { Arrival, CARPET } from './Arrival';
import { capture } from '../PerformerRig';

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

/** Walking controller (home & arrival) plus every camera view and interaction prompts. */
function LifeRig() {
  const { camera, gl, scene } = useThree();
  const look = useRef(new THREE.Vector3());
  const first = useRef(true);
  const cine = useRef(0);

  useEffect(() => {
    capture.gl = gl;
    capture.scene = scene;
    capture.camera = camera;
    capture.still = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => {
      capture.gl = null;
      capture.still = null;
    };
  }, [camera, gl, scene]);

  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const ui = useLife.getState();
    const p = player;
    const onFoot = ui.phase !== 'drive';
    const locked = !!ui.dialog || ui.closet || ui.showPicker || ui.recording >= 0 || ui.fade > 0.3;

    if (onFoot) {
      p.camYaw -= input.lookDX * 0.0055;
      p.camPitch = THREE.MathUtils.clamp(p.camPitch + input.lookDY * 0.004, -0.5, 0.9);
      const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
      const speed = locked ? 0 : mag * (input.run || mag > 0.92 ? 4.6 : 2.4);
      if (mag > 0.05 && !locked) {
        const fx = Math.sin(p.camYaw), fz = Math.cos(p.camYaw), rx = -Math.cos(p.camYaw), rz = Math.sin(p.camYaw);
        const dx = (fx * input.moveY + rx * input.moveX) / mag, dz = (fz * input.moveY + rz * input.moveX) / mag;
        let diff = Math.atan2(dx, dz) - p.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        p.yaw += diff * Math.min(1, dt * 10);
        if (p.action === 'dance') p.action = 'none';
        const nx = p.pos.x + dx * speed * dt, nz = p.pos.z + dz * speed * dt;
        if (walkArea.test(nx, nz)) p.pos.set(nx, p.pos.y, nz);
        else if (walkArea.test(nx, p.pos.z)) p.pos.x = nx;
        else if (walkArea.test(p.pos.x, nz)) p.pos.z = nz;
      }
      if (ui.cam === 'first' && !locked) p.yaw = p.camYaw;
      p.speed += (speed / 2.4 - p.speed) * Math.min(1, dt * 8);
      p.actionT += dt;
      if ((p.action === 'wave' || p.action === 'point' || p.action === 'bow') && p.actionT > 2.6) p.action = 'none';
      p.pos.y = ui.phase === 'arrival' ? 0.2 : 0;
      p.onGround = true;
    }
    input.lookDX = input.lookDY = 0;

    // interaction prompt: nearest interactable in range
    let best: (typeof interactables.list)[number] | null = null;
    let bd = Infinity;
    if (onFoot)
      for (const it of interactables.list) {
        const d = Math.hypot(it.x - p.pos.x, it.z - p.pos.z);
        if (d < it.r && d < bd) {
          bd = d;
          best = it;
        }
      }
    if ((best?.id ?? null) !== (ui.prompt?.id ?? null)) ui.set({ prompt: best });
    if (ui.phase === 'home') {
      const loc = roomAt(p.pos.x, p.pos.z);
      if (loc !== ui.location) ui.set({ location: loc });
    }

    /* ------------------------------ cameras ------------------------------ */
    const cam = camera as THREE.PerspectiveCamera;
    let k = Math.min(1, dt * 6);
    if (first.current) {
      k = 1;
      first.current = false;
    }
    cine.current += dt;
    if (onFoot) {
      const eye = 1.55;
      if (ui.cam === 'first') {
        tmp.set(p.pos.x + Math.sin(p.camYaw) * 0.15, p.pos.y + eye + 0.1, p.pos.z + Math.cos(p.camYaw) * 0.15);
        cam.position.copy(tmp);
        tmp2.set(tmp.x + Math.sin(p.camYaw) * Math.cos(p.camPitch), tmp.y - Math.sin(p.camPitch) * 0.8, tmp.z + Math.cos(p.camYaw) * Math.cos(p.camPitch));
        cam.lookAt(tmp2);
      } else if (ui.cam === 'top') {
        tmp.set(p.pos.x, p.pos.y + (ui.phase === 'home' ? 22 : 30), p.pos.z + 6);
        cam.position.lerp(tmp, k);
        look.current.lerp(tmp2.set(p.pos.x, p.pos.y, p.pos.z), k);
        cam.lookAt(look.current);
      } else if (ui.cam === 'cinematic') {
        const a = cine.current * 0.18;
        const r = ui.phase === 'home' ? 4.5 : 7;
        tmp.set(p.pos.x + Math.sin(a) * r, p.pos.y + 1.4 + Math.sin(a * 0.7) * 0.4, p.pos.z + Math.cos(a) * r);
        if (ui.phase === 'home' && !walkArea.test(tmp.x, tmp.z)) tmp.set(p.pos.x + Math.sin(a) * 2, p.pos.y + 1.8, p.pos.z + Math.cos(a) * 2);
        cam.position.lerp(tmp, k * 0.5);
        look.current.lerp(tmp2.set(p.pos.x, p.pos.y + 1.3, p.pos.z), k);
        cam.lookAt(look.current);
      } else {
        // third person: pull the camera in when a wall is behind (indoors)
        let dist = ui.phase === 'home' ? 3.2 : 4.6;
        const behind = (d: number) => [p.pos.x - Math.sin(p.camYaw) * d * Math.cos(p.camPitch * 0.6), p.pos.z - Math.cos(p.camYaw) * d * Math.cos(p.camPitch * 0.6)];
        if (ui.phase === 'home') while (dist > 0.9 && !walkArea.test(behind(dist)[0], behind(dist)[1])) dist -= 0.3;
        const [bx, bz] = behind(dist);
        tmp.set(bx, p.pos.y + 1.7 + Math.sin(p.camPitch) * dist, bz);
        cam.position.lerp(tmp, k);
        look.current.lerp(tmp2.set(p.pos.x, p.pos.y + 1.35, p.pos.z), k);
        cam.lookAt(look.current);
      }
    } else {
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      if (ui.cam === 'hood') {
        cam.position.set(car.pos.x + fx * 1.2, 1.55, car.pos.z + fz * 1.2);
        cam.lookAt(car.pos.x + fx * 30, 1.2, car.pos.z + fz * 30);
      } else if (ui.cam === 'top') {
        tmp.set(car.pos.x, 70, car.pos.z + 18);
        cam.position.lerp(tmp, k);
        cam.lookAt(car.pos);
      } else if (ui.cam === 'cinematic') {
        // alternate between a low side tracking shot and a high orbit
        const seg = Math.floor(cine.current / 7) % 3;
        if (seg === 0) tmp.set(car.pos.x - fz * 7, 1.1, car.pos.z + fx * 7);
        else if (seg === 1) tmp.set(car.pos.x + fx * 16, 2.2, car.pos.z + fz * 16);
        else tmp.set(car.pos.x + Math.sin(cine.current * 0.3) * 22, 14, car.pos.z + Math.cos(cine.current * 0.3) * 22);
        cam.position.lerp(tmp, Math.min(1, dt * 2));
        cam.lookAt(car.pos.x, 1, car.pos.z);
      } else {
        tmp.set(car.pos.x - fx * 10, 3.8, car.pos.z - fz * 10);
        cam.position.lerp(tmp, k);
        look.current.lerp(tmp2.set(car.pos.x + fx * 6, 1, car.pos.z + fz * 6), k);
        cam.lookAt(look.current);
      }
    }
    void state;
  });
  return null;
}

function Scene() {
  const phase = useLife((s) => s.phase);
  const look = useCareer((s) => s.career.look);
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(phase === 'home' ? '#0d0f14' : '#05070d');
    scene.fog = phase === 'home' ? null : new THREE.Fog('#0a0d18', 60, 420);
  }, [phase, scene]);
  return (
    <>
      {phase === 'home' && <Home />}
      {phase !== 'home' && <City driving={phase === 'drive'} />}
      {phase === 'arrival' && <Arrival />}
      {phase !== 'drive' && <Avatar look={look} />}
      <LifeRig key={phase} />
    </>
  );
}

export function LifeWorld() {
  const graphics = useSettings((s) => s.effective);
  const q = QUALITY[graphics];
  return (
    <Canvas
      className="viewport-canvas"
      dpr={[1, Math.min(q.dpr, window.devicePixelRatio || 1)]}
      gl={{ antialias: graphics !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false, preserveDrawingBuffer: false }}
      camera={{ fov: 58, near: 0.1, far: 2000, position: [0, 2, 4] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      style={{ touchAction: 'none' }}
    >
      <Suspense fallback={null}>
        <Scene />
        {q.bloom && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
            <Vignette darkness={0.45} offset={0.3} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}

export { CARPET };
