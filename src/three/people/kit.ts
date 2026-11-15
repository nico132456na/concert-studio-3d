import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import maleUrl from '../../assets/people/ubc-male.glb?url';
import femaleUrl from '../../assets/people/ubc-female.glb?url';
import hairUrl from '../../assets/people/ubc-hair.glb?url';
import anim1Url from '../../assets/people/ual1-anims.glb?url';
import anim2Url from '../../assets/people/ual2-anims.glb?url';
import maleLightUrl from '../../assets/people/skin-male-light.jpg?url';
import femaleLightUrl from '../../assets/people/skin-female-light.jpg?url';

/**
 * Realistic people from Quaternius CC0 packs (Universal Base Characters + Universal Animation Library).
 * Loaded once and shared; each person is a SkeletonUtils clone with its own materials.
 */

export type Body = 'male' | 'female';

export interface PeopleKit {
  bodies: Record<Body, GLTF>;
  hair: Record<string, THREE.Mesh>;
  clips: Record<Body, Record<string, THREE.AnimationClip>>;
  skinLight: Record<Body, THREE.Texture>;
  /** rest-pose world position of each body's head bone (hair is modelled for the female head) */
  headRest: Record<Body, THREE.Vector3>;
}

let promise: Promise<PeopleKit> | null = null;
export let kit: PeopleKit | null = null;

const loader = new GLTFLoader();
const load = (url: string) => loader.loadAsync(url);

function restPelvis(root: THREE.Object3D) {
  const p = root.getObjectByName('pelvis');
  return p ? p.position.clone() : new THREE.Vector3(0, 0.95, 0);
}

/** Keep bone rotations; scale the pelvis translation to the target body; drop per-bone translation/scale (proportions). */
function fitClips(clips: THREE.AnimationClip[], animPelvis: THREE.Vector3, bodyPelvis: THREE.Vector3) {
  const k = bodyPelvis.length() / Math.max(1e-4, animPelvis.length());
  const out: Record<string, THREE.AnimationClip> = {};
  for (const c of clips) {
    const tracks: THREE.KeyframeTrack[] = [];
    for (const t of c.tracks) {
      const [node, prop] = t.name.split('.');
      if (node === 'root') continue;
      if (prop === 'quaternion') tracks.push(t);
      else if (prop === 'position' && node === 'pelvis') {
        const v = t.clone();
        for (let i = 0; i < v.values.length; i++) v.values[i] *= k;
        tracks.push(v);
      }
    }
    out[c.name] = new THREE.AnimationClip(c.name, c.duration, tracks);
  }
  return out;
}

export function loadPeople(): Promise<PeopleKit> {
  if (promise) return promise;
  promise = (async () => {
    const [male, female, hair, a1, a2] = await Promise.all([load(maleUrl), load(femaleUrl), load(hairUrl), load(anim1Url), load(anim2Url)]);
    const tl = new THREE.TextureLoader();
    const [ml, fl] = await Promise.all([tl.loadAsync(maleLightUrl), tl.loadAsync(femaleLightUrl)]);
    for (const t of [ml, fl]) {
      t.flipY = false; // glTF texture convention
      t.colorSpace = THREE.SRGBColorSpace;
    }
    const animPelvis = restPelvis(a1.scene);
    const allClips = [...a1.animations, ...a2.animations];
    const hairMeshes: Record<string, THREE.Mesh> = {};
    hair.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) hairMeshes[o.name.replace(/_\d+$/, '')] = o as THREE.Mesh;
    });
    const headRest = {} as Record<Body, THREE.Vector3>;
    for (const [b, g] of [['male', male], ['female', female]] as const) {
      g.scene.updateMatrixWorld(true);
      const h = g.scene.getObjectByName('Head');
      headRest[b] = h ? h.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.65, 0);
    }
    kit = {
      bodies: { male, female },
      hair: hairMeshes,
      clips: { male: fitClips(allClips, animPelvis, restPelvis(male.scene)), female: fitClips(allClips, animPelvis, restPelvis(female.scene)) },
      skinLight: { male: ml, female: fl },
      headRest,
    };
    return kit;
  })();
  promise.catch(() => {
    promise = null;
  });
  return promise;
}
