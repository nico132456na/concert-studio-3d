import * as THREE from 'three';

/**
 * Adds procedural, UV-free surface detail (world-space value noise) to a standard material:
 * subtle albedo variation, grime toward the floor and roughness breakup. Used on large venue
 * geometry built without UVs (concrete tiers, walls, steel).
 */
export function withWorldDetail(m: THREE.MeshStandardMaterial, opts: { scale?: number; strength?: number; grime?: number } = {}) {
  const scale = opts.scale ?? 0.6, strength = opts.strength ?? 0.25, grime = opts.grime ?? 0.15;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWD;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWD = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWD;
float wdH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float wdN(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wdH(i), wdH(i + vec3(1,0,0)), f.x), mix(wdH(i + vec3(0,1,0)), wdH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wdH(i + vec3(0,0,1)), wdH(i + vec3(1,0,1)), f.x), mix(wdH(i + vec3(0,1,1)), wdH(i + vec3(1,1,1)), f.x), f.y), f.z);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float wdA = wdN(vWD * ${scale.toFixed(3)}) * 0.6 + wdN(vWD * ${(scale * 4.3).toFixed(3)}) * 0.3 + wdN(vWD * ${(scale * 17.0).toFixed(3)}) * 0.1;
  diffuseColor.rgb *= 1.0 - ${strength.toFixed(3)} * (wdA - 0.5) * 2.0;
  diffuseColor.rgb *= 1.0 - ${grime.toFixed(3)} * (1.0 - smoothstep(0.0, 2.5, vWD.y));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + (wdN(vWD * ${(scale * 3.1).toFixed(3)}) - 0.5) * 0.3, 0.04, 1.0);`,
      );
  };
  m.customProgramCacheKey = () => `wd-${scale}-${strength}-${grime}`;
  return m;
}
