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
  clear() { this.patches = []; this.serial = 0; this.lastDrop = -100; this.nextAssignment = 0; this.eaten = 0; }
  add(x, z, time) {
    if (![x, z, time].every(Number.isFinite) || time - this.lastDrop < .55) return false;
    this.lastDrop = time;
    const id = this.serial++;
    const nearby = this.patches.find((p) => Math.hypot(p.x - x, p.z - z) < .7);
    if (nearby) this.patches.splice(this.patches.indexOf(nearby), 1);
    const pieces = Array.from({ length: 3 }, (_, i) => {
      const angle = i * 2.39996 + random(id, 2) * 6.28, radius = .12 + random(id + i, 3) * .24;
      return { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius, size: .045 + random(id + i, 4) * .035, seed: id * 17.3 + i * 4.7, eatenAt: null };
    });
    this.patches.push({ id, x, z, created: time, expires: time + 28, pieces });
    if (this.patches.length > 4) this.patches.shift();
    this.nextAssignment = 0;
    return true;
  }
  update(time, fish) {
    this.patches = this.patches.filter((p) => time < p.expires && p.pieces.some((piece) => piece.eatenAt === null || time - piece.eatenAt < 1.2));
    for (const animal of fish) {
      const goal = animal.foodGoal;
      if (!goal || (animal.fedUntil ?? 0) > time) continue;
      const patch = this.patches.find((p) => p.id === goal.patch);
      if (!patch) { animal.foodGoal = null; continue; }
      const piece = patch.pieces.find((p) => p.eatenAt === null && Math.hypot(p.x - animal.x, p.z - animal.z) < .62);
      if (piece && (animal.surfaceInterest ?? 0) > .15) {
        piece.eatenAt = time; this.eaten++;
        animal.fedUntil = time + 11 + random(animal.id, 6) * 9;
        animal.foodGoal = null;
      }
    }
    if (time < this.nextAssignment) return;
    this.nextAssignment = time + .35;
    for (const animal of fish) animal.foodGoal = null;
    const assigned = new Set();
    for (const patch of [...this.patches].reverse()) {
      const pieces = patch.pieces.filter((p) => p.eatenAt === null);
      if (!pieces.length) continue;
      const candidates = fish.filter((animal) => !assigned.has(animal.id) && (animal.fedUntil ?? 0) <= time
        && time - patch.created > .35 + random(animal.id, 7) * 1.1
        && Math.hypot(animal.x - patch.x, animal.z - patch.z) < 16)
        .sort((a, b) => Math.hypot(a.x - patch.x, a.z - patch.z) - Math.hypot(b.x - patch.x, b.z - patch.z))
        .slice(0, Math.min(5, pieces.length + 2, Math.ceil(fish.length * .42)));
      candidates.forEach((animal, index) => {
        const piece = pieces[index % pieces.length];
        animal.foodGoal = { x: piece.x, z: piece.z, patch: patch.id };
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
