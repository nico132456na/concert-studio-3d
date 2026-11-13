import { useMemo, useRef, useState } from 'react';
import {
  X, Copy, Trash2, Eye, Lock, Unlock, RotateCcw, Group, Ungroup, FlipHorizontal2, AlignCenterVertical, Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsUp, ChevronsDown, ImagePlus, Save, Volume2,
} from 'lucide-react';
import { useUI, toast } from '../../state/uiStore';
import { useProject, edit, getProject } from '../../state/projectStore';
import { useSettings } from '../../state/settingsStore';
import { MATERIAL_PRESETS, mat } from '../../data/materials';
import { VISUALS, VISUAL_PRESETS } from '../../data/visuals';
import { OBJECT_DEF, defaultLed, AUDIO_KINDS } from '../../data/library';
import { coverageOf } from '../../three/SoundCoverage';
import { testSpeaker } from '../../audio/beat';
import type { LedSpec, MaterialSpec, StageObject, TextureKind, Vec3 } from '../../types';
import { ColorPicker, NumberField, Seg, Slider, Toggle, PromptModal } from '../components';
import { nudge } from '../../three/interaction';
import { resetObject, uploadScreenMedia } from './actions';
import { FixtureControls } from './FixtureControls';
import { deg, rad, uid, fmt } from '../../util/misc';
import { setLibrary } from '../../storage/db';

function ballStyle(m: MaterialSpec): React.CSSProperties {
  const shine = m.metalness > 0.5 ? 0.9 : 1 - m.roughness * 0.8;
  return {
    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,${shine}) 0%, ${m.color} 38%, #000 105%)`,
    opacity: Math.max(0.35, m.opacity),
    boxShadow: m.emissiveIntensity > 0 ? `0 0 14px ${m.emissive}` : undefined,
  };
}

function useSelected() {
  const selection = useUI((s) => s.selection);
  const objects = useProject((s) => s.project?.objects);
  const fixtures = useProject((s) => s.project?.fixtures);
  return useMemo(() => {
    const set = new Set(selection);
    return { objs: (objects ?? []).filter((o) => set.has(o.id)), fxs: (fixtures ?? []).filter((f) => set.has(f.id)) };
  }, [selection, objects, fixtures]);
}

/* ------------------------------- object tab ------------------------------- */

function ObjectTab({ objs }: { objs: StageObject[] }) {
  const advanced = useSettings((s) => s.editorMode) === 'advanced';
  const gridSize = useUI((s) => s.gridSize);
  const set = useUI((s) => s.set);
  const requestCamera = useUI((s) => s.requestCamera);
  const [renaming, setRenaming] = useState(false);
  const o = objs[0];
  const ids = objs.map((x) => x.id);
  const single = objs.length === 1;
  const step = Math.max(0.25, gridSize);
  const upd = (patch: Partial<StageObject>, key: string) => edit.updateObject(o.id, patch, { key: `${key}-${o.id}` });
  const anyLocked = objs.some((x) => x.locked);
  const grouped = objs.some((x) => x.groupId);

  return (
    <>
      {single ? (
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn block" style={{ justifyContent: 'flex-start' }} onClick={() => setRenaming(true)}>
            {o.name}
          </button>
        </div>
      ) : (
        <div className="hint" style={{ marginBottom: 12 }}>{objs.length} items selected — changes apply to all.</div>
      )}

      <div className="section-title">Actions</div>
      <div className="grid-3">
        <button className="btn small" onClick={() => set({ selection: edit.duplicate(ids) })}><Copy size={16} /> Copy</button>
        <button className="btn small" onClick={() => set({ selection: edit.mirror(ids) })}><FlipHorizontal2 size={16} /> Mirror</button>
        <button className="btn small danger" onClick={() => { edit.remove(ids); set({ selection: [] }); }}><Trash2 size={16} /> Delete</button>
        <button className="btn small" onClick={() => { edit.updateObjects(ids, (x) => ({ ...x, hidden: true })); set({ selection: [] }); toast('Hidden — find it again in Layers'); }}><Eye size={16} /> Hide</button>
        <button className="btn small" onClick={() => edit.updateObjects(ids, (x) => ({ ...x, locked: !anyLocked }))}>{anyLocked ? <Unlock size={16} /> : <Lock size={16} />} {anyLocked ? 'Unlock' : 'Lock'}</button>
        <button className="btn small" onClick={() => edit.updateObjects(ids, resetObject)}><RotateCcw size={16} /> Reset</button>
        {objs.length > 1 && !grouped && <button className="btn small" onClick={() => { edit.group(ids); toast('Grouped'); }}><Group size={16} /> Group</button>}
        {grouped && <button className="btn small" onClick={() => { edit.ungroup(ids); toast('Ungrouped'); }}><Ungroup size={16} /> Ungroup</button>}
        <button className="btn small" onClick={() => edit.updateObjects(ids, (x) => ({ ...x, pos: [0, x.pos[1], x.pos[2]] }))}><AlignCenterVertical size={16} /> Center</button>
        <button className="btn small" onClick={() => requestCamera('free', [o.pos[0], o.pos[1] + o.size[1] / 2, o.pos[2]], Math.max(6, Math.max(...o.size) * 1.8))}><Crosshair size={16} /> Focus</button>
      </div>
      {anyLocked && <div className="hint" style={{ marginTop: 8 }}>Locked items can't be moved or resized.</div>}
      {objs.some((x) => AUDIO_KINDS.has(x.kind)) && <SpeakerSection objs={objs.filter((x) => AUDIO_KINDS.has(x.kind))} />}

      <div className="section-title">Position</div>
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 4 }}>
          <span />
          <button className="icon-btn boxed" onClick={() => nudge([0, 0, -step])} aria-label="Back"><ArrowUp size={20} /></button>
          <span />
          <button className="icon-btn boxed" onClick={() => nudge([-step, 0, 0])} aria-label="Left"><ArrowLeft size={20} /></button>
          <span />
          <button className="icon-btn boxed" onClick={() => nudge([step, 0, 0])} aria-label="Right"><ArrowRight size={20} /></button>
          <span />
          <button className="icon-btn boxed" onClick={() => nudge([0, 0, step])} aria-label="Forward"><ArrowDown size={20} /></button>
          <span />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 12 }}>
          <button className="icon-btn boxed" onClick={() => nudge([0, step, 0])} aria-label="Raise"><ChevronsUp size={20} /></button>
          <button className="icon-btn boxed" onClick={() => nudge([0, -step, 0])} aria-label="Lower"><ChevronsDown size={20} /></button>
        </div>
      </div>
      {single && (
        <>
          <Slider label="Height above floor" value={o.pos[1]} min={0} max={40} step={0.1} onChange={(v) => upd({ pos: [o.pos[0], v, o.pos[2]] }, 'y')} format={(v) => `${fmt(v)} m`} />
          <div className="section-title">Size</div>
          <Slider label="Width" value={o.size[0]} min={0.1} max={Math.max(80, o.size[0])} step={0.1} onChange={(v) => upd({ size: [v, o.size[1], o.size[2]] }, 'sx')} format={(v) => `${fmt(v)} m`} />
          <Slider label="Height" value={o.size[1]} min={0.05} max={Math.max(40, o.size[1])} step={0.05} onChange={(v) => upd({ size: [o.size[0], v, o.size[2]] }, 'sy')} format={(v) => `${fmt(v, 2)} m`} />
          <Slider label="Depth" value={o.size[2]} min={0.05} max={Math.max(80, o.size[2])} step={0.05} onChange={(v) => upd({ size: [o.size[0], o.size[1], v] }, 'sz')} format={(v) => `${fmt(v, 2)} m`} />
          <div className="section-title">Rotation</div>
          <Slider label="Turn" value={Math.round(deg(o.rot[1]))} min={-180} max={180} step={1} onChange={(v) => upd({ rot: [o.rot[0], rad(v), o.rot[2]] }, 'ry')} format={(v) => `${v}°`} />
          {advanced && (
            <>
              <Slider label="Tilt forward" value={Math.round(deg(o.rot[0]))} min={-90} max={90} step={1} onChange={(v) => upd({ rot: [rad(v), o.rot[1], o.rot[2]] }, 'rx')} format={(v) => `${v}°`} />
              <Slider label="Roll" value={Math.round(deg(o.rot[2]))} min={-90} max={90} step={1} onChange={(v) => upd({ rot: [o.rot[0], o.rot[1], rad(v)] }, 'rz')} format={(v) => `${v}°`} />
              <div className="section-title">Exact values (meters)</div>
              <div className="field-label" style={{ marginBottom: 6 }}>Position</div>
              <div className="num-row">
                {(['X', 'Y', 'Z'] as const).map((l, i) => (
                  <NumberField key={l} label={l} value={o.pos[i]} onChange={(v) => { const p = [...o.pos] as Vec3; p[i] = i === 1 ? Math.max(0, v) : v; edit.updateObject(o.id, { pos: p }); }} />
                ))}
              </div>
              <div className="field-label" style={{ margin: '12px 0 6px' }}>Size</div>
              <div className="num-row">
                {(['W', 'H', 'D'] as const).map((l, i) => (
                  <NumberField key={l} label={l} value={o.size[i]} onChange={(v) => { const s = [...o.size] as Vec3; s[i] = Math.max(0.02, v); edit.updateObject(o.id, { size: s }); }} />
                ))}
              </div>
              <div className="field-label" style={{ margin: '12px 0 6px' }}>Rotation (°)</div>
              <div className="num-row">
                {(['X', 'Y', 'Z'] as const).map((l, i) => (
                  <NumberField key={l} label={l} value={Math.round(deg(o.rot[i]) * 10) / 10} onChange={(v) => { const r = [...o.rot] as Vec3; r[i] = rad(v); edit.updateObject(o.id, { rot: r }); }} />
                ))}
              </div>
            </>
          )}
        </>
      )}
      {!single && (
        <Slider
          label="Scale all"
          value={1}
          min={0.5}
          max={1.5}
          step={0.05}
          onChange={(v) => edit.updateObjects(ids, (x) => ({ ...x, size: x.size.map((s) => s * (1 + (v - 1) * 0.1)) as Vec3 }), { key: 'multiscale' })}
          format={() => 'drag'}
        />
      )}
      {renaming && <PromptModal title="Rename" initial={o.name} onClose={() => setRenaming(false)} onDone={(v) => { edit.updateObject(o.id, { name: v }); setRenaming(false); }} />}
    </>
  );
}

function SpeakerSection({ objs }: { objs: StageObject[] }) {
  const show = useUI((s) => s.showCoverage);
  const set = useUI((s) => s.set);
  const c = coverageOf(objs[0]);
  return (
    <>
      <div className="section-title">Sound</div>
      {c && (
        <div className="hint" style={{ marginBottom: 8 }}>
          <span className="dot" style={{ background: c.color, display: 'inline-block', width: 10, height: 10, marginRight: 6 }} />
          {c.role} · about {Math.round(c.range)} m throw · {c.angle >= 360 ? 'omni' : `${c.angle}° wide`}
        </div>
      )}
      <div className="grid-2">
        <button className="btn small" onClick={() => objs.forEach((o, i) => setTimeout(() => testSpeaker(o.kind, o.pos[0]), i * 300))}>
          <Volume2 size={16} /> Test sound
        </button>
        <button className={`btn small ${show ? 'active' : ''}`} onClick={() => set({ showCoverage: !show })}>
          {show ? 'Hide' : 'Show'} all coverage
        </button>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>Shaded area = approximate coverage on the floor. Turn the speaker to aim it.</div>
    </>
  );
}

/* ------------------------------ material tab ------------------------------ */

const TEXTURES: TextureKind[] = ['none', 'brushed', 'concrete', 'wood', 'fabric', 'grid', 'diamond', 'carbon'];

function MaterialTab({ objs }: { objs: StageObject[] }) {
  const advancedMode = useSettings((s) => s.editorMode) === 'advanced';
  const [showAdv, setShowAdv] = useState(advancedMode);
  const custom = useProject((s) => s.project?.customMaterials ?? []);
  const saved = useProject((s) => s.project?.savedColors ?? []);
  const bump = useUI((s) => s.bump);
  const [naming, setNaming] = useState(false);
  const m = objs[0].material;
  const ids = objs.map((o) => o.id);
  const apply = (patch: Partial<MaterialSpec>, key?: string) => {
    edit.updateObjects(ids, (o) => {
      const material = { ...o.material, ...patch };
      const led = material.preset === 'led' && !o.led ? defaultLed() : o.led;
      return { ...o, material, led };
    }, { key: key ? `mat-${key}` : undefined });
    bump('materials');
  };
  const choosePreset = (preset: string) => {
    const base = mat(preset);
    // keep the user's color for paint-like presets when they chose one? use preset color for clarity
    apply(base);
  };
  const saveColor = (c: string) => {
    useProject.getState().mutate((p) => ({ ...p, savedColors: Array.from(new Set([c, ...p.savedColors])).slice(0, 24) }));
    toast('Color saved');
  };
  return (
    <>
      {objs.length > 1 && <div className="hint" style={{ marginBottom: 12 }}>Applying to {objs.length} items.</div>}
      <div className="section-title">Materials</div>
      <div className="mat-grid">
        {MATERIAL_PRESETS.map((p) => (
          <div key={p.preset} className={`mat-chip ${m.preset === p.preset ? 'on' : ''}`} onClick={() => choosePreset(p.preset)} data-tut={`mat-${p.preset}`}>
            <div className="mat-ball" style={ballStyle(p)} />
            <span>{p.label}</span>
          </div>
        ))}
        {custom.map((c) => (
          <div key={c.id} className="mat-chip" onClick={() => { const { id: _i, name: _n, ...spec } = c; apply(spec); }}>
            <div className="mat-ball" style={ballStyle(c)} />
            <span>{c.name}</span>
          </div>
        ))}
      </div>
      <div className="section-title">Color</div>
      <ColorPicker value={m.color} onChange={(c) => apply({ color: c }, 'color')} saved={saved} onSave={saveColor} />
      <div className="divider" />
      <Toggle label="Advanced material settings" value={showAdv} onChange={setShowAdv} />
      {showAdv && (
        <div style={{ marginTop: 10 }}>
          <Slider label="Metallic" value={m.metalness} min={0} max={1} onChange={(v) => apply({ metalness: v }, 'metal')} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Roughness" value={m.roughness} min={0} max={1} onChange={(v) => apply({ roughness: v }, 'rough')} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Reflectiveness" value={m.reflect} min={0} max={1} onChange={(v) => apply({ reflect: v }, 'refl')} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Opacity" value={m.opacity} min={0.05} max={1} onChange={(v) => apply({ opacity: v }, 'opac')} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Glow (emission)" value={m.emissiveIntensity} min={0} max={5} onChange={(v) => apply({ emissiveIntensity: v, emissive: m.emissive === '#000000' ? m.color : m.emissive }, 'emit')} format={(v) => v.toFixed(1)} />
          {m.emissiveIntensity > 0 && (
            <div className="field">
              <div className="field-label">Glow color</div>
              <ColorPicker value={m.emissive} onChange={(c) => apply({ emissive: c }, 'emitc')} />
            </div>
          )}
          <div className="field">
            <div className="field-label">Texture / surface finish</div>
            <div className="row wrap">
              {TEXTURES.map((t) => (
                <button key={t} className={`btn small ${m.texture === t ? 'active' : ''}`} onClick={() => apply({ texture: t })}>
                  {t === 'none' ? 'Smooth' : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button className="btn block" onClick={() => setNaming(true)}>
            <Save size={16} /> Save as custom material
          </button>
        </div>
      )}
      {naming && (
        <PromptModal
          title="Name this material"
          initial="My material"
          onClose={() => setNaming(false)}
          onDone={(name) => {
            const nm = { ...m, preset: 'custom', id: uid('m'), name };
            useProject.getState().mutate((p) => ({ ...p, customMaterials: [...p.customMaterials, nm] }));
            setLibrary('materials', [...(getProject()?.customMaterials ?? [])]).catch(() => {});
            setNaming(false);
            toast('Material saved', 'success');
          }}
        />
      )}
    </>
  );
}

/* --------------------------------- LED tab --------------------------------- */

function LedTab({ objs }: { objs: StageObject[] }) {
  const advanced = useSettings((s) => s.editorMode) === 'advanced';
  const file = useRef<HTMLInputElement>(null);
  const screens = objs.filter((o) => o.led);
  if (!screens.length)
    return (
      <div className="hint">
        This object isn't a screen. Pick the <b>LED Surface</b> material to turn any shape into a video surface.
        <button className="btn block" style={{ marginTop: 12 }} onClick={() => edit.updateObjects(objs.map((o) => o.id), (o) => ({ ...o, material: mat('led'), led: defaultLed() }))}>
          Make it an LED surface
        </button>
      </div>
    );
  const led = screens[0].led!;
  const ids = screens.map((o) => o.id);
  const apply = (patch: Partial<LedSpec>, key?: string) => edit.updateObjects(ids, (o) => ({ ...o, led: { ...(o.led ?? defaultLed()), ...patch } }), { key: key ? `led-${key}` : undefined });
  const groups = Array.from(new Set(VISUALS.map((v) => v.group)));
  return (
    <>
      {screens.length > 1 && <div className="hint" style={{ marginBottom: 12 }}>Editing {screens.length} screens.</div>}
      <div className="section-title">Looks</div>
      <div className="grid-2">
        {VISUAL_PRESETS.map((p) => (
          <button key={p.name} className="preset-btn" onClick={() => apply({ visual: p.visual, color1: p.color1, color2: p.color2, brightness: p.brightness, speed: p.speed })}>
            {p.name}
            <span className="bar" style={{ background: `linear-gradient(90deg, ${p.color1}, ${p.color2})` }} />
          </button>
        ))}
      </div>
      <div className="section-title">Visual</div>
      {groups.map((g) => (
        <div key={g} style={{ marginBottom: 8 }}>
          <div className="hint" style={{ marginBottom: 6 }}>{g}</div>
          <div className="row wrap">
            {VISUALS.filter((v) => v.group === g).map((v) => (
              <button key={v.id} className={`btn small ${led.visual === v.id ? 'active' : ''}`} onClick={() => apply({ visual: v.id })}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {led.visual === 'text' && (
        <div className="field">
          <div className="field-label">Text</div>
          <input className="text-input" value={led.text} maxLength={40} onChange={(e) => apply({ text: e.target.value }, 'text')} />
        </div>
      )}
      <div className="field">
        <div className="field-label">Your image or video</div>
        <button className="btn block" onClick={() => file.current?.click()}>
          <ImagePlus size={18} /> Upload to screen
        </button>
        <input ref={file} type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadScreenMedia(ids, f); e.target.value = ''; }} />
      </div>
      <div className="section-title">Colors</div>
      <div className="field-label" style={{ marginBottom: 6 }}>Primary</div>
      <ColorPicker value={led.color1} onChange={(c) => apply({ color1: c }, 'c1')} />
      <div className="field-label" style={{ margin: '14px 0 6px' }}>Secondary</div>
      <ColorPicker value={led.color2} onChange={(c) => apply({ color2: c }, 'c2')} />
      <div className="divider" />
      <Slider label="Brightness" value={led.brightness} min={0} max={2} onChange={(v) => apply({ brightness: v }, 'b')} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Speed" value={led.speed} min={0} max={3} onChange={(v) => apply({ speed: v }, 's')} format={(v) => `${v.toFixed(1)}×`} />
      {advanced && <Slider label="Pixel resolution" value={led.resolution} min={0} max={160} step={4} onChange={(v) => apply({ resolution: v }, 'r')} format={(v) => (v ? `${v} px` : 'Smooth')} />}
      {!advanced && (
        <Seg value={String(led.resolution ? 'led' : 'smooth')} onChange={(v) => apply({ resolution: v === 'led' ? 48 : 0 })} options={[{ v: 'led', label: 'LED pixels' }, { v: 'smooth', label: 'Smooth' }]} />
      )}
    </>
  );
}

/* --------------------------------- panel --------------------------------- */

export function RightPanel() {
  const set = useUI((s) => s.set);
  const tab = useUI((s) => s.rightTab);
  const { objs, fxs } = useSelected();
  const hasLed = objs.some((o) => o.led) || objs.some((o) => OBJECT_DEF[o.kind]?.led);
  const title = objs.length + fxs.length === 0 ? 'Properties' : objs.length + fxs.length === 1 ? (objs[0]?.name ?? fxs[0]?.name) : `${objs.length + fxs.length} selected`;
  const tabs: { id: typeof tab; label: string; show: boolean }[] = [
    { id: 'object', label: 'Object', show: objs.length > 0 },
    { id: 'material', label: 'Material', show: objs.length > 0 },
    { id: 'led', label: 'Screen', show: objs.length > 0 && hasLed },
    { id: 'light', label: 'Light', show: fxs.length > 0 },
  ];
  const visible = tabs.filter((t) => t.show);
  const active = visible.find((t) => t.id === tab)?.id ?? visible[0]?.id;
  return (
    <div className="panel right-panel" data-tut="props">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        <button className="icon-btn" onClick={() => set({ rightOpen: false })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      {visible.length > 1 && (
        <div className="tabs">
          {visible.map((t) => (
            <button key={t.id} className={`tab ${active === t.id ? 'on' : ''}`} onClick={() => set({ rightTab: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="panel-body">
        {!visible.length && (
          <div className="hint" style={{ fontSize: 15 }}>
            Tap any object or light in the 3D view to edit it.
            <br />
            <br />
            Tip: with <b>Move</b> selected, drag a selected object to reposition it. <b>Rotate</b> and <b>Scale</b> work the same way.
          </div>
        )}
        {active === 'object' && <ObjectTab objs={objs} />}
        {active === 'material' && <MaterialTab objs={objs} />}
        {active === 'led' && <LedTab objs={objs} />}
        {active === 'light' && <FixtureControls fixtureIds={fxs.map((f) => f.id)} showActions />}
      </div>
    </div>
  );
}
