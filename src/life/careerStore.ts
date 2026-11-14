import { create } from 'zustand';
import type { AvatarLook } from '../types';
import { DEFAULT_LOOK } from '../performer/state';
import { tierFor, type HomeId, type VehicleId } from './data';

export interface ShowRecord {
  at: number;
  venue: string;
  project: string;
  minutes: number;
  xp: number;
  money: number;
  crowd: number;
}

export interface Career {
  started: boolean;
  name: string;
  genre: string;
  /** optional archive artist used as inspiration (look/aesthetic only) */
  inspiredBy?: string;
  look: AvatarLook;
  xp: number;
  money: number;
  sandbox: boolean;
  home: HomeId;
  homes: HomeId[];
  vehicle: VehicleId;
  vehicles: VehicleId[];
  vehicleColors: Partial<Record<VehicleId, string>>;
  day: number;
  recordedToday: boolean;
  fanMoments: number;
  songs: number;
  /** tonight's show */
  venue: string;
  stageProjectId?: string;
  stageArchiveId?: string;
  shows: ShowRecord[];
}

/** A performance launched from the life/career flow (scored when performer mode exits). */
export interface LiveSession {
  startedAt: number;
  venue: string;
  projectName: string;
}

const KEY = 'cs3d-career';

export const freshCareer = (): Career => ({
  started: false,
  name: 'Nova',
  genre: 'Pop',
  look: { ...DEFAULT_LOOK },
  xp: 0,
  money: 5000,
  sandbox: false,
  home: 'apartment',
  homes: ['apartment'],
  vehicle: 'sedan',
  vehicles: ['sedan', 'van'],
  vehicleColors: {},
  day: 1,
  recordedToday: false,
  fanMoments: 0,
  songs: 0,
  venue: 'theater',
  shows: [],
});

function load(): Career {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshCareer(), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return freshCareer();
}

interface CareerState {
  career: Career;
  live: LiveSession | null;
  lastResult: ShowRecord | null;
  update: (p: Partial<Career> | ((c: Career) => Partial<Career>)) => void;
  addXp: (xp: number, money?: number) => void;
  reset: (sandbox?: boolean) => void;
  set: (p: Partial<Pick<CareerState, 'live' | 'lastResult'>>) => void;
}

function persist(c: Career) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable */
  }
}

export const useCareer = create<CareerState>((set, get) => ({
  career: load(),
  live: null,
  lastResult: null,
  update: (p) => {
    const c = get().career;
    const next = { ...c, ...(typeof p === 'function' ? p(c) : p) };
    persist(next);
    set({ career: next });
  },
  addXp: (xp, money = 0) => get().update((c) => ({ xp: c.xp + Math.round(xp), money: c.money + Math.round(money) })),
  reset: (sandbox = false) => {
    const c = { ...freshCareer(), sandbox };
    if (sandbox) {
      c.homes = ['apartment', 'studioRes', 'penthouse', 'mansion', 'estate'];
      c.vehicles = ['sedan', 'van', 'suv', 'ev', 'sports', 'limo'];
      c.home = 'mansion';
      c.vehicle = 'limo';
      c.venue = 'football';
      c.money = 10_000_000;
    }
    persist(c);
    set({ career: c, live: null, lastResult: null });
  },
  set: (p) => set(p),
}));

export const currentTier = () => {
  const c = useCareer.getState().career;
  return tierFor(c.xp, c.sandbox);
};
