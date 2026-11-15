import { useEffect, useRef, useState } from 'react';
import { input } from '../../performer/state';
import { useSettings } from '../../state/settingsStore';

/**
 * Mobile-game style touch controls.
 * - MoveZone (left side): touch anywhere to start. Floating mode puts the stick under the thumb;
 *   fixed mode keeps it in the corner but still accepts touches anywhere in the zone. The knob follows
 *   the thumb inside the ring, output has a dead zone and a smooth response curve, and it springs back
 *   to centre on release.
 * - LookZone (everything else): one finger orbits the camera, two fingers pinch-zoom. It never receives
 *   touches that started in the move zone, so moving can't rotate the camera by accident.
 */

const DEAD = 0.12;

function shape(v: number) {
  // smooth curve: precise near centre, full speed at the rim
  const a = Math.max(0, (Math.abs(v) - DEAD) / (1 - DEAD));
  return Math.sign(v) * Math.min(1, a * (0.55 + 0.45 * a));
}

export function MoveZone() {
  const size = useSettings((s) => s.joySize);
  const opacity = useSettings((s) => s.joyOpacity);
  const mode = useSettings((s) => s.joyMode);
  const sens = useSettings((s) => s.moveSens);
  const R = size / 2;
  const zone = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  const fixedCenter = () => {
    const r = zone.current!.getBoundingClientRect();
    return { x: r.left + 34 + R, y: r.bottom - 34 - R };
  };

  const update = (cx: number, cy: number, c: { x: number; y: number }) => {
    let dx = cx - c.x, dy = cy - c.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy, active: true });
    const nx = dx / R, ny = -dy / R;
    const m = Math.hypot(nx, ny);
    const k = m > 0 ? Math.min(1, (shape(m) * sens) / m) : 0;
    input.moveX = nx * k;
    input.moveY = ny * k;
  };
  const release = () => {
    pid.current = null;
    setKnob({ x: 0, y: 0, active: false });
    if (mode === 'floating') setBase(null);
    input.moveX = input.moveY = 0;
  };
  useEffect(() => () => {
    input.moveX = input.moveY = 0;
  }, []);

  const center = base ?? null;
  return (
    <div
      ref={zone}
      className="move-zone"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        const c = mode === 'floating' ? { x: e.clientX, y: e.clientY } : fixedCenter();
        setBase(c);
        update(e.clientX, e.clientY, c);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pid.current || !center) return;
        update(e.clientX, e.clientY, center);
      }}
      onPointerUp={(e) => e.pointerId === pid.current && release()}
      onPointerCancel={(e) => e.pointerId === pid.current && release()}
    >
      {(() => {
        const zr = zone.current?.getBoundingClientRect();
        const c = center && zr ? { x: center.x - zr.left, y: center.y - zr.top } : null;
        const style: React.CSSProperties = c
          ? { left: c.x - R, top: c.y - R, width: size, height: size, opacity }
          : { left: 34, bottom: 34, width: size, height: size, opacity: opacity * 0.8 };
        return (
          <div className={`joy2 ${knob.active ? 'active' : ''}`} style={style}>
            <div className="joy2-ring" />
            <div className="joy2-knob" style={{ width: size * 0.42, height: size * 0.42, transform: `translate(${knob.x}px, ${knob.y}px)`, transition: knob.active ? 'none' : 'transform 0.18s ease-out' }} />
          </div>
        );
      })()}
    </div>
  );
}

export function LookZone() {
  const sens = useSettings((s) => s.lookSens);
  const invert = useSettings((s) => s.invertY);
  const camDistance = useSettings((s) => s.camDistance);
  const update = useSettings((s) => s.update);
  const pts = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  useEffect(() => {
    input.zoom = camDistance;
  }, [camDistance]);
  const dist = () => {
    const [a, b] = [...pts.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  return (
    <div
      className="look-zone"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2) pinch.current = { d: dist(), z: input.zoom };
      }}
      onPointerMove={(e) => {
        const l = pts.current.get(e.pointerId);
        if (!l) return;
        if (pts.current.size >= 2 && pinch.current) {
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const z = Math.min(2.2, Math.max(0.45, pinch.current.z * (pinch.current.d / Math.max(20, dist()))));
          input.zoom = z;
          return;
        }
        input.lookDX += (e.clientX - l.x) * sens;
        input.lookDY += (e.clientY - l.y) * sens * (invert ? -1 : 1);
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerUp={(e) => {
        pts.current.delete(e.pointerId);
        if (pts.current.size < 2 && pinch.current) {
          pinch.current = null;
          update({ camDistance: Math.round(input.zoom * 100) / 100 });
        }
      }}
      onPointerCancel={(e) => pts.current.delete(e.pointerId)}
      onWheel={(e) => {
        input.zoom = Math.min(2.2, Math.max(0.45, input.zoom * (1 + e.deltaY * 0.001)));
      }}
    />
  );
}
