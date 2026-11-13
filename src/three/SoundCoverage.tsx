import { useMemo } from 'react';
import * as THREE from 'three';
import type { ObjectKind, StageObject } from '../types';
import { AUDIO_KINDS, DEF_BY_ID, OBJECT_DEF } from '../data/library';
import { useProject } from '../state/projectStore';
import { useUI } from '../state/uiStore';

/** Approximate throw (m), horizontal dispersion (deg) and role color per speaker type. */
export function coverageOf(o: StageObject): { range: number; angle: number; color: string; role: string } | null {
  if (!AUDIO_KINDS.has(o.kind)) return null;
  const base = OBJECT_DEF[o.kind];
  const scale = Math.sqrt(Math.max(0.2, o.size[1] / (base?.size[1] ?? 1)));
  const t: Partial<Record<ObjectKind, [number, number, string, string]>> = {
    lineArray: [75, 100, '#4da3ff', 'Main PA'],
    groundStack: [32, 90, '#3ddc84', 'Ground stack / side fill'],
    speakerCab: [12, 90, '#ffd166', 'Front fill / near field'],
    wedgeMonitor: [4, 60, '#ff7a1a', 'Stage monitor'],
    subwoofer: [30, 360, '#b07aff', 'Low end (omni)'],
    speakerTower: [30, 90, '#3ddc84', 'Pole PA'],
    delayTower: [45, 80, '#ff5fa2', 'Delay'],
  };
  const r = t[o.kind];
  if (!r) return null;
  return { range: r[0] * scale, angle: r[1], color: r[2], role: r[3] };
}

const vert = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = `uniform vec3 uColor; uniform float uRange; varying vec2 vP;
void main(){ float d = length(vP) / uRange; float a = pow(clamp(1.0 - d, 0.0, 1.0), 0.8) * 0.32;
  float rings = smoothstep(0.03, 0.0, abs(fract(d * 4.0) - 0.5) - 0.47) * 0.25;
  gl_FragColor = vec4(uColor * (a + rings * (1.0 - d)), 1.0); }`;

function Sector({ o }: { o: StageObject }) {
  const c = coverageOf(o)!;
  const { geo, mat } = useMemo(() => {
    const a = THREE.MathUtils.degToRad(Math.min(359.9, c.angle));
    const geo = new THREE.CircleGeometry(c.range, 48, -Math.PI / 2 - a / 2, a);
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color(c.color) }, uRange: { value: c.range } } });
    return { geo, mat };
  }, [c.range, c.angle, c.color]);
  return (
    <group position={[o.pos[0], 0.08, o.pos[2]]} rotation={[0, o.rot[1], 0]}>
      <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={3} />
    </group>
  );
}

export function SoundCoverage() {
  const objects = useProject((s) => s.project?.objects);
  const show = useUI((s) => s.showCoverage);
  const selection = useUI((s) => s.selection);
  const list = useMemo(() => (objects ?? []).filter((o) => AUDIO_KINDS.has(o.kind) && !o.hidden), [objects]);
  const selAudio = list.filter((o) => selection.includes(o.id));
  const visible = show ? list : selAudio;
  if (!visible.length) return null;
  void DEF_BY_ID;
  return (
    <group>
      {visible.map((o) => (
        <Sector key={o.id} o={o} />
      ))}
    </group>
  );
}
