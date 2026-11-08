import test from 'node:test';
import assert from 'node:assert/strict';
import { FishSimulation, FIXED_STEP } from '../src/simulation.mjs';
import { SchoolSimulation } from '../src/school.mjs';

test('spontaneous swimming adds short speed increases and quiet drifts with smooth acceleration', () => {
  const lively = new FishSimulation({ speed: 0.47, liveliness: 0.65 });
  const steady = new FishSimulation({ speed: 0.47, liveliness: 0 });
  lively.mode = steady.mode = 'straight';
  const range = { livelyMin: Infinity, livelyMax: 0, steadyMin: Infinity, steadyMax: 0, acceleration: 0 };
  const states = new Set();
  for (let i = 0; i < 90 / FIXED_STEP; i++) {
    const previous = lively.speed;
    lively.step(); steady.step();
    if (i < 5 / FIXED_STEP) continue;
    const a = lively.speed / lively.bodyLength, b = steady.speed / steady.bodyLength;
    range.livelyMin = Math.min(range.livelyMin, a); range.livelyMax = Math.max(range.livelyMax, a);
    range.steadyMin = Math.min(range.steadyMin, b); range.steadyMax = Math.max(range.steadyMax, b);
    range.acceleration = Math.max(range.acceleration, Math.abs(lively.speed - previous) / (FIXED_STEP * lively.bodyLength));
    states.add(lively.rhythm.state);
  }
  assert.ok(range.livelyMax > range.steadyMax * 1.1, JSON.stringify(range));
  assert.ok(range.livelyMin < range.steadyMin * 0.7, JSON.stringify(range));
  assert.ok(range.livelyMax < 0.85, `a brief flutter became too fast: ${range.livelyMax}`);
  assert.ok(range.acceleration < 1.1, `acceleration: ${range.acceleration} body lengths/s²`);
  assert.deepEqual(states, new Set(['cruise', 'coast', 'flutter', 'quiet']));
});

test('fish take spontaneous flutters and quiet periods on independent schedules', () => {
  const school = new SchoolSimulation();
  const starts = new Map();
  let isolatedFlutter = false, quiet = false;
  for (let i = 0; i < 90 / FIXED_STEP; i++) {
    school.step();
    const fluttering = school.fish.filter((fish) => fish.activity.flutter > 0.35);
    if (fluttering.length === 1) isolatedFlutter = true;
    for (const fish of school.fish) {
      if (fish.rhythm.state === 'flutter' && !starts.has(fish.id)) starts.set(fish.id, school.time);
      if (fish.rhythm.state === 'quiet' && fish.effort < 0.2) quiet = true;
    }
  }
  assert.equal(starts.size, 6);
  assert.ok(Math.max(...starts.values()) - Math.min(...starts.values()) > 2);
  assert.ok(isolatedFlutter);
  assert.ok(quiet);
});

test('avoidance braking still takes priority during a spontaneous flutter', () => {
  const fish = new FishSimulation({ speed: 0.47 });
  fish.mode = 'straight';
  while (fish.activity.flutter < 0.4 && fish.time < 60) fish.step();
  assert.ok(fish.activity.flutter >= 0.4);
  const before = fish.speed;
  for (let i = 0; i < 2 / FIXED_STEP; i++) fish.step(FIXED_STEP, { turn: 0, pace: 1, autonomy: 0, brake: 0.95 });
  assert.ok(fish.speed < before * 0.35, `speed before ${before}, after ${fish.speed}`);
  assert.ok(fish.effort < 0.1);
});
