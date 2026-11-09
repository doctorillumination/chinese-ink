import test from 'node:test';
import assert from 'node:assert/strict';
import { SchoolSimulation, bodySamples, closestBodies } from '../src/school.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';

function sample(school) {
  const bodies = school.fish.map((fish) => { fish.updateSpine(); return bodySamples(fish); });
  let gap = Infinity;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) gap = Math.min(gap, closestBodies(bodies[i], bodies[j]).clearance);
  return gap;
}
function advance(school, seconds, inspect) {
  let minGap = Infinity;
  for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) {
    school.step();
    if (i % 12) continue;
    minGap = Math.min(minGap, sample(school));
    if (inspect) inspect(school);
  }
  return minGap;
}
function radius(school) {
  const center = school.centroid;
  return school.fish.reduce((sum, fish) => {
    const c = school.center(fish);
    return sum + Math.hypot(c.x - center.x, c.z - center.z);
  }, 0) / school.fish.length;
}

test('the first frame is dispersed, already moving, and independently phased', () => {
  const school = new SchoolSimulation();
  assert.ok(school.metrics.alignment < .4, 'initial headings must not form a synchronized school');
  assert.ok(new Set(school.fish.map((f) => Math.floor(f.yaw / (Math.PI / 2)))).size >= 3);
  assert.ok(new Set(school.fish.map((f) => f.rhythm.state)).size >= 2);
  assert.ok(new Set(school.fish.map((f) => f.time.toFixed(2))).size >= 10);
  assert.ok(school.fish.every((f) => f.time > 6 && f.speed > .1 && f.history.length > 50));
  assert.ok(Math.max(...school.fish.map((f) => f.x)) - Math.min(...school.fish.map((f) => f.x)) > 9);
  assert.ok(Math.max(...school.fish.map((f) => f.z)) - Math.min(...school.fish.map((f) => f.z)) > 8);
  assert.ok(sample(school) > .7);
});

test('the six-fish school is deterministic while its individuals retain different gaits', () => {
  const a = new SchoolSimulation({ count: 6, mixed: false }), b = new SchoolSimulation({ count: 6, mixed: false });
  advance(a, 25); advance(b, 25);
  assert.deepEqual(a.fish.map((f) => [f.x, f.y, f.z, f.yaw, f.phase]), b.fish.map((f) => [f.x, f.y, f.z, f.yaw, f.phase]));
  assert.equal(new Set(a.fish.map((f) => f.scale)).size, 6);
  assert.equal(new Set(a.fish.map((f) => f.phase.toFixed(3))).size, 6);
  assert.ok(Math.max(...a.fish.map((f) => f.speed)) - Math.min(...a.fish.map((f) => f.speed)) > 0.05);
});

test('three minutes of default schooling maintain torso clearance and bounded 3D motion', () => {
  const school = new SchoolSimulation();
  let maximumRadius = 0;
  const gap = advance(school, 180, (s) => {
    for (const fish of s.fish) {
      assert.ok([fish.x, fish.y, fish.z, fish.speed, fish.omega, fish.phase].every(Number.isFinite));
      assert.ok(Math.abs(fish.verticalVelocity) <= 0.38 + 1e-9);
      assert.ok(Math.abs(fish.y) < 1.05);
      maximumRadius = Math.max(maximumRadius, Math.hypot(fish.x, fish.z));
    }
  });
  assert.ok(gap > 0.1, `minimum torso envelope gap: ${gap}`);
  assert.ok(maximumRadius < 26, `maximum distance from origin: ${maximumRadius}`);
});

test('all supported school sizes preserve torso clearance in the initial minute', () => {
  for (let count = 2; count <= 16; count++) {
    const school = new SchoolSimulation({ count });
    const gap = advance(school, 60);
    assert.equal(school.fish.length, count);
    assert.ok(gap > 0, `${count} fish, minimum torso envelope gap: ${gap}`);
  }
});

test('head-on and crossing encounters pass without overlapping torso envelopes', () => {
  for (const crossing of [false, true]) {
    const school = new SchoolSimulation({ count: 2, cohesion: 0, alignment: 0 });
    school.mode = 'straight';
    Object.assign(school.fish[0].origin, { x: -5, z: 0, yaw: 0, depth: 0 });
    Object.assign(school.fish[1].origin, crossing ? { x: 0, z: -5, yaw: Math.PI / 2, depth: 0 } : { x: 5, z: 0, yaw: Math.PI, depth: 0 });
    for (const fish of school.fish) fish.reset();
    const gap = advance(school, 25);
    assert.ok(gap > 0.1, `${crossing ? 'crossing' : 'head-on'} gap: ${gap}`);
  }
});

test('scatter and regroup preserve positions at activation, and regroup draws fish together sooner', () => {
  const school = new SchoolSimulation();
  const unassisted = new SchoolSimulation();
  advance(school, 10); advance(unassisted, 10);
  const positions = () => school.fish.map((f) => [f.x, f.y, f.z]);
  const before = positions(); school.scatter(); assert.deepEqual(positions(), before);
  unassisted.scatter();
  let gap = advance(school, 7);
  advance(unassisted, 7);
  const scattered = positions(); school.regroup(); assert.deepEqual(positions(), scattered);
  let regroupedRadius = 0, unassistedRadius = 0, samples = 0;
  for (let i = 0; i < 9 / FIXED_STEP; i++) {
    school.step(); unassisted.step();
    if (i % 12) continue;
    gap = Math.min(gap, sample(school));
    if (i > 6 / FIXED_STEP) {
      regroupedRadius += radius(school); unassistedRadius += radius(unassisted); samples++;
    }
  }
  assert.ok(gap > 0, `minimum scatter/regroup gap: ${gap}`);
  assert.ok(regroupedRadius / samples < unassistedRadius / samples * 0.8, `regroup ${regroupedRadius / samples}, unassisted ${unassistedRadius / samples}`);
});

test('a shared pointer destination retains space between the fish', () => {
  const school = new SchoolSimulation();
  advance(school, 10);
  school.setTarget(0, 0, true);
  const gap = advance(school, 60);
  const meanDistance = school.fish.reduce((sum, fish) => sum + Math.hypot(fish.x, fish.z), 0) / school.fish.length;
  assert.ok(gap > 0, `minimum destination gap: ${gap}`);
  assert.ok(meanDistance < 10, `mean distance from destination: ${meanDistance}`);
});

test('social perception ignores fish beyond the local sensing range', () => {
  const school = new SchoolSimulation();
  const far = school.fish.at(-1);
  Object.assign(far.origin, { x: 100, z: 100 }); far.reset();
  advance(school, 0.3);
  assert.deepEqual(far.neighbours, []);
  for (const fish of school.fish.slice(0, -1)) assert.ok(!fish.neighbours.includes(far.id));
});

test('schooling produces shared headings more often than the independent preset', () => {
  // Compare steady social intentions; the artwork deliberately includes explorers.
  const school = new SchoolSimulation({ mixed: false });
  const independent = new SchoolSimulation({ mixed: false, cohesion: 0, alignment: 0, individuality: 1, spacing: 1.15 });
  let shared = 0, separate = 0, n = 0;
  for (let i = 0; i < 90 / FIXED_STEP; i++) {
    school.step(); independent.step();
    if (i > 20 / FIXED_STEP && i % 120 === 0) { shared += school.metrics.alignment; separate += independent.metrics.alignment; n++; }
  }
  assert.ok(shared / n > separate / n + 0.15, `school ${shared / n}, independent ${separate / n}`);
});
