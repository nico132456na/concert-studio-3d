import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useUI } from '../state/uiStore';
import { edit, expandGroups, getProject, useProject } from '../state/projectStore';
import type { Fixture, StageObject, Vec3 } from '../types';
import { round, clamp } from '../util/misc';

/** Filled in by <InteractionBridge/> inside the Canvas. */
export const ctx: {
  camera: THREE.Camera | null;
  dom: HTMLElement | null;
  controls: any;
} = { camera: null, dom: null, controls: null };

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3();

let lastTap = { id: '', t: 0 };
/** set while a drag moved, so the trailing click doesn't change selection */
let suppressClickUntil = 0;

function rayAt(clientX: number, clientY: number) {
  if (!ctx.camera || !ctx.dom) return null;
  const r = ctx.dom.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, ctx.camera);
  return ray;
}

function isFixtureId(id: string) {
  return !!getProject()?.fixtures.some((f) => f.id === id);
}

export function handleItemClick(e: ThreeEvent<MouseEvent>, id: string) {
  e.stopPropagation();
  if (performance.now() < suppressClickUntil) return;
  if ((e as any).delta > 8) return;
  const ui = useUI.getState();
  const now = performance.now();
  const fixture = isFixtureId(id);
  // double tap → focus camera
  if (lastTap.id === id && now - lastTap.t < 380) {
    const p = getProject();
    const o = p?.objects.find((x) => x.id === id);
    const f = p?.fixtures.find((x) => x.id === id);
    if (o) ui.requestCamera('free', [o.pos[0], o.pos[1] + o.size[1] / 2, o.pos[2]], Math.max(6, Math.max(...o.size) * 1.8));
    if (f) ui.requestCamera('free', f.pos, 6);
    lastTap = { id: '', t: 0 };
    return;
  }
  lastTap = { id, t: now };
  const ids = fixture ? [id] : expandGroups([id]);
  ui.select(ids, ui.multiSelect);
  if (!ui.multiSelect) ui.set({ rightTab: fixture ? 'light' : ui.rightTab === 'light' ? 'object' : ui.rightTab, rightOpen: true });
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  primary: string;
  anchor: THREE.Vector3; // offset from hit to primary position
  planeAxis: 'y' | 'z' | 'x';
  startObjs: Map<string, StageObject>;
  startFx: Map<string, Fixture>;
  tool: string;
}

let drag: DragState | null = null;

export function handleItemPointerDown(e: ThreeEvent<PointerEvent>, id: string) {
  const ui = useUI.getState();
  if (ui.screen !== 'editor' || ui.tool === 'select') return;
  if (!ui.selection.includes(id)) return; // first tap selects; dragging works on selected items
  if (!e.isPrimary || drag) return;
  const p = getProject();
  if (!p) return;
  const ids = ui.selection;
  const objs = p.objects.filter((o) => ids.includes(o.id) && !o.locked);
  const fxs = p.fixtures.filter((f) => ids.includes(f.id) && !f.locked);
  if (!objs.length && !fxs.length) return;
  e.stopPropagation();
  if (ctx.controls) ctx.controls.enabled = false;

  const primaryPos = (objs.find((o) => o.id === id)?.pos ?? fxs.find((f) => f.id === id)?.pos ?? [0, 0, 0]) as Vec3;
  const view = ui.view;
  const axis: DragState['planeAxis'] = view === 'front' ? 'z' : view === 'side' ? 'x' : 'y';
  const pt = e.point.clone();
  drag = {
    pointerId: e.pointerId,
    startX: e.nativeEvent.clientX,
    startY: e.nativeEvent.clientY,
    moved: false,
    primary: id,
    anchor: new THREE.Vector3(pt.x - primaryPos[0], pt.y - primaryPos[1], pt.z - primaryPos[2]),
    planeAxis: axis,
    startObjs: new Map(objs.map((o) => [o.id, o])),
    startFx: new Map(fxs.map((f) => [f.id, f])),
    tool: ui.tool,
  };
  if (axis === 'y') plane.set(new THREE.Vector3(0, 1, 0), -pt.y);
  else if (axis === 'z') plane.set(new THREE.Vector3(0, 0, 1), -pt.z);
  else plane.set(new THREE.Vector3(1, 0, 0), -pt.x);

  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

function bounds(o: StageObject) {
  // axis-aligned footprint approximation (rotation by 90° swaps w/d)
  const r = Math.abs(Math.sin(o.rot[1]));
  const w = o.size[0] * (1 - r) + o.size[2] * r;
  const d = o.size[2] * (1 - r) + o.size[0] * r;
  return { x0: o.pos[0] - w / 2, x1: o.pos[0] + w / 2, z0: o.pos[2] - d / 2, z1: o.pos[2] + d / 2, cx: o.pos[0], cz: o.pos[2] };
}

function snapToObjects(primary: StageObject, nx: number, nz: number, exclude: Set<string>) {
  const p = getProject();
  if (!p) return { x: nx, z: nz, gx: undefined as number | undefined, gz: undefined as number | undefined };
  const me = bounds({ ...primary, pos: [nx, primary.pos[1], nz] });
  const th = 0.6;
  let bestX = { d: th, v: nx, g: undefined as number | undefined };
  let bestZ = { d: th, v: nz, g: undefined as number | undefined };
  const myX = [me.x0, me.cx, me.x1];
  const myZ = [me.z0, me.cz, me.z1];
  const tryX = (target: number) => {
    for (const mx of myX) {
      const d = Math.abs(mx - target);
      if (d < bestX.d) bestX = { d, v: nx + (target - mx), g: target };
    }
  };
  const tryZ = (target: number) => {
    for (const mz of myZ) {
      const d = Math.abs(mz - target);
      if (d < bestZ.d) bestZ = { d, v: nz + (target - mz), g: target };
    }
  };
  tryX(0); // stage center line
  for (const o of p.objects) {
    if (exclude.has(o.id) || o.hidden) continue;
    const b = bounds(o);
    [b.x0, b.cx, b.x1].forEach(tryX);
    [b.z0, b.cz, b.z1].forEach(tryZ);
  }
  return { x: bestX.v, z: bestZ.v, gx: bestX.g, gz: bestZ.g };
}

function onMove(ev: PointerEvent) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  ev.preventDefault();
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    useProject.getState().checkpoint();
    useUI.getState().set({ dragging: true });
  }
  const ui = useUI.getState();
  const { startObjs, startFx } = drag;

  if (drag.tool === 'move') {
    const r = rayAt(ev.clientX, ev.clientY);
    if (!r || !r.ray.intersectPlane(plane, hit)) return;
    const prim = startObjs.get(drag.primary) ?? startFx.get(drag.primary);
    if (!prim) return;
    let nx = hit.x - drag.anchor.x;
    let ny = hit.y - drag.anchor.y;
    let nz = hit.z - drag.anchor.z;
    if (drag.planeAxis === 'y') ny = prim.pos[1];
    if (drag.planeAxis === 'z') nz = prim.pos[2];
    if (drag.planeAxis === 'x') nx = prim.pos[0];
    let guides: { x?: number; z?: number } | null = null;
    const primObj = startObjs.get(drag.primary);
    if (ui.snapObjects && primObj && drag.planeAxis === 'y') {
      const s = snapToObjects(primObj, nx, nz, new Set([...startObjs.keys()]));
      if (s.gx !== undefined) nx = s.x;
      if (s.gz !== undefined) nz = s.z;
      if (s.gx !== undefined || s.gz !== undefined) guides = { x: s.gx, z: s.gz };
    }
    if (ui.snapGrid) {
      if (!guides || guides.x === undefined) nx = round(nx, ui.gridSize);
      if (!guides || guides.z === undefined) nz = round(nz, ui.gridSize);
      if (drag.planeAxis !== 'y') ny = round(ny, ui.gridSize);
    }
    ny = Math.max(0, ny);
    const ddx = nx - prim.pos[0], ddy = ny - prim.pos[1], ddz = nz - prim.pos[2];
    const ids = [...startObjs.keys(), ...startFx.keys()];
    const mutate = useProject.getState().mutate;
    mutate(
      (p) => ({
        ...p,
        objects: p.objects.map((o) => {
          const s = startObjs.get(o.id);
          return s ? { ...o, pos: [s.pos[0] + ddx, Math.max(0, s.pos[1] + ddy), s.pos[2] + ddz] as Vec3 } : o;
        }),
        fixtures: p.fixtures.map((f) => {
          const s = startFx.get(f.id);
          return s ? { ...f, pos: [s.pos[0] + ddx, Math.max(0, s.pos[1] + ddy), s.pos[2] + ddz] as Vec3 } : f;
        }),
      }),
      { history: false },
    );
    ui.set({ guides });
    void ids;
  } else if (drag.tool === 'rotate') {
    const delta = dx * 0.012;
    const snap = ui.snapGrid ? Math.PI / 12 : 0;
    useProject.getState().mutate(
      (p) => ({
        ...p,
        objects: p.objects.map((o) => {
          const s = startObjs.get(o.id);
          if (!s) return o;
          let ry = s.rot[1] - delta;
          if (snap) ry = Math.round(ry / snap) * snap;
          return { ...o, rot: [s.rot[0], ry, s.rot[2]] as Vec3 };
        }),
        fixtures: p.fixtures.map((f) => {
          const s = startFx.get(f.id);
          if (!s) return f;
          let pan = s.pan + dx * 0.6;
          if (snap) pan = Math.round(pan / 15) * 15;
          return { ...f, pan: ((pan + 540) % 360) - 180, tilt: clamp(s.tilt + dy * 0.4, 0, 180) };
        }),
      }),
      { history: false },
    );
  } else if (drag.tool === 'scale') {
    const factor = Math.exp(-dy * 0.006 + dx * 0.002);
    useProject.getState().mutate(
      (p) => ({
        ...p,
        objects: p.objects.map((o) => {
          const s = startObjs.get(o.id);
          if (!s) return o;
          const step = ui.snapGrid ? 0.1 : 0;
          const sz = s.size.map((v) => Math.max(0.05, step ? round(v * factor, step) || step : v * factor)) as Vec3;
          return { ...o, size: sz };
        }),
        fixtures: p.fixtures.map((f) => {
          const s = startFx.get(f.id);
          return s ? { ...f, beamAngle: clamp(s.beamAngle * factor, 1, 90) } : f;
        }),
      }),
      { history: false },
    );
  }
}

function onUp(ev: PointerEvent) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
  if (ctx.controls) ctx.controls.enabled = true;
  const ui = useUI.getState();
  if (drag.moved) {
    suppressClickUntil = performance.now() + 250;
    ui.bump('moves');
  }
  ui.set({ dragging: false, guides: null });
  drag = null;
}

/** Nudge selected items by a delta (used by arrow buttons). */
export function nudge(delta: Vec3) {
  const ui = useUI.getState();
  const ids = ui.selection;
  edit.updateObjects(ids, (o) => (o.locked ? o : { ...o, pos: [o.pos[0] + delta[0], Math.max(0, o.pos[1] + delta[1]), o.pos[2] + delta[2]] }), { key: 'nudge' });
  edit.updateFixtures(ids, (f) => (f.locked ? f : { ...f, pos: [f.pos[0] + delta[0], Math.max(0, f.pos[1] + delta[1]), f.pos[2] + delta[2]] }), { key: 'nudge' });
}
