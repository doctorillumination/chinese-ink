const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const random = (id, salt) => { const n = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };

export const MAX_FISH = 16;
export const MAX_FOOD_PIECES = 12;

export function socialIntention(id, time) {
  const phase = Math.floor(id / 3) * 2.1 + random(id, 5) * .8;
  const cycle = smooth(-.35, .65, Math.sin(time * .085 + phase));
  return id % 4 === 0 ? .12 + cycle * .28 : .20 + cycle * .88;
}

export class FoodField {
  constructor() { this.clear(); }
  clear() { this.patches = []; this.serial = 0; this.lastDrop = -100; this.nextAssignment = 0; this.eaten = 0; this.previousTime = null; }
  add(x, z, time) {
    if (![x, z, time].every(Number.isFinite) || time - this.lastDrop < .55) return false;
    this.lastDrop = time;
    const id = this.serial++;
    const nearby = this.patches.find((p) => Math.hypot(p.x - x, p.z - z) < .7);
    if (nearby) this.patches.splice(this.patches.indexOf(nearby), 1);
    const pieces = Array.from({ length: 3 }, (_, i) => {
      const angle = i * 2.39996 + random(id, 2) * 6.28, radius = .20 + random(id + i, 3) * .30;
      return { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius, size: .045 + random(id + i, 4) * .035, seed: id * 17.3 + i * 4.7, eatenAt: null };
    });
    this.patches.push({ id, x, z, created: time, expires: time + 28, pieces });
    if (this.patches.length > 4) this.patches.shift();
    this.nextAssignment = 0;
    return true;
  }
  update(time, fish) {
    const dt = this.previousTime === null ? 0 : clamp(time - this.previousTime, 0, .05);
    this.previousTime = time;
    this.patches = this.patches.filter((p) => time < p.expires && p.pieces.some((piece) => piece.eatenAt === null || time - piece.eatenAt < 1.2));
    for (const animal of fish) {
      const goal = animal.foodGoal;
      if (!goal || ((animal.fedUntil ?? 0) > time && animal.lastFeedPatch === goal.patch)) continue;
      const patch = this.patches.find((p) => p.id === goal.patch);
      if (!patch) { animal.foodGoal = null; continue; }
      const chosen = patch.pieces[goal.piece];
      if (chosen?.eatenAt === null && (animal.surfaceInterest ?? 0) > .15 && Math.hypot(chosen.x - animal.x, chosen.z - animal.z) < 1.3) {
        const draw = 1 - Math.exp(-6 * dt);
        chosen.x += (animal.x - chosen.x) * draw; chosen.z += (animal.z - chosen.z) * draw;
        goal.x = chosen.x; goal.z = chosen.z;
      }
      const piece = patch.pieces.find((p) => p.eatenAt === null && Math.hypot(p.x - animal.x, p.z - animal.z) < .62);
      if (piece && (animal.surfaceInterest ?? 0) > .15) {
        piece.eatenAt = time; this.eaten++;
        const next = patch.pieces.find((p) => p.eatenAt === null && Math.hypot(p.x - animal.x, p.z - animal.z) < 1.6);
        animal.fedUntil = time + (next ? .25 : 3 + random(animal.id, 6) * 2);
        animal.lastFeedPatch = patch.id;
        animal.foodGoal = next ? { x: next.x, z: next.z, patch: patch.id, piece: patch.pieces.indexOf(next), until: time + 1.8 } : null;
        this.nextAssignment = 0;
      }
    }
    if (time < this.nextAssignment) return;
    this.nextAssignment = time + .10;
    const assigned = new Set();
    // Keep a chosen pellet until it is eaten or the commitment expires.
    for (const animal of fish) {
      const goal = animal.foodGoal;
      const patch = goal && this.patches.find((p) => p.id === goal.patch);
      if (patch && patch.pieces[goal.piece]?.eatenAt === null && goal.until > time) assigned.add(animal.id);
      else animal.foodGoal = null;
    }
    for (const patch of [...this.patches].reverse()) {
      const pieces = patch.pieces.filter((p) => p.eatenAt === null);
      if (!pieces.length) continue;
      const committed = fish.filter((animal) => animal.foodGoal?.patch === patch.id).length;
      const travel = (animal) => {
        const dx = patch.x - animal.x, dz = patch.z - animal.z;
        const angle = Math.atan2(dz, dx) - animal.yaw;
        return Math.hypot(dx, dz) / 1.8 + Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) / .85;
      };
      const candidates = fish.filter((animal) => !assigned.has(animal.id) && ((animal.fedUntil ?? 0) <= time || animal.lastFeedPatch !== patch.id)
        && time - patch.created > .04 + random(animal.id, 7) * .12
        && Math.hypot(animal.x - patch.x, animal.z - patch.z) < 16)
        .sort((a, b) => travel(a) - travel(b))
        .slice(0, Math.max(0, Math.min(3, pieces.length, Math.ceil(fish.length * .42)) - committed));
      candidates.forEach((animal, index) => {
        const piece = pieces[(index + committed) % pieces.length];
        animal.foodGoal = { x: piece.x, z: piece.z, patch: patch.id, piece: patch.pieces.indexOf(piece), until: time + 2.4 };
        assigned.add(animal.id);
      });
    }
  }
  get remaining() { return this.patches.reduce((sum, p) => sum + p.pieces.filter((piece) => piece.eatenAt === null).length, 0); }
  visible(time) {
    return this.patches.flatMap((patch) => patch.pieces.map((piece) => ({ ...piece,
      fade: (piece.eatenAt === null ? 1 : 1 - smooth(0, 1.2, time - piece.eatenAt)) * (1 - smooth(24, 28, time - patch.created)),
    }))).filter((piece) => piece.fade > .001);
  }
}
