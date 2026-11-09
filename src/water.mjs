import * as THREE from '../vendor/three.module.js';

export const RIPPLE_COUNT = 12;
const CLICK_RIPPLES = 6;
export const RIPPLE_SPEED = 2.35;
export const RIPPLE_LIFE = 8;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const geometrySample = {};

export function rippleGeometry(ripple, x, z, out) {
  const shape = ripple.shape;
  const angle = shape?.x ?? 0, stretch = shape?.y || 1, phase = shape?.z ?? 0;
  const c = Math.cos(angle), s = Math.sin(angle), age = ripple.z;
  const cx = ripple.x + (c * .035 - s * .018) * age;
  const cz = ripple.y + (s * .035 + c * .018) * age;
  const dx = x - cx, dz = z - cz;
  const qx = (c * dx + s * dz) / stretch, qz = (-s * dx + c * dz) * stretch;
  const radius = Math.hypot(qx, qz), theta = Math.atan2(qz, qx);
  const bend = 1 + Math.sin(theta * 3 + phase) * .025 + Math.sin(theta * 5 - phase * .7) * .012;
  const derivative = Math.cos(theta * 3 + phase) * .075 + Math.cos(theta * 5 - phase * .7) * .060;
  const gx = (bend * qx - derivative * qz) / Math.max(radius, .05);
  const gz = (bend * qz + derivative * qx) / Math.max(radius, .05);
  const nx = c * gx / stretch - s * gz * stretch, nz = s * gx / stretch + c * gz * stretch;
  const length = Math.max(.05, Math.hypot(nx, nz));
  Object.assign(out, { radius: radius * bend, nx: nx / length, nz: nz / length, angle: theta, cx, cz });
  return out;
}

// Optical depth varies independently of the animal's swimming motor and steering.
export function fishWaterDepth(fish, amount = 1) {
  const phase = (fish.id ?? 0) * 2.39996;
  const t = fish.time ?? 0;
  const depth = .43 - fish.y * .50 + Math.sin(t * .115 + phase) * .30
    + Math.sin(t * .049 + phase * .73 + 1.2) * .12;
  return clamp(depth, .035, .96) * (1 - clamp(fish.surfaceInterest ?? 0, 0, 1) * .82) * clamp(amount, 0, 1);
}

export function sampleWaterRipples(ripples, x, z, out) {
  out.x = out.z = out.height = 0;
  for (const ripple of ripples) {
    const age = ripple.z;
    const life = ripple.life ?? RIPPLE_LIFE;
    if (ripple.w <= 0 || age < 0 || age >= life) continue;
    const shape = rippleGeometry(ripple, x, z, geometrySample);
    const front = shape.radius - age * RIPPLE_SPEED * (ripple.shape?.w || 1);
    const fade = smooth(0, .18, age) * (1 - smooth(life - 1.8, life, age));
    const envelope = Math.exp(-front * front / 1.2 - age * .26) * fade * ripple.w;
    const displacement = Math.cos(front * 5.7) * envelope * .28;
    out.x += shape.nx * displacement;
    out.z += shape.nz * displacement;
    out.height += Math.sin(front * 5.7) * envelope * .055;
  }
  return out;
}

export class WaterSurface {
  constructor() {
    this.ripples = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4());
    this.shapes = this.ripples.map((ripple) => (ripple.shape = new THREE.Vector4(0, 1, 0, 1)));
    this.lives = Array(RIPPLE_COUNT).fill(RIPPLE_LIFE);
    this.starts = Array(RIPPLE_COUNT).fill(-100);
    this.clear();
  }
  clear() {
    this.index = 0; this.lastTime = -100; this.count = 0;
    this.fishIndex = 0; this.ambientCount = 0; this.nextAmbient = 1;
    this.biteCount = 0; this.biteClock = 0; this.lastBites = new Map();
    this.fishTimes = new Map();
    this.starts.fill(-100);
    for (const ripple of this.ripples) ripple.set(0, 0, 0, 0);
    for (const shape of this.shapes) shape.set(0, 1, 0, 1);
    this.ripples.forEach((ripple, i) => { ripple.life = this.lives[i] = RIPPLE_LIFE; });
  }
  add(x, z, time, strength = 1) {
    if (![x, z, time, strength].every(Number.isFinite) || time - this.lastTime < .16) return false;
    const i = this.index++ % CLICK_RIPPLES;
    this.spawn(i, x, z, time, strength, RIPPLE_LIFE, 1);
    this.lastTime = time; this.count++;
    return true;
  }
  spawn(i, x, z, time, strength, life, speed) {
    const seed = x * 12.9898 + z * 78.233 + time * .73 + this.count * 19.1;
    const random = (salt) => { const v = Math.sin(seed + salt * 27.13) * 43758.5453; return v - Math.floor(v); };
    this.shapes[i].set(random(1) * Math.PI * 2, 1.035 + random(2) * .095, random(3) * Math.PI * 2, (.94 + random(4) * .12) * speed);
    this.ripples[i].set(x, z, 0, clamp(strength, 0, 1));
    this.starts[i] = time;
    this.ripples[i].life = this.lives[i] = life;
  }
  emitFish(fish, time, depthAmount = .8) {
    if (time < this.nextAmbient) return false;
    const candidate = fish.filter((animal) => fishWaterDepth(animal, depthAmount) < .22
      && animal.speed / animal.bodyLength > .08
      && time - (this.fishTimes.get(animal.id) ?? -100) > 3.7 + animal.id % 3)
      .sort((a, b) => fishWaterDepth(a, depthAmount) - fishWaterDepth(b, depthAmount))[0];
    if (!candidate) return false;
    const i = CLICK_RIPPLES + this.fishIndex++ % (RIPPLE_COUNT - CLICK_RIPPLES);
    const depth = fishWaterDepth(candidate, depthAmount);
    this.spawn(i, candidate.x - Math.cos(candidate.yaw) * candidate.bodyLength * .15,
      candidate.z - Math.sin(candidate.yaw) * candidate.bodyLength * .15,
      time, .14 + (.22 - depth) * .32, 4.8, .62);
    this.fishTimes.set(candidate.id, time); this.nextAmbient = time + .8; this.ambientCount++;
    return true;
  }
  emitBites(bites, time) {
    if (time < this.biteClock) this.lastBites.clear();
    this.biteClock = time;
    let emitted = 0;
    for (const bite of bites) {
      if (![bite.time, bite.mouthX, bite.mouthZ].every(Number.isFinite) || bite.time > time
        || bite.time <= (this.lastBites.get(bite.fish) ?? -Infinity)) continue;
      this.lastBites.set(bite.fish, bite.time);
      if (time - bite.time >= 1.9) continue;
      const i = CLICK_RIPPLES + this.fishIndex++ % (RIPPLE_COUNT - CLICK_RIPPLES);
      this.spawn(i, bite.mouthX, bite.mouthZ, bite.time, .30, 1.9, .22);
      this.biteCount++; emitted++;
    }
    return emitted;
  }
  update(time) {
    this.ripples.forEach((ripple, i) => {
      ripple.z = time - this.starts[i];
      if (ripple.z < 0 || ripple.z >= ripple.life) ripple.w = 0;
    });
  }
}

export const rippleGeometryGLSL = `
  uniform vec4 uRipples[${RIPPLE_COUNT}];
  uniform vec4 uRippleShapes[${RIPPLE_COUNT}];
  uniform float uRippleLives[${RIPPLE_COUNT}];
  vec4 rippleGeometry(vec2 surface, int i) {
    vec4 shape = uRippleShapes[i];
    float c = cos(shape.x), s = sin(shape.x), age = uRipples[i].z;
    vec2 center = uRipples[i].xy + vec2(c * .035 - s * .018, s * .035 + c * .018) * age;
    vec2 d = surface - center;
    vec2 q = vec2((c * d.x + s * d.y) / shape.y, (-s * d.x + c * d.y) * shape.y);
    float r = length(q), angle = atan(q.y, q.x);
    float bend = 1. + sin(angle * 3. + shape.z) * .025 + sin(angle * 5. - shape.z * .7) * .012;
    float derivative = cos(angle * 3. + shape.z) * .075 + cos(angle * 5. - shape.z * .7) * .060;
    vec2 g = vec2(bend * q.x - derivative * q.y, bend * q.y + derivative * q.x) / max(r, .05);
    vec2 normal = vec2(c * g.x / shape.y - s * g.y * shape.y, s * g.x / shape.y + c * g.y * shape.y);
    return vec4(normal / max(length(normal), .05), r * bend, angle);
  }
`;

export const rippleGLSL = `
  ${rippleGeometryGLSL}
  vec4 waterRipple(vec2 surface) {
    vec2 push = vec2(0.);
    float ink = 0., light = 0.;
    for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
      if (uRipples[i].w <= 0.) continue;
      vec4 geometry = rippleGeometry(surface, i);
      float r = geometry.z, age = uRipples[i].z, angle = geometry.w;
      float front = r - age * ${RIPPLE_SPEED.toFixed(2)} * uRippleShapes[i].w;
      float life = uRippleLives[i];
      float fade = exp(-age * .26) * smoothstep(0., .18, age) * (1. - smoothstep(life - 1.8, life, age)) * uRipples[i].w;
      float envelope = exp(-front * front / 1.2) * fade;
      push += geometry.xy * cos(front * 5.7) * envelope;
      float ragged = life < 6. ? 0. : (noise2(surface * 3.8 + float(i) * 19.) - .5) * .08;
      float width = max(.018, fwidth(r) * .8);
      float brush = life < 6. ? .65 : smoothstep(.18, .70, fbm2(surface * 2.1 + float(i) * 7.));
      float facing = dot(geometry.xy, vec2(-.55, -.835));
      for (int band = 0; band < 3; band++) {
        if (band > 0 && life < 6.) continue;
        float j = float(band);
        float f = front + j * .64 + sin(angle * (2. + j) + uRippleShapes[i].z + j * 1.7) * j * .065 + ragged;
        float weight = exp(-j * .85) * fade * (.12 + brush * .88);
        float marks = exp(-pow(f / (width * (1. + j * .3)), 2.));
        float softEdge = width * 2. + .025;
        float relief = (exp(-pow((f + .055) / softEdge, 2.)) - exp(-pow((f - .065) / softEdge, 2.))) * facing;
        ink += (marks * .020 + max(0., -relief) * .032) * weight;
        light += max(0., relief) * weight * .040;
      }
    }
    return vec4(push, ink, light);
  }
`;
