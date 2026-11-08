import test from 'node:test';
import assert from 'node:assert/strict';
import { WaterSurface, RIPPLE_SPEED, RIPPLE_LIFE, fishWaterDepth, sampleWaterRipples } from '../src/water.mjs';

test('a click wave travels outward, stays smooth, and expires without lingering displacement', () => {
  const water = new WaterSurface(), out = {};
  assert.ok(water.add(0, 0, 0));
  water.update(1);
  const ahead = sampleWaterRipples(water.ripples, RIPPLE_SPEED * 2, 0, out).x;
  const front = sampleWaterRipples(water.ripples, RIPPLE_SPEED, 0, out).x;
  assert.ok(front > .15 && Math.abs(ahead) < front * .05);
  water.update(2);
  const nextFront = sampleWaterRipples(water.ripples, RIPPLE_SPEED * 2, 0, out).x;
  assert.ok(nextFront > .12, 'the wave must reach the more distant pad');
  water.update(2.001);
  assert.ok(Math.abs(sampleWaterRipples(water.ripples, RIPPLE_SPEED * 2, 0, out).x - nextFront) < .003);
  const paused = water.ripples.map((ripple) => ripple.toArray());
  water.update(2.001);
  assert.deepEqual(water.ripples.map((ripple) => ripple.toArray()), paused);
  water.update(RIPPLE_LIFE + 1);
  assert.deepEqual(sampleWaterRipples(water.ripples, RIPPLE_SPEED * 2, 0, out), { x: 0, z: 0, height: 0 });
});

test('water input is bounded during dragging, clears on reset, and rejects invalid coordinates', () => {
  const water = new WaterSurface();
  assert.equal(water.add(NaN, 0, 0), false);
  for (let i = 0; i < 40; i++) water.add(i * .02, 0, i * .02, .6);
  assert.ok(water.count > 1 && water.count < 8);
  water.update(.8);
  assert.ok(water.ripples.filter((ripple) => ripple.w > 0).length <= 6);
  water.clear();
  assert.equal(water.count, 0);
  assert.ok(water.ripples.every((ripple) => ripple.w === 0));
});

test('individual optical depths rise and fall smoothly without mutating swimming state', () => {
  const fish = { id: 0, time: 0, x: 3, y: .1, z: -2 };
  const before = { ...fish };
  assert.equal(fishWaterDepth(fish, 0), 0);
  const near = fishWaterDepth({ ...fish, y: .5 });
  const deep = fishWaterDepth({ ...fish, y: -.5 });
  assert.ok(near < deep);
  const depths = Array.from({ length: 121 }, (_, time) => fishWaterDepth({ ...fish, time }));
  assert.ok(depths.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(Math.max(...depths) - Math.min(...depths) > .45);
  for (let i = 1; i < depths.length; i++) assert.ok(Math.abs(depths[i] - depths[i - 1]) < .05);
  assert.ok(Math.abs(fishWaterDepth(fish) - fishWaterDepth({ ...fish, id: 1 })) > .1);
  assert.deepEqual(fish, before);
});
