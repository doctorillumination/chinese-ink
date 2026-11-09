import { SwimRhythm } from './rhythm.mjs';
import { clamp } from './simulation-math.mjs';
export { clamp } from './simulation-math.mjs';

// Original motion study. Distances use body lengths only at the UI boundary.
export const BODY_LENGTH = 3.05;
export const JOINT_COUNT = 29;
export const FIXED_STEP = 1 / 120;
export const DEFAULTS = Object.freeze({
  speed: 0.46,
  amplitude: 1,
  tempo: 1,
  stiffness: 0.72,
  rhythm: 0.82,
  drag: 0.45,
  turn: 0,
  wander: 0.7,
  liveliness: 0.65,
});

const mix = (a, b, t) => a + (b - a) * t;
const approach = (a, b, rate, dt) => mix(a, b, 1 - Math.exp(-rate * dt));
export const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash(n, seed) {
  let x = (n + Math.imul(seed, 374761393)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
}

function noise(t, seed) {
  const n = Math.floor(t);
  const u = t - n;
  return mix(hash(n, seed), hash(n + 1, seed), u * u * (3 - 2 * u)) * 2 - 1;
}

export class FishSimulation {
  constructor(params = {}, options = {}) {
    this.params = { ...DEFAULTS, ...params };
    this.seed = options.seed ?? 1729;
    this.scale = options.scale ?? 1;
    this.bodyLength = BODY_LENGTH * this.scale;
    this.origin = { x: 0, z: 0, yaw: 0, depth: 0, phase: 0, pace: 0.88, ...options };
    this.mode = 'wander';
    this.reset();
  }

  reset() {
    this.time = 0;
    this.x = this.origin.x;
    this.y = this.origin.depth;
    this.z = this.origin.z;
    this.yaw = this.origin.yaw;
    this.omega = 0;
    this.speed = this.params.speed * this.bodyLength * this.origin.pace;
    this.distance = 0;
    this.phase = this.origin.phase;
    this.effort = 0.3 + 0.25 * Math.cos(this.origin.phase);
    this.braking = 0;
    this.verticalVelocity = 0;
    this.finVelocityX = 0;
    this.finVelocityZ = 0;
    this.rhythm = new SwimRhythm(this.seed);
    this.activity = { pace: 1, power: 1, tempo: 1, brake: 0, flutter: 0 };
    this.effectiveCruise = this.params.speed * this.bodyLength;
    this.frequency = 1.1;
    this.beating = true;
    this.stateTime = 0;
    this.glideUntil = 0;
    this.burstUntil = 0;
    this.target = null;
    this.history = [];
    for (let d = -this.bodyLength * 3; d <= 0.001; d += 0.04) {
      this.history.push({ x: this.x + Math.cos(this.yaw) * d, y: this.y, z: this.z + Math.sin(this.yaw) * d, yaw: this.yaw, d });
    }
    this.history.push({ x: this.x, y: this.y, z: this.z, yaw: this.yaw, d: 0 });
    this.spine = Array.from({ length: JOINT_COUNT }, () => ({ x: 0, y: 0, z: 0 }));
    this.updateSpine();
  }

  setTarget(x, z, persistent = false) {
    if (Number.isFinite(x) && Number.isFinite(z)) {
      this.target = { x, z, expires: persistent ? Infinity : this.time + 18 };
    }
  }

  burst() {
    this.burstUntil = this.time + 2.2;
    this.glideUntil = 0;
    this.beating = true;
  }

  glide() {
    this.glideUntil = this.time + 3.5;
    this.burstUntil = 0;
    this.beating = false;
  }

  step(dt = FIXED_STEP, influence = null) {
    const p = this.params;
    this.time += dt;
    this.stateTime += dt;
    this.activity = this.rhythm.step(dt, p.liveliness);
    // An explicit group action can interrupt a quiet intention without resetting its clock.
    const alertness = influence?.alertness ?? 0;
    if (alertness) {
      this.activity.pace += Math.max(0, 1 - this.activity.pace) * alertness;
      this.activity.power += (1 - this.activity.power) * alertness;
      this.activity.tempo += Math.max(0, 1 - this.activity.tempo) * alertness;
      this.activity.brake *= 1 - alertness;
    }
    if (this.target && this.target.expires < this.time) this.target = null;

    let turnWish = 0;
    let arrival = 1;
    let feedingSpeed = Infinity;
    let feedingDistance = Infinity;
    let stationX = 0, stationZ = 0;
    if (this.target && this.mode !== 'straight') {
      const dx = this.target.x - this.x;
      const dz = this.target.z - this.z;
      const d = Math.hypot(dx, dz);
      turnWish = angleDifference(Math.atan2(dz, dx), this.yaw) * 1.4;
      if (influence?.feeding) {
        feedingDistance = d;
        const angle = Math.abs(angleDifference(Math.atan2(dz, dx), this.yaw));
        const alignment = mix(.02, 1, smoothstep(.1, .95, Math.cos(angle)));
        feedingSpeed = Math.min(d * .85 + .005, this.bodyLength * .78) * mix(alignment, 1, smoothstep(1.5, 4, d));
        const hovering = (1 - smoothstep(.45, 1.0, d)) * (1 - smoothstep(.25, .65, this.speed));
        const vx = dx * 1.8 - Math.cos(this.yaw) * this.speed;
        const vz = dz * 1.8 - Math.sin(this.yaw) * this.speed;
        const limited = Math.min(1, .32 / Math.max(.001, Math.hypot(vx, vz))) * hovering;
        stationX = vx * limited; stationZ = vz * limited;
      } else arrival = mix(0.18, 1, smoothstep(0.35, 2.5, d));
      if (d < 0.3 && this.target.expires !== Infinity) this.target = null;
    } else if (this.mode === 'wander') {
      turnWish = noise(this.time * 0.17 + 3, this.seed) * p.wander * 0.75;
      turnWish += noise(this.time * 0.049 + 11, this.seed + 7) * p.wander * 0.26;
      const lookX = this.x + Math.cos(this.yaw) * this.speed * 2.2;
      const lookZ = this.z + Math.sin(this.yaw) * this.speed * 2.2;
      const edge = influence ? 0 : smoothstep(7, 12, Math.hypot(lookX, lookZ));
      const home = angleDifference(Math.atan2(-this.z, -this.x), this.yaw);
      turnWish = mix(turnWish, home * 0.8, edge);
    }
    if (influence) turnWish = turnWish * (influence.autonomy ?? 1) + influence.turn;
    turnWish += p.turn * 0.8;
    // Fin-assisted slow turns remain possible; rapid pivots do not.
    const maxTurn = clamp(this.speed / (this.bodyLength * 0.78), influence?.feeding ? .72 : influence ? 0.42 : 0.12, 0.92);
    const desiredOmega = clamp(turnWish, -maxTurn, maxTurn);
    const nextOmega = approach(this.omega, desiredOmega, 2.9, dt);
    this.omega += clamp(nextOmega - this.omega, -1.15 * dt, 1.15 * dt);
    this.yaw += this.omega * dt;

    const bursting = this.time < this.burstUntil;
    const forcedGlide = this.time < this.glideUntil;
    const activity = this.activity;
    const targetSpeed = Math.min(feedingSpeed, p.speed * this.bodyLength * arrival * (influence?.pace ?? 1) * (bursting ? 1.65 : activity.pace));
    this.effectiveCruise = targetSpeed;
    const dragAt = (v) => (0.105 + p.drag * 0.2) * v * (1 + v * 0.27);
    const availableThrust = (dragAt(targetSpeed) * 1.3 + this.bodyLength * 0.27) * p.amplitude * (1 + activity.flutter * 0.20) * (influence?.feeding ? 1.3 : 1);
    if (targetSpeed < 0.015 || forcedGlide) {
      this.beating = false;
    } else if (this.stateTime > 0.3) {
      if (this.beating && this.speed > targetSpeed * 1.12) {
        this.beating = false;
        this.stateTime = 0;
      } else if (!this.beating && this.speed < targetSpeed * 0.85) {
        this.beating = true;
        this.stateTime = 0;
      }
    }
    const holding = clamp((dragAt(this.speed) + (targetSpeed - this.speed) * 1.5) / availableThrust, 0, 1);
    const gait = influence?.feeding ? p.rhythm * smoothstep(.5, 2.5, feedingDistance) : p.rhythm;
    let command = mix(holding, this.beating ? 1 : 0, gait);
    command = Math.max(command, activity.flutter * 0.85);
    command = Math.min(command, activity.power);
    if (bursting) command = 1;
    if (forcedGlide || targetSpeed < 0.015) command = 0;
    const arrivalBrake = influence?.feeding ? clamp((this.speed - targetSpeed) * 3.5, 0, .95) : 0;
    this.braking = approach(this.braking, Math.max(arrivalBrake, influence?.brake ?? 0, bursting || forcedGlide ? 0 : activity.brake), 5, dt);
    command *= 1 - this.braking;
    this.effort = approach(this.effort, command, command > this.effort ? 5 : 3, dt);
    const thrust = this.effort * availableThrust;
    const turningLoss = Math.abs(this.omega) * this.speed * 0.12;
    const finBraking = this.braking * this.speed * 1.5;
    this.speed = clamp(this.speed + (thrust - dragAt(this.speed) - turningLoss - finBraking) * dt, 0, this.bodyLength * 2.3);
    // Slow pectoral adjustments move the snout to food without moving the food.
    this.finVelocityX += clamp((stationX - this.finVelocityX) * 4, -.45, .45) * dt;
    this.finVelocityZ += clamp((stationZ - this.finVelocityZ) * 4, -.45, .45) * dt;
    const vx = Math.cos(this.yaw) * this.speed + this.finVelocityX;
    const vz = Math.sin(this.yaw) * this.speed + this.finVelocityZ;
    const forwardTravel = this.speed * dt;
    const travelled = this.finVelocityX || this.finVelocityZ ? Math.hypot(vx, vz) * dt : forwardTravel;
    this.x += Math.cos(this.yaw) * forwardTravel + this.finVelocityX * dt;
    this.z += Math.sin(this.yaw) * forwardTravel + this.finVelocityZ * dt;
    const depth = this.origin.depth + 0.027 * Math.sin(this.time * 0.47 + this.origin.phase) + 0.012 * Math.sin(this.time * 0.83 + this.origin.phase * 0.7);
    if (influence) {
      const desiredDepth = clamp(depth + (influence.depthShift ?? 0), -0.95, 0.95);
      const desiredVertical = clamp((desiredDepth - this.y) * 1.6, -0.38, 0.38);
      const vertical = approach(this.verticalVelocity, desiredVertical, 3, dt);
      this.verticalVelocity += clamp(vertical - this.verticalVelocity, -0.5 * dt, 0.5 * dt);
      this.y += this.verticalVelocity * dt;
    } else this.y = depth;
    this.distance += travelled;
    const flutterTempo = 1 + (activity.tempo - 1) * (1 - this.braking);
    this.frequency = (0.64 + 1.12 * this.speed / this.bodyLength) * p.tempo * flutterTempo * (influence?.feeding ? 1.18 : 1);
    this.phase += Math.PI * 2 * this.frequency * dt * mix(0.55, 1, this.effort);
    const last = this.history[this.history.length - 1];
    if (this.distance - last.d > 0.025) {
      this.history.push({ x: this.x, y: this.y, z: this.z, yaw: this.yaw, d: this.distance });
      while (this.history.length > 2 && this.history[1].d < this.distance - this.bodyLength * 2.5) this.history.shift();
    }
  }

  past(distance) {
    const d = this.distance - distance;
    const h = this.history;
    let low = 0;
    let high = h.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (h[mid].d <= d) low = mid;
      else high = mid - 1;
    }
    const a = h[low];
    const b = h[low + 1] || { x: this.x, y: this.y, z: this.z, yaw: this.yaw, d: this.distance };
    const u = clamp((d - a.d) / Math.max(0.000001, b.d - a.d), 0, 1);
    return { yaw: a.yaw + angleDifference(b.yaw, a.yaw) * u, y: mix(a.y, b.y, u) };
  }

  updateSpine() {
    const n = JOINT_COUNT;
    const length = this.bodyLength / (n - 1);
    Object.assign(this.spine[0], { x: this.x, y: this.y, z: this.z });
    for (let i = 1; i < n; i++) {
      const s = (i - 0.5) / (n - 1);
      const old = this.past(s * this.bodyLength);
      const envelope = Math.pow(smoothstep(0.13, 1, s), 1.0 + this.params.stiffness * 1.65);
      const amplitude = (0.025 + Math.pow(this.effort, 0.8) * 0.64) * this.params.amplitude * (1 + this.activity.flutter * 0.10);
      const wave = Math.sin(this.phase - s * 5.8) * envelope * amplitude;
      const front = 1 - smoothstep(0, 0.22, s);
      const heading = old.yaw + angleDifference(this.yaw, old.yaw) * front + wave;
      const prev = this.spine[i - 1];
      const rise = clamp((old.y - prev.y) / length, -0.25, 0.25);
      const horizontal = Math.sqrt(1 - rise * rise);
      Object.assign(this.spine[i], {
        x: prev.x - Math.cos(heading) * length * horizontal,
        y: prev.y + rise * length,
        z: prev.z - Math.sin(heading) * length * horizontal,
      });
    }
    return this.spine;
  }

  get state() {
    if (this.time < this.glideUntil) return 'Gliding';
    if (this.time < this.burstUntil) return 'Tail burst';
    if (this.braking > 0.4) return 'Braking';
    if (this.params.liveliness > 0.05 && this.rhythm.state === 'flutter' && this.activity.flutter > 0.25) return 'Short flutter';
    if (this.params.liveliness > 0.05 && this.rhythm.state === 'quiet' && this.activity.pace < 0.8) return 'Quiet drift';
    if (this.params.liveliness > 0.05 && this.rhythm.state === 'coast' && this.activity.power < 0.8) return 'Coasting';
    if (this.effort < 0.22) return 'Gliding';
    if (Math.abs(this.omega) > 0.22) return 'Turning';
    return this.beating ? 'Tail beating' : 'Settling';
  }
}
