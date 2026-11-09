import test from 'node:test';
import assert from 'node:assert/strict';
import { FoodField, MAX_FOOD_PIECES, socialIntention } from '../src/pond-life.mjs';
import { SchoolSimulation } from '../src/school.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';

test('food drops are bounded, expire, and fade after being eaten', () => {
  const food = new FoodField();
  assert.equal(food.add(NaN, 0, 0), false);
  for (let i = 0; i < 6; i++) assert.ok(food.add(i * 2, 0, i));
  assert.equal(food.patches.length, 4); assert.equal(food.remaining, MAX_FOOD_PIECES);
  assert.equal(food.add(0, 0, 5.1), false);
  const piece = food.patches[0].pieces[0];
  const fish = { id: 0, x: piece.x, z: piece.z, foodGoal: { patch: food.patches[0].id }, surfaceInterest: 1 };
  food.update(5.2, [fish]);
  assert.equal(food.eaten, 1); assert.ok(fish.fedUntil > 5.2);
  assert.ok(food.visible(5.8).some((p) => p.fade > 0 && p.fade < 1));
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
  let feeding = 0, lifted = 0, nearest = Infinity;
  for (let i = 0; i < 28 / FIXED_STEP; i++) {
    school.step();
    feeding = Math.max(feeding, school.fish.filter((fish) => fish.foodGoal).length);
    lifted = Math.max(lifted, ...school.fish.map((fish) => fish.surfaceInterest));
    nearest = Math.min(nearest, ...school.fish.map((fish) => Math.hypot(fish.x - x, fish.z - z)));
  }
  assert.ok(feeding > 0 && feeding <= 5);
  assert.ok(lifted > .3 && nearest < 1);
  assert.ok(school.food.eaten > 0, 'at least one fish reaches and eats food');
  assert.equal(school.food.remaining, 0);
  for (let i = 0; i < 10 / FIXED_STEP; i++) school.step();
  assert.ok(school.fish.every((fish) => !fish.foodGoal && fish.surfaceInterest < .02));
});
