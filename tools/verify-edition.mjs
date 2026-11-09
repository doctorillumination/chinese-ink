import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { SchoolSimulation } from '../src/school.mjs';
import { SchoolSimulation as PreviousSchool } from '../archive/v0.16-mouth-contact/src/school.mjs';
import { ProceduralFish } from '../src/fish.mjs';
import { ProceduralFish as PreviousFish } from '../archive/v0.16-mouth-contact/src/fish.mjs';
import { WaterSurface } from '../src/water.mjs';
import { biteAmount } from '../src/bite-feedback.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';

const report = { edition: '0.17', date: '2026-11-08', preservedSources: [], motion: {}, idleGeometry: {}, feedback: {} };
for (const name of ['simulation.mjs', 'simulation-math.mjs', 'school.mjs', 'pond-life.mjs', 'rhythm.mjs', 'ink-material.mjs', 'ink-garden.mjs', 'shell.html', 'style.css']) {
  assert.equal(await readFile(new URL('../src/' + name, import.meta.url), 'utf8'), await readFile(new URL('../archive/v0.16-mouth-contact/src/' + name, import.meta.url), 'utf8'));
  report.preservedSources.push(name);
}
const school = new SchoolSimulation(), previous = new PreviousSchool(), water = new WaterSurface();
const model = new ProceduralFish(new THREE.Scene(), school.fish[3], 'pond');
const oldModel = new PreviousFish(new THREE.Scene(), school.fish[3], 'pond');
for (const fish of [model, oldModel]) { fish.setStyle('ink'); fish.setInspection({ spine: false, translucent: false, wireframe: false }); }
let motionDeviation = 0, geometryDeviation = 0, compared = 0, maxOpening = 0, activeFrames = 0;
for (let i = 0; i < 40 / FIXED_STEP; i++) {
  if (i === 360) { school.feed(0, 0); previous.feed(0, 0); water.add(0, 0, school.time); }
  school.step(); previous.step();
  for (let f = 0; f < school.fish.length; f++) for (const key of ['x', 'y', 'z', 'yaw', 'phase', 'speed', 'omega', 'effort', 'finVelocityX', 'finVelocityZ']) motionDeviation = Math.max(motionDeviation, Math.abs(school.fish[f][key] - previous.fish[f][key]));
  if (i % 2) continue;
  water.emitFish(school.fish, school.time); water.emitBites(school.food.bites, school.time); water.update(school.time);
  model.biteAmount = biteAmount(school.food.bites, model.sim.id, school.time);
  maxOpening = Math.max(maxOpening, model.biteAmount); activeFrames += model.biteAmount > 0 ? 1 : 0;
  if (i % 120) continue;
  model.biteAmount = 0; model.update(); oldModel.update();
  for (const [current, old] of [[model.geometry, oldModel.geometry], [model.mouth.geometry, oldModel.mouth.geometry], ...model.fins.map((fin, i) => [fin.geometry, oldModel.fins[i].geometry])]) {
    for (const key of ['position', 'normal']) {
      if (!current.attributes[key] || !old.attributes[key]) continue;
      const a = current.attributes[key].array, b = old.attributes[key].array;
      for (let j = 0; j < a.length; j++) { geometryDeviation = Math.max(geometryDeviation, Math.abs(a[j] - b[j])); compared++; }
    }
  }
}
assert.equal(motionDeviation, 0); assert.deepEqual(school.food.bites, previous.food.bites);
assert.equal(geometryDeviation, 0); assert.equal(school.food.eaten, 3); assert.equal(water.biteCount, 3);
assert.ok(maxOpening > .98 && activeFrames > 30);
report.motion = { seconds: 40, fish: 12, includesFeeding: true, maximumDeviation: motionDeviation, biteEventsUnchanged: true };
report.idleGeometry = { poses: 40, comparedValues: compared, maximumDeviation: geometryDeviation };
report.feedback = { foodEaten: school.food.eaten, biteRipples: water.biteCount, maximumMouthOpening: maxOpening, activeFramesAt60Hz: activeFrames, openingDurationSeconds: .45, rippleLifetimeSeconds: 1.9, rippleStrength: .30, rippleSpeedMultiplier: .22, clickRippleCount: water.count, biteEvents: school.food.bites };
model.dispose(); oldModel.dispose();
await writeFile(new URL('../verification/edition-17-bite-feedback.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, feedback: { ...report.feedback, biteEvents: report.feedback.biteEvents.length } }, null, 2));
