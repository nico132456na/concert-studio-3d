import * as THREE from 'three';
import type { TextureKind } from '../types';
import { rng } from '../util/misc';

/**
 * Procedural PBR texture sets (albedo detail, tangent-space normal, roughness), generated once on a canvas
 * and shared by every material that uses them (clones share the GPU upload).
 */
export interface PbrSet {
  map?: THREE.Texture;
  normal?: THREE.Texture;
  rough?: THREE.Texture;
  normalScale: number;
  /** metres covered by one texture tile */
  tile: number;
}

type Height = (x: number, y: number, s: number, r: () => number) => void;

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  return t;
}

/** Sobel normal map from a grayscale height canvas (wrapping). */
function normalFrom(h: HTMLCanvasElement, strength: number) {
  const s = h.width;
  const src = h.getContext('2d')!.getImageData(0, 0, s, s).data;
  const out = canvas(s);
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  const H = (x: number, y: number) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * strength;
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * s + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Draw a height field + optional albedo / roughness variation. */
function make(size: number, seed: number, height: (c: CanvasRenderingContext2D, s: number, r: () => number) => void, opts: { normal: number; albedo?: (c: CanvasRenderingContext2D, s: number, r: () => number, h: HTMLCanvasElement) => void; rough?: (c: CanvasRenderingContext2D, s: number, r: () => number, h: HTMLCanvasElement) => void; tile: number; normalScale?: number }): PbrSet {
  const r = rng(seed);
  const h = canvas(size);
  const hc = h.getContext('2d')!;
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, size, size);
  height(hc, size, r);
  const set: PbrSet = { normal: tex(normalFrom(h, opts.normal), false), normalScale: opts.normalScale ?? 1, tile: opts.tile };
  if (opts.albedo) {
    const a = canvas(size);
    const ac = a.getContext('2d')!;
    opts.albedo(ac, size, rng(seed + 1), h);
    set.map = tex(a, true);
  }
  if (opts.rough) {
    const g = canvas(size);
    const gc = g.getContext('2d')!;
    opts.rough(gc, size, rng(seed + 2), h);
    set.rough = tex(g, false);
  }
  return set;
}

/** Soft blotches for natural variation. */
function blotches(c: CanvasRenderingContext2D, s: number, r: () => number, n: number, light: number, dark: number, alpha = 0.08) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = s * (0.04 + r() * 0.18);
    const v = r() > 0.5 ? light : dark;
    for (const ox of [-s, 0, s])
      for (const oy of [-s, 0, s]) {
        const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        g.addColorStop(0, `rgba(${v},${v},${v},${alpha})`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        c.fillStyle = g;
        c.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
  }
}

function speckle(c: CanvasRenderingContext2D, s: number, r: () => number, n: number, lo: number, hi: number, a: number, maxSize = 2) {
  for (let i = 0; i < n; i++) {
    const v = lo + r() * (hi - lo);
    c.fillStyle = `rgba(${v},${v},${v},${a})`;
    const z = 0.6 + r() * maxSize;
    c.fillRect(r() * s, r() * s, z, z);
  }
}

const gray = (c: CanvasRenderingContext2D, s: number, v: number) => {
  c.fillStyle = `rgb(${v},${v},${v})`;
  c.fillRect(0, 0, s, s);
};

const cache = new Map<TextureKind, PbrSet | null>();

export function pbrSet(kind: TextureKind): PbrSet | null {
  if (kind === 'none') return null;
  if (cache.has(kind)) return cache.get(kind)!;
  let set: PbrSet | null = null;
  switch (kind) {
    case 'concrete':
      set = make(512, 11, (c, s, r) => {
        blotches(c, s, r, 40, 170, 90, 0.18);
        speckle(c, s, r, 26000, 60, 200, 0.5, 2.2);
        // small air pits
        for (let i = 0; i < 260; i++) {
          c.fillStyle = 'rgba(20,20,20,0.8)';
          c.beginPath();
          c.arc(r() * s, r() * s, 0.6 + r() * 1.6, 0, 7);
          c.fill();
        }
      }, {
        normal: 2.2,
        tile: 2.5,
        albedo: (c, s, r) => {
          gray(c, s, 210);
          blotches(c, s, r, 50, 245, 150, 0.22);
          speckle(c, s, r, 12000, 150, 245, 0.35);
        },
        rough: (c, s, r) => {
          gray(c, s, 230);
          blotches(c, s, r, 30, 255, 180, 0.25);
        },
      });
      break;
    case 'brushed':
      set = make(512, 21, (c, s, r) => {
        for (let i = 0; i < 2600; i++) {
          const v = 100 + r() * 60;
          c.fillStyle = `rgba(${v},${v},${v},0.5)`;
          c.fillRect(0, r() * s, s, 0.6 + r());
        }
      }, {
        normal: 0.9,
        tile: 1.2,
        normalScale: 0.35,
        rough: (c, s, r) => {
          gray(c, s, 150);
          for (let i = 0; i < 1800; i++) {
            const v = 110 + r() * 90;
            c.fillStyle = `rgba(${v},${v},${v},0.45)`;
            c.fillRect(0, r() * s, s, 1);
          }
        },
      });
      break;
    case 'wood':
      set = make(512, 31, (c, s, r) => {
        // planks 64px high with grain
        for (let y = 0; y < s; y += 64) {
          c.fillStyle = 'rgb(40,40,40)';
          c.fillRect(0, y, s, 2);
          const off = r() * s;
          c.fillRect(off, y, 2, 64);
        }
        for (let i = 0; i < 900; i++) {
          const y = r() * s;
          const v = 110 + r() * 40;
          c.strokeStyle = `rgba(${v},${v},${v},0.5)`;
          c.lineWidth = 0.6 + r();
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(s * 0.3, y + r() * 8 - 4, s * 0.6, y + r() * 8 - 4, s, y);
          c.stroke();
        }
      }, {
        normal: 1.4,
        tile: 2,
        albedo: (c, s, r) => {
          gray(c, s, 205);
          for (let y = 0; y < s; y += 64) {
            const v = 170 + r() * 70;
            c.fillStyle = `rgba(${v},${v * 0.92},${v * 0.82},0.6)`;
            c.fillRect(0, y, s, 64);
            c.fillStyle = 'rgba(40,25,15,0.7)';
            c.fillRect(0, y, s, 2);
          }
          for (let i = 0; i < 700; i++) {
            const y = r() * s;
            c.strokeStyle = `rgba(90,55,30,${0.06 + r() * 0.16})`;
            c.beginPath();
            c.moveTo(0, y);
            c.bezierCurveTo(s * 0.3, y + r() * 8 - 4, s * 0.6, y + r() * 8 - 4, s, y);
            c.stroke();
          }
        },
        rough: (c, s, r) => {
          gray(c, s, 190);
          speckle(c, s, r, 4000, 150, 230, 0.3);
        },
      });
      break;
    case 'fabric':
      set = make(256, 41, (c, s) => {
        for (let i = 0; i < s; i += 4) {
          c.fillStyle = 'rgba(200,200,200,0.55)';
          c.fillRect(i, 0, 2, s);
          c.fillStyle = 'rgba(60,60,60,0.45)';
          c.fillRect(0, i + 2, s, 2);
        }
      }, { normal: 1.2, tile: 0.5, albedo: (c, s, r) => { gray(c, s, 225); speckle(c, s, r, 3000, 180, 255, 0.3, 1); } });
      break;
    case 'pleat':
      // stage skirting: deep vertical pleats
      set = make(256, 45, (c, s) => {
        for (let x = 0; x < s; x++) {
          const v = 128 + Math.sin((x / s) * Math.PI * 2 * 8) * 90;
          c.fillStyle = `rgb(${v},${v},${v})`;
          c.fillRect(x, 0, 1, s);
        }
      }, { normal: 2.5, tile: 1.6, albedo: (c, s) => {
        for (let x = 0; x < s; x++) {
          const v = 190 + Math.sin((x / s) * Math.PI * 2 * 8) * 60;
          c.fillStyle = `rgb(${v},${v},${v})`;
          c.fillRect(x, 0, 1, s);
        }
      } });
      break;
    case 'grid':
      set = make(256, 51, (c, s) => {
        gray(c, s, 30);
        c.fillStyle = 'rgb(230,230,230)';
        for (let i = 0; i < s; i += 32) {
          c.fillRect(i, 0, 6, s);
          c.fillRect(0, i, s, 6);
        }
      }, { normal: 3, tile: 0.6, albedo: (c, s) => {
        gray(c, s, 25);
        c.fillStyle = 'rgb(220,220,220)';
        for (let i = 0; i < s; i += 32) {
          c.fillRect(i, 0, 6, s);
          c.fillRect(0, i, s, 6);
        }
      } });
      break;
    case 'diamond':
      set = make(256, 61, (c, s) => {
        c.fillStyle = 'rgb(230,230,230)';
        for (let y = 0; y < s; y += 32)
          for (let x = (y / 32) % 2 ? 16 : 0; x < s; x += 32) {
            c.save();
            c.translate(x + 8, y + 8);
            c.rotate(Math.PI / 4);
            c.fillRect(-10, -3, 20, 6);
            c.restore();
          }
      }, { normal: 2.5, tile: 0.5 });
      break;
    case 'carbon':
      set = make(256, 71, (c, s) => {
        for (let y = 0; y < s; y += 16)
          for (let x = 0; x < s; x += 16) {
            const g = c.createLinearGradient(x, y, ((x + y) / 16) % 2 ? x + 16 : x, ((x + y) / 16) % 2 ? y : y + 16);
            g.addColorStop(0, '#404040');
            g.addColorStop(1, '#c0c0c0');
            c.fillStyle = g;
            c.fillRect(x, y, 16, 16);
          }
      }, { normal: 0.8, tile: 0.3, albedo: (c, s) => {
        for (let y = 0; y < s; y += 16)
          for (let x = 0; x < s; x += 16) {
            c.fillStyle = ((x + y) / 16) % 2 ? '#8a8a8a' : '#d0d0d0';
            c.fillRect(x, y, 16, 16);
          }
      } });
      break;
    case 'paint':
      // painted metal / powder coat: faint orange-peel
      set = make(256, 81, (c, s, r) => {
        speckle(c, s, r, 9000, 90, 170, 0.35, 3);
      }, { normal: 0.6, tile: 0.8, normalScale: 0.5, rough: (c, s, r) => { gray(c, s, 200); speckle(c, s, r, 5000, 160, 240, 0.4); } });
      break;
    case 'plastic':
      set = make(256, 91, (c, s, r) => speckle(c, s, r, 14000, 100, 160, 0.4, 1), { normal: 0.5, tile: 0.4, normalScale: 0.4 });
      break;
    case 'deck':
      // stage deck: 2.44 x 1.22 m panels with seams and wear
      set = make(512, 101, (c, s, r) => {
        blotches(c, s, r, 20, 150, 110, 0.12);
        c.fillStyle = 'rgb(10,10,10)';
        c.fillRect(0, 0, s, 3);
        c.fillRect(0, s / 2, s, 3);
        c.fillRect(0, 0, 3, s);
        // screw heads
        c.fillStyle = 'rgb(60,60,60)';
        for (const y of [8, s / 2 - 8, s / 2 + 10, s - 8]) for (let x = 12; x < s; x += 62) c.fillRect(x, y, 3, 3);
      }, {
        normal: 2.2,
        tile: 2.44,
        albedo: (c, s, r) => {
          gray(c, s, 225);
          blotches(c, s, r, 40, 255, 170, 0.18);
          c.fillStyle = 'rgba(0,0,0,0.6)';
          c.fillRect(0, 0, s, 3);
          c.fillRect(0, s / 2, s, 3);
          c.fillRect(0, 0, 3, s);
        },
        rough: (c, s, r) => {
          gray(c, s, 170);
          blotches(c, s, r, 50, 240, 110, 0.25);
        },
      });
      break;
  }
  cache.set(kind, set);
  return set;
}

/** Per-object clone of a texture tiled to the object's real size (clones share the uploaded image). */
export function tiled(t: THREE.Texture | undefined, rx: number, ry: number) {
  if (!t) return null;
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}
