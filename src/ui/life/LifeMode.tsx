import { useEffect, useState } from 'react';
import { X, Camera, Car, SkipForward, Mic, Shirt, CalendarDays } from 'lucide-react';
import { ErrorBoundary, Seg, Toggle } from '../components';
import { LifeWorld } from '../../three/life/LifeWorld';
import { useLife, type LifeCam } from '../../life/state';
import { useCareer, currentTier } from '../../life/careerStore';
import { lifeActions } from '../../life/actions';
import { input, doAction } from '../../performer/state';
import { Joystick, LookLayer, Swatches, SKINS, HAIRS, TOPS, BOTTOMS, COLORS } from '../performer/PerformerMode';
import { ShowPicker } from './ShowPicker';
import { screenshot } from '../../performer/recorder';
import { saveBlob } from '../../util/misc';
import { toast } from '../../state/uiStore';
import { getArena } from '../../data/arenas';
import type { AvatarLook } from '../../types';

function Closet() {
  const look = useCareer((s) => s.career.look);
  const update = useCareer((s) => s.update);
  const set = useLife((s) => s.set);
  const upd = (p: Partial<AvatarLook>) => update((c) => ({ look: { ...c.look, ...p } }));
  const label = (s: string) => s[0].toUpperCase() + s.slice(1);
  return (
    <div className="panel right-panel" style={{ zIndex: 40 }}>
      <div className="panel-head">
        <div className="panel-title">Closet</div>
        <button className="icon-btn" onClick={() => set({ closet: false })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="panel-body">
        <div className="hint" style={{ marginBottom: 10 }}>This look follows you everywhere — home, the red carpet and on stage.</div>
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
    </div>
  );
}

function Recording() {
  const p = useLife((s) => s.recording);
  const set = useLife((s) => s.set);
  useEffect(() => {
    if (p < 0) return;
    const start = performance.now();
    const t = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / 6000);
      if (k >= 1) {
        window.clearInterval(t);
        lifeActions.finishRecording();
      } else set({ recording: k });
    }, 100);
    return () => window.clearInterval(t);
  }, [p >= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  if (p < 0) return null;
  const steps = ['Laying down the beat', 'Recording vocals', 'Stacking harmonies', 'Mixing'];
  return (
    <div className="life-center">
      <div className="info-card" style={{ minWidth: 300 }}>
        <div className="row" style={{ gap: 8 }}><Mic size={18} /> <b>Studio session</b></div>
        <div className="hint" style={{ margin: '8px 0' }}>{steps[Math.min(3, Math.floor(p * 4))]}…</div>
        <div className="progress"><div style={{ width: `${p * 100}%` }} /></div>
      </div>
    </div>
  );
}

export function LifeMode() {
  const ui = useLife();
  const career = useCareer((s) => s.career);
  const tier = currentTier();
  const [run, setRun] = useState(false);
  const onFoot = ui.phase !== 'drive';

  useEffect(() => {
    input.run = run;
  }, [run]);

  // keyboard: WASD / arrows, Shift run, E interact, V camera
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      input.moveY = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      input.moveX = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      input.run = keys.has('shift') || run;
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'e') useLife.getState().prompt?.actions[0]?.run();
      if (k === 'q') input.lookDX -= 40;
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

  const snap = async () => {
    const url = screenshot();
    if (!url) return toast('Screenshot failed', 'error');
    try {
      if (await saveBlob(`artist-life-${Date.now()}.png`, await (await fetch(url)).blob())) toast('Screenshot ready', 'success');
    } catch (e) {
      toast(`Could not save: ${(e as Error).message}`, 'error');
    }
  };

  const cams: { v: LifeCam; label: string }[] = onFoot
    ? [
        { v: 'third', label: '3rd' },
        { v: 'first', label: '1st' },
        { v: 'cinematic', label: 'Cinematic' },
        { v: 'top', label: 'Top' },
      ]
    : [
        { v: 'chase', label: 'Chase' },
        { v: 'hood', label: 'Hood' },
        { v: 'cinematic', label: 'Cinematic' },
        { v: 'top', label: 'Top' },
      ];
  const where = ui.phase === 'home' ? ui.location : ui.phase === 'drive' ? 'On the road' : `${getArena(career.venue).name} — arrival`;
  const blocked = !!ui.dialog || ui.closet || ui.showPicker || ui.recording >= 0;

  return (
    <div className="fill">
      <ErrorBoundary label="Artist life">
        <LifeWorld />
      </ErrorBoundary>
      <LookLayer />
      <div className="perf-top">
        <button className="btn" onClick={lifeActions.exit} aria-label="Exit artist life"><X size={18} /> Exit</button>
        <div className="badge" style={{ fontSize: 13, padding: '8px 12px' }}>📍 {where}</div>
        <div className="badge" style={{ fontSize: 13, padding: '8px 12px' }}>{career.name} · {tier.label}</div>
        <span className="spacer" />
        <div className="view-seg">
          {cams.map((c) => (
            <button key={c.v} className={ui.cam === c.v ? 'on' : ''} onClick={() => ui.set({ cam: c.v })}>{c.label}</button>
          ))}
        </div>
        {ui.phase === 'home' && (
          <>
            <button className="icon-btn boxed" onClick={() => ui.set({ closet: !ui.closet })} aria-label="Closet"><Shirt size={20} /></button>
            <button className="icon-btn boxed" onClick={() => ui.set({ showPicker: true })} aria-label="Plan tonight's show"><CalendarDays size={20} /></button>
          </>
        )}
        <button className="icon-btn boxed" onClick={snap} aria-label="Screenshot"><Camera size={20} /></button>
      </div>

      {(onFoot || !ui.autopilot) && !blocked && <Joystick />}

      {ui.phase === 'home' && !blocked && !ui.prompt && (
        <div className="life-hint">Walk around your home · talk to your team · record in the studio · pick a car in the garage to drive to the show</div>
      )}
      {ui.phase === 'arrival' && !blocked && !ui.prompt && <div className="life-hint">Walk the red carpet · meet fans at the barricades · enter at the artist entrance</div>}

      {ui.phase === 'drive' && (
        <div className="drive-hud">
          <div className="info-card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 14px' }}>
            <div><div className="stat-k">Speed</div><div className="stat-v">{ui.speedKmh} km/h</div></div>
            <div><div className="stat-k">To venue</div><div className="stat-v">{ui.distLeft} m</div></div>
            <button className={`btn small ${ui.autopilot ? 'active' : ''}`} onClick={() => ui.set({ autopilot: !ui.autopilot })}><Car size={16} /> {ui.autopilot ? 'Chauffeur' : 'Driving'}</button>
            <button className="btn small" onClick={lifeActions.arrive}><SkipForward size={16} /> Skip drive</button>
          </div>
          {!ui.autopilot && <div className="hint" style={{ textAlign: 'center' }}>Joystick: up = gas, down = brake, left/right = steer (WASD on a keyboard)</div>}
        </div>
      )}

      {ui.prompt && !blocked && (
        <div className="life-prompt">
          <div className="info-card" style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui.prompt.label}</div>
            <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
              {ui.prompt.actions.map((a) => (
                <button key={a.label} className="btn primary" onClick={a.run}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {onFoot && !blocked && (
        <div className="act-grid" style={{ gridTemplateColumns: 'repeat(2, 84px)' }}>
          <button className="act-btn" onPointerDown={(e) => { e.stopPropagation(); doAction('wave'); }}>WAVE</button>
          <button className="act-btn" onPointerDown={(e) => { e.stopPropagation(); doAction('dance'); }}>DANCE</button>
          <button className="act-btn" onPointerDown={(e) => { e.stopPropagation(); doAction('point'); }}>POINT</button>
          <button className={`act-btn ${run ? 'on' : ''}`} onPointerDown={(e) => { e.stopPropagation(); setRun(!run); }}>RUN</button>
        </div>
      )}

      {ui.dialog && (
        <div className="life-dialog">
          <div className="info-card">
            <div className="row" style={{ gap: 8 }}><b style={{ fontSize: 17 }}>{ui.dialog.name}</b><span className="badge">{ui.dialog.role}</span></div>
            {ui.dialog.lines.map((l, i) => <div key={i} style={{ marginTop: 8, lineHeight: 1.45 }}>{l}</div>)}
            <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
              {ui.dialog.options.map((o, i) => <button key={o.label} className={`btn ${i === 0 ? 'primary' : ''}`} onClick={o.run}>{o.label}</button>)}
            </div>
          </div>
        </div>
      )}

      {ui.closet && <Closet />}
      {ui.showPicker && <ShowPicker onClose={() => ui.set({ showPicker: false })} />}
      <Recording />
      <div className="life-fade" style={{ opacity: ui.fade }} />
      <div className="life-flash" style={{ opacity: ui.flashes ? 0.18 : 0 }} />
    </div>
  );
}

