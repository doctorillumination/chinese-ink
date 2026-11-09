const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const random = (id, salt) => { const n = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };

export const MAX_FISH = 16;
export const MAX_FOOD_PIECES = 12;
const surfaceSpeed = (animal) => Math.hypot(Math.cos(animal.yaw) * (animal.speed ?? 0) + (animal.finVelocityX ?? 0), Math.sin(animal.yaw) * (animal.speed ?? 0) + (animal.finVelocityZ ?? 0));

export function mouthContact(animal, piece) {
  const scale = animal.scale ?? 1, c = Math.cos(animal.yaw), s = Math.sin(animal.yaw);
  const dx = piece.x - animal.x - c * .004 * scale, dz = piece.z - animal.z - s * .004 * scale;
  const forward = dx * c + dz * s, lateral = -dx * s + dz * c;
  return forward >= -.025 * scale && forward <= .045 * scale + piece.size * .5
    && Math.abs(lateral) <= .045 * scale + piece.size * .4
    && surfaceSpeed(animal) < (animal.bodyLength ?? 3.05) * .24
    && (animal.surfaceInterest ?? 0) > .65;
}

export function socialIntention(id, time) {
  const phase = Math.floor(id / 3) * 2.1 + random(id, 5) * .8;
  const cycle = smooth(-.35, .65, Math.sin(time * .085 + phase));
  return id % 4 === 0 ? .12 + cycle * .28 : .20 + cycle * .88;
}

export class FoodField {
  constructor() { this.clear(); }
  clear() { this.patches = []; this.serial = 0; this.lastDrop = -100; this.nextAssignment = 0; this.eaten = 0; this.bites = []; }
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
    this.patches = this.patches.filter((p) => time < p.expires && p.pieces.some((piece) => piece.eatenAt === null || time - piece.eatenAt < .24));
    for (const patch of this.patches) for (const piece of patch.pieces) {
      if (piece.eatenAt !== null) continue;
      const animal = fish.find((animal) => animal.foodGoal?.patch === patch.id && animal.foodGoal.role !== 'waiting'
        && !((animal.fedUntil ?? 0) > time && animal.lastFeedPatch === patch.id) && mouthContact(animal, piece));
      if (!animal) { piece.contactFish = null; piece.contactSince = null; continue; }
      if (piece.contactFish !== animal.id) { piece.contactFish = animal.id; piece.contactSince = time; }
      if (time - piece.contactSince < .075) continue;
      piece.eatenAt = time; this.eaten++;
      this.bites.push({ time, fish: animal.id, x: piece.x, z: piece.z, mouthX: animal.x + Math.cos(animal.yaw) * .004 * (animal.scale ?? 1), mouthZ: animal.z + Math.sin(animal.yaw) * .004 * (animal.scale ?? 1), speed: surfaceSpeed(animal), surface: animal.surfaceInterest });
      if (this.bites.length > 24) this.bites.shift();
      const more = patch.pieces.some((p) => p.eatenAt === null);
      animal.fedUntil = time + (more ? .24 : 3 + random(animal.id, 6) * 2);
      animal.nibblingUntil = time + .24;
      animal.lastFeedPatch = patch.id;
      const next = patch.pieces.filter((p) => p.eatenAt === null).sort((a, b) => Math.hypot(a.x - animal.x, a.z - animal.z) - Math.hypot(b.x - animal.x, b.z - animal.z))[0];
      animal.foodGoal = next ? { x: next.x, z: next.z, patch: patch.id, piece: patch.pieces.indexOf(next), role: 'eat', until: time + 9 } : null;
      this.nextAssignment = 0;
    }
    if (time < this.nextAssignment) return;
    this.nextAssignment = time + .10;
    const assigned = new Set();
    for (const animal of fish) {
      const goal = animal.foodGoal;
      const patch = goal && this.patches.find((p) => p.id === goal.patch);
      const alive = patch?.pieces.some((p) => p.eatenAt === null);
      if (alive && goal.until > time && (goal.role === 'waiting' || patch.pieces[goal.piece]?.eatenAt === null)) assigned.add(animal.id);
      else animal.foodGoal = null;
    }
    for (const patch of [...this.patches].reverse()) {
      const pieces = patch.pieces.filter((p) => p.eatenAt === null);
      if (!pieces.length) continue;
      const travel = (animal) => {
        const dx = patch.x - animal.x, dz = patch.z - animal.z;
        const angle = Math.atan2(dz, dx) - animal.yaw;
        return Math.hypot(dx, dz) / 1.8 + Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) / .85;
      };
      const available = () => fish.filter((animal) => (!assigned.has(animal.id) || (animal.foodGoal?.patch === patch.id && animal.foodGoal.role === 'waiting'))
        && ((animal.fedUntil ?? 0) <= time || animal.lastFeedPatch !== patch.id)
        && time - patch.created > .04 + random(animal.id, 7) * .12
        && Math.hypot(animal.x - patch.x, animal.z - patch.z) < 16).sort((a, b) => travel(a) - travel(b));
      let eater = fish.find((animal) => animal.foodGoal?.patch === patch.id && animal.foodGoal.role !== 'waiting');
      if (!eater) {
        eater = available()[0];
        if (eater) {
          const piece = [...pieces].sort((a, b) => Math.hypot(a.x - eater.x, a.z - eater.z) - Math.hypot(b.x - eater.x, b.z - eater.z))[0];
          eater.foodGoal = { x: piece.x, z: piece.z, patch: patch.id, piece: patch.pieces.indexOf(piece), role: 'eat', until: time + 9 };
          assigned.add(eater.id);
        }
      }
      if (!eater) continue;
      // Other interested fish approach the outside of the patch, leaving the snout room.
      let waiting = fish.filter((animal) => animal.foodGoal?.patch === patch.id && animal.foodGoal.role === 'waiting').length;
      for (const animal of available()) {
        if (waiting >= Math.min(2, fish.length - 1)) break;
        if (assigned.has(animal.id)) continue;
        const dx = animal.x - patch.x, dz = animal.z - patch.z, distance = Math.hypot(dx, dz);
        if (distance < 2.8) continue;
        const radius = 2.8 + waiting * .35;
        animal.foodGoal = { x: patch.x + dx / distance * radius, z: patch.z + dz / distance * radius, patch: patch.id, role: 'waiting', until: time + 9 };
        assigned.add(animal.id); waiting++;
      }
    }
  }

  get remaining() { return this.patches.reduce((sum, p) => sum + p.pieces.filter((piece) => piece.eatenAt === null).length, 0); }
  visible(time) {
    return this.patches.flatMap((patch) => patch.pieces.map((piece) => ({ ...piece,
      fade: (piece.eatenAt === null ? 1 : 1 - smooth(0, .24, time - piece.eatenAt)) * (1 - smooth(24, 28, time - patch.created)),
      size: piece.size * (piece.eatenAt === null ? 1 : 1 - smooth(0, .24, time - piece.eatenAt)),
    }))).filter((piece) => piece.fade > .001);
  }
}
