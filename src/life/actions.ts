import { useCareer, currentTier } from './careerStore';
import { useLife } from './state';
import { TIERS, VEHICLE_BY_ID, tierIndex, type VehicleId } from './data';
import { player, doAction, defaultPerformer } from '../performer/state';
import { useUI, toast } from '../state/uiStore';
import { useProject, getProject } from '../state/projectStore';
import { getArena } from '../data/arenas';
import { TEMPLATE_BY_ID } from '../data/templates';
import { TOUR_BY_ID, ARTIST_BY_ID } from '../data/archive';
import { createProject, openProjectById } from '../ui/flow';
import { enterPerformer } from '../performer/flow';
import { resetCar } from '../three/life/City';
import { ARRIVAL_SPAWN, flashes } from '../three/life/Arrival';

let fanXpThisArrival = 0;

function fadeTo(fn: () => void) {
  const ui = useLife.getState();
  ui.set({ fade: 1, prompt: null, dialog: null });
  window.setTimeout(() => {
    fn();
    window.setTimeout(() => useLife.getState().set({ fade: 0 }), 120);
  }, 450);
}

function stageLabel() {
  const c = useCareer.getState().career;
  if (c.stageArchiveId) {
    const t = TOUR_BY_ID.get(c.stageArchiveId);
    if (t) return `${t.title} stage (${ARTIST_BY_ID.get(t.artistId)?.name}, ${t.accuracy === 'inspired' ? 'inspired concept' : 'archive reconstruction'})`;
  }
  if (c.stageProjectId) return 'your own stage design';
  return 'an auto-designed stage';
}

export const lifeActions = {
  venueName() {
    return getArena(useCareer.getState().career.venue).name;
  },

  startDay() {
    player.pos.set(-3.5, 0, -9.6);
    player.yaw = player.camYaw = Math.PI;
    player.camPitch = 0.15;
    player.action = 'none';
    player.speed = 0;
    useLife.getState().set({ phase: 'home', cam: 'third', prompt: null, dialog: null, closet: false, showPicker: false, recording: -1, fade: 0, location: 'Bedroom' });
    useUI.getState().set({ screen: 'life' });
  },

  talk(who: 'manager' | 'assistant' | 'security' | 'phone') {
    const c = useCareer.getState().career;
    const tier = currentTier();
    const next = TIERS[tierIndex(tier.id) + 1];
    const set = useLife.getState().set;
    const close = () => set({ dialog: null });
    const arena = getArena(c.venue);
    if (who === 'manager')
      set({
        dialog: {
          name: 'Jordan',
          role: 'Manager',
          lines: [
            `Tonight you’re playing ${arena.name} — ${arena.capacity.toLocaleString()} capacity, on ${stageLabel()}.`,
            c.sandbox ? 'Sandbox mode: everything is unlocked.' : next ? `You’re a ${tier.label}. ${(next.xp - c.xp).toLocaleString()} XP until ${next.label}.` : `You’re a ${tier.label}. The world is yours.`,
          ],
          options: [
            { label: 'Plan tonight’s show', run: () => set({ dialog: null, showPicker: true }) },
            {
              label: 'How do I grow?',
              run: () =>
                set({
                  dialog: {
                    name: 'Jordan',
                    role: 'Manager',
                    lines: ['Play long, high-energy shows: time on stage and crowd hype earn XP and money.', 'Record in the studio once a day and spend time with fans on arrival. Bigger tiers unlock arenas, stadiums, homes and cars.'],
                    options: [{ label: 'Got it', run: close }],
                  },
                }),
            },
            { label: 'Let’s go', run: () => { close(); toast('Your car is waiting in the garage'); } },
          ],
        },
      });
    if (who === 'assistant')
      set({
        dialog: {
          name: 'Sam',
          role: 'Assistant',
          lines: [
            `Day ${c.day} schedule: ${c.recordedToday ? '✓' : '•'} studio session · • pick an outfit · • motorcade from the garage · • red-carpet arrival · • show at ${arena.name}.`,
            `Your look today: ${c.look.top} in ${c.look.topColor}. Want to change?`,
          ],
          options: [
            { label: 'Open the closet', run: () => set({ dialog: null, closet: true }) },
            { label: 'All good', run: close },
          ],
        },
      });
    if (who === 'security')
      set({
        dialog: {
          name: 'Marcus',
          role: 'Head of Security',
          lines: [
            tier.escorts ? `Motorcade’s ready: your ${VEHICLE_BY_ID[c.vehicle].label} plus ${tier.escorts} escort vehicle${tier.escorts > 1 ? 's' : ''}. ${Math.max(1, tier.security)} on your detail tonight.` : `It’s just us tonight — your ${VEHICLE_BY_ID[c.vehicle].label}. Keep your head down at the venue.`,
            'Pick any car in the garage and we roll.',
          ],
          options: [
            { label: 'Let’s roll', run: () => lifeActions.drive(c.vehicle) },
            { label: 'Not yet', run: close },
          ],
        },
      });
    if (who === 'phone') {
      const last = c.shows[c.shows.length - 1];
      set({
        dialog: {
          name: 'Phone',
          role: 'Messages',
          lines: [
            last ? `Fans are still posting about your ${getArena(last.venue).name} show (${last.crowd.toLocaleString()} people).` : 'Fans are hyped for your first big show.',
            `${c.songs} song${c.songs === 1 ? '' : 's'} recorded · ${c.shows.length} show${c.shows.length === 1 ? '' : 's'} played · ${c.fanMoments} fan moments.`,
          ],
          options: [{ label: 'Close', run: close }],
        },
      });
    }
  },

  closet() {
    useLife.getState().set({ closet: true, dialog: null });
  },

  record() {
    const c = useCareer.getState().career;
    if (c.recordedToday) return toast('You already recorded today — come back after the show', 'info');
    useLife.getState().set({ recording: 0, prompt: null });
  },

  finishRecording() {
    const c = useCareer.getState().career;
    const xp = 120 + tierIndex(currentTier().id) * 40;
    useCareer.getState().update({ recordedToday: true, songs: c.songs + 1 });
    useCareer.getState().addXp(xp, 1500);
    useLife.getState().set({ recording: -1 });
    toast(`New song recorded (+${xp} XP)`, 'success');
  },

  pickShow() {
    useLife.getState().set({ showPicker: true, dialog: null });
  },

  paint(v: VehicleId) {
    const c = useCareer.getState().career;
    const cols = VEHICLE_BY_ID[v].colors;
    const cur = c.vehicleColors[v] ?? cols[0];
    const nextC = cols[(cols.indexOf(cur) + 1) % cols.length];
    useCareer.getState().update({ vehicleColors: { ...c.vehicleColors, [v]: nextC } });
  },

  drive(v: VehicleId) {
    useCareer.getState().update({ vehicle: v });
    fadeTo(() => {
      resetCar();
      useLife.getState().set({ phase: 'drive', cam: 'chase', autopilot: true, dialog: null, prompt: null });
    });
  },

  arrive() {
    if (useLife.getState().phase !== 'drive' || useLife.getState().fade > 0) return;
    fanXpThisArrival = 0;
    fadeTo(() => {
      player.pos.set(ARRIVAL_SPAWN[0], 0.2, ARRIVAL_SPAWN[1]);
      player.yaw = player.camYaw = 0;
      player.camPitch = 0.1;
      player.speed = 0;
      useLife.getState().set({ phase: 'arrival', cam: 'third' });
    });
  },

  fanMoment(kind: 'autograph' | 'selfie', side: number) {
    player.yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    doAction(kind === 'autograph' ? 'point' : 'wave');
    flashes.last = performance.now();
    const c = useCareer.getState().career;
    useCareer.getState().update({ fanMoments: c.fanMoments + 1 });
    if (fanXpThisArrival < 80) {
      fanXpThisArrival += 10;
      useCareer.getState().addXp(10);
      toast(kind === 'autograph' ? 'Signed autographs (+10 XP)' : 'Selfie with fans (+10 XP)', 'success');
    } else toast(kind === 'autograph' ? 'Signed more autographs' : 'Another selfie!');
  },

  async enterVenue() {
    const c = useCareer.getState().career;
    const tier = currentTier();
    useLife.getState().set({ fade: 1, prompt: null });
    let ok = false;
    if (c.stageProjectId) ok = await openProjectById(c.stageProjectId);
    if (ok && getProject()?.arenaId !== c.venue) ok = false;
    if (!ok) {
      const tour = c.stageArchiveId ? TOUR_BY_ID.get(c.stageArchiveId) : undefined;
      const big = getArena(c.venue).capacity > 30000;
      const seed = tour && tour.arenaId === c.venue ? tour.build() : TEMPLATE_BY_ID[big ? 'stadium' : 'minimal'].build();
      const name = tour && tour.arenaId === c.venue ? `${c.name} — ${tour.title} stage` : `${c.name} — ${getArena(c.venue).name}`;
      const credit = tour && tour.arenaId === c.venue && tour.accuracy !== 'inspired' ? `Based on ${ARTIST_BY_ID.get(tour.artistId)?.name} — ${tour.title}. ${tour.sources.map((s) => s.url).join(' ')}` : 'Career mode stage';
      const p = await createProject(c.venue, seed, name, credit);
      useCareer.getState().update({ stageProjectId: p.id });
    }
    // the career artist is the performer
    useProject.getState().mutate((p) => {
      const pf = p.performer ?? defaultPerformer();
      return { ...p, performer: { ...pf, name: c.name, look: { ...c.look } } };
    }, { history: false });
    useCareer.getState().set({ live: { startedAt: Date.now(), venue: c.venue, projectName: getProject()?.name ?? '' } });
    player.stageTime = 0;
    player.hypeSum = 0;
    void tier;
    useLife.getState().set({ fade: 0 });
    enterPerformer();
  },

  exit() {
    useLife.getState().set({ dialog: null, closet: false, showPicker: false, prompt: null, recording: -1 });
    useUI.getState().set({ screen: 'career' });
  },
};

/** Score a career show when performer mode exits. Returns true if it handled the exit. */
export function finishCareerShow(): boolean {
  const cs = useCareer.getState();
  if (!cs.live) return false;
  const live = cs.live;
  const c = cs.career;
  const tier = currentTier();
  const arena = getArena(live.venue);
  const secs = player.stageTime;
  const crowd = Math.round(arena.capacity * tier.crowdFill);
  const venueMult = Math.min(4, Math.max(0.6, arena.capacity / 15000));
  const avgHype = secs > 0 ? player.hypeSum / secs : 0;
  const counted = secs >= 20;
  const xp = counted ? Math.round((Math.min(secs, 900) * 2.2 + player.hypeSum * 5) * venueMult) : 15;
  const money = counted ? Math.round(crowd * 0.9 * Math.min(1, secs / 120) * (0.6 + avgHype)) : 0;
  const rec = { at: Date.now(), venue: live.venue, project: live.projectName, minutes: Math.round((secs / 60) * 10) / 10, xp, money, crowd };
  cs.addXp(xp, money);
  cs.update({ shows: [...c.shows, rec].slice(-50), day: c.day + 1, recordedToday: false });
  cs.set({ live: null, lastResult: rec });
  useUI.getState().set({ screen: 'career' });
  return true;
}
