import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { AvatarLook } from '../types';
import { player } from '../performer/state';

const noRay = () => null;

function Mat({ color, rough = 0.7, metal = 0 }: { color: string; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;
}

/**
 * Original procedural performer avatar. Limbs are separate pivots so walking, running,
 * dancing, waving, pointing and jumping are animated procedurally (no external assets).
 */
/** Anything an avatar can be driven by (the player, or an NPC). */
export interface AvatarDriver {
  pos: THREE.Vector3;
  yaw: number;
  speed: number;
  action: typeof player.action;
  actionT: number;
  phase: number;
  onGround: boolean;
}

export function makeDriver(x = 0, z = 0, yaw = 0): AvatarDriver {
  return { pos: new THREE.Vector3(x, 0, z), yaw, speed: 0, action: 'none', actionT: 0, phase: Math.random() * 6, onGround: true };
}

export function Avatar({ look, followPlayer = true, driver }: { look: AvatarLook; followPlayer?: boolean; driver?: AvatarDriver }) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const shinL = useRef<THREE.Group>(null);
  const shinR = useRef<THREE.Group>(null);

  const longSleeves = look.top === 'hoodie' || look.top === 'jacket' || look.top === 'suit';
  const sleeve = look.top === 'tank' ? look.skin : look.topColor;
  const forearm = longSleeves ? look.topColor : look.skin;
  const shin = look.bottom === 'shorts' ? look.skin : look.bottomColor;
  const hand = look.gloves ? '#111111' : look.skin;
  const t = useRef(0);

  const hair = useMemo(() => {
    const c = look.hairColor;
    switch (look.hair) {
      case 'bald':
        return null;
      case 'buzz':
        return <mesh position={[0, 0.03, 0]} raycast={noRay}><sphereGeometry args={[0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} /><Mat color={c} rough={1} /></mesh>;
      case 'long':
        return (
          <group>
            <mesh position={[0, 0.03, 0]} raycast={noRay}><sphereGeometry args={[0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} /><Mat color={c} /></mesh>
            <mesh position={[0, -0.15, -0.07]} raycast={noRay}><boxGeometry args={[0.28, 0.36, 0.12]} /><Mat color={c} /></mesh>
          </group>
        );
      case 'curly':
        return (
          <group>
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return <mesh key={i} position={[Math.cos(a) * 0.12, 0.06 + (i % 2) * 0.04, Math.sin(a) * 0.12 - 0.02]} raycast={noRay}><sphereGeometry args={[0.065, 8, 6]} /><Mat color={c} rough={1} /></mesh>;
            })}
            <mesh position={[0, 0.11, -0.01]} raycast={noRay}><sphereGeometry args={[0.12, 10, 8]} /><Mat color={c} rough={1} /></mesh>
          </group>
        );
      case 'braids':
        return (
          <group>
            <mesh position={[0, 0.03, 0]} raycast={noRay}><sphereGeometry args={[0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={c} /></mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} position={[-0.11 + i * 0.032, -0.14, -0.1]} raycast={noRay}><cylinderGeometry args={[0.014, 0.014, 0.34, 6]} /><Mat color={c} /></mesh>
            ))}
          </group>
        );
      case 'bun':
        return (
          <group>
            <mesh position={[0, 0.03, 0]} raycast={noRay}><sphereGeometry args={[0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={c} /></mesh>
            <mesh position={[0, 0.16, -0.07]} raycast={noRay}><sphereGeometry args={[0.07, 10, 8]} /><Mat color={c} /></mesh>
          </group>
        );
      default:
        return <mesh position={[0, 0.035, -0.005]} raycast={noRay}><sphereGeometry args={[0.142, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9]} /><Mat color={c} rough={0.9} /></mesh>;
    }
  }, [look.hair, look.hairColor]);

  useFrame((_, dt) => {
    t.current += dt;
    const p = driver ?? player;
    if (driver) driver.actionT += dt;
    if (followPlayer && root.current) {
      root.current.position.copy(p.pos);
      root.current.rotation.y = p.yaw;
    }
    const s = followPlayer ? Math.min(1.6, p.speed) : 0;
    p.phase += dt * (s > 0.05 ? 6 + s * 4 : 0);
    const ph = p.phase;
    const run = Math.max(0, s - 1);
    const a = followPlayer ? p.action : 'dance';
    const at = followPlayer ? p.actionT : t.current;
    const swing = Math.sin(ph) * (0.55 * Math.min(1, s) + run * 0.35);
    let armLx = -swing * 0.9, armRx = swing * 0.9, armLz = 0.08, armRz = -0.08;
    let foreLx = -0.25 - run * 0.8, foreRx = -0.25 - run * 0.8;
    let hipY = 0.95 + Math.abs(Math.sin(ph)) * 0.04 * s;
    let lean = run * 0.18;
    let twist = 0;
    const breathe = Math.sin(t.current * 2) * 0.01;
    if (s < 0.05) {
      if (a === 'dance') {
        const b = t.current * 7.5;
        hipY = 0.93 + Math.abs(Math.sin(b)) * 0.07;
        armLz = 0.5 + Math.sin(b) * 0.9;
        armRz = -0.5 - Math.cos(b) * 0.9;
        armLx = -1.2 + Math.sin(b * 0.5) * 0.6;
        armRx = -1.2 - Math.sin(b * 0.5) * 0.6;
        twist = Math.sin(b * 0.5) * 0.35;
      } else if (a === 'wave') {
        armRz = -2.7;
        foreRx = 0;
        armRx = 0;
        if (foreR.current) foreR.current.rotation.z = Math.sin(at * 12) * 0.5;
      } else if (a === 'handsUp') {
        armLz = 2.75 + Math.sin(at * 6) * 0.1;
        armRz = -2.75 - Math.sin(at * 6) * 0.1;
        foreLx = foreRx = 0;
        armLx = armRx = 0;
      } else if (a === 'point') {
        armRx = -1.55;
        foreRx = 0;
        armRz = -0.1;
      } else if (a === 'bow') {
        lean = 0.9 * Math.min(1, Math.sin(Math.min(at, 2.4) * 1.3));
      }
    }
    if (!followPlayer || p.onGround === false) {
      // airborne: tuck legs a little
    }
    if (hips.current) {
      hips.current.position.y = hipY + breathe;
      hips.current.rotation.y = twist;
    }
    if (torso.current) torso.current.rotation.x = lean;
    if (head.current) head.current.rotation.x = -lean * 0.5;
    const air = followPlayer && !p.onGround ? 1 : 0;
    if (legL.current) legL.current.rotation.x = swing * 1.0 - air * 0.5;
    if (legR.current) legR.current.rotation.x = -swing * 1.0 - air * 0.3;
    if (shinL.current) shinL.current.rotation.x = Math.max(0, -Math.sin(ph)) * (0.9 * Math.min(1, s) + run * 0.6) + air * 0.8;
    if (shinR.current) shinR.current.rotation.x = Math.max(0, Math.sin(ph)) * (0.9 * Math.min(1, s) + run * 0.6) + air * 0.6;
    if (armL.current) armL.current.rotation.set(armLx, 0, -armLz);
    if (armR.current) armR.current.rotation.set(armRx, 0, -armRz);
    if (foreL.current) foreL.current.rotation.x = foreLx;
    if (foreR.current) foreR.current.rotation.x = foreRx;
    if (a === 'wave' && s < 0.05) {
      /* forearm wave set above */
    } else if (foreR.current) foreR.current.rotation.z = 0;
  });

  const sc = look.height;
  const legLen = 0.46;
  return (
    <group ref={root} scale={[sc, sc, sc]}>
      <group ref={hips} position={[0, 0.95, 0]}>
        {/* pelvis */}
        <mesh position={[0, -0.02, 0]} raycast={noRay}><boxGeometry args={[0.32, 0.16, 0.2]} /><Mat color={look.bottomColor} /></mesh>
        {look.bottom === 'skirt' && <mesh position={[0, -0.2, 0]} raycast={noRay}><coneGeometry args={[0.3, 0.45, 12, 1, true]} /><meshStandardMaterial color={look.bottomColor} side={THREE.DoubleSide} /></mesh>}
        {/* legs */}
        {[
          [legL, shinL, -0.09],
          [legR, shinR, 0.09],
        ].map(([leg, sh, x], i) => (
          <group key={i} ref={leg as React.RefObject<THREE.Group>} position={[x as number, -0.06, 0]}>
            <mesh position={[0, -legLen / 2, 0]} raycast={noRay}><capsuleGeometry args={[0.072, legLen - 0.1, 4, 8]} /><Mat color={look.bottomColor} /></mesh>
            <group ref={sh as React.RefObject<THREE.Group>} position={[0, -legLen, 0]}>
              <mesh position={[0, -0.22, 0]} raycast={noRay}><capsuleGeometry args={[0.062, 0.34, 4, 8]} /><Mat color={shin} /></mesh>
              <mesh position={[0, -0.46, 0.05]} raycast={noRay}><boxGeometry args={[0.12, 0.09, 0.28]} /><Mat color={look.shoes} rough={0.5} /></mesh>
            </group>
          </group>
        ))}
        {/* torso */}
        <group ref={torso} position={[0, 0.05, 0]}>
          <mesh position={[0, 0.27, 0]} raycast={noRay}><capsuleGeometry args={[0.17, 0.3, 4, 12]} /><Mat color={look.topColor} rough={look.top === 'jacket' ? 0.4 : 0.8} metal={look.top === 'jacket' ? 0.1 : 0} /></mesh>
          {look.top === 'suit' && <mesh position={[0, 0.36, 0.165]} raycast={noRay}><boxGeometry args={[0.1, 0.24, 0.02]} /><Mat color="#f2f2f2" /></mesh>}
          {look.top === 'jacket' && <mesh position={[0, 0.3, 0.17]} raycast={noRay}><boxGeometry args={[0.06, 0.38, 0.02]} /><Mat color="#2a2a2a" /></mesh>}
          {look.top === 'hoodie' && <mesh position={[0, 0.52, -0.08]} rotation={[0.4, 0, 0]} raycast={noRay}><torusGeometry args={[0.13, 0.05, 6, 16]} /><Mat color={look.topColor} /></mesh>}
          {look.top === 'jersey' && <mesh position={[0, 0.28, 0.172]} raycast={noRay}><boxGeometry args={[0.2, 0.2, 0.01]} /><Mat color="#ffffff" /></mesh>}
          {look.chain && <mesh position={[0, 0.47, 0.06]} rotation={[1.2, 0, 0]} raycast={noRay}><torusGeometry args={[0.1, 0.012, 6, 20]} /><Mat color="#d9a740" metal={1} rough={0.2} /></mesh>}
          {/* arms */}
          {[
            [armL, foreL, -0.22],
            [armR, foreR, 0.22],
          ].map(([arm, fore, x], i) => (
            <group key={i} ref={arm as React.RefObject<THREE.Group>} position={[x as number, 0.49, 0]}>
              <mesh position={[0, -0.15, 0]} raycast={noRay}><capsuleGeometry args={[0.058, 0.2, 4, 8]} /><Mat color={sleeve} /></mesh>
              <group ref={fore as React.RefObject<THREE.Group>} position={[0, -0.3, 0]}>
                <mesh position={[0, -0.13, 0]} raycast={noRay}><capsuleGeometry args={[0.05, 0.18, 4, 8]} /><Mat color={forearm} /></mesh>
                <mesh position={[0, -0.28, 0]} raycast={noRay}><sphereGeometry args={[0.055, 8, 6]} /><Mat color={hand} /></mesh>
              </group>
            </group>
          ))}
          {/* head */}
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh position={[0, -0.04, 0]} raycast={noRay}><cylinderGeometry args={[0.05, 0.06, 0.08, 8]} /><Mat color={look.skin} /></mesh>
            <group position={[0, 0.1, 0]}>
              <mesh raycast={noRay}><sphereGeometry args={[0.13, 20, 14]} /><Mat color={look.skin} rough={0.6} /></mesh>
              <mesh position={[-0.045, 0.02, 0.118]} raycast={noRay}><sphereGeometry args={[0.014, 6, 4]} /><Mat color="#111" /></mesh>
              <mesh position={[0.045, 0.02, 0.118]} raycast={noRay}><sphereGeometry args={[0.014, 6, 4]} /><Mat color="#111" /></mesh>
              {hair}
              {look.glasses && <mesh position={[0, 0.02, 0.122]} raycast={noRay}><boxGeometry args={[0.2, 0.045, 0.02]} /><Mat color="#050505" rough={0.1} metal={0.6} /></mesh>}
              {look.cap && (
                <group position={[0, 0.06, 0]}>
                  <mesh raycast={noRay}><sphereGeometry args={[0.145, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={look.topColor === '#111111' ? '#d9a740' : '#111111'} /></mesh>
                  <mesh position={[0, 0, 0.13]} raycast={noRay}><boxGeometry args={[0.2, 0.015, 0.14]} /><Mat color={look.topColor === '#111111' ? '#d9a740' : '#111111'} /></mesh>
                </group>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
