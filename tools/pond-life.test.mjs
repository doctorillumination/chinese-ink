import test from 'node:test';
import assert from 'node:assert/strict';
import { FoodField, MAX_FOOD_PIECES, socialIntention, mouthContact } from '../src/pond-life.mjs';
import { SchoolSimulation } from '../src/school.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';

test('food drops are bounded, expire, and fade after being eaten', () => {
  const food = new FoodField();
  assert.equal(food.add(NaN, 0, 0), false);
  for (let i = 0; i < 6; i++) assert.ok(food.add(i * 2, 0, i));
  assert.equal(food.patches.length, 4); assert.equal(food.remaining, MAX_FOOD_PIECES);
  assert.equal(food.add(0, 0, 5.1), false);
  const piece = food.patches[0].pieces[0];
  const fish = { id: 0, x: piece.x, z: piece.z, yaw: 0, foodGoal: { patch: food.patches[0].id, piece: 0, role: 'eat', until: 10 }, surfaceInterest: 1 };
  food.update(5.2, [fish]);
  assert.equal(food.eaten, 0, 'a bite requires a brief contact, not an instantaneous hit');
  food.update(5.3, [fish]);
  assert.equal(food.eaten, 1); assert.ok(fish.fedUntil > 5.2);
  assert.ok(food.visible(5.4).some((p) => p.fade > 0 && p.fade < 1));
  food.update(40, [fish]); assert.equal(food.remaining, 0); assert.deepEqual(food.visible(40), []);
});

test('grouping intentions vary smoothly and include explorers alongside schoolers', () => {
  for (const time of [0, 15, 40, 80]) {
    const values = Array.from({ length: 12 }, (_, id) => socialIntention(id, time));
    assert.ok(values.some((n) => n < .4) && values.some((n) => n > .8));
    for (let id = 0; id < 12; id++) assert.ok(Math.abs(socialIntention(id, time + .1) - values[id]) < .02);
  }
  const cycle = Array.from({ length: 100 }, (_, time) => socialIntention(2, time));
  assert.ok(Math.max(...cycle) - Math.min(...cycle) > .7);
});

test('feeding attracts a local subset through swimming and releases fish after a nibble', () => {
  const school = new SchoolSimulation();
  assert.equal(school.fish.length, 12);
  for (let i = 0; i < 3 / FIXED_STEP; i++) school.step();
  const x = school.fish[2].x + 2.5, z = school.fish[2].z + 1;
  const positions = school.fish.map((fish) => [fish.x, fish.y, fish.z, fish.speed]);
  assert.ok(school.feed(x, z));
  assert.deepEqual(school.fish.map((fish) => [fish.x, fish.y, fish.z, fish.speed]), positions);
  let feeding = 0, lifted = 0, nearest = Infinity, noticed = null, firstBite = null, finished = null;
  const start = school.time;
  const landed = school.food.patches.flatMap((p) => p.pieces.map((piece) => [piece.x, piece.z]));
  for (let i = 0; i < 28 / FIXED_STEP; i++) {
    school.step();
    assert.deepEqual(school.food.patches.flatMap((p) => p.pieces.map((piece) => [piece.x, piece.z])).slice(0, landed.length), school.food.patches.length ? landed : []);
    feeding = Math.max(feeding, school.fish.filter((fish) => fish.foodGoal).length);
    lifted = Math.max(lifted, ...school.fish.map((fish) => fish.surfaceInterest));
    nearest = Math.min(nearest, ...school.fish.map((fish) => Math.hypot(fish.x - x, fish.z - z)));
    if (noticed === null && school.fish.some((fish) => fish.foodGoal)) noticed = school.time - start;
    if (firstBite === null && school.food.eaten > 0) firstBite = school.time - start;
    if (finished === null && school.food.eaten === 3) finished = school.time - start;
  }
  assert.ok(feeding > 0 && feeding <= 5);
  assert.ok(lifted > .3 && nearest < 1);
  assert.ok(school.food.eaten > 0, 'at least one fish reaches and eats food');
  assert.ok(noticed < .25 && firstBite < 10 && finished < 16, `feeding latency: ${noticed}, ${firstBite}, ${finished}`);
  assert.equal(school.food.eaten, 3, 'food is eaten rather than simply expiring');
  assert.equal(school.food.remaining, 0);
  for (let i = 0; i < 10 / FIXED_STEP; i++) school.step();
  assert.ok(school.fish.every((fish) => !fish.foodGoal && fish.surfaceInterest < .02));
});

test('food is noticed quickly, commitments persist, and fresh drops interest recently fed fish', () => {
  const food = new FoodField();
  const fish = Array.from({ length: 8 }, (_, id) => ({ id, x: -5 - id * .4, z: 0, yaw: 0, surfaceInterest: 1 }));
  food.add(2, 0, 0); food.update(.2, fish);
  const responders = fish.filter((animal) => animal.foodGoal);
  assert.equal(responders.length, 3);
  const chosen = responders[0], goal = chosen.foodGoal;
  chosen.x = -8; food.update(.31, fish);
  assert.equal(chosen.foodGoal, goal, 'a small change in ranking does not replace a committed target');
  const piece = food.patches[0].pieces[goal.piece];
  chosen.x = piece.x; chosen.z = piece.z; food.update(.32, fish);
  food.update(.42, fish);
  assert.equal(food.eaten, 1); assert.ok(chosen.fedUntil > .42);
  assert.notEqual(chosen.foodGoal?.piece, goal.piece, 'a nibble cannot keep targeting the eaten pellet');
  chosen.foodGoal = null;
  food.add(chosen.x + 1, chosen.z, 1); food.update(1.2, fish);
  assert.equal(chosen.foodGoal?.patch, 1, 'a fresh drop can attract a recently fed fish');
});

test('food can only be swallowed at a slow, surfaced snout, never along the flank or tail', () => {
  const fish = { x: 0, z: 0, yaw: 0, scale: 1, bodyLength: 3.05, speed: .15, surfaceInterest: 1 };
  const pellet = { x: .055, z: .02, size: .06 };
  assert.ok(mouthContact(fish, pellet));
  for (const [x, z] of [[-.4, 0], [-2, 0], [0, .3], [.4, 0]]) assert.equal(mouthContact(fish, { ...pellet, x, z }), false);
  assert.equal(mouthContact({ ...fish, speed: 1.5 }, pellet), false);
  assert.equal(mouthContact({ ...fish, surfaceInterest: .2 }, pellet), false);
  const turned = { ...fish, yaw: Math.PI / 2 };
  assert.ok(mouthContact(turned, { ...pellet, x: -.02, z: .055 }));
  assert.equal(mouthContact(turned, { ...pellet, x: .3, z: 0 }), false);
});
