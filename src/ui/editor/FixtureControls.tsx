import { useState } from 'react';
import { Copy, FlipHorizontal2, Trash2, Lock, Unlock, Power } from 'lucide-react';
import { useProject, edit } from '../../state/projectStore';
import { useUI, toast } from '../../state/uiStore';
import { useSettings } from '../../state/settingsStore';
import type { EffectType, Fixture, MovementPattern } from '../../types';
import { ColorPicker, Slider, PromptModal } from '../components';
import { LIGHT_PRESETS } from '../../data/visuals';
import { applyLightPreset } from './actions';
import { clamp } from '../../util/misc';

export function XYPad({ pan, tilt, onChange, onStart }: { pan: number; tilt: number; onChange: (pan: number, tilt: number) => void; onStart?: () => void }) {
  const pick = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y = clamp((e.clientY - r.top) / r.height, 0, 1);
    onChange(Math.round(x * 360 - 180), Math.round(y * 180));
  };
  return (
    <div>
      <div
        className="xy-pad"
        onPointerDown={(e) => {
          onStart?.();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => e.buttons && pick(e)}
      >
        <div className="xy-dot" style={{ left: `${((pan + 180) / 360) * 100}%`, top: `${(tilt / 180) * 100}%` }} />
      </div>
      <div className="hint" style={{ marginTop: 6 }}>
        Left/right = pan ({pan}°) · Up/down = tilt ({tilt}°, top = straight down)
      </div>
    </div>
  );
}

export const MOVES: { v: MovementPattern; label: string }[] = [
  { v: 'none', label: 'Still' },
  { v: 'sweep', label: 'Sweep' },
  { v: 'circle', label: 'Circle' },
  { v: 'figure8', label: 'Figure 8' },
  { v: 'tilt', label: 'Tilt wave' },
  { v: 'random', label: 'Random' },
  { v: 'ballyhoo', label: 'Ballyhoo' },
  { v: 'fan', label: 'Fan' },
];
export const EFFECTS: { v: EffectType; label: string }[] = [
  { v: 'none', label: 'None' },
  { v: 'pulse', label: 'Pulse' },
  { v: 'strobe', label: 'Strobe' },
  { v: 'chase', label: 'Chase' },
  { v: 'colorchase', label: 'Color chase' },
  { v: 'rainbow', label: 'Rainbow' },
  { v: 'fade', label: 'Fade' },
  { v: 'flicker', label: 'Flicker' },
];

/** Controls for a set of fixtures (empty = every light). Used by the properties panel and the simple desk. */
export function FixtureControls({ fixtureIds, showActions = false, simple = false }: { fixtureIds: string[]; showActions?: boolean; simple?: boolean }) {
  const all = useProject((s) => s.project?.fixtures ?? []);
  const saved = useProject((s) => s.project?.savedColors ?? []);
  const advanced = useSettings((s) => s.editorMode) === 'advanced' && !simple;
  const set = useUI((s) => s.set);
  const requestCamera = useUI((s) => s.requestCamera);
  const [renaming, setRenaming] = useState(false);
  const ids = fixtureIds.length ? fixtureIds : all.map((f) => f.id);
  const list = all.filter((f) => ids.includes(f.id));
  if (!list.length) return <div className="hint">No lights yet. Tap ADD → Lights.</div>;
  const f = list[0];
  const key = ids.length > 3 ? 'many' : ids.join(',');
  const upd = (patch: Partial<Fixture>, k: string) => edit.updateFixtures(ids, (x) => ({ ...x, ...patch }), { key: `fx-${k}-${key}` });
  const anyLocked = list.some((x) => x.locked);

  return (
    <>
      {showActions && (
        <>
          {list.length === 1 ? (
            <button className="btn block" style={{ justifyContent: 'flex-start', marginBottom: 12 }} onClick={() => setRenaming(true)}>
              {f.name}
            </button>
          ) : (
            <div className="hint" style={{ marginBottom: 12 }}>{list.length} lights selected.</div>
          )}
          <div className="grid-3" style={{ marginBottom: 8 }}>
            <button className="btn small" onClick={() => set({ selection: edit.duplicate(ids, [2, 0, 0]) })}><Copy size={16} /> Copy</button>
            <button className="btn small" onClick={() => set({ selection: edit.mirror(ids) })}><FlipHorizontal2 size={16} /> Mirror</button>
            <button className="btn small danger" onClick={() => { edit.remove(ids); set({ selection: [] }); }}><Trash2 size={16} /> Delete</button>
            <button className="btn small" onClick={() => edit.updateFixtures(ids, (x) => ({ ...x, locked: !anyLocked }))}>{anyLocked ? <Unlock size={16} /> : <Lock size={16} />} {anyLocked ? 'Unlock' : 'Lock'}</button>
            <button className="btn small" onClick={() => requestCamera('free', f.pos, 8)}>Focus</button>
            <button className="btn small" onClick={() => { edit.updateFixtures(ids, (x) => ({ ...x, hidden: true })); set({ selection: [] }); toast('Hidden — find it in Layers'); }}>Hide</button>
          </div>
          {list.length === 1 && <Slider label="Height" value={f.pos[1]} min={0} max={40} step={0.1} onChange={(v) => edit.updateFixture(f.id, { pos: [f.pos[0], v, f.pos[2]] }, { key: `fxh-${f.id}` })} format={(v) => `${v.toFixed(1)} m`} />}
        </>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={`btn block ${f.on ? 'active' : ''}`} onClick={() => upd({ on: true }, 'on')}>
          <Power size={18} /> ON
        </button>
        <button className={`btn block ${!f.on ? 'active' : ''}`} onClick={() => upd({ on: false }, 'off')}>
          OFF
        </button>
      </div>
      <Slider label="Brightness" value={f.intensity} min={0} max={1} onChange={(v) => upd({ intensity: v, on: true }, 'int')} format={(v) => `${Math.round(v * 100)}%`} />
      <div className="section-title">Color</div>
      <ColorPicker
        value={f.color}
        onChange={(c) => upd({ color: c, on: true }, 'col')}
        saved={saved}
        advanced={advanced}
        onSave={(c) => {
          useProject.getState().mutate((p) => ({ ...p, savedColors: Array.from(new Set([c, ...p.savedColors])).slice(0, 24) }));
          toast('Color saved');
        }}
      />
      <div className="section-title">Direction</div>
      <XYPad pan={Math.round(f.pan)} tilt={Math.round(f.tilt)} onChange={(pan, tilt) => upd({ pan, tilt }, 'dir')} />
      <div style={{ height: 12 }} />
      <Slider label="Beam width" value={f.beamAngle} min={1} max={90} step={1} onChange={(v) => upd({ beamAngle: v }, 'beam')} format={(v) => `${v}°`} />
      {(simple || !advanced) && (
        <>
          <div className="section-title">Quick presets</div>
          <div className="grid-3">
            {LIGHT_PRESETS.map((p) => (
              <button key={p.id} className="preset-btn" onClick={() => applyLightPreset(p)}>
                {p.name}
                <span className="bar" style={{ background: p.colors.length > 1 ? `linear-gradient(90deg, ${p.colors.join(',')})` : p.colors[0] }} />
              </button>
            ))}
          </div>
        </>
      )}
      {advanced && (
        <>
          <Slider label="Focus (soft → sharp)" value={f.focus} min={0} max={1} onChange={(v) => upd({ focus: v }, 'focus')} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="section-title">Movement</div>
          <div className="row wrap">
            {MOVES.map((m) => (
              <button key={m.v} className={`fx-chip ${f.movement === m.v ? 'on' : ''}`} onClick={() => upd({ movement: m.v }, 'mv')}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ height: 10 }} />
          <Slider label="Movement speed" value={f.moveSpeed} min={0} max={3} onChange={(v) => upd({ moveSpeed: v }, 'ms')} format={(v) => `${v.toFixed(1)}×`} />
          <Slider label="Movement size" value={f.moveSize} min={0} max={90} step={1} onChange={(v) => upd({ moveSize: v }, 'mz')} format={(v) => `${v}°`} />
          <div className="section-title">Effect</div>
          <div className="row wrap">
            {EFFECTS.map((m) => (
              <button key={m.v} className={`fx-chip ${f.effect === m.v ? 'on' : ''}`} onClick={() => upd({ effect: m.v }, 'fx')}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ height: 10 }} />
          <Slider label="Effect speed" value={f.effectSpeed} min={0} max={3} onChange={(v) => upd({ effectSpeed: v }, 'fs')} format={(v) => `${v.toFixed(1)}×`} />
          <Slider label="Strobe rate" value={f.strobeRate} min={1} max={20} step={0.5} onChange={(v) => upd({ strobeRate: v }, 'sr')} format={(v) => `${v} Hz`} />
        </>
      )}
      {renaming && <PromptModal title="Rename light" initial={f.name} onClose={() => setRenaming(false)} onDone={(v) => { edit.updateFixture(f.id, { name: v }); setRenaming(false); }} />}
    </>
  );
}
