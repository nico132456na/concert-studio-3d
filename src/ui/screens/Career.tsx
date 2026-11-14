import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowLeft, Home as HomeIcon, Car, Lock, Mic2, Sunrise, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { useUI, toast } from '../../state/uiStore';
import { useCareer, currentTier } from '../../life/careerStore';
import { TIERS, HOMES, VEHICLES, GENRES, tierIndex, unlocked } from '../../life/data';
import { lifeActions } from '../../life/actions';
import { ARENAS, getArena } from '../../data/arenas';
import { ARCHIVE_ARTISTS } from '../../data/archive';
import { Avatar } from '../../three/Avatar';
import { ErrorBoundary, Modal } from '../components';
import { Swatches, SKINS, HAIRS, TOPS, COLORS } from '../performer/PerformerMode';
import { ShowPicker } from '../life/ShowPicker';
import type { AvatarLook } from '../../types';

function AvatarPreview({ look }: { look: AvatarLook }) {
  return (
    <div style={{ height: 220, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 30%, #2a3040, #0d0e12)' }}>
      <ErrorBoundary label="Avatar">
        <Canvas camera={{ position: [0, 1.25, 3.1], fov: 38 }} dpr={[1, 2]}>
          <hemisphereLight args={['#ffffff', '#404050', 1.6]} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} />
          <group position={[0, -0.05, 0]}>
            <Avatar look={look} followPlayer={false} />
          </group>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

function CreateArtist() {
  const update = useCareer((s) => s.update);
  const reset = useCareer((s) => s.reset);
  const career = useCareer((s) => s.career);
  const [name, setName] = useState(career.name);
  const [genre, setGenre] = useState(career.genre);
  const [insp, setInsp] = useState<string>('');
  const look = career.look;
  const upd = (p: Partial<AvatarLook>) => update((c) => ({ look: { ...c.look, ...p } }));
  const start = (sandbox: boolean) => {
    const keep = { look: useCareer.getState().career.look };
    reset(sandbox);
    update({ ...keep, started: true, name: name.trim() || 'Nova', genre, inspiredBy: insp || undefined });
    toast(sandbox ? 'Sandbox: everything unlocked' : 'Your career begins. Play your first show!', 'success');
  };
  return (
    <div className="career-grid">
      <div className="card">
        <div className="card-title">Create your artist</div>
        <div className="card-sub">An original performer — your name, your look. Archive artists can be picked as a style inspiration only.</div>
        <div className="field" style={{ marginTop: 14 }}>
          <div className="field-label">Stage name</div>
          <input className="text-input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">Genre</div>
          <div className="row wrap" style={{ gap: 6 }}>{GENRES.map((g) => <button key={g} className={`btn small ${genre === g ? 'active' : ''}`} onClick={() => setGenre(g)}>{g}</button>)}</div>
        </div>
        <div className="field">
          <div className="field-label">Inspired by (optional)</div>
          <select className="text-input" value={insp} onChange={(e) => setInsp(e.target.value)}>
            <option value="">Nobody — fully original</option>
            {ARCHIVE_ARTISTS.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.aesthetic}</option>)}
          </select>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
          <button className="btn primary" onClick={() => start(false)}><Sunrise size={18} /> Start as an emerging artist</button>
          <button className="btn" onClick={() => start(true)}><Sparkles size={18} /> Sandbox (all unlocked)</button>
        </div>
      </div>
      <div className="card">
        <div className="card-title">Look</div>
        <AvatarPreview look={look} />
        <div className="section-title">Skin</div>
        <Swatches value={look.skin} list={SKINS} onChange={(c) => upd({ skin: c })} />
        <div className="section-title">Hair</div>
        <div className="row wrap">{HAIRS.map((h) => <button key={h} className={`btn small ${look.hair === h ? 'active' : ''}`} onClick={() => upd({ hair: h })}>{h}</button>)}</div>
        <div className="section-title">Top</div>
        <div className="row wrap" style={{ marginBottom: 8 }}>{TOPS.map((h) => <button key={h} className={`btn small ${look.top === h ? 'active' : ''}`} onClick={() => upd({ top: h })}>{h}</button>)}</div>
        <Swatches value={look.topColor} list={COLORS} onChange={(c) => upd({ topColor: c })} />
        <div className="hint" style={{ marginTop: 10 }}>More outfit options are in your closet at home.</div>
      </div>
    </div>
  );
}

function Dashboard() {
  const career = useCareer((s) => s.career);
  const update = useCareer((s) => s.update);
  const reset = useCareer((s) => s.reset);
  const result = useCareer((s) => s.lastResult);
  const setC = useCareer((s) => s.set);
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tier = currentTier();
  const ti = tierIndex(tier.id);
  const next = TIERS[ti + 1];
  const pct = career.sandbox || !next ? 100 : Math.round(((career.xp - tier.xp) / (next.xp - tier.xp)) * 100);
  const buyHome = (id: (typeof HOMES)[number]['id'], price: number) => {
    if (career.homes.includes(id)) return update({ home: id });
    if (career.money < price) return toast(`You need $${price.toLocaleString()}`, 'error');
    update({ money: career.money - price, homes: [...career.homes, id], home: id });
    toast('New home — the keys are yours', 'success');
  };
  const buyCar = (id: (typeof VEHICLES)[number]['id'], price: number) => {
    if (career.vehicles.includes(id)) return update({ vehicle: id });
    if (career.money < price) return toast(`You need $${price.toLocaleString()}`, 'error');
    update({ money: career.money - price, vehicles: [...career.vehicles, id], vehicle: id });
    toast('Delivered to your garage', 'success');
  };
  return (
    <div className="career-grid">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="card-title" style={{ fontSize: 22 }}>{career.name}</div>
            <div className="card-sub">{career.genre}{career.inspiredBy ? ` · inspired by ${ARCHIVE_ARTISTS.find((a) => a.id === career.inspiredBy)?.name}` : ''} · Day {career.day}</div>
          </div>
          <span className="badge" style={{ background: ['#5a6070', '#2f7fe0', '#8a2aff', '#d9a740'][ti], color: '#fff' }}>{tier.label}</span>
        </div>
        <div style={{ margin: '14px 0 6px' }} className="progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="hint">{career.sandbox ? 'Sandbox — everything unlocked' : next ? `${career.xp.toLocaleString()} / ${next.xp.toLocaleString()} XP to ${next.label}` : `${career.xp.toLocaleString()} XP — top tier`}</div>
        <div className="stats">
          <div><div className="stat-k">Money</div><div className="stat-v">${career.money.toLocaleString()}</div></div>
          <div><div className="stat-k">Shows</div><div className="stat-v">{career.shows.length}</div></div>
          <div><div className="stat-k">Songs</div><div className="stat-v">{career.songs}</div></div>
          <div><div className="stat-k">Fan moments</div><div className="stat-v">{career.fanMoments}</div></div>
        </div>
        <div className="section-title">Tonight</div>
        <div style={{ fontSize: 14 }}>{getArena(career.venue).name} · {Math.round(getArena(career.venue).capacity * tier.crowdFill).toLocaleString()} expected</div>
        <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn primary" onClick={lifeActions.startDay}><Sunrise size={18} /> Start the day (Artist Life)</button>
          <button className="btn" onClick={() => setPicker(true)}>Plan the show</button>
          <button className="btn" onClick={() => lifeActions.enterVenue()}><Mic2 size={18} /> Skip to the show</button>
        </div>
      </div>
      <div className="card">
        <div className="card-title">Career path</div>
        {TIERS.map((t, i) => (
          <div key={t.id} className={`unlock ${i > ti ? 'locked' : ''}`}>
            {i > ti ? <Lock size={16} /> : <Trophy size={16} color="#d9a740" />}
            <div className="grow">
              <b>{t.label}</b> <span className="hint">{t.xp.toLocaleString()} XP</span>
              <div className="hint">{t.venues.filter((v) => !TIERS[i - 1]?.venues.includes(v)).map((v) => getArena(v).name).join(', ') || 'Same venues'} · {t.security} security · {t.escorts} escort cars · {Math.round(t.crowdFill * 100)}% crowd</div>
            </div>
          </div>
        ))}
        <div className="section-title">Venues</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {ARENAS.filter((a) => a.id !== 'empty').map((a) => (
            <span key={a.id} className="badge" style={{ opacity: tier.venues.includes(a.id) ? 1 : 0.4 }}>{!tier.venues.includes(a.id) && '🔒 '}{a.name}</span>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title"><HomeIcon size={16} /> Homes</div>
        {HOMES.map((h) => {
          const ok = unlocked(h.tier, tier), own = career.homes.includes(h.id);
          return (
            <div key={h.id} className={`unlock ${ok ? '' : 'locked'}`}>
              {!ok && <Lock size={16} />}
              <div className="grow"><b>{h.label}</b><div className="hint">{h.blurb}</div></div>
              {ok && <button className={`btn small ${career.home === h.id ? 'active' : ''}`} onClick={() => buyHome(h.id, h.price)}>{career.home === h.id ? 'Living here' : own ? 'Move in' : `$${h.price.toLocaleString()}`}</button>}
            </div>
          );
        })}
      </div>
      <div className="card">
        <div className="card-title"><Car size={16} /> Garage</div>
        {VEHICLES.map((v) => {
          const ok = unlocked(v.tier, tier), own = career.vehicles.includes(v.id);
          return (
            <div key={v.id} className={`unlock ${ok ? '' : 'locked'}`}>
              {!ok && <Lock size={16} />}
              <div className="grow"><b>{v.label}</b><div className="hint">Top speed {Math.round(v.top * 3.6)} km/h</div></div>
              {ok && <button className={`btn small ${career.vehicle === v.id ? 'active' : ''}`} onClick={() => buyCar(v.id, v.price)}>{career.vehicle === v.id ? 'Selected' : own ? 'Select' : `$${v.price.toLocaleString()}`}</button>}
            </div>
          );
        })}
        <div className="hint" style={{ marginTop: 8 }}>Repaint cars in your home garage.</div>
      </div>
      <div className="card">
        <div className="card-title">Recent shows</div>
        {career.shows.length === 0 && <div className="hint" style={{ marginTop: 8 }}>No shows yet. Start the day and head to the venue.</div>}
        {career.shows.slice(-6).reverse().map((s) => (
          <div key={s.at} className="unlock">
            <div className="grow"><b>{getArena(s.venue).name}</b><div className="hint">{s.project} · {s.minutes} min · {s.crowd.toLocaleString()} fans</div></div>
            <span className="badge">+{s.xp} XP</span>
          </div>
        ))}
        <button className="btn small" style={{ marginTop: 14 }} onClick={() => setConfirm(true)}><RotateCcw size={14} /> Reset career</button>
      </div>
      {picker && <ShowPicker onClose={() => setPicker(false)} />}
      {confirm && (
        <Modal title="Reset career?" onClose={() => setConfirm(false)} footer={<><button className="btn" onClick={() => setConfirm(false)}>Cancel</button><button className="btn danger" onClick={() => { reset(false); setConfirm(false); }}>Reset</button></>}>
          This erases your XP, money, homes and cars. Your saved stage projects are kept.
        </Modal>
      )}
      {result && (
        <Modal title="Show complete" onClose={() => setC({ lastResult: null })} footer={<button className="btn primary" onClick={() => setC({ lastResult: null })}>Continue</button>}>
          <div style={{ fontSize: 16, lineHeight: 1.6 }}>
            <b>{getArena(result.venue).name}</b> — {result.crowd.toLocaleString()} fans
            <br />
            {result.minutes} minutes on stage
            <br />
            <b>+{result.xp.toLocaleString()} XP</b> · <b>+${result.money.toLocaleString()}</b>
            {result.minutes < 0.4 && <div className="hint" style={{ marginTop: 8 }}>Spend at least 20 seconds on stage for a full payout.</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function CareerScreen() {
  const set = useUI((s) => s.set);
  const started = useCareer((s) => s.career.started);
  const sandbox = useCareer((s) => s.career.sandbox);
  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn boxed" onClick={() => set({ screen: 'menu' })} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="screen-title">Career Mode</div>
          <div className="screen-sub">Emerging → Rising → Established → Superstar{started && sandbox ? ' · Sandbox' : ''}</div>
        </div>
        {started && <span className="hint">Saved automatically</span>}
      </div>
      {started ? <Dashboard /> : <CreateArtist />}
    </div>
  );
}
