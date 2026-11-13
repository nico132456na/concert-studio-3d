import * as THREE from 'three';

const vert = /* glsl */ `
varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const frag = /* glsl */ `
uniform float uTime;
uniform float uMode;
uniform float uBright;
uniform float uAspect;
uniform float uHasMap;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec2 uRes;
uniform sampler2D uMap;
varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_fragment>

float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

vec3 visual(vec2 uv, float t) {
  int m = int(uMode + 0.5);
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  if (m == 1) return uC1;
  if (m == 2) {
    float g = 0.5 + 0.5 * sin(uv.x * 3.0 + uv.y * 2.0 + t);
    return mix(uC1, uC2, g);
  }
  if (m == 3) {
    float v = sin(p.x * 6.0 + t) + sin(p.y * 7.0 - t * 1.3) + sin((p.x + p.y) * 5.0 + t * 0.7) + sin(length(p) * 9.0 - t * 2.0);
    v = 0.5 + 0.5 * sin(v);
    return mix(uC1, uC2, v) * (0.5 + 0.7 * v);
  }
  if (m == 4) {
    float a = t * 0.25;
    mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 q = R * p;
    float d = max(abs(q.x), abs(q.y));
    float r = fract(d * 4.0 - t * 0.4);
    float line = 1.0 - smoothstep(0.0, 0.07, abs(r - 0.5));
    float tri = 1.0 - smoothstep(0.0, 0.05, abs(fract((q.x + q.y) * 3.0 + t * 0.2) - 0.5));
    return mix(uC2 * 0.08, uC1, line) + uC2 * tri * 0.35;
  }
  if (m == 5) {
    float hz = 0.42;
    if (uv.y > hz) {
      float sky = (uv.y - hz) / (1.0 - hz);
      vec3 c = mix(uC1 * 0.5, uC2, sky);
      vec2 s = vec2((uv.x - 0.5) * uAspect, uv.y - 0.62);
      float sun = 1.0 - smoothstep(0.17, 0.18, length(s));
      sun *= step(0.3, fract(uv.y * 22.0 - 0.2)) + step(0.7, uv.y);
      return c + uC1 * sun * 1.3;
    }
    float z = 1.0 / (hz - uv.y + 0.03);
    float x = (uv.x - 0.5) * z * uAspect;
    float gx = 1.0 - smoothstep(0.0, 0.06 * z * 0.3, abs(fract(x) - 0.5) - 0.44);
    float gz = 1.0 - smoothstep(0.0, 0.06, abs(fract(z * 0.6 - t) - 0.5) - 0.44);
    float g = max(gx, gz) * smoothstep(40.0, 4.0, z);
    return mix(uC2 * 0.15, uC1 * 1.4, g);
  }
  if (m == 6) {
    vec3 c = uC2 * 0.25;
    for (int l = 0; l < 3; l++) {
      float fl = float(l);
      vec2 g = uv * vec2(uAspect, 1.0) * (18.0 + fl * 14.0) + vec2(fl * 7.3, t * (0.6 + fl * 0.5));
      vec2 id = floor(g), f = fract(g) - 0.5;
      float r = h21(id + fl);
      if (r > 0.9) {
        vec2 o = vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5;
        float s = exp(-length(f - o * 0.6) * 18.0) * (0.5 + 0.5 * sin(t * 3.0 + r * 50.0));
        c += mix(uC1, vec3(1.0), 0.3) * s * 1.6;
      }
    }
    return c;
  }
  if (m == 7) {
    float n = fbm(vec2(p.x * 3.0, uv.y * 3.0 - t * 1.6));
    float f = n * 1.7 - uv.y * 1.2;
    f = clamp(f, 0.0, 1.0);
    return mix(uC1 * smoothstep(0.1, 0.5, f), uC2 * 1.4, smoothstep(0.45, 0.9, f));
  }
  if (m == 8) {
    vec2 q = p * 3.0;
    float w = fbm(q + vec2(t * 0.15, t * 0.1) + fbm(q * 1.5 - t * 0.2));
    float c = pow(1.0 - abs(sin(w * 9.0)), 6.0);
    return mix(uC1 * 0.6, uC2, w) + uC2 * c * 0.8;
  }
  if (m == 9) {
    float n = 28.0;
    float col = floor(uv.x * n);
    float hgt = 0.15 + 0.75 * abs(sin(col * 1.7 + t * 3.0) * sin(col * 0.31 + t * 1.3));
    float gap = step(0.15, fract(uv.x * n)) * step(0.2, fract(uv.y * 24.0));
    float on = step(uv.y, hgt) * gap;
    return mix(uC1, uC2, uv.y / max(hgt, 0.01)) * on + uC2 * 0.03;
  }
  if (m == 10) {
    float y = 0.5 + 0.32 * sin(t * 0.6);
    float d = abs(uv.y - y);
    return uC1 * (exp(-d * 140.0) * 1.5 + exp(-d * 20.0) * 0.15);
  }
  if (m == 11) {
    float v = fbm(p * 2.5 + vec2(t * 0.2, 0.0) + fbm(p * 1.7 - t * 0.12) * 1.5);
    v = smoothstep(0.25, 0.8, v);
    float hi = pow(v, 6.0);
    return mix(uC2, uC1, v) + vec3(hi) * 0.6;
  }
  if (m == 12) {
    float r = length(p) + 0.001;
    float a = atan(p.y, p.x);
    float v = fract(0.35 / r + t * 0.6);
    float rings = 1.0 - smoothstep(0.0, 0.08, abs(v - 0.5) - 0.3);
    float spokes = 0.5 + 0.5 * sin(a * 8.0 + t);
    return mix(uC2, uC1, spokes) * rings * smoothstep(0.0, 0.25, r) * 1.2;
  }
  if (m == 13) {
    float c = mod(floor(uv.x * 8.0 * uAspect / 2.0) + floor(uv.y * 4.0) + floor(t * 2.0), 2.0);
    return mix(uC2, uC1, c);
  }
  if (m == 14) {
    vec3 sky = mix(uC1 * 0.35, uC2, smoothstep(0.1, 1.0, uv.y));
    vec2 mp = vec2((uv.x - 0.72) * uAspect, uv.y - 0.72);
    sky += vec3(1.0, 0.95, 0.9) * (1.0 - smoothstep(0.08, 0.09, length(mp))) * 0.9;
    float cols = 34.0;
    float col = floor(uv.x * cols);
    float hgt = 0.12 + 0.5 * pow(h21(vec2(col, 2.0)), 1.6);
    if (uv.y < hgt) {
      vec2 w = floor(vec2(uv.x * cols * 5.0, uv.y * 70.0));
      float lit = step(0.72, h21(w)) * step(0.3, fract(uv.x * cols * 5.0)) * step(0.35, fract(uv.y * 70.0));
      lit *= 0.6 + 0.4 * sin(t * 2.0 + h21(w) * 30.0);
      return uC2 * 0.08 + uC1 * lit * 1.2;
    }
    return sky;
  }
  if (m == 15) {
    float r = length(p);
    float ring = exp(-abs(r - 0.3) * 30.0) * 1.6 + exp(-max(r - 0.3, 0.0) * 5.0) * 0.5;
    float flick = 0.85 + 0.15 * sin(t * 2.0 + atan(p.y, p.x) * 6.0);
    vec3 c = uC2 + uC1 * ring * flick;
    if (r < 0.285) c = uC2 * 0.3;
    return c;
  }
  if (m == 16) {
    float v = fbm(p * 2.2 + vec2(t * 0.06, 0.0));
    float v2 = fbm(p * 4.0 - vec2(t * 0.04, 0.0));
    vec3 sky = mix(uC1 * 0.8, uC1 * 0.35, uv.y);
    return mix(sky, uC2, smoothstep(0.42, 0.75, v * 0.7 + v2 * 0.4));
  }
  if (m == 17) {
    vec2 tuv = vec2(fract(uv.x - t * 0.08), uv.y);
    float s = texture2D(uMap, tuv).r * uHasMap;
    return uC1 * s * 1.4 + uC2 * 0.05;
  }
  if (m == 19) {
    // rotating Earth (equirectangular on sphere UVs)
    vec2 e = vec2(fract(uv.x + t * 0.015), uv.y);
    float lat = (e.y - 0.5) * 3.14159;
    float land = fbm(vec2(e.x * 7.0, e.y * 3.5) + 3.7);
    land = smoothstep(0.5, 0.56, land + 0.08 * (1.0 - abs(e.y - 0.5) * 2.0));
    float ice = smoothstep(0.82, 0.92, abs(e.y - 0.5) * 2.0);
    vec3 ocean = mix(vec3(0.01, 0.05, 0.18), uC1 * 0.25 + vec3(0.02, 0.12, 0.35), 0.5 + 0.5 * fbm(e * 12.0));
    vec3 ground = mix(vec3(0.08, 0.22, 0.06), vec3(0.42, 0.33, 0.18), fbm(e * 18.0));
    vec3 c = mix(ocean, ground, land);
    c = mix(c, vec3(0.9), ice);
    float cloud = smoothstep(0.55, 0.8, fbm(vec2(e.x * 9.0 + t * 0.03, e.y * 5.0)));
    c = mix(c, vec3(0.95), cloud * 0.7);
    float night = smoothstep(-0.2, 0.3, sin(e.x * 6.2831 + t * 0.1));
    c *= 0.35 + 0.65 * night;
    c += uC2 * (1.0 - night) * land * step(0.75, h21(floor(e * vec2(300.0, 150.0)))) * 0.8;
    return c * (0.6 + 0.4 * cos(lat * 0.6));
  }
  if (m == 20) {
    // deep space nebula
    vec2 q = p * 2.0;
    float n = fbm(q + vec2(t * 0.03, 0.0) + fbm(q * 1.7 - t * 0.02));
    vec3 c = mix(vec3(0.0, 0.0, 0.02), uC1 * 0.9, smoothstep(0.35, 0.8, n));
    c = mix(c, uC2, smoothstep(0.65, 0.95, fbm(q * 2.3 + 9.0)) * 0.7);
    vec2 g = uv * vec2(uAspect, 1.0) * 90.0;
    float star = step(0.985, h21(floor(g))) * (0.5 + 0.5 * sin(t * 4.0 + h21(floor(g)) * 40.0));
    return c + vec3(star);
  }
  if (m == 21) {
    // stained glass: voronoi cells with dark lead lines
    vec2 g = p * 5.0;
    vec2 id = floor(g), f = fract(g);
    float d1 = 9.0, d2 = 9.0;
    vec2 best = vec2(0.0);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 r = o + vec2(h21(id + o), h21(id + o + 5.3)) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; best = id + o; } else if (d < d2) d2 = d;
    }
    float lead = smoothstep(0.02, 0.08, sqrt(d2) - sqrt(d1));
    float k = h21(best);
    vec3 col = k < 0.33 ? uC1 : k < 0.66 ? uC2 : mix(uC1, uC2, 0.5).gbr;
    col *= 0.7 + 0.5 * sin(t + k * 20.0);
    return col * lead;
  }
  if (m == 18) {
    if (uHasMap < 0.5) return mix(uC1, uC2, uv.y) * 0.25;
    return texture2D(uMap, uv).rgb;
  }
  return vec3(0.0);
}

void main() {
  #include <logdepthbuf_fragment>
  vec2 uv = vUv;
  float mask = 1.0;
  if (uRes.x > 0.0) {
    vec2 g = uv * uRes;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    uv = (cell + 0.5) / uRes;
    float pm = smoothstep(0.5, 0.36, abs(f.x - 0.5)) * smoothstep(0.5, 0.36, abs(f.y - 0.5));
    float px = max(fwidth(g.x), fwidth(g.y));
    mask = mix(pm, 1.0, smoothstep(0.2, 0.55, px));
  }
  vec3 c = visual(uv, uTime);
  c *= uBright * mix(0.25, 1.0, mask);
  c += vec3(0.008);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createLedMaterial(side: THREE.Side = THREE.FrontSide) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side,
    toneMapped: true,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 2 },
      uBright: { value: 1 },
      uAspect: { value: 1 },
      uHasMap: { value: 0 },
      uC1: { value: new THREE.Color('#2a7bff') },
      uC2: { value: new THREE.Color('#9b2aff') },
      uRes: { value: new THREE.Vector2(0, 0) },
      uMap: { value: null },
    },
  });
}
