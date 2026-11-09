import { FishSimulation, BODY_LENGTH, DEFAULTS, FIXED_STEP, clamp, angleDifference } from './simulation.mjs';
import { MAX_FISH, FoodField, socialIntention } from './pond-life.mjs';

export const SCHOOL_DEFAULTS = Object.freeze({ count: 12, cohesion: 0.56, alignment: 0.68, spacing: 1.05, individuality: 0.65, mixed: true });
export const SCHOOL_MOTION = Object.freeze({ ...DEFAULTS, speed: 0.47, wander: 0.55 });
export const SCHOOL_ROAMING = Object.freeze({ halfWidth: 6.8, halfDepth: 8.3 });
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const norm = (x, z) => { const d = Math.hypot(x, z) || 1; return { x: x / d, z: z / d }; };
const value = (id, salt) => {
  let x = Math.imul(id + 31, 374761393) ^ Math.imul(salt + 17, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
};

// Overlapping spheres describe the torso along its actual bent spine.
// Fins remain flexible and are deliberately outside this collision envelope.
const BODY_SPHERES = [[0.10, 0.23], [0.22, 0.35], [0.36, 0.35], [0.50, 0.28], [0.65, 0.19], [0.80, 0.11]];
export function bodySamples(fish) {
  return BODY_SPHERES.map(([s, radius]) => {
    const u = s * (fish.spine.length - 1);
    const i = Math.floor(u);
    const a = fish.spine[i]; const b = fish.spine[i + 1];
    return { x: mix(a.x, b.x, u - i), y: mix(a.y, b.y, u - i), z: mix(a.z, b.z, u - i), r: radius * fish.scale };
  });
}

export function closestBodies(a, b, ax = 0, az = 0, bx = 0, bz = 0, ay = 0, by = 0) {
  let clearance = Infinity;
  let dx = 0; let dz = 0;
  for (const p of a) for (const q of b) {
    const x = p.x + ax - q.x - bx;
    const z = p.z + az - q.z - bz;
    const y = p.y + ay - q.y - by;
    const gap = Math.sqrt(x * x + y * y + z * z) - p.r - q.r;
    if (gap < clearance) { clearance = gap; dx = x; dz = z; }
  }
  return { clearance, dx, dz };
}

function forecast(fish, requestedTurn, brake) {
  const path = [];
  for (let i = fish.spine.length - 1; i >= 0; i--) path.push({ ...fish.spine[i], d: -i / (fish.spine.length - 1) * fish.bodyLength });
  let x = fish.x, z = fish.z, yaw = fish.yaw, omega = fish.omega, speed = fish.speed, distance = 0;
  const result = [];
  const dt = 0.15;
  for (let step = 1; step <= 20; step++) {
    const maxTurn = clamp(speed / (fish.bodyLength * 0.78), 0.42, 0.92);
    const desired = clamp(requestedTurn, -maxTurn, maxTurn);
    const nextOmega = omega + (desired - omega) * (1 - Math.exp(-2.9 * dt));
    omega += clamp(nextOmega - omega, -1.15 * dt, 1.15 * dt);
    yaw += omega * dt;
    speed = Math.max(0, speed + (((fish.effectiveCruise ?? fish.params.speed * fish.bodyLength) - speed) * 0.7 - brake * speed * 1.5) * dt);
    distance += speed * dt;
    x += Math.cos(yaw) * speed * dt;
    z += Math.sin(yaw) * speed * dt;
    // Constant depth is conservative: a new evasive dive has not happened yet.
    path.push({ x, y: fish.y, z, d: distance });
    if (step % 4) continue;
    const body = BODY_SPHERES.map(([s, r]) => {
      const d = distance - s * fish.bodyLength;
      let j = path.length - 2;
      while (j > 0 && path[j].d > d) j--;
      const a = path[j], b = path[j + 1];
      const u = clamp((d - a.d) / Math.max(0.000001, b.d - a.d), 0, 1);
      return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), z: mix(a.z, b.z, u), r: r * fish.scale };
    });
    result.push(body);
  }
  return result;
}

export class SchoolSimulation {
  constructor(params = {}, motion = {}) {
    this.params = { ...SCHOOL_DEFAULTS, ...params };
    this.motion = { ...SCHOOL_MOTION, ...motion };
    this.roaming = { ...SCHOOL_ROAMING };
    this.mode = 'wander';
    this.reset();
  }

  reset() {
    this.time = 0;
    this.target = null;
    this.scatterUntil = 0;
    this.regroupUntil = 0;
    this.food = new FoodField();
    this.peerForecasts = new Map();
    this.fish = [];
    const count = clamp(Math.round(this.params.count), 2, MAX_FISH);
    this.params.count = count;
    const columns = count > 9 ? 4 : 3;
    for (let id = 0; id < count; id++) {
      const row = Math.floor(id / columns);
      const column = id % columns;
      const scale = 0.88 + value(id, 2) * 0.23;
      const yaw = (value(id, 3) - 0.5) * 0.4;
      const fish = new FishSimulation(this.motion, {
        scale, seed: 1729 + id * 547,
        x: (row - (Math.ceil(count / columns) - 1) / 2) * 3.9 + (column - (columns - 1) / 2) * 0.45 + (value(id, 19) - 0.5) * 1.1,
        z: (column - (columns - 1) / 2) * 2.85 + (value(id, 4) - 0.5) * 0.7,
        yaw, phase: value(id, 5) * Math.PI * 2,
        depth: (value(id, 6) - 0.5) * 0.7,
        pace: 0.78 + value(id, 7) * 0.38,
      });
      fish.id = id;
      fish.surfaceInterest = 0; fish.fedUntil = 0; fish.foodGoal = null;
      fish.traits = {
        pace: value(id, 8) * 2 - 1,
        tempo: value(id, 9) * 2 - 1,
        sociability: 0.86 + value(id, 10) * 0.3,
        reaction: 0.085 + value(id, 11) * 0.085,
        phase: value(id, 12) * Math.PI * 2,
      };
      fish.perceptionAt = id * 0.017;
      fish.steering = { turn: 0, pace: 1, brake: 0, autonomy: 1, depthShift: 0 };
      fish.neighbours = [];
      fish.encounters = new Map();
      this.fish.push(fish);
    }
  }

  setTarget(x, z, persistent = false) {
    if (Number.isFinite(x) && Number.isFinite(z)) {
      this.target = { x, z, expires: persistent ? Infinity : this.time + 18 };
      this.scatterUntil = 0;
    }
  }

  feed(x, z) {
    this.target = null;
    return this.food.add(x, z, this.time);
  }

  scatter() {
    this.target = null;
    this.scatterUntil = this.time + 3.8;
    this.regroupUntil = 0;
  }

  regroup() {
    this.scatterUntil = 0;
    this.regroupUntil = this.time + 9;
    this.target = null;
  }

  center(fish) {
    return { x: fish.x - Math.cos(fish.yaw) * fish.bodyLength * 0.44, y: fish.y, z: fish.z - Math.sin(fish.yaw) * fish.bodyLength * 0.44 };
  }

  observe(fish, snapshots) {
    const p = this.params;
    const gathering = this.time < this.regroupUntil;
    const own = snapshots[fish.id];
    const f = own.forward;
    const right = { x: -f.z, z: f.x };
    const sensing = BODY_LENGTH * (3.0 + fish.traits.sociability * 0.45);
    const candidates = snapshots.filter((q) => q.id !== own.id).map((q) => {
      const dx = q.center.x - own.center.x; const dz = q.center.z - own.center.z;
      const distance = Math.hypot(dx, dz);
      const visibility = (dx * f.x + dz * f.z) / Math.max(0.001, distance);
      return { ...q, dx, dz, distance, visibility };
    }).filter((q) => q.distance < sensing).sort((a, b) => a.distance - b.distance);
    // Social perception is local and forward-biased. Safety checks cover all sides.
    const neighbours = candidates.filter((q) => gathering || q.visibility > -0.72).slice(0, 4);
    fish.neighbours = neighbours.map((q) => q.id);
    let alignX = 0, alignZ = 0, centerX = 0, centerZ = 0, weight = 0, meanSpeed = 0;
    let separateX = 0, separateZ = 0;
    let avoidTurn = 0, urgency = 0, brake = 0, depthShift = 0;
    const spacing = p.spacing * BODY_LENGTH;
    const safetyPad = this.fish.length > 9 ? .40 : 0;
    for (const q of candidates) {
      const actual = closestBodies(own.body, q.body);
      const retreat = norm(actual.dx, actual.dz);
      const personal = spacing * 0.34;
      const intrusion = 1 - smooth(personal * 0.35 + safetyPad, personal * 1.45 + safetyPad, actual.clearance);
      separateX += retreat.x * intrusion;
      separateZ += retreat.z * intrusion;

      const rvx = q.velocity.x - own.velocity.x;
      const rvz = q.velocity.z - own.velocity.z;
      const vv = rvx * rvx + rvz * rvz;
      const approaching = -(q.dx * rvx + q.dz * rvz);
      const t = vv > 0.01 ? clamp(approaching / vv, 0, 3.1) : 0;
      const future = closestBodies(own.body, q.body, own.velocity.x * t, own.velocity.z * t, q.velocity.x * t, q.velocity.z * t, own.vertical * t, q.vertical * t);
      const risk = (1 - smooth(0.35 + safetyPad, 1.15 + spacing * 0.12 + safetyPad, future.clearance)) * (1 - t / 4.8);
      const nearRisk = 1 - smooth(0.25 + safetyPad, personal * 0.9 + safetyPad, actual.clearance);
      const danger = Math.max(nearRisk, approaching > 0 ? risk : 0);
      if (danger < 0.01) continue;
      const lateral = q.dx * right.x + q.dz * right.z;
      const forward = q.dx * f.x + q.dz * f.z;
      const headingAgreement = f.x * q.forward.x + f.z * q.forward.z;
      // Head-on encounters use a consistent passing side for both animals.
      let encounter = fish.encounters.get(q.id);
      if (!encounter || encounter.until < this.time) {
        const vertical = own.center.y - q.center.y;
        encounter = {
          side: Math.abs(lateral) < 0.6 || headingAgreement < -0.45 ? 1 : -Math.sign(lateral),
          vertical: Math.abs(vertical) > 0.07 ? Math.sign(vertical) : own.id < q.id ? 1 : -1,
          until: this.time + 2,
        };
        fish.encounters.set(q.id, encounter);
      }
      encounter.until = this.time + 2;
      const passSide = encounter.side;
      let threatTurn;
      if (forward > -fish.bodyLength * 0.2) {
        threatTurn = passSide * 1.5;
        const yielding = lateral > -0.15 && headingAgreement > -0.6;
        const following = headingAgreement > 0.65;
        brake = Math.max(brake, danger * (following ? 0.98 : yielding ? 0.94 : 0.82));
      } else {
        threatTurn = (f.x * retreat.z - f.z * retreat.x) * 0.9;
        brake = Math.max(brake, nearRisk * 0.45);
      }
      if (danger > urgency) {
        urgency = danger; avoidTurn = threatTurn;
        depthShift = encounter.vertical * danger * 0.85;
      }
    }
    for (const q of neighbours) {
      const w = (1 - smooth(sensing * 0.6, sensing, q.distance)) * mix(0.45, 1, clamp((q.visibility + 1) / 2, 0, 1));
      alignX += q.forward.x * w; alignZ += q.forward.z * w;
      centerX += q.dx * w; centerZ += q.dz * w;
      meanSpeed += q.speed * w;
      weight += w;
    }
    let vx = f.x, vz = f.z;
    const intention = !p.mixed || gathering ? 1 : socialIntention(fish.id, this.time);
    fish.socialIntent = intention;
    const social = fish.traits.sociability * intention;
    if (weight > 0) {
      const a = norm(alignX, alignZ);
      const c = norm(centerX, centerZ);
      const distance = Math.hypot(centerX, centerZ) / weight;
      const attraction = smooth(spacing * 1.1, spacing * 3.3, distance);
      const cohesion = gathering ? Math.max(p.cohesion, 1.0) : p.cohesion;
      vx += a.x * p.alignment * 1.1 * social + c.x * attraction * cohesion * social * 0.95;
      vz += a.z * p.alignment * 1.1 * social + c.z * attraction * cohesion * social * 0.95;
    }
    vx += separateX * 1.5;
    vz += separateZ * 1.5;
    const desired = Math.atan2(vz, vx);
    const socialTurn = angleDifference(desired, fish.yaw) * 1.6;
    let turn = socialTurn;
    let autonomy = clamp(1 - Math.max(p.cohesion, p.alignment) * (weight ? 0.72 : 0) * intention, .1, 1);
    let pace = weight > 0 ? clamp(mix(1, meanSpeed / weight / Math.max(0.25, this.motion.speed * fish.bodyLength), p.alignment * 0.3), 0.83, 1.13) : 1;
    if (gathering && weight > 0) {
      const goal = this.fish.length > 9 ? this.centroid : null;
      const gatherX = goal ? goal.x - own.center.x : centerX / weight;
      const gatherZ = goal ? goal.z - own.center.z : centerZ / weight;
      const attraction = smooth(spacing * .85, spacing * 1.80, Math.hypot(gatherX, gatherZ));
      const returnTurn = angleDifference(Math.atan2(gatherZ, gatherX), fish.yaw);
      turn = mix(turn, returnTurn, attraction);
      autonomy *= 1 - attraction * 0.8;
    }
    if (this.time < this.scatterUntil) {
      const center = this.centroid;
      const outward = Math.atan2(own.center.z - center.z, own.center.x - center.x);
      turn = angleDifference(outward + Math.sin(fish.traits.phase) * 0.24, fish.yaw) * 1.1;
      pace *= 1.2 + value(fish.id, 17) * 0.15;
      autonomy = 0.15;
    }
    const feeding = fish.foodGoal && !this.target && this.time >= this.scatterUntil;
    if (feeding) { turn *= .25; autonomy = Math.max(autonomy, .9); pace *= 1.08; }
    // A soft oval encourages earlier return turns without a wall or position clamp.
    const lookX = own.center.x + own.velocity.x * 2.2;
    const lookZ = own.center.z + own.velocity.z * 2.2;
    if (this.mode !== 'straight') {
      const { halfWidth, halfDepth } = this.roaming;
      const edge = smooth(.72, 1.15, Math.hypot(lookX / halfWidth, lookZ / halfDepth)) * (feeding ? .18 : 1);
      const home = angleDifference(Math.atan2(-own.center.z / (halfDepth * halfDepth), -own.center.x / (halfWidth * halfWidth)), fish.yaw);
      turn = mix(turn, home * 0.9, edge);
    }
    const preferredTurn = turn;
    turn = turn * (1 - urgency * 0.95) + avoidTurn * urgency;
    autonomy *= 1 - urgency * 0.95;
    const result = { turn, autonomy, pace, brake: clamp(brake, 0, 0.98), depthShift, alertness: feeding || gathering || this.time < this.scatterUntil ? 1 : 0 };
    if (urgency > 0.08) this.chooseSafeMotion(fish, result, preferredTurn, candidates);
    return result;
  }

  chooseSafeMotion(fish, result, preferredTurn, neighbours) {
    const maxTurn = clamp(fish.speed / (fish.bodyLength * 0.78), 0.42, 0.92);
    const turns = [...new Set([clamp(result.turn, -maxTurn, maxTurn), 0, maxTurn, -maxTurn, maxTurn * 0.5, -maxTurn * 0.5])];
    const brakes = [...new Set([result.brake, 0.45, 0.92])];
    const others = neighbours.map((other) => {
      let body = this.peerForecasts.get(other.id);
      if (!body) {
        body = forecast(this.fish[other.id], this.fish[other.id].omega, this.fish[other.id].braking);
        this.peerForecasts.set(other.id, body);
      }
      return { body };
    });
    let best = null;
    for (const turn of turns) for (const brake of brakes) {
      const prediction = forecast(fish, turn, brake);
      let danger = 0, proximity = 0;
      for (const other of others) for (let k = 0; k < prediction.length; k++) {
        const gap = closestBodies(prediction[k], other.body[k]).clearance;
        const collision = Math.pow(Math.max(0, (this.fish.length > 9 ? .80 : .40) - gap), 2) * 1200;
        danger = Math.max(danger, collision);
        proximity += Math.pow(Math.max(0, 1.0 - gap), 2) * 0.45;
      }
      const score = danger + proximity + Math.pow(turn - clamp(preferredTurn, -maxTurn, maxTurn), 2) * 1.2 + Math.pow(turn - clamp(fish.steering.turn, -maxTurn, maxTurn), 2) * 0.18 + brake * brake * 0.3;
      if (!best || score < best.score) best = { score, turn, brake };
    }
    result.turn = best.turn;
    result.brake = best.brake;
    result.autonomy *= 0.15;
  }

  step(dt = FIXED_STEP) {
    this.time += dt;
    this.peerForecasts.clear();
    this.food.update(this.time, this.fish);
    if (this.target && this.target.expires < this.time) this.target = null;
    const individuality = this.params.individuality;
    const snapshots = this.fish.map((fish) => {
      fish.updateSpine();
      return { id: fish.id, center: this.center(fish), forward: { x: Math.cos(fish.yaw), z: Math.sin(fish.yaw) }, velocity: { x: Math.cos(fish.yaw) * fish.speed, z: Math.sin(fish.yaw) * fish.speed }, vertical: fish.verticalVelocity, speed: fish.speed, body: bodySamples(fish) };
    });
    // All observations read the same pre-step state, independent of update order.
    for (const fish of this.fish) {
      if (this.time >= fish.perceptionAt) {
        fish.steering = this.observe(fish, snapshots);
        fish.perceptionAt = this.time + fish.traits.reaction;
      }
    }
    for (const fish of this.fish) {
      Object.assign(fish.params, this.motion);
      fish.params.speed *= 1 + fish.traits.pace * individuality * 0.10 + Math.sin(this.time * 0.31 + fish.traits.phase) * individuality * 0.025;
      fish.params.tempo *= 1 + fish.traits.tempo * individuality * 0.17;
      fish.params.rhythm = clamp(fish.params.rhythm + Math.sin(fish.traits.phase) * individuality * 0.09, 0, 1);
      fish.params.wander *= 0.45 + individuality * 0.8;
      fish.mode = this.mode;
      if (this.target && this.mode !== 'straight') {
        const angle = fish.id * 2.399963 + this.time * 0.025;
        const radius = Math.sqrt((fish.id + 0.8) / this.fish.length) * BODY_LENGTH * this.params.spacing * 1.6;
        fish.setTarget(this.target.x + Math.cos(angle) * radius, this.target.z + Math.sin(angle) * radius, true);
      } else if (fish.foodGoal && this.mode !== 'straight' && this.time >= this.scatterUntil) {
        fish.setTarget(fish.foodGoal.x, fish.foodGoal.z, true);
      } else fish.target = null;
      const surface = fish.foodGoal && !this.target ? 1 - smooth(1.5, 6, Math.hypot(fish.x - fish.foodGoal.x, fish.z - fish.foodGoal.z)) : 0;
      fish.surfaceInterest += (surface - fish.surfaceInterest) * (1 - Math.exp(-dt * .85));
      fish.step(dt, fish.steering);
    }
  }

  get centroid() {
    const centers = this.fish.map((fish) => this.center(fish));
    return { x: centers.reduce((sum, p) => sum + p.x, 0) / centers.length, z: centers.reduce((sum, p) => sum + p.z, 0) / centers.length };
  }

  get metrics() {
    let x = 0, z = 0, nearest = 0;
    const centers = this.fish.map((fish) => this.center(fish));
    for (let i = 0; i < this.fish.length; i++) {
      x += Math.cos(this.fish[i].yaw); z += Math.sin(this.fish[i].yaw);
      let d = Infinity;
      for (let j = 0; j < this.fish.length; j++) if (i !== j) d = Math.min(d, Math.hypot(centers[i].x - centers[j].x, centers[i].z - centers[j].z));
      nearest += d;
    }
    return { alignment: Math.hypot(x, z) / this.fish.length, spacing: nearest / this.fish.length / BODY_LENGTH };
  }
}
