import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { ArenaDef } from '../data/arenas';
import { useUI, type CameraPresetId, type ViewMode } from '../state/uiStore';
import { useSettings } from '../state/settingsStore';
import { useProject } from '../state/projectStore';
import { ctx } from './interaction';
import type { Vec3 } from '../types';

type Pose = { pos: Vec3; target: Vec3 };

/** Keep indoor cameras inside the room so walls and roof never block the view. */
export function clampIndoor(pose: Pose, a: ArenaDef): Pose {
  if (!a.ceiling) return pose;
  const f = a.floor;
  const k = a.kind === 'bowl' ? 1.55 : 0.92;
  const cx = (f.xMin + f.xMax) / 2, cz = (f.zMin + f.zMax) / 2;
  const hx = ((f.xMax - f.xMin) / 2) * k, hz = ((f.zMax - f.zMin) / 2) * k;
  const [x, y, z] = pose.pos;
  return {
    pos: [Math.max(cx - hx, Math.min(cx + hx, x)), Math.max(1, Math.min(a.ceiling * 0.82, y)), Math.max(cz - hz, Math.min(cz + hz, z))],
    target: pose.target,
  };
}

export function presetPose(id: CameraPresetId, a: ArenaDef): Pose {
  return clampIndoor(rawPose(id, a), a);
}

function rawPose(id: CameraPresetId, a: ArenaDef): Pose {
  const D = a.camDist;
  const st = a.standing;
  switch (id) {
    case 'front':
      return { pos: [0, D * 0.14, D * 0.6], target: [0, 5, -2] };
    case 'rear':
      return { pos: [0, D * 0.2, -D * 0.45], target: [0, 4, 4] };
    case 'left':
      return { pos: [D * 0.55, D * 0.15, 4], target: [0, 4, -3] };
    case 'right':
      return { pos: [-D * 0.55, D * 0.15, 4], target: [0, 4, -3] };
    case 'bird':
      return { pos: [D * 0.3, D * 0.62, D * 0.55], target: [0, 0, 4] };
    case 'side':
      return { pos: [D * 0.7, 3, -3], target: [0, 4, -3] };
    case 'performer':
      return { pos: [0, 3.6, -1], target: [0, 3, 40] };
    case 'overview':
      return { pos: [D * 0.85, D * 0.75, D * 1.1], target: [0, 0, (a.floor.zMin + a.floor.zMax) / 3] };
    case 'audience':
      return { pos: [3, 1.75, st.zMin + Math.min(26, (st.zMax - st.zMin) * 0.35)], target: [0, 6, -4] };
    case 'reset':
    default: {
      const R = Math.min(D, 78);
      return { pos: [R * 0.42, R * 0.32, R * 0.78], target: [0, 4, 0] };
    }
  }
}

const ORTHO: ViewMode[] = ['top', 'front', 'side'];

export function CameraRig({ arena, autoRotate = false, interactive = true, initial }: { arena: ArenaDef; autoRotate?: boolean; interactive?: boolean; initial?: Pose }) {
  const view = useUI((s) => s.view);
  const camRequest = useUI((s) => s.camRequest);
  const rotateSpeed = useSettings((s) => s.rotateSpeed);
  const zoomSpeed = useSettings((s) => s.zoomSpeed);
  const controls = useRef<any>(null);
  const { camera, size, gl } = useThree();
  const ortho = ORTHO.includes(view);
  const anim = useRef<{ from: Pose; to: Pose; t: number; dur: number } | null>(null);
  const userMoved = useRef(false);

  // initial pose (or restore saved camera)
  const startPose = useMemo<Pose>(() => initial ?? presetPose(view === 'audience' ? 'audience' : 'reset', arena), // eslint-disable-next-line react-hooks/exhaustive-deps
  [arena.id]);

  useEffect(() => {
    ctx.camera = camera;
    ctx.dom = gl.domElement;
  }, [camera, gl]);

  useEffect(() => {
    ctx.controls = controls.current;
    return () => {
      if (ctx.controls === controls.current) ctx.controls = null;
    };
  });

  // configure ortho views
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (ortho) {
      const cam = camera as THREE.OrthographicCamera;
      const span = Math.max(30, Math.min(arena.camDist * 0.9, 120));
      if (view === 'top') {
        cam.up.set(0, 0, -1);
        cam.position.set(0, 300, 6);
        c.target.set(0, 0, 6);
        cam.zoom = Math.min(size.width, size.height) / span;
      } else if (view === 'front') {
        cam.up.set(0, 1, 0);
        cam.position.set(0, 8, 300);
        c.target.set(0, 8, 0);
        cam.zoom = Math.min(size.width / span, size.height / (span * 0.5));
      } else {
        cam.up.set(0, 1, 0);
        cam.position.set(300, 8, 0);
        c.target.set(0, 8, 0);
        cam.zoom = Math.min(size.width / span, size.height / (span * 0.5));
      }
      cam.lookAt(c.target);
      cam.updateProjectionMatrix();
      c.update();
    } else {
      camera.up.set(0, 1, 0);
      const pose = view === 'audience' ? presetPose('audience', arena) : startPose;
      camera.position.set(...pose.pos);
      c.target.set(...pose.target);
      c.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, ortho, arena.id]);

  // preset requests
  useEffect(() => {
    if (!camRequest || !controls.current) return;
    const c = controls.current;
    const ui = useUI.getState();
    if (camRequest.id === 'top') {
      ui.set({ view: 'top' });
      return;
    }
    if (ortho && camRequest.id !== 'free') ui.set({ view: camRequest.id === 'audience' ? 'audience' : 'persp' });
    let to: Pose;
    if (camRequest.focus) {
      const f = camRequest.focus;
      if (ortho) {
        c.target.set(f[0], ortho && view === 'top' ? 0 : f[1], f[2]);
        if (view === 'top') camera.position.set(f[0], 300, f[2]);
        else if (view === 'front') camera.position.set(f[0], f[1], 300);
        else camera.position.set(300, f[1], f[2]);
        (camera as THREE.OrthographicCamera).zoom = Math.min(size.width, size.height) / Math.max(4, (camRequest.radius ?? 10) * 1.6);
        camera.updateProjectionMatrix();
        c.update();
        return;
      }
      const dir = camera.position.clone().sub(c.target).normalize();
      if (dir.y < 0.15) dir.y = 0.3;
      dir.normalize();
      const r = camRequest.radius ?? 10;
      to = { pos: [f[0] + dir.x * r, f[1] + dir.y * r, f[2] + dir.z * r], target: f };
    } else {
      if (camRequest.id === 'audience' && view !== 'audience') ui.set({ view: 'audience' });
      else if (camRequest.id !== 'audience' && view === 'audience') ui.set({ view: 'persp' });
      to = presetPose(camRequest.id, arena);
    }
    anim.current = {
      from: { pos: camera.position.toArray() as Vec3, target: c.target.toArray() as Vec3 },
      to,
      t: 0,
      dur: 0.9,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camRequest]);

  useFrame((_, dt) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    a.t = Math.min(1, a.t + dt / a.dur);
    const k = a.t < 0.5 ? 4 * a.t * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 3) / 2;
    camera.position.set(
      a.from.pos[0] + (a.to.pos[0] - a.from.pos[0]) * k,
      a.from.pos[1] + (a.to.pos[1] - a.from.pos[1]) * k,
      a.from.pos[2] + (a.to.pos[2] - a.from.pos[2]) * k,
    );
    c.target.set(
      a.from.target[0] + (a.to.target[0] - a.from.target[0]) * k,
      a.from.target[1] + (a.to.target[1] - a.from.target[1]) * k,
      a.from.target[2] + (a.to.target[2] - a.from.target[2]) * k,
    );
    c.update();
    if (a.t >= 1) anim.current = null;
  });

  const onStart = () => {
    anim.current = null;
    if (!userMoved.current) {
      userMoved.current = true;
      useUI.getState().bump('camera');
    }
  };
  const onEnd = () => {
    userMoved.current = false;
    // remember the editor camera with the project (no undo entry)
    const ui = useUI.getState();
    if (ui.screen !== 'editor' || ortho || !controls.current) return;
    const pos = camera.position.toArray().map((v) => Math.round(v * 100) / 100) as Vec3;
    const target = (controls.current.target as THREE.Vector3).toArray().map((v) => Math.round(v * 100) / 100) as Vec3;
    useProject.getState().mutate((p) => ({ ...p, camera: { pos, target } }), { history: false });
  };

  const maxDist = arena.ceiling ? (arena.kind === 'bowl' ? arena.camDist * 1.3 : arena.camDist * 0.9) : Math.max(80, arena.camDist * 3.5);

  return (
    <>
      {ortho ? (
        <OrthographicCamera makeDefault near={0.1} far={2000} position={[0, 300, 6]} zoom={10} />
      ) : (
        <PerspectiveCamera makeDefault fov={view === 'audience' ? 62 : 45} near={0.2} far={2500} position={startPose.pos} />
      )}
      <OrbitControls
        key={ortho ? `o-${view}` : 'p'}
        ref={controls}
        makeDefault
        enabled={interactive}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={rotateSpeed}
        zoomSpeed={zoomSpeed}
        panSpeed={0.9}
        screenSpacePanning
        enableRotate={!ortho}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        minDistance={1.5}
        maxDistance={maxDist}
        minZoom={0.5}
        maxZoom={200}
        maxPolarAngle={Math.PI * 0.495}
        touches={ortho ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        mouseButtons={ortho ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        onStart={onStart}
        onEnd={onEnd}
        target={startPose.target}
      />
    </>
  );
}
