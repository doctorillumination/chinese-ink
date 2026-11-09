import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { SchoolSimulation, bodySamples, closestBodies } from '../src/school.mjs';
import { SchoolSimulation as PreviousSchool } from '../archive/v0.15-clean-pond/src/school.mjs';
import { FishSimulation, FIXED_STEP } from '../src/simulation.mjs';
import { FishSimulation as PreviousMotor } from '../archive/v0.15-clean-pond/src/simulation.mjs';

const report = { edition: '0.16', date: '2026-11-08', startup: {}, feeding: [], motor: {} };
const start = performance.now(), school = new SchoolSimulation(), previous = new PreviousSchool();
const bodies = school.fish.map((fish) => bodySamples(fish));
let clearance = Infinity;
for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) clearance = Math.min(clearance, closestBodies(bodies[i], bodies[j]).clearance);
report.startup = {
  constructionMs: performance.now() - start,
  previousHeadingAlignment: previous.metrics.alignment,
  headingAlignment: school.metrics.alignment,
  minimumTorsoClearance: clearance,
  states: school.fish.map((fish) => fish.rhythm.state),
  fish: school.fish.map((fish) => ({ id: fish.id, x: fish.x, z: fish.z, yaw: fish.yaw, speed: fish.speed, motorAge: fish.time, history: fish.history.length })),
};
assert.ok(school.metrics.alignment < .4 && clearance > .7);
let maximumDeviation = 0;
for (const mode of ['straight', 'wander']) {
  const old = new PreviousMotor(), current = new FishSimulation(); old.mode = current.mode = mode;
  for (let i = 0; i < 60 / FIXED_STEP; i++) {
    old.step(); current.step();
    for (const key of ['x', 'y', 'z', 'yaw', 'phase', 'speed', 'effort', 'omega']) maximumDeviation = Math.max(maximumDeviation, Math.abs(old[key] - current[key]));
  }
}
assert.equal(maximumDeviation, 0);
report.motor = { secondsPerMode: 60, modes: ['straight', 'wander'], noFeedingMaximumDeviation: maximumDeviation };
for (const [label, at] of [
  ['ahead of a fish', (f) => [f.x + Math.cos(f.yaw) * 2.5, f.z + Math.sin(f.yaw) * 2.5]],
  ['beside a fish', (f) => [f.x + 2.5, f.z + 1]],
  ['behind a fish', (f) => [f.x - 2.5, f.z]],
  ['centre', () => [0, 0]],
]) {
  const pond = new SchoolSimulation();
  for (let i = 0; i < 3 / FIXED_STEP; i++) pond.step();
  const [x, z] = at(pond.fish[2]), time = pond.time;
  pond.feed(x, z);
  const patch = pond.food.patches[0], landed = patch.pieces.map((piece) => [piece.x, piece.z]);
  let first = null, finished = null, noticed = null, gap = Infinity, maxResponders = 0;
  for (let i = 0; i < 25 / FIXED_STEP; i++) {
    pond.step();
    assert.deepEqual(patch.pieces.map((piece) => [piece.x, piece.z]), landed, 'food must not be pulled toward a fish');
    const responders = pond.fish.filter((fish) => fish.foodGoal).length;
    maxResponders = Math.max(maxResponders, responders);
    if (noticed === null && responders) noticed = pond.time - time;
    if (first === null && pond.food.eaten) first = pond.time - time;
    if (finished === null && pond.food.eaten === 3) finished = pond.time - time;
    if (i % 12) continue;
    const bodies = pond.fish.map((fish) => { fish.updateSpine(); return bodySamples(fish); });
    for (let a = 0; a < bodies.length; a++) for (let b = a + 1; b < bodies.length; b++) gap = Math.min(gap, closestBodies(bodies[a], bodies[b]).clearance);
  }
  const maxMouthDistance = Math.max(...pond.food.bites.map((bite) => Math.hypot(bite.x - bite.mouthX, bite.z - bite.mouthZ)));
  const entry = { label, x, z, noticeSeconds: noticed, firstBiteSeconds: first, allEatenSeconds: finished, eaten: pond.food.eaten, foodPositionChange: 0, maxMouthDistance, minimumTorsoClearance: gap, maxResponders, bites: pond.food.bites };
  report.feeding.push(entry);
  assert.ok(noticed < .25 && first < 15 && finished < 25, JSON.stringify(entry));
  assert.equal(pond.food.eaten, 3); assert.ok(maxMouthDistance < .12 && gap > 0);
  assert.ok(pond.food.bites.every((bite) => bite.surface > .65 && bite.speed < .82));
}
report.preservedSources = [];
for (const name of ['fish.mjs', 'ink-material.mjs', 'ink-renderer.mjs', 'water.mjs', 'rhythm.mjs']) {
  assert.equal(await readFile(new URL('../src/' + name, import.meta.url), 'utf8'), await readFile(new URL('../archive/v0.15-clean-pond/src/' + name, import.meta.url), 'utf8'));
  report.preservedSources.push(name);
}
await writeFile(new URL('../verification/edition-16-behaviour.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ startup: report.startup, motor: report.motor, feeding: report.feeding.map(({ bites, ...result }) => result) }, null, 2));
