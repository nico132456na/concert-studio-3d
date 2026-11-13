import * as THREE from 'three';
import { useEffect, useState } from 'react';
import { DEF_BY_ID, type ObjectDef } from '../data/library';
import { getGeometry, ledWholeSurface } from './geometry';
import { mat } from '../data/materials';

/** Renders small 3D previews of library items with one shared offscreen renderer. */
const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let queue: string[] = [];
let renderer: THREE.WebGLRenderer | null = null;
let running = false;

function setup() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(128, 128, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
}

function renderOne(def: ObjectDef): string {
  if (!renderer) setup();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e6ecff', '#3a3a44', 2.6));
  const key = new THREE.DirectionalLight('#ffffff', 3.6);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7aa8ff', 1.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const geo = getGeometry(def.kind, def.size);
  const spec = mat(def.material);
  const isLed = !!def.led;
  const m = new THREE.MeshStandardMaterial({
    color: isLed && ledWholeSurface(def.kind) ? '#111' : new THREE.Color(spec.color).getHSL({ h: 0, s: 0, l: 0 }).l < 0.15 ? '#4a4d55' : spec.color,
    metalness: spec.metalness,
    roughness: Math.max(0.15, spec.roughness),
    emissive: isLed ? '#5a6bff' : spec.emissive,
    emissiveIntensity: isLed ? (ledWholeSurface(def.kind) ? 1.2 : 0.2) : spec.emissiveIntensity,
    transparent: spec.opacity < 1,
    opacity: Math.max(0.4, spec.opacity),
    side: THREE.DoubleSide,
  });
  if (spec.metalness > 0.5) m.color.multiplyScalar(0.8);
  const mesh = new THREE.Mesh(geo.main, m);
  const s = def.size;
  const k = 1 / Math.max(s[0], s[1], s[2]);
  mesh.scale.set(s[0] * k, s[1] * k, s[2] * k);
  mesh.position.y = -0.5 * s[1] * k;
  scene.add(mesh);
  if (geo.screen) {
    const sc = new THREE.Mesh(geo.screen, new THREE.MeshBasicMaterial({ color: '#6a5cff', toneMapped: false }));
    sc.scale.copy(mesh.scale);
    sc.position.copy(mesh.position);
    scene.add(sc);
  }
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(1.45, 1.05, 2.0);
  cam.lookAt(0, 0, 0);
  renderer!.setClearColor(0x000000, 0);
  renderer!.render(scene, cam);
  const url = renderer!.domElement.toDataURL('image/png');
  m.dispose();
  return url;
}

function pump() {
  if (running) return;
  running = true;
  const step = () => {
    const batch = queue.splice(0, 6);
    for (const id of batch) {
      const def = DEF_BY_ID[id];
      if (!def || cache.has(id)) continue;
      try {
        cache.set(id, renderOne(def));
      } catch {
        cache.set(id, '');
      }
    }
    listeners.forEach((l) => l());
    if (queue.length) requestAnimationFrame(step);
    else {
      running = false;
      // free the extra WebGL context once everything is cached
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
    }
  };
  requestAnimationFrame(step);
}

export function useThumbnail(defId: string): string | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    if (cache.has(defId)) return;
    const l = () => cache.has(defId) && force((n) => n + 1);
    listeners.add(l);
    if (!queue.includes(defId)) queue.push(defId);
    pump();
    return () => {
      listeners.delete(l);
    };
  }, [defId]);
  return cache.get(defId) || undefined;
}
