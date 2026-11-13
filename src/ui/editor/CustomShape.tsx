import { useMemo, useRef, useState } from 'react';
import { Undo2, Trash2 } from 'lucide-react';
import { Modal, Slider, Toggle, Seg } from '../components';
import { smoothOutline } from '../../three/geometry';
import { addCustomShape } from './actions';
import { MATERIAL_PRESETS } from '../../data/materials';
import { round } from '../../util/misc';

type Pt = [number, number]; // meters, x right, z toward audience

const PRESETS: Record<string, () => Pt[]> = {
  Rectangle: () => [[-10, -5], [10, -5], [10, 5], [-10, 5]],
  Thrust: () => [[-12, -6], [12, -6], [12, 0], [3, 0], [3, 10], [-3, 10], [-3, 0], [-12, 0]],
  Hexagon: () => Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2) * 9, Math.sin((i / 6) * Math.PI * 2) * 9] as Pt),
  Star: () => Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 4 : 10;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  }),
  Blob: () => [[-9, -4], [-2, -7], [6, -5], [10, 1], [5, 6], [-3, 5], [-8, 3]],
  Arrow: () => [[-3, -8], [3, -8], [3, 2], [7, 2], [0, 10], [-7, 2], [-3, 2]],
};

function shoelace(pts: Pt[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

export function CustomShapeModal({ onClose }: { onClose: () => void }) {
  const [pts, setPts] = useState<Pt[]>(PRESETS.Thrust());
  const [span, setSpan] = useState(30);
  const [mirror, setMirror] = useState(false);
  const [smooth, setSmooth] = useState(false);
  const [height, setHeight] = useState(1.6);
  const [elev, setElev] = useState(0);
  const [material, setMaterial] = useState('glossBlack');
  const [drag, setDrag] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const moved = useRef(false);

  // final outline: mirrored + smoothed
  const outline = useMemo(() => {
    let p = pts;
    if (mirror) {
      const right = pts.filter(([x]) => x >= 0);
      if (right.length >= 2) {
        const sorted = [...right].sort((a, b) => a[1] - b[1]);
        p = [...sorted, ...[...sorted].reverse().map(([x, z]) => [-x, z] as Pt)];
      }
    }
    if (smooth && p.length >= 3) p = smoothOutline(p, 3);
    return p;
  }, [pts, mirror, smooth]);

  const toPlan = (e: React.PointerEvent): Pt => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * span;
    const z = ((e.clientY - r.top) / r.height - 0.5) * span;
    return [round(x, 0.5), round(z, 0.5)];
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    moved.current = false;
    const p = toPlan(e);
    const hit = pts.findIndex(([x, z]) => Math.hypot(x - p[0], z - p[1]) < span / 28);
    if (hit >= 0) setDrag(hit);
    else {
      // insert the new point after the nearest existing edge
      let best = pts.length, bestD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const d = Math.hypot((a[0] + b[0]) / 2 - p[0], (a[1] + b[1]) / 2 - p[1]);
        if (d < bestD) {
          bestD = d;
          best = i + 1;
        }
      }
      const n = [...pts];
      n.splice(best, 0, p);
      setPts(n);
      setDrag(best);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    moved.current = true;
    const p = toPlan(e);
    setPts((cur) => cur.map((q, i) => (i === drag ? p : q)));
  };

  const create = () => {
    if (outline.length < 3) return;
    const xs = outline.map((p) => p[0]), zs = outline.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const w = Math.max(0.5, x1 - x0), d = Math.max(0.5, z1 - z0);
    let unit = outline.map(([x, z]) => [(x - x0) / w - 0.5, (z - z0) / d - 0.5] as Pt);
    if (shoelace(unit) < 0) unit = unit.reverse();
    addCustomShape(unit, w, d, height, elev, material);
    onClose();
  };

  const toSvg = ([x, z]: Pt) => `${((x / span + 0.5) * 100).toFixed(2)},${((z / span + 0.5) * 100).toFixed(2)}`;
  const xs = outline.map((p) => p[0]), zs = outline.map((p) => p[1]);
  const w = outline.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const d = outline.length ? Math.max(...zs) - Math.min(...zs) : 0;
  const area = Math.abs(shoelace(outline));

  return (
    <Modal
      title="Custom stage creator"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={outline.length < 3}>Build it in 3D</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div>
          <div className="hint" style={{ marginBottom: 8 }}>Tap to add corners · drag corners to reshape. The audience is at the bottom.</div>
          <svg
            ref={svg}
            viewBox="0 0 100 100"
            style={{ width: '100%', aspectRatio: '1', background: '#0d0e11', borderRadius: 14, border: '1px solid var(--line-2)', touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
          >
            {Array.from({ length: Math.floor(span / 2) + 1 }, (_, i) => {
              const v = (i * 2 / span) * 100;
              return (
                <g key={i} stroke={i % 5 === 0 ? '#3a3f4a' : '#1f2228'} strokeWidth={0.2}>
                  <line x1={v} y1={0} x2={v} y2={100} />
                  <line x1={0} y1={v} x2={100} y2={v} />
                </g>
              );
            })}
            <line x1={50} y1={0} x2={50} y2={100} stroke="#4da3ff" strokeWidth={0.25} strokeDasharray="1 1" />
            {outline.length >= 3 && <polygon points={outline.map(toSvg).join(' ')} fill="rgba(77,163,255,0.25)" stroke="#4da3ff" strokeWidth={0.5} />}
            {pts.map((p, i) => {
              const [cx, cy] = toSvg(p).split(',').map(Number);
              return <circle key={i} cx={cx} cy={cy} r={drag === i ? 2.4 : 1.8} fill={mirror && p[0] < 0 ? '#555' : '#fff'} />;
            })}
            <text x={50} y={97} textAnchor="middle" fontSize={3} fill="#6f737b">AUDIENCE ↓</text>
          </svg>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => setPts(pts.slice(0, -1))} disabled={pts.length <= 3}><Undo2 size={16} /> Remove last</button>
            <button className="btn small" onClick={() => setPts([])}><Trash2 size={16} /> Clear</button>
          </div>
        </div>
        <div>
          <div className="section-title">Start from</div>
          <div className="row wrap">
            {Object.keys(PRESETS).map((k) => (
              <button key={k} className="btn small" onClick={() => setPts(PRESETS[k]())}>{k}</button>
            ))}
          </div>
          <div className="section-title">Shape</div>
          <Toggle label="Mirror left ↔ right (edit the right half)" value={mirror} onChange={setMirror} />
          <Toggle label="Smooth curved edges" value={smooth} onChange={setSmooth} />
          <Slider label="Drawing area" value={span} min={10} max={80} step={2} onChange={setSpan} format={(v) => `${v} m`} />
          <div className="section-title">3D</div>
          <Slider label="Thickness / deck height" value={height} min={0.2} max={8} step={0.1} onChange={setHeight} format={(v) => `${v.toFixed(1)} m`} />
          <Slider label="Raise above floor" value={elev} min={0} max={15} step={0.1} onChange={setElev} format={(v) => `${v.toFixed(1)} m`} />
          <div className="field">
            <div className="field-label">Material</div>
            <Seg value={material} onChange={setMaterial} options={['glossBlack', 'white', 'mirror', 'aluminum', 'frosted'].map((m) => ({ v: m, label: MATERIAL_PRESETS.find((x) => x.preset === m)!.label.split(' ')[0] }))} />
          </div>
          <div className="hint">
            {w.toFixed(1)} × {d.toFixed(1)} m · {area.toFixed(0)} m² · {outline.length} corners
          </div>
        </div>
      </div>
    </Modal>
  );
}
