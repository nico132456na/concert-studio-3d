import { useEffect, useRef, useState } from 'react';
import { X, Map as MapIcon, Shirt, Camera, Circle, Square, Play, Pause, SkipForward, Moon, ArrowUpCircle, DoorOpen, Undo2, Save, Trash2, Footprints } from 'lucide-react';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary, Modal, Seg, Toggle, PromptModal } from '../components';
import { useProject } from '../../state/projectStore';
import { useShow } from '../../state/showStore';
import { useUI, toast } from '../../state/uiStore';
import { player, input, usePerformer, doAction, defaultPerformer, type CamMode, type Action } from '../../performer/state';
import { exitPerformer, goOnStage, goBackstage, toArenaFloor, teleportRoom, teleportStage } from '../../performer/flow';
import { ROOMS, type RoomId } from '../../data/backstage';
import { show } from '../showControl';
import { VISUAL_PRESETS } from '../../data/visuals';
import { startRecording, stopRecording, screenshot, canRecord } from '../../performer/recorder';
import { saveBlob, uid } from '../../util/misc';
import type { AvatarLook, HairStyle, TopStyle, BottomStyle } from '../../types';
import { manualSave } from '../editor/Chrome';

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const id = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const R = 56;
  const update = (e: React.PointerEvent) => {
    const dx = e.clientX - center.current.x, dy = e.clientY - center.current.y;
    const d = Math.min(R, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    setKnob({ x, y });
    input.moveX = x / R;
    input.moveY = -y / R;
  };
  return (
    <div
      className="joy"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        id.current = e.pointerId;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        update(e);
      }}
      onPointerMove={(e) => e.pointerId === id.current && update(e)}
      onPointerUp={() => {
        id.current = null;
        setKnob({ x: 0, y: 0 });
        input.moveX = input.moveY = 0;
      }}
      onPointerCancel={() => {
        id.current = null;
        setKnob({ x: 0, y: 0 });
        input.moveX = input.moveY = 0;
      }}
    >
      <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

/** Drag anywhere (not on a control) to look around. */
function LookLayer() {
  const last = useRef<Map<number, { x: number; y: number }>>(new Map());
  return (
    <div
      className="look-layer"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        last.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        const l = last.current.get(e.pointerId);
        if (!l) return;
        input.lookDX += e.clientX - l.x;
        input.lookDY += e.clientY - l.y;
        last.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerUp={(e) => last.current.delete(e.pointerId)}
      onPointerCancel={(e) => last.current.delete(e.pointerId)}
    />
  );
}

const SKINS = ['#f2d0b5', '#e0b08a', '#c68a5e', '#9a6340', '#6b4128', '#3f2617'];
const HAIRS: HairStyle[] = ['short', 'buzz', 'long', 'curly', 'braids', 'bun', 'bald'];
const TOPS: TopStyle[] = ['tee', 'hoodie', 'jacket', 'tank', 'suit', 'jersey'];
const BOTTOMS: BottomStyle[] = ['jeans', 'cargo', 'shorts', 'skirt', 'suit'];
const COLORS = ['#111111', '#f2f2f2', '#d9a740', '#c0c0c0', '#ff2a4a', '#ff7a1a', '#ffc21a', '#3ddc84', '#1ae0ff', '#2a7bff', '#8a2aff', '#ff2ad4', '#5a3a24', '#20283a'];

function Swatches({ value, list, onChange }: { value: string; list: string[]; onChange: (c: string) => void }) {
  return (
    <div className="swatches" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))' }}>
      {list.map((c) => (
        <div key={c} className={`swatch ${c === value ? 'on' : ''}`} style={{ background: c, minHeight: 36 }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

function Wardrobe() {
  const perf = useProject((s) => s.project?.performer) ?? defaultPerformer();
  const set = usePerformer((s) => s.set);
  const [naming, setNaming] = useState(false);
  const look = perf.look;
  const upd = (patch: Partial<AvatarLook>) => useProject.getState().mutate((p) => ({ ...p, performer: { ...(p.performer ?? defaultPerformer()), look: { ...look, ...patch } } }), { key: 'wardrobe' });
  const label = (s: string) => s[0].toUpperCase() + s.slice(1);
  return (
    <div className="panel right-panel" style={{ zIndex: 40 }}>
      <div className="panel-head">
        <div className="panel-title">Wardrobe</div>
        <button className="icon-btn" onClick={() => set({ wardrobe: false, cam: 'third' })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="panel-body">
        <div className="hint" style={{ marginBottom: 10 }}>Your performer is an original avatar. Changes save with the project.</div>
        <div className="section-title">Outfits</div>
        <div className="row wrap">
          {perf.outfits.map((o) => (
            <button key={o.id} className="btn small" onClick={() => upd(o.look)}>{o.name}</button>
          ))}
          <button className="btn small" onClick={() => setNaming(true)}><Save size={14} /> Save outfit</button>
        </div>
        <div className="section-title">Skin</div>
        <Swatches value={look.skin} list={SKINS} onChange={(c) => upd({ skin: c })} />
        <div className="section-title">Hair</div>
        <div className="row wrap">{HAIRS.map((h) => <button key={h} className={`btn small ${look.hair === h ? 'active' : ''}`} onClick={() => upd({ hair: h })}>{label(h)}</button>)}</div>
        <div style={{ height: 8 }} />
        <Swatches value={look.hairColor} list={['#1a1410', '#4a2e1a', '#a0703c', '#e8d08a', '#f2f2f2', '#ff2a4a', '#2a7bff', '#ff2ad4', '#3ddc84']} onChange={(c) => upd({ hairColor: c })} />
        <div className="section-title">Top</div>
        <div className="row wrap">{TOPS.map((h) => <button key={h} className={`btn small ${look.top === h ? 'active' : ''}`} onClick={() => upd({ top: h })}>{label(h)}</button>)}</div>
        <div style={{ height: 8 }} />
        <Swatches value={look.topColor} list={COLORS} onChange={(c) => upd({ topColor: c })} />
        <div className="section-title">Bottom</div>
        <div className="row wrap">{BOTTOMS.map((h) => <button key={h} className={`btn small ${look.bottom === h ? 'active' : ''}`} onClick={() => upd({ bottom: h })}>{label(h)}</button>)}</div>
        <div style={{ height: 8 }} />
        <Swatches value={look.bottomColor} list={COLORS} onChange={(c) => upd({ bottomColor: c })} />
        <div className="section-title">Shoes</div>
        <Swatches value={look.shoes} list={COLORS} onChange={(c) => upd({ shoes: c })} />
        <div className="section-title">Accessories</div>
        <Toggle label="Sunglasses" value={look.glasses} onChange={(v) => upd({ glasses: v })} />
        <Toggle label="Gold chain" value={look.chain} onChange={(v) => upd({ chain: v })} />
        <Toggle label="Cap" value={look.cap} onChange={(v) => upd({ cap: v })} />
        <Toggle label="Gloves" value={look.gloves} onChange={(v) => upd({ gloves: v })} />
        <div className="section-title">Height</div>
        <Seg value={String(look.height)} onChange={(v) => upd({ height: parseFloat(v) })} options={[['0.92', 'Shorter'], ['1', 'Average'], ['1.08', 'Taller']].map(([v, l]) => ({ v, label: l }))} />
      </div>
      {naming && (
        <PromptModal
          title="Name this outfit"
          initial={`Outfit ${perf.outfits.length + 1}`}
          onClose={() => setNaming(false)}
          onDone={(name) => {
            useProject.getState().mutate((p) => {
              const pf = p.performer ?? defaultPerformer();
              return { ...p, performer: { ...pf, outfits: [...pf.outfits, { id: uid('fit'), name, look: { ...pf.look } }] } };
            });
            setNaming(false);
            toast('Outfit saved', 'success');
          }}
        />
      )}
    </div>
  );
}

function MapModal() {
  const set = usePerformer((s) => s.set);
  const xs = ROOMS.flatMap((r) => [r.rect.x0, r.rect.x1]);
  const zs = ROOMS.flatMap((r) => [r.rect.z0, r.rect.z1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs) + 6;
  const W = x1 - x0, H = z1 - z0;
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 300);
    return () => window.clearInterval(t);
  }, []);
  const back = player.pos.y < -3;
  return (
    <Modal title="Venue map" wide onClose={() => set({ map: false })}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        <svg viewBox={`${x0 - 1} ${z0 - 1} ${W + 2} ${H + 2}`} style={{ width: '100%', background: '#0d0e11', borderRadius: 12, maxHeight: '60vh' }}>
          {ROOMS.map((r) => (
            <g key={r.id} onClick={() => r.id !== 'corridor' && r.id !== 'tunnel' && teleportRoom(r.id as RoomId)} style={{ cursor: 'pointer' }}>
              <rect x={r.rect.x0} y={r.rect.z0} width={r.rect.x1 - r.rect.x0} height={r.rect.z1 - r.rect.z0} fill={r.id === 'corridor' || r.id === 'tunnel' ? '#22252b' : '#2c3340'} stroke="#4a5262" strokeWidth={0.2} />
              {r.id !== 'corridor' && <text x={(r.rect.x0 + r.rect.x1) / 2} y={(r.rect.z0 + r.rect.z1) / 2} fontSize={r.id === 'tunnel' ? 0.9 : 1.1} fill="#cfd6e2" textAnchor="middle">{r.name.replace('Artist ', '').replace(' & Storage', '')}</text>}
            </g>
          ))}
          <rect x={-12} y={-1} width={24} height={6} fill="#1d2a40" stroke="#4da3ff" strokeWidth={0.2} />
          <text x={0} y={2.6} fontSize={1.3} fill="#4da3ff" textAnchor="middle">STAGE (above)</text>
          {back && <circle cx={player.pos.x} cy={player.pos.z} r={0.8} fill="#ff3b4e" />}
        </svg>
        <div>
          <div className="section-title">Backstage</div>
          <div className="grid-2">
            {ROOMS.filter((r) => r.id !== 'corridor' && r.id !== 'tunnel').map((r) => (
              <button key={r.id} className="btn small" onClick={() => teleportRoom(r.id as RoomId)}>{r.name}</button>
            ))}
          </div>
          <div className="section-title">Arena</div>
          <div className="grid-2">
            <button className="btn small" onClick={() => { teleportRoom('tunnel'); set({ map: false }); }}>Performer Tunnel</button>
            <button className="btn small" onClick={() => teleportStage('stage')}>Main Stage</button>
            <button className="btn small" onClick={() => teleportStage('runway')}>Runway / B-Stage</button>
            <button className="btn small" onClick={toArenaFloor}>Arena Floor</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function PerformerMode() {
  const project = useProject((s) => s.project);
  const pu = usePerformer();
  const s = useShow();
  const [drawer, setDrawer] = useState<'none' | 'show' | 'visuals' | 'fx'>('none');
  const [clip, setClip] = useState<{ url: string; blob: Blob } | null>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    input.run = run;
  }, [run]);

  // keyboard (PC): WASD / arrows, Shift run, Space jump, 1-6 actions, V camera
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      input.moveY = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      input.moveX = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      input.run = keys.has('shift') || run;
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (k === ' ') input.jump = true;
      const acts: Record<string, Action> = { '1': 'dance', '2': 'wave', '3': 'handsUp', '4': 'point', '5': 'bow' };
      if (acts[k]) doAction(acts[k]);
      if (k === 'v') usePerformer.getState().set({ cam: usePerformer.getState().cam === 'first' ? 'third' : 'first' });
      if (k === 'q') input.lookDX -= 40;
      if (k === 'e') input.lookDX += 40;
      keys.add(k);
      apply();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      apply();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      input.moveX = input.moveY = 0;
    };
  }, [run]);

  if (!project) return null;

  const toggleRec = async () => {
    if (pu.recording) {
      const blob = await stopRecording();
      pu.set({ recording: false });
      if (blob) setClip({ blob, url: URL.createObjectURL(blob) });
      else toast('Nothing was recorded', 'error');
    } else if (startRecording()) {
      pu.set({ recording: true });
      toast('Recording… tap ■ to stop');
    } else toast('Recording is not supported in this browser', 'error');
  };
  const snap = async () => {
    const url = screenshot();
    if (!url) return toast('Screenshot failed', 'error');
    const blob = await (await fetch(url)).blob();
    try {
      const ok = await saveBlob(`concert-${Date.now()}.png`, blob);
      if (ok) toast('Screenshot ready', 'success');
    } catch (e) {
      toast(`Could not save: ${(e as Error).message}`, 'error');
    }
  };
  const cams: { v: CamMode; label: string }[] = [
    { v: 'third', label: '3rd' },
    { v: 'first', label: '1st' },
    { v: 'crowd', label: 'Crowd' },
    { v: 'drone', label: 'Drone' },
    { v: 'stagefront', label: 'Front' },
    { v: 'auto', label: 'Auto' },
  ];
  const act = (a: Action, label: string) => (
    <button className={`act-btn ${player.action === a ? 'on' : ''}`} onPointerDown={(e) => { e.stopPropagation(); doAction(player.action === a && (a === 'dance' || a === 'handsUp') ? 'none' : a); }}>
      {label}
    </button>
  );

  return (
    <div className="fill">
      <ErrorBoundary label="Performer view">
        <Viewport mode="performer" arenaId={project.arenaId} />
      </ErrorBoundary>
      <LookLayer />
      <div className="perf-top">
        <button className="btn" onClick={exitPerformer} aria-label="Exit performer mode"><X size={18} /> Exit</button>
        <div className="badge" style={{ fontSize: 13, padding: '8px 12px' }}>📍 {pu.location}</div>
        <span className="spacer" />
        <div className="view-seg">
          {cams.map((c) => (
            <button key={c.v} className={pu.cam === c.v ? 'on' : ''} onClick={() => pu.set({ cam: c.v, wardrobe: false })}>{c.label}</button>
          ))}
        </div>
        <button className="icon-btn boxed" onClick={() => pu.set({ map: true })} aria-label="Map"><MapIcon size={20} /></button>
        <button className="icon-btn boxed" onClick={() => pu.set({ wardrobe: !pu.wardrobe, cam: pu.wardrobe ? 'third' : 'wardrobe' })} aria-label="Wardrobe"><Shirt size={20} /></button>
        <button className="icon-btn boxed" onClick={snap} aria-label="Screenshot"><Camera size={20} /></button>
        {canRecord() !== false && (
          <button className={`icon-btn boxed ${pu.recording ? 'active' : ''}`} onClick={toggleRec} aria-label={pu.recording ? 'Stop recording' : 'Record'}>
            {pu.recording ? <Square size={18} fill="#ff3b4e" color="#ff3b4e" /> : <Circle size={18} fill="#ff3b4e" color="#ff3b4e" />}
          </button>
        )}
        <button className="icon-btn boxed" onClick={manualSave} aria-label="Save" data-tut="save-perf"><Save size={20} /></button>
      </div>

      <Joystick />

      <div className="act-grid">
        <button className="act-btn big" onPointerDown={(e) => { e.stopPropagation(); input.jump = true; }}>JUMP</button>
        {act('dance', 'DANCE')}
        {act('wave', 'WAVE')}
        {act('handsUp', 'HANDS UP')}
        {act('point', 'POINT')}
        {act('bow', 'BOW')}
        <button className={`act-btn ${run ? 'on' : ''}`} onPointerDown={(e) => { e.stopPropagation(); setRun(!run); }}><Footprints size={16} /> RUN</button>
      </div>

      {/* contextual action */}
      <div className="perf-cta">
        {pu.nearLift && pu.entrance === 'none' && (
          <button className="btn live" style={{ minHeight: 64, fontSize: 18, padding: '0 28px' }} onClick={goOnStage}>
            <ArrowUpCircle size={22} /> GO ON STAGE
          </button>
        )}
        {pu.nearArenaDoor && pu.entrance === 'none' && (
          <button className="btn primary" style={{ minHeight: 56 }} onClick={toArenaFloor}>
            <DoorOpen size={20} /> Enter arena floor
          </button>
        )}
        {pu.location === 'Artist Dressing Room' && !pu.wardrobe && <div className="float-hint" style={{ position: 'static', transform: 'none' }}>Tap 👕 to dress your artist, then walk to the Performer Tunnel → stage lift</div>}
      </div>

      {/* show controls while performing */}
      {(pu.onStage || player.pos.y > -3) && (
        <div className="perf-show">
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn boxed" onClick={() => show.toggle(true)} aria-label={s.playing ? 'Pause' : 'Play'}>{s.playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <button className="icon-btn boxed" onClick={() => show.next()} aria-label="Next cue"><SkipForward size={20} /></button>
            <button className={`icon-btn boxed ${s.blackout ? 'active' : ''}`} onClick={() => s.set({ blackout: !s.blackout })} aria-label="Blackout"><Moon size={20} /></button>
            <button className={`btn small ${drawer === 'show' ? 'active' : ''}`} onClick={() => setDrawer(drawer === 'show' ? 'none' : 'show')}>Scenes</button>
            <button className={`btn small ${drawer === 'visuals' ? 'active' : ''}`} onClick={() => setDrawer(drawer === 'visuals' ? 'none' : 'visuals')}>Screens</button>
            <button className={`btn small ${drawer === 'fx' ? 'active' : ''}`} onClick={() => setDrawer(drawer === 'fx' ? 'none' : 'fx')}>FX</button>
            <button className="btn small" onClick={goBackstage}><Undo2 size={14} /> Backstage</button>
          </div>
          {drawer !== 'none' && (
            <div className="pad-row" style={{ padding: '8px 0 0' }}>
              {drawer === 'show' && project.scenes.map((sc) => <button key={sc.id} className={`pad ${s.activeSceneId === sc.id ? 'on' : ''}`} style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.activateScene(sc)}>{sc.name}</button>)}
              {drawer === 'visuals' && VISUAL_PRESETS.map((v) => <button key={v.name} className="pad" style={{ minWidth: 100, minHeight: 60, borderBottom: `4px solid ${v.color1}` }} onClick={() => s.set({ liveVisual: v })}>{v.name}</button>)}
              {drawer === 'fx' && (
                <>
                  <button className="pad" style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.trigger('pyro')}>PYRO</button>
                  <button className="pad" style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.trigger('confetti')}>CONFETTI</button>
                  <button className="pad" style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.trigger('smoke')}>CO₂</button>
                  <button className="pad" style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.trigger('flash')}>FLASH</button>
                  <button className={`pad ${s.phoneLights ? 'on' : ''}`} style={{ minWidth: 100, minHeight: 60 }} onClick={() => s.set({ phoneLights: !s.phoneLights })}>PHONE LIGHTS</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="hype">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em' }}>CROWD</div>
        <div className="hype-bar"><div style={{ height: `${Math.round(Math.min(1, s.hype) * 100)}%` }} /></div>
      </div>

      {pu.recording && <div className="rec-dot">● REC</div>}
      <div className="fade-overlay" style={{ opacity: pu.fade, pointerEvents: pu.fade > 0.5 ? 'auto' : 'none' }} />
      {pu.wardrobe && <Wardrobe />}
      {pu.map && <MapModal />}
      {clip && (
        <Modal
          title="Your concert clip"
          onClose={() => { URL.revokeObjectURL(clip.url); setClip(null); }}
          footer={
            <>
              <button className="btn" onClick={() => { URL.revokeObjectURL(clip.url); setClip(null); }}><Trash2 size={16} /> Discard</button>
              <button className="btn primary" onClick={async () => {
                const ext = clip.blob.type.includes('mp4') ? 'mp4' : 'webm';
                try {
                  if (await saveBlob(`concert-clip-${Date.now()}.${ext}`, clip.blob)) toast('Clip ready to save', 'success');
                } catch (e) {
                  toast(`Could not save: ${(e as Error).message}`, 'error');
                }
              }}><Save size={16} /> Save video</button>
            </>
          }
        >
          <video src={clip.url} controls playsInline autoPlay style={{ width: '100%', borderRadius: 12, background: '#000' }} />
        </Modal>
      )}
    </div>
  );
}

export { useUI };
