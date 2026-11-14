import { RIHANNA, YE, DRAKE, KENDRICK, TRAVIS, BRUNO, WEEKND, TAYLOR, BEYONCE } from './tours1';
import { OTHER_TOURS } from './tours2';
import type { ArchiveArtist, Tour } from './types';

export * from './types';

const A = (id: string, name: string, genre: string, origin: string, aesthetic: string): ArchiveArtist => ({ id, name, genre, origin, aesthetic });

export const ARCHIVE_ARTISTS: ArchiveArtist[] = [
  A('rihanna', 'Rihanna', 'Pop / R&B', 'Barbados', 'Bold colour, fashion-led, high-gloss pop'),
  A('ye', 'Ye', 'Hip-hop', 'USA', 'Monolithic, minimalist, conceptual'),
  A('drake', 'Drake', 'Hip-hop / R&B', 'Canada', 'Arena-floor spectacle, in-the-round'),
  A('kendrick', 'Kendrick Lamar', 'Hip-hop', 'USA', 'Theatrical, cinematic, stripped-back'),
  A('travis', 'Travis Scott', 'Hip-hop', 'USA', 'Rage, fire, flying set pieces'),
  A('bruno', 'Bruno Mars', 'Pop / Funk', 'USA', 'Retro showband, gold and neon'),
  A('weeknd', 'The Weeknd', 'R&B / Pop', 'Canada', 'Dark cinematic cityscapes'),
  A('taylor', 'Taylor Swift', 'Pop', 'USA', 'Narrative eras, multi-act stadium'),
  A('beyonce', 'Beyoncé', 'Pop / R&B', 'USA', 'Monumental video, sculptural staging'),
  A('metallica', 'Metallica', 'Metal', 'USA', 'In-the-round towers, raw power'),
  A('edsheeran', 'Ed Sheeran', 'Pop', 'UK', 'Revolving centre stage, loop-pedal solo'),
  A('coldplay', 'Coldplay', 'Pop rock', 'UK', 'Colourful, cosmic, wristband light'),
  A('dua', 'Dua Lipa', 'Pop', 'UK', 'Kinetic rings, sleek dance pop'),
  A('gaga', 'Lady Gaga', 'Pop', 'USA', 'Gothic opera, avant-garde theatre'),
  A('billie', 'Billie Eilish', 'Alt pop', 'USA', 'Intimate in-the-round, LED floor'),
  A('olivia', 'Olivia Rodrigo', 'Pop rock', 'USA', 'Purple, playful, flying moon'),
  A('sabrina', 'Sabrina Carpenter', 'Pop', 'USA', 'Midcentury dollhouse, pink camp'),
  A('postmalone', 'Post Malone', 'Pop / Country', 'USA', 'Crowd-level platforms, roadside Americana'),
  A('badbunny', 'Bad Bunny', 'Reggaeton / Latin trap', 'Puerto Rico', 'Tropical islands, Puerto Rican landscape'),
  A('tyler', 'Tyler, the Creator', 'Hip-hop', 'USA', 'Character worlds, built sets'),
  A('charli', 'Charli XCX', 'Pop', 'UK', 'Brutalist, scaffold, club energy'),
  A('sza', 'SZA', 'R&B', 'USA', 'Ocean storytelling'),
  A('doja', 'Doja Cat', 'Pop / Hip-hop', 'USA', 'Horror camp, red and black'),
  A('ariana', 'Ariana Grande', 'Pop', 'USA', 'Celestial, soft, orbital'),
  A('bieber', 'Justin Bieber', 'Pop', 'Canada', 'Big-arena pop, glass and flying stages'),
  A('shawn', 'Shawn Mendes', 'Pop', 'Canada', 'Circular halo, rose motif'),
  A('pesopluma', 'Peso Pluma', 'Regional Mexican', 'Mexico', '360° centre stage, lasers'),
  A('karolg', 'Karol G', 'Reggaeton', 'Colombia', 'Mermaid blues to pink, stadium colour'),
  A('rosalia', 'Rosalía', 'Pop / Flamenco', 'Spain', 'White-box minimalism, live camera'),
  A('linkinpark', 'Linkin Park', 'Rock', 'USA', 'Cube canvases, centre stage'),
  A('bts', 'BTS', 'K-pop', 'South Korea', 'Stadium runways, themed sections'),
  A('blackpink', 'BLACKPINK', 'K-pop', 'South Korea', 'Black and pink duality'),
  A('straykids', 'Stray Kids', 'K-pop', 'South Korea', 'Pyro-heavy stadium runways'),
  A('jayz', 'Jay-Z', 'Hip-hop', 'USA', 'Centre stage, rotating cubes'),
  A('frank', 'Frank Ocean', 'R&B', 'USA', 'Sparse, enigmatic'),
  A('gambino', 'Childish Gambino', 'Hip-hop / Funk', 'USA', 'Projection, cinematic'),
  A('carti', 'Playboi Carti', 'Hip-hop', 'USA', 'Rage pit, strobes'),
  A('jcole', 'J. Cole', 'Hip-hop', 'USA', 'Warm, grounded'),
  A('wayne', 'Lil Wayne', 'Hip-hop', 'USA', 'New Orleans neon'),
  A('harry', 'Harry Styles', 'Pop', 'UK', 'Bright, rainbow, joyful'),
  A('ateez', 'ATEEZ', 'K-pop', 'South Korea', 'Pirate fantasy'),
  A('imaginedragons', 'Imagine Dragons', 'Pop rock', 'USA', 'Big drums, stadium rock'),
  A('foofighters', 'Foo Fighters', 'Rock', 'USA', 'Classic stadium rock'),
  A('tatemcrae', 'Tate McRae', 'Pop', 'Canada', 'Choreography-first'),
  A('hozier', 'Hozier', 'Folk rock', 'Ireland', 'Earthy, forest light'),
  A('lanadelrey', 'Lana Del Rey', 'Alt pop', 'USA', 'Dreamy Americana'),
];

export const ALL_TOURS: Tour[] = [...RIHANNA, ...YE, ...DRAKE, ...KENDRICK, ...TRAVIS, ...BRUNO, ...WEEKND, ...TAYLOR, ...BEYONCE, ...OTHER_TOURS];

export const TOUR_BY_ID = new Map(ALL_TOURS.map((t) => [t.id, t]));
export const ARTIST_BY_ID = new Map(ARCHIVE_ARTISTS.map((a) => [a.id, a]));
export const toursFor = (artistId: string) => ALL_TOURS.filter((t) => t.artistId === artistId).sort((a, b) => a.year - b.year);
