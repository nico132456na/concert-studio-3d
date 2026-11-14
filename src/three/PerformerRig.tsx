import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { ArenaDef } from '../data/arenas';
import { player, input, usePerformer, type CamMode } from '../performer/state';
import { BACKSTAGE_Y, LIFT, ARENA_DOOR, walkableBackstage, roomAt, inRect, ROOM_BY_ID } from '../data/backstage';
import { backstageData } from './Backstage';
import { getProject } from '../state/projectStore';
import { useShow } from '../state/showStore';
import { walkSurface, supportHeight } from './collision';
import { ctx } from './interaction';
import { crowd } from '../audio/crowd';
import type { StageObject } from '../types';

export const capture: { gl: THREE.WebGLRenderer | null; still: (() => string) | null; scene?: THREE.Scene; camera?: THREE.Camera } = { gl: null, still: null };

/** Where the performer appears when the stage lift reaches the top. */
export function stageArrival(objects: StageObject[]): [number, number, number] {
  const decks = objects.filter((o) => (o.tag === 'main' || ['platform', 'circlePlatform', 'hexPlatform', 'octagon', 'ovalPlatform', 'custom'].includes(o.kind)) && o.pos[1] < 3 && !o.hidden);
  if (!decks.length) return [0, 0, -2];
  const main = decks.reduce((a, b) => (b.size[0] * b.size[2] > a.size[0] * a.size[2] ? b : a));
  const x = main.pos[0];
  const z = main.pos[2] + Math.min(2, main.size[2] / 4);
  const y = supportHeight(objects, x, z);
  return [x, y, z];
}

/** Front edge of the crowd, used for hype and crowd cameras. */
function crowdFront(arena: ArenaDef) {
  return arena.standing.zMin;
}

const tmp = new THREE.Vector3();
const look = new THREE.Vector3();
const camPos = new THREE.Vector3();

/** A follow spot from the front-of-house truss that tracks the performer on stage. */
function FollowSpot() {
  const light = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const on = player.pos.y > -3;
    l.intensity = on ? 11 : 0;
    l.position.set(player.pos.x * 0.6, player.pos.y + 14, player.pos.z + 22);
    l.target.position.set(player.pos.x, player.pos.y + 1, player.pos.z);
    l.target.updateMatrixWorld();
  });
  return <spotLight ref={light} color="#fff1dc" angle={0.06} penumbra={0.7} decay={0} distance={0} intensity={0} />;
}

export function PerformerRig({ arena }: { arena: ArenaDef }) {
  const { camera, gl, scene } = useThree();
  const autoT = useRef(0);
  const camSmooth = useRef(new THREE.Vector3());
  const first = useRef(true);

  useEffect(() => {
    ctx.camera = camera;
    ctx.dom = gl.domElement;
    ctx.controls = null;
    capture.gl = gl;
    capture.scene = scene;
    capture.camera = camera;
    capture.still = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    player.active = true;
    return () => {
      player.active = false;
      capture.gl = null;
      capture.still = null;
    };
  }, [camera, gl, scene]);

  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const p = player;
    const ui = usePerformer.getState();
    const project = getProject();
    const objects = project?.objects ?? [];
    const backstage = p.pos.y < -3;

    /* ----------------------------- movement ----------------------------- */
    const locked = ui.entrance !== 'none' || ui.wardrobe;
    if (!locked) {
      p.camYaw -= input.lookDX * 0.0055;
      p.camPitch = THREE.MathUtils.clamp(p.camPitch + input.lookDY * 0.004, -0.6, 0.9);
    }
    input.lookDX = 0;
    input.lookDY = 0;
    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const running = input.run || mag > 0.92;
    const targetSpeed = locked ? 0 : mag * (running ? 5.4 : 2.6);
    const fx = Math.sin(p.camYaw), fz = Math.cos(p.camYaw);
    const rx = -Math.cos(p.camYaw), rz = Math.sin(p.camYaw);
    let dx = 0, dz = 0;
    if (mag > 0.05 && !locked) {
      dx = (fx * input.moveY + rx * input.moveX) / Math.max(mag, 1e-3);
      dz = (fz * input.moveY + rz * input.moveX) / Math.max(mag, 1e-3);
      const want = Math.atan2(dx, dz);
      let diff = want - p.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.yaw += diff * Math.min(1, dt * 10);
      if (p.action === 'dance' || p.action === 'handsUp') p.action = 'none';
    }
    if (ui.cam === 'first' && !locked) p.yaw = p.camYaw;
    p.speed += ((targetSpeed / 2.6) - p.speed) * Math.min(1, dt * 8);
    const stepLen = targetSpeed * dt;

    const tryMove = (nx: number, nz: number) => {
      if (p.pos.y < -3) return walkableBackstage(nx, nz, backstageData.obstacles) ? BACKSTAGE_Y : null;
      const f = arena.floor;
      if (nx < f.xMin + 0.5 || nx > f.xMax - 0.5 || nz < f.zMin + 0.5 || nz > f.zMax - 0.5) return null;
      const w = walkSurface(objects, nx, nz, p.pos.y, 0);
      return w.blocked ? null : w.ground;
    };

    let ground = p.pos.y < -3 ? BACKSTAGE_Y : walkSurface(objects, p.pos.x, p.pos.z, p.pos.y, 0).ground;
    if (stepLen > 0 && p.liftT < 0) {
      const nx = p.pos.x + dx * stepLen, nz = p.pos.z + dz * stepLen;
      let g = tryMove(nx, nz);
      if (g !== null) {
        p.pos.x = nx;
        p.pos.z = nz;
        ground = g;
      } else if ((g = tryMove(nx, p.pos.z)) !== null) {
        p.pos.x = nx;
        ground = g;
      } else if ((g = tryMove(p.pos.x, nz)) !== null) {
        p.pos.z = nz;
        ground = g;
      }
    }

    /* ----------------------------- vertical ----------------------------- */
    if (p.liftT >= 0) {
      // wall-clock based so slow frame rates can't desync the entrance
      p.liftT = Math.min(1, (performance.now() - p.liftStart) / 3200);
      const k = p.liftT * p.liftT * (3 - 2 * p.liftT);
      p.pos.y = p.liftFrom + (p.liftTo - p.liftFrom) * k;
      p.vel.y = 0;
      p.onGround = true;
      if (p.liftT >= 1) p.liftT = -1;
    } else {
      if (!p.onGround || p.pos.y > ground + 0.02) {
        p.vel.y -= 18 * dt;
        p.pos.y += p.vel.y * dt;
        if (p.pos.y <= ground) {
          p.pos.y = ground;
          p.vel.y = 0;
          p.onGround = true;
        } else if (p.onGround && p.pos.y - ground < 0.55 && p.vel.y <= 0) {
          p.pos.y = ground; // step down stairs
        } else p.onGround = false;
      } else {
        p.pos.y = ground;
      }
    }
    if (input.jump) {
      input.jump = false;
      if (p.onGround && !locked) {
        p.vel.y = 5.2;
        p.onGround = false;
        p.pos.y += 0.01;
        p.hypeBoost = Math.min(1.5, p.hypeBoost + 0.3);
      }
    }

    /* ------------------------------ actions ------------------------------ */
    p.actionT += dt;
    if ((p.action === 'wave' || p.action === 'point' || p.action === 'bow' || p.action === 'jump') && p.actionT > 2.6) p.action = 'none';
    p.hypeBoost = Math.max(0, p.hypeBoost - dt * 0.18);

    /* -------------------------- crowd reaction -------------------------- */
    const onStage = !backstage && p.pos.y > 0.3;
    if (onStage) {
      p.stageTime += dt;
      p.hypeSum += p.hype * dt;
    }
    const front = crowdFront(arena);
    const near = onStage ? THREE.MathUtils.clamp(1 - Math.abs(front - p.pos.z) / 28, 0, 1) : 0;
    const show = useShow.getState();
    const target = backstage ? 0.15 : 0.25 + near * 0.45 + p.hypeBoost * 0.45 + (show.playing ? 0.15 : 0);
    p.hype += (target - p.hype) * Math.min(1, dt * 1.5);
    if (Math.abs(show.hype - p.hype) > 0.02) show.set({ hype: p.hype });
    crowd.setLevel(backstage ? 0.06 + (p.pos.z > -12 ? 0.12 : 0) : p.hype, backstage);

    /* -------------------------- HUD state sync -------------------------- */
    const nearLift = backstage && Math.hypot(p.pos.x - LIFT.x, p.pos.z - LIFT.z) < LIFT.r + 0.4;
    const nearDoor = backstage && Math.hypot(p.pos.x - ARENA_DOOR.x, p.pos.z - ARENA_DOOR.z) < ARENA_DOOR.r;
    let location = 'Arena Floor';
    if (backstage) location = roomAt(p.pos.x, p.pos.z)?.name ?? 'Backstage';
    else if (onStage) location = p.pos.z > 3 ? 'Runway / B-Stage' : 'Main Stage';
    if (ui.nearLift !== nearLift || ui.nearArenaDoor !== nearDoor || ui.location !== location || ui.onStage !== onStage) usePerformer.getState().set({ nearLift, nearArenaDoor: nearDoor, location, onStage });

    /* ------------------------------ camera ------------------------------ */
    let mode: CamMode = ui.cam;
    if (backstage && mode !== 'first' && mode !== 'wardrobe') mode = 'third';
    if (mode === 'auto') {
      autoT.current += dt;
      const order: CamMode[] = ['third', 'crowd', 'drone', 'stagefront'];
      mode = order[Math.floor(autoT.current / 6) % order.length];
    }
    const h = 1.65;
    const head = tmp.set(p.pos.x, p.pos.y + h, p.pos.z);
    let instant = first.current;
    first.current = false;
    if (ui.entrance === 'reveal' && p.liftT >= 0) {
      // cinematic reveal: sweep from the crowd toward the performer
      const k = Math.max(0, p.liftT);
      const startZ = front + 30, endZ = p.pos.z + 7;
      camPos.set(Math.sin(k * 1.2) * 14, p.pos.y + 6 - k * 3.5, startZ + (endZ - startZ) * k);
      look.set(p.pos.x, p.pos.y + 1.4, p.pos.z);
      instant = true;
    } else if (mode === 'first') {
      camPos.copy(head).addScaledVector(new THREE.Vector3(Math.sin(p.camYaw), 0, Math.cos(p.camYaw)), 0.12);
      look.set(camPos.x + Math.sin(p.camYaw) * Math.cos(p.camPitch), camPos.y - Math.sin(p.camPitch) + 0.15, camPos.z + Math.cos(p.camYaw) * Math.cos(p.camPitch));
      instant = true;
    } else if (mode === 'wardrobe') {
      camPos.set(p.pos.x + Math.sin(p.yaw) * 2.8, p.pos.y + 1.25, p.pos.z + Math.cos(p.yaw) * 2.8);
      look.set(p.pos.x, p.pos.y + 1.05, p.pos.z);
    } else if (mode === 'crowd') {
      camPos.set(p.pos.x * 0.4 + Math.sin(state.clock.elapsedTime * 0.1) * 4, 2.4, front + 9);
      look.copy(head);
    } else if (mode === 'drone') {
      const a = state.clock.elapsedTime * 0.15;
      camPos.set(p.pos.x + Math.sin(a) * 16, p.pos.y + 9, p.pos.z + Math.cos(a) * 16);
      look.copy(head);
    } else if (mode === 'stagefront') {
      camPos.set(p.pos.x + 1.5, p.pos.y + 0.4, p.pos.z + 4.5);
      look.set(p.pos.x, p.pos.y + 1.6, p.pos.z);
    } else {
      // wider framing out front so the stage, crowd and performer all read
      let dist = (backstage ? 4.2 : 6.4) - p.camPitch * 1.2;
      const up = (backstage ? 1.2 : 1.9) + p.camPitch * 2.4;
      // keep the camera inside backstage rooms
      if (backstage) {
        for (let i = 0; i < 12; i++) {
          const cx = p.pos.x - Math.sin(p.camYaw) * dist, cz = p.pos.z - Math.cos(p.camYaw) * dist;
          if (walkableBackstage(cx, cz, [], 0.15)) break;
          dist *= 0.8;
        }
      }
      camPos.set(p.pos.x - Math.sin(p.camYaw) * dist, Math.min(p.pos.y + up + h * 0.4, backstage ? BACKSTAGE_Y + 3.1 : 999), p.pos.z - Math.cos(p.camYaw) * dist);
      look.set(p.pos.x, p.pos.y + h * 0.85, p.pos.z);
    }
    if (instant) camSmooth.current.copy(camPos);
    else camSmooth.current.lerp(camPos, Math.min(1, dt * 6));
    camera.position.copy(camSmooth.current);
    camera.lookAt(look);
    (camera as THREE.PerspectiveCamera).fov = mode === 'first' ? 70 : 55;
    camera.updateProjectionMatrix();
    void inRect;
    void ROOM_BY_ID;
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={55} near={0.08} far={2500} position={[0, -6, -10]} />
      <FollowSpot />
    </>
  );
}
