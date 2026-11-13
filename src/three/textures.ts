import * as THREE from 'three';
import type { TextureKind } from '../types';
import { rng } from '../util/misc';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, color = true): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Grayscale detail maps multiplied with the material color. */
export function detailTexture(kind: TextureKind): THREE.Texture | null {
  if (kind === 'none') return null;
  const r = rng(kind.length * 991);
  switch (kind) {
    case 'brushed':
      return canvasTex('brushed', 256, (c, s) => {
        c.fillStyle = '#d8d8d8';
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < 1400; i++) {
          const v = 180 + r() * 75;
          c.fillStyle = `rgba(${v},${v},${v},0.35)`;
          c.fillRect(0, r() * s, s, 1);
        }
      });
    case 'concrete':
      return canvasTex('concrete', 256, (c, s) => {
        c.fillStyle = '#cfcfcf';
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < 9000; i++) {
          const v = 150 + r() * 105;
          c.fillStyle = `rgba(${v},${v},${v},0.5)`;
          const z = r() * 3;
          c.fillRect(r() * s, r() * s, z, z);
        }
      });
    case 'wood':
      return canvasTex('wood', 256, (c, s) => {
        c.fillStyle = '#c9a27a';
        c.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 32) {
          c.fillStyle = 'rgba(80,50,30,0.5)';
          c.fillRect(0, y, s, 1.5);
        }
        for (let i = 0; i < 300; i++) {
          c.strokeStyle = `rgba(90,60,35,${0.08 + r() * 0.15})`;
          c.beginPath();
          const y = r() * s;
          c.moveTo(0, y);
          c.bezierCurveTo(s * 0.3, y + r() * 6 - 3, s * 0.6, y + r() * 6 - 3, s, y);
          c.stroke();
        }
      });
    case 'fabric':
      return canvasTex('fabric', 128, (c, s) => {
        c.fillStyle = '#bdbdbd';
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < s; i += 2) {
          c.fillStyle = 'rgba(255,255,255,0.12)';
          c.fillRect(i, 0, 1, s);
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(0, i, s, 1);
        }
      });
    case 'grid':
      return canvasTex('grid', 128, (c, s) => {
        c.fillStyle = '#202020';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#d0d0d0';
        for (let i = 0; i < s; i += 16) {
          c.fillRect(i, 0, 3, s);
          c.fillRect(0, i, s, 3);
        }
      });
    case 'diamond':
      return canvasTex('diamond', 128, (c, s) => {
        c.fillStyle = '#9a9a9a';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#d6d6d6';
        for (let y = 0; y < s; y += 16)
          for (let x = (y / 16) % 2 ? 8 : 0; x < s; x += 16) {
            c.save();
            c.translate(x + 4, y + 4);
            c.rotate(Math.PI / 4);
            c.fillRect(-5, -1.5, 10, 3);
            c.restore();
          }
      });
    case 'carbon':
      return canvasTex('carbon', 64, (c, s) => {
        for (let y = 0; y < s; y += 8)
          for (let x = 0; x < s; x += 8) {
            const g = c.createLinearGradient(x, y, x + 8, y + 8);
            const flip = ((x + y) / 8) % 2;
            g.addColorStop(0, flip ? '#555' : '#999');
            g.addColorStop(1, flip ? '#999' : '#555');
            c.fillStyle = g;
            c.fillRect(x, y, 8, 8);
          }
      });
  }
  return null;
}

export function grassTexture() {
  return canvasTex('grass', 256, (c, s) => {
    const r = rng(7);
    c.fillStyle = '#5f7a4a';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) {
      const g = 90 + r() * 80;
      c.fillStyle = `rgba(${g * 0.6},${g},${g * 0.5},0.5)`;
      c.fillRect(r() * s, r() * s, 1, 2 + r() * 3);
    }
  });
}

export function pitchTexture() {
  return canvasTex('pitch', 256, (c, s) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#3f6e33' : '#4a7c3c';
      c.fillRect(0, (i * s) / 8, s, s / 8);
    }
  });
}

export function floorTexture() {
  return canvasTex('floorpanel', 256, (c, s) => {
    c.fillStyle = '#b0b0b0';
    c.fillRect(0, 0, s, s);
    const r = rng(3);
    for (let i = 0; i < 3000; i++) {
      const v = 140 + r() * 80;
      c.fillStyle = `rgba(${v},${v},${v},0.35)`;
      c.fillRect(r() * s, r() * s, 2, 2);
    }
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 0, s, 2);
    c.fillRect(0, 0, 2, s);
  });
}

export function glowTexture() {
  return canvasTex(
    'glow',
    128,
    (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.2, 'rgba(255,255,255,0.6)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    },
    false,
  );
}

export function smokeTexture() {
  return canvasTex(
    'smoke',
    128,
    (c, s) => {
      const r = rng(11);
      for (let i = 0; i < 30; i++) {
        const x = s / 2 + (r() - 0.5) * s * 0.4;
        const y = s / 2 + (r() - 0.5) * s * 0.4;
        const rad = s * (0.15 + r() * 0.25);
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
      }
    },
    false,
  );
}

const textCache = new Map<string, THREE.CanvasTexture>();
export function textTexture(text: string): THREE.Texture {
  const key = text.slice(0, 80);
  const hit = textCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, 1024, 256);
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let size = 170;
  c.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`;
  while (c.measureText(key).width > 960 && size > 30) {
    size -= 8;
    c.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`;
  }
  c.fillText(key || ' ', 512, 134);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (textCache.size > 30) {
    const first = textCache.keys().next().value as string;
    textCache.get(first)?.dispose();
    textCache.delete(first);
  }
  textCache.set(key, t);
  return t;
}
