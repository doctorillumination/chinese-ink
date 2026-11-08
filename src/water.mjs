import * as THREE from '../vendor/three.module.js';

export const RIPPLE_COUNT = 6;
export const RIPPLE_SPEED = 2.35;
export const RIPPLE_LIFE = 8;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Optical depth varies independently of the animal's swimming motor and steering.
export function fishWaterDepth(fish, amount = 1) {
  const phase = (fish.id ?? 0) * 2.39996;
  const t = fish.time ?? 0;
  const depth = .43 - fish.y * .50 + Math.sin(t * .115 + phase) * .30
    + Math.sin(t * .049 + phase * .73 + 1.2) * .12;
  return clamp(depth, .035, .96) * clamp(amount, 0, 1);
}

export function sampleWaterRipples(ripples, x, z, out) {
  out.x = out.z = out.height = 0;
  for (const ripple of ripples) {
    const age = ripple.z;
    if (ripple.w <= 0 || age < 0 || age >= RIPPLE_LIFE) continue;
    const dx = x - ripple.x, dz = z - ripple.y;
    const radius = Math.hypot(dx, dz), front = radius - age * RIPPLE_SPEED;
    const fadeIn = Math.min(1, age / .18);
    const envelope = Math.exp(-front * front / 1.2 - age * .26) * fadeIn * ripple.w;
    const displacement = Math.cos(front * 5.7) * envelope * .28;
    out.x += dx / Math.max(radius, .05) * displacement;
    out.z += dz / Math.max(radius, .05) * displacement;
    out.height += Math.sin(front * 5.7) * envelope * .055;
  }
  return out;
}

export class WaterSurface {
  constructor() {
    this.ripples = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4());
    this.starts = Array(RIPPLE_COUNT).fill(-100);
    this.clear();
  }
  clear() {
    this.index = 0; this.lastTime = -100; this.count = 0;
    this.starts.fill(-100);
    for (const ripple of this.ripples) ripple.set(0, 0, 0, 0);
  }
  add(x, z, time, strength = 1) {
    if (![x, z, time, strength].every(Number.isFinite) || time - this.lastTime < .16) return false;
    const i = this.index++ % RIPPLE_COUNT;
    this.ripples[i].set(x, z, 0, clamp(strength, 0, 1));
    this.starts[i] = time; this.lastTime = time; this.count++;
    return true;
  }
  update(time) {
    this.ripples.forEach((ripple, i) => {
      ripple.z = time - this.starts[i];
      if (ripple.z < 0 || ripple.z >= RIPPLE_LIFE) ripple.w = 0;
    });
  }
}

export const rippleGLSL = `
  uniform vec4 uRipples[${RIPPLE_COUNT}];
  vec3 waterRipple(vec2 surface) {
    vec2 push = vec2(0.);
    float ink = 0.;
    for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
      if (uRipples[i].w <= 0.) continue;
      vec2 d = surface - uRipples[i].xy;
      float r = length(d), age = uRipples[i].z;
      float front = r - age * ${RIPPLE_SPEED.toFixed(2)};
      float fade = exp(-age * .26) * smoothstep(0., .18, age) * uRipples[i].w;
      float envelope = exp(-front * front / 1.2) * fade;
      push += d / max(r, .05) * cos(front * 5.7) * envelope;
      float ragged = (noise2(surface * 3.8 + float(i) * 19.) - .5) * .08;
      float width = max(.018, fwidth(r) * .8);
      float marks = exp(-pow((front + ragged) / width, 2.));
      marks += exp(-pow((front + .62 + ragged * .8) / (width * 1.35), 2.)) * .42;
      marks += exp(-pow((front + 1.16 + ragged * .6) / (width * 1.9), 2.)) * .18;
      float brush = smoothstep(.18, .70, fbm2(surface * 2.1 + float(i) * 7.));
      ink += marks * fade * (.24 + brush * .76) * .052;
    }
    return vec3(push, ink);
  }
`;
