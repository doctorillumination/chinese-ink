import test from 'node:test';
import assert from 'node:assert/strict';
import { FishSimulation, BODY_LENGTH, JOINT_COUNT, FIXED_STEP } from '../src/simulation.mjs';
import { ProceduralFish, profile } from '../src/fish.mjs';
import * as THREE from '../vendor/three.module.js';

function advance(sim, seconds, check) {
  for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) {
    sim.step();
    if (check) check(sim, i);
  }
  sim.updateSpine();
}

test('seeded exploration repeats exactly', () => {
  const a = new FishSimulation();
  const b = new FishSimulation();
  advance(a, 60);
  advance(b, 60);
  assert.deepEqual(a.spine, b.spine);
  assert.equal(a.speed, b.speed);
});

test('spine length stays fixed through hard turns and maximum tail effort', () => {
  const sim = new FishSimulation({ turn: 1, amplitude: 1.6, stiffness: 0.2, speed: 1.2 });
  advance(sim, 90, (s, i) => {
    if (i % 120) return;
    s.updateSpine();
    for (let j = 1; j < JOINT_COUNT; j++) {
      const a = s.spine[j - 1];
      const b = s.spine[j];
      const length = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      assert.ok(Math.abs(length - BODY_LENGTH / (JOINT_COUNT - 1)) < 1e-10);
    }
  });
});

test('a glide reduces forward speed and muscle effort without an instantaneous velocity change', () => {
  const sim = new FishSimulation();
  sim.mode = 'straight';
  advance(sim, 5);
  const before = sim.speed;
  sim.glide();
  assert.equal(sim.speed, before);
  advance(sim, 3);
  assert.ok(sim.speed < before * 0.8);
  assert.ok(sim.effort < 0.005);
});

test('stopping the preferred speed decays to rest without reversing or pivoting rapidly', () => {
  const sim = new FishSimulation();
  sim.params.speed = 0;
  sim.params.turn = 1;
  advance(sim, 90, (s) => {
    assert.ok(s.speed >= 0 && Number.isFinite(s.speed));
    assert.ok(Math.abs(s.omega) <= 0.92 + 1e-8);
  });
  assert.ok(sim.speed < 1e-6);
});

test('angular acceleration is bounded during a sudden steering reversal', () => {
  const sim = new FishSimulation({ speed: 1, turn: 1 });
  sim.mode = 'straight';
  advance(sim, 4);
  sim.params.turn = -1;
  let previous = sim.omega;
  advance(sim, 4, (s) => {
    assert.ok(Math.abs(s.omega - previous) <= 1.15 * FIXED_STEP + 1e-10);
    previous = s.omega;
  });
  assert.ok(sim.omega < 0);
});

test('default cruise includes repeated active and low-effort phases', () => {
  const sim = new FishSimulation();
  sim.mode = 'straight';
  let active = 0;
  let recovering = 0;
  advance(sim, 30, (s) => {
    if (s.effort > 0.65) active++;
    if (s.effort < 0.22) recovering++;
  });
  assert.ok(active > 120, `active steps: ${active}`);
  assert.ok(recovering > 120, `low-effort steps: ${recovering}`);
});

test('head path guides the tail through a turn after forward travel', () => {
  const sim = new FishSimulation({ turn: 0.8, wander: 0 });
  sim.mode = 'straight';
  advance(sim, 5);
  const earlier = sim.past(BODY_LENGTH);
  assert.ok(Math.abs(earlier.yaw - sim.yaw) > 0.15);
  assert.ok(Math.abs(sim.spine[0].z - sim.spine[JOINT_COUNT - 1].z) > 0.1);
});

test('long exploration stays finite and near the bounded study area', () => {
  const sim = new FishSimulation();
  let maximumRadius = 0;
  advance(sim, 300, (s) => {
    assert.ok([s.x, s.y, s.z, s.speed, s.phase, s.omega, s.effort].every(Number.isFinite));
    maximumRadius = Math.max(maximumRadius, Math.hypot(s.x, s.z));
  });
  assert.ok(maximumRadius < 18, `maximum radius: ${maximumRadius}`);
});

test('generated fish has finite vertices and normals across changing poses', () => {
  const sim = new FishSimulation();
  const scene = new THREE.Scene();
  const fish = new ProceduralFish(scene, sim);
  for (const turn of [-1, 0, 1]) {
    sim.params.turn = turn;
    sim.params.amplitude = 1.6;
    advance(sim, 3);
    fish.update();
    for (const g of [fish.geometry, ...fish.fins.map((f) => f.geometry)]) {
      for (const name of ['position', 'normal']) {
        assert.ok([...g.attributes[name].array].every(Number.isFinite), name);
      }
    }
  }
  const top = Math.round(0.3 * (fish.rings - 1)) * fish.radials + fish.radials / 4;
  assert.ok(fish.geometry.attributes.normal.getY(top) > 0.8, 'back normals should face out');
  for (let i = 0; i <= 100; i++) assert.ok(profile(i / 100).every((v) => v > 0));
});

test('pond geometry retains body landmarks and animated fin shape at lower cost', () => {
  const sim = new FishSimulation({ turn: .6, amplitude: 1.1 });
  const full = new ProceduralFish(new THREE.Scene(), sim);
  const pond = new ProceduralFish(new THREE.Scene(), sim, 'pond');
  full.setStyle('ink'); pond.setStyle('ink');
  assert.ok(pond.geometry.attributes.position.count < full.geometry.attributes.position.count * .3);
  for (let pose = 0; pose < 20; pose++) {
    advance(sim, .1); full.update(); pond.update();
    const a = full.geometry.attributes.position, b = pond.geometry.attributes.position;
    for (let i = 0; i < pond.rings; i++) for (let j = 0; j < pond.radials; j++) for (const key of ['getX', 'getY', 'getZ']) {
      assert.equal(b[key](i * pond.radials + j), a[key](i * 2 * full.radials + j * 2));
    }
    for (let i = 0; i < pond.fins.length; i++) for (const u of [0, .25, .5, .75, 1]) for (const v of [0, .5, 1]) {
      const a = full.finPoint(full.fins[i].spec, u, v).clone();
      const b = pond.finPoint(pond.fins[i].spec, u, v).clone();
      assert.ok(a.distanceTo(b) < 1e-10);
    }
    assert.ok([...pond.geometry.attributes.normal.array].every(Number.isFinite));
  }
  full.dispose(); pond.dispose();
});
