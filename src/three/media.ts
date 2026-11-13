import * as THREE from 'three';
import { useEffect, useState } from 'react';
import { getMedia } from '../storage/db';

interface Entry {
  tex: THREE.Texture;
  url: string;
  video?: HTMLVideoElement;
  users: number;
}

const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry | null>>();

async function load(id: string, type: 'image' | 'video'): Promise<Entry | null> {
  const blob = await getMedia(id).catch(() => undefined);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  if (type === 'video') {
    const v = document.createElement('video');
    v.src = url;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.crossOrigin = 'anonymous';
    v.play().catch(() => {
      /* autoplay may need a tap; resumed on next interaction */
      const resume = () => {
        v.play().catch(() => {});
        window.removeEventListener('pointerdown', resume);
      };
      window.addEventListener('pointerdown', resume);
    });
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, url, video: v, users: 0 };
  }
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, url, users: 0 };
}

/** Loads an uploaded image/video (stored in IndexedDB) as a texture, ref-counted. */
export function useMediaTexture(id: string | undefined, type: 'image' | 'video' | undefined) {
  const [tex, setTex] = useState<THREE.Texture | null>(() => (id ? entries.get(id)?.tex ?? null : null));
  useEffect(() => {
    if (!id || !type) {
      setTex(null);
      return;
    }
    let alive = true;
    let entry = entries.get(id);
    const use = (e: Entry) => {
      e.users++;
      entry = e;
      if (alive) setTex(e.tex);
    };
    if (entry) use(entry);
    else {
      let p = pending.get(id);
      if (!p) {
        p = load(id, type).then((e) => {
          if (e) entries.set(id, e);
          pending.delete(id);
          return e;
        });
        pending.set(id, p);
      }
      p.then((e) => e && use(e));
    }
    return () => {
      alive = false;
      const e = entries.get(id);
      if (e && entry === e) {
        e.users--;
        if (e.users <= 0) {
          setTimeout(() => {
            if (e.users <= 0) {
              e.video?.pause();
              e.tex.dispose();
              URL.revokeObjectURL(e.url);
              entries.delete(id);
            }
          }, 3000);
        }
      }
    };
  }, [id, type]);
  return tex;
}
