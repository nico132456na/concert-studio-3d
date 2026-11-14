import type { DesignSeed, Fixture, StageObject } from '../../types';
import type { Palette } from '../sceneGen';
import { seed } from './kit';

export type Era = 'early' | 'first' | 'breakthrough' | 'world' | 'stadium' | 'festival' | 'special' | 'recent' | 'current';
export type Accuracy = 'documented' | 'partial' | 'inspired';

export const ERA_LABEL: Record<Era, string> = {
  early: 'Early career',
  first: 'First tours',
  breakthrough: 'Breakthrough era',
  world: 'Major world tours',
  stadium: 'Stadium tours',
  festival: 'Festival performances',
  special: 'Special performances',
  recent: 'Recent tours',
  current: 'Current & newest',
};

export const ACCURACY_LABEL: Record<Accuracy, string> = {
  documented: 'Documented reconstruction',
  partial: 'Partially documented',
  inspired: 'Original inspired concept',
};

export const ACCURACY_HINT: Record<Accuracy, string> = {
  documented: 'Key structures modelled from published production details (designers, dimensions, set pieces). Simplified geometry — not a production drawing.',
  partial: 'Some elements are documented; the rest is an informed approximation. Uncertain details are noted.',
  inspired: 'Original design in the spirit of the era. Not a recreation of a real stage.',
};

export interface Source {
  label: string;
  url: string;
}

export interface Tour {
  id: string;
  artistId: string;
  title: string;
  year: number;
  yearLabel?: string;
  era: Era;
  accuracy: Accuracy;
  designers?: string;
  venueType: 'arena' | 'stadium' | 'theater' | 'festival' | 'special' | 'club';
  arenaId: string;
  description: string;
  features: string[];
  sources: Source[];
  palette: Palette;
  build: () => DesignSeed;
}

export interface ArchiveArtist {
  id: string;
  name: string;
  genre: string;
  origin: string;
  aesthetic: string;
}

type Make = () => { objects: StageObject[]; fixtures: Fixture[]; atmosphere?: DesignSeed['atmosphere'] };

export function tour(t: Omit<Tour, 'build'> & { make: Make }): Tour {
  const { make, ...rest } = t;
  return {
    ...rest,
    build: () => {
      const r = make();
      return seed(r.objects, r.fixtures, t.palette, r.atmosphere);
    },
  };
}
