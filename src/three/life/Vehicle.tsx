import { forwardRef } from 'react';
import * as THREE from 'three';
import type { VehicleDef } from '../../life/data';

const noRay = () => null;

/** Original procedural vehicle. Forward is +z, origin at ground centre. */
export const Vehicle = forwardRef<THREE.Group, { def: VehicleDef; color: string; lights?: boolean; position?: [number, number, number]; rotation?: [number, number, number] }>(function Vehicle({ def, color, lights = false, position, rotation }, ref) {
  const [L, W, H, C] = def.dims;
  const wheelR = def.id === 'sports' ? 0.34 : def.id === 'suv' || def.id === 'van' ? 0.42 : 0.37;
  const bodyY = wheelR * 0.75;
  const cabinL = def.id === 'van' ? L * 0.82 : def.id === 'limo' ? L * 0.72 : def.id === 'sports' ? L * 0.42 : L * 0.55;
  const cabinZ = def.id === 'van' ? -L * 0.04 : def.id === 'sports' ? -L * 0.06 : -L * 0.04;
  const paint = { color, roughness: 0.25, metalness: 0.6 };
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh position={[0, bodyY + H / 2, 0]} castShadow raycast={noRay}>
        <boxGeometry args={[W, H, L]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {/* cabin + glass */}
      <mesh position={[0, bodyY + H + C / 2, cabinZ]} raycast={noRay}>
        <boxGeometry args={[W * 0.9, C, cabinL]} />
        <meshStandardMaterial color="#0b0d12" roughness={0.05} metalness={0.9} />
      </mesh>
      <mesh position={[0, bodyY + H + C + 0.02, cabinZ]} raycast={noRay}>
        <boxGeometry args={[W * 0.86, 0.04, cabinL * 0.9]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {/* wheels */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.12), wheelR, sz * (L / 2 - wheelR * 1.5)]} rotation={[0, 0, Math.PI / 2]} raycast={noRay}>
            <cylinderGeometry args={[wheelR, wheelR, 0.28, 16]} />
            <meshStandardMaterial color="#141414" roughness={0.8} />
          </mesh>
        )),
      )}
      {/* lights */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * (W / 2 - 0.3), bodyY + H * 0.62, L / 2 + 0.01]} raycast={noRay}>
            <boxGeometry args={[0.42, 0.12, 0.03]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={lights ? 4 : 0.6} toneMapped={false} />
          </mesh>
          <mesh position={[sx * (W / 2 - 0.3), bodyY + H * 0.62, -L / 2 - 0.01]} raycast={noRay}>
            <boxGeometry args={[0.42, 0.12, 0.03]} />
            <meshStandardMaterial color="#400000" emissive="#ff1020" emissiveIntensity={lights ? 3 : 0.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {def.id === 'suv' && <mesh position={[0, bodyY + H + C + 0.06, cabinZ]} raycast={noRay}><boxGeometry args={[W * 0.7, 0.06, cabinL * 0.7]} /><meshStandardMaterial color="#222" /></mesh>}
      {def.id === 'sports' && <mesh position={[0, bodyY + H + 0.2, -L / 2 + 0.2]} raycast={noRay}><boxGeometry args={[W * 0.9, 0.05, 0.3]} /><meshStandardMaterial {...paint} /></mesh>}
    </group>
  );
});
