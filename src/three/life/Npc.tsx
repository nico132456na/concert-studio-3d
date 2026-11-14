import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AvatarLook } from '../../types';
import { Avatar, makeDriver, type AvatarDriver } from '../Avatar';
import { player } from '../../performer/state';
import { DEFAULT_LOOK } from '../../performer/state';

export const NPC_LOOKS: Record<string, AvatarLook> = {
  manager: { ...DEFAULT_LOOK, skin: '#e0b08a', hair: 'short', hairColor: '#4a2e1a', top: 'suit', topColor: '#2a2f3a', bottom: 'suit', bottomColor: '#2a2f3a', shoes: '#111111', glasses: true, chain: false, cap: false, gloves: false, height: 1 },
  assistant: { ...DEFAULT_LOOK, skin: '#9a6340', hair: 'bun', hairColor: '#1a1410', top: 'jacket', topColor: '#d9a740', bottom: 'jeans', bottomColor: '#20283a', shoes: '#f2f2f2', glasses: false, chain: false, cap: false, gloves: false, height: 0.95 },
  security: { ...DEFAULT_LOOK, skin: '#6b4128', hair: 'buzz', hairColor: '#111111', top: 'suit', topColor: '#0b0b0d', bottom: 'suit', bottomColor: '#0b0b0d', shoes: '#0b0b0d', glasses: true, chain: false, cap: false, gloves: false, height: 1.08 },
  security2: { ...DEFAULT_LOOK, skin: '#f2d0b5', hair: 'bald', hairColor: '#111111', top: 'suit', topColor: '#0b0b0d', bottom: 'suit', bottomColor: '#0b0b0d', shoes: '#0b0b0d', glasses: true, chain: false, cap: false, gloves: false, height: 1.06 },
};

/** A standing character who turns to face the player when they come close. */
export function Npc({ look, x, z, yaw = 0, action = 'none', driver }: { look: AvatarLook; x: number; z: number; yaw?: number; action?: AvatarDriver['action']; driver?: AvatarDriver }) {
  const d = useMemo(() => driver ?? makeDriver(x, z, yaw), [driver, x, z, yaw]);
  useFrame((_, dt) => {
    if (driver) return;
    d.action = action;
    const dx = player.pos.x - d.pos.x, dz = player.pos.z - d.pos.z;
    const want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : yaw;
    let diff = want - d.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    d.yaw += diff * Math.min(1, dt * 4);
  });
  return <Avatar look={look} driver={d} />;
}

/** Characters that follow the player at fixed offsets (security detail). */
export function followStep(d: AvatarDriver, tx: number, tz: number, dt: number, speed = 3.4) {
  const dx = tx - d.pos.x, dz = tz - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.25) {
    const step = Math.min(dist, speed * Math.min(1.6, dist / 1.5) * dt);
    d.pos.x += (dx / dist) * step;
    d.pos.z += (dz / dist) * step;
    d.yaw = Math.atan2(dx, dz);
    d.speed = Math.min(1.5, step / dt / 2.6);
  } else {
    d.speed *= 0.8;
    const pdx = player.pos.x - d.pos.x, pdz = player.pos.z - d.pos.z;
    d.yaw += Math.atan2(Math.sin(Math.atan2(pdx, pdz) - d.yaw), Math.cos(Math.atan2(pdx, pdz) - d.yaw)) * Math.min(1, dt * 3);
  }
}
