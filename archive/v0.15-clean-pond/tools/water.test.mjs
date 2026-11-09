import test from 'node:test';
import assert from 'node:assert/strict';
import { WaterSurface, RIPPLE_SPEED, RIPPLE_LIFE, fishWaterDepth, sampleWaterRipples } from '../src/water.mjs';

test('a click wave travels outward, stays smooth, and expires without lingering displacement', () => {
  const water = new WaterSurface(), out = {};
  assert.ok(water.add(0, 0, 0));
  water.update(1);
  const peak = () => {
    let best = { radius: 0, displacement: 0 };
    for (let radius = .1; radius < 8; radius += .025) {
      sampleWaterRipples(water.ripples, radius, 0, out);
      if (out.x > best.displacement) best = { radius, displacement: out.x };
    }
    return best;
  };
  const first = peak();
  assert.ok(first.displacement > .15);
  assert.ok(Math.abs(sampleWaterRipples(water.ripples, 8, 0, out).x) < .001);
  water.update(2);
  const next = peak();
  assert.ok(next.radius > first.radius + 1.5 && next.displacement > .12, 'the wave must reach more distant pads');
  water.update(2.001);
  assert.ok(Math.abs(sampleWaterRipples(water.ripples, next.radius, 0, out).x - next.displacement) < .003);
  const paused = water.ripples.map((ripple) => ripple.toArray());
  water.update(2.001);
  assert.deepEqual(water.ripples.map((ripple) => ripple.toArray()), paused);
  water.update(RIPPLE_LIFE + 1);
  assert.deepEqual(sampleWaterRipples(water.ripples, RIPPLE_SPEED * 2, 0, out), { x: 0, z: 0, height: 0 });
});

test('click waves have repeatable directional variation instead of circular symmetry', () => {
  const water = new WaterSurface(), repeat = new WaterSurface(), out = {};
  water.add(0, 0, 0); repeat.add(0, 0, 0);
  assert.deepEqual(water.shapes.map((shape) => shape.toArray()), repeat.shapes.map((shape) => shape.toArray()));
  water.update(2);
  const radii = [0, Math.PI / 4, Math.PI / 2, Math.PI * .75].map((angle) => {
    let best = 0, peakRadius = 0;
    for (let radius = 2.5; radius < 7; radius += .02) {
      sampleWaterRipples(water.ripples, Math.cos(angle) * radius, Math.sin(angle) * radius, out);
      const push = Math.hypot(out.x, out.z);
      if (push > best) { best = push; peakRadius = radius; }
    }
    return peakRadius;
  });
  assert.ok(Math.max(...radii) - Math.min(...radii) > .2, 'wavefront reaches different directions at different distances');
  water.add(0, 0, .2);
  assert.notDeepEqual(water.shapes[0].toArray(), water.shapes[1].toArray());
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

test('only moving fish near the surface emit gentle ripples in their own slots', () => {
  const water = new WaterSurface();
  const shallow = { id: 0, time: 1, x: 0, y: .9, z: 0, yaw: 0, bodyLength: 3, speed: 1 };
  assert.equal(water.emitFish([{ ...shallow, y: -2 }], 1), false);
  assert.equal(water.emitFish([{ ...shallow, speed: 0 }], 1), false);
  assert.equal(water.emitFish([shallow], 1), true);
  assert.equal(water.ambientCount, 1); assert.equal(water.count, 0);
  assert.ok(water.ripples[6].w > 0 && water.ripples[6].w < .22);
  assert.ok(water.lives[6] < 5 && water.shapes[6].w < .7);
  assert.equal(water.emitFish([shallow], 1.1), false);
  water.add(2, 3, 1.2);
  assert.equal(water.count, 1); assert.ok(water.ripples[0].w === 1 && water.ripples[6].w > 0);
  water.update(6); assert.equal(water.ripples[6].w, 0); assert.ok(water.ripples[0].w > 0);
});
