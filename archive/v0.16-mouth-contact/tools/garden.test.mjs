import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { InkGarden } from '../src/ink-garden.mjs';
import { WaterSurface, RIPPLE_SPEED } from '../src/water.mjs';

function view() {
  const camera = new THREE.OrthographicCamera(-12.75, 12.75, 8.5, -8.5, .1, 150);
  camera.position.set(0, 45 * Math.cos(.15), 45 * Math.sin(.15));
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return camera;
}
function centre(garden, pair) {
  const p = garden.stems.geometry.attributes.position;
  return new THREE.Vector3((p.getX(pair) + p.getX(pair + 1)) / 2, (p.getY(pair) + p.getY(pair + 1)) / 2, (p.getZ(pair) + p.getZ(pair + 1)) / 2);
}
function leafPoint(garden, index) {
  return new THREE.Vector3().fromBufferAttribute(garden.leaves.geometry.attributes.aOrigin, index);
}
function dispose(garden) {
  for (const mesh of [garden.leaves, garden.stems, garden.submerged, garden.food]) mesh.geometry.dispose();
  garden.leafMaterial.dispose(); garden.stemMaterial.dispose();
}

test('painted leaves and petioles stay joined to their moving branches', () => {
  const garden = new InkGarden(), camera = view();
  for (const time of [0, 7, 23, 61]) {
    garden.update(camera, time);
    assert.equal(garden.attachments.length, 10);
    for (const joint of garden.branchJoints) {
      assert.ok(centre(garden, joint.parentPair).distanceTo(centre(garden, joint.childPair)) < .000005, `branch joint at ${time}s`);
    }
    for (const attachment of garden.attachments) {
      assert.equal(garden.leaves.geometry.attributes.aAxis.getY(attachment.leafIndex), 0, 'leaf rotation must pivot at its painted base');
      assert.ok(leafPoint(garden, attachment.leafIndex).distanceTo(centre(garden, attachment.stemEndPair)) < .000005, `leaf joint at ${time}s`);
    }
  }
  dispose(garden);
});

test('pads and debris drift smoothly while rooted plants remain anchored and pause holds the pose', () => {
  const garden = new InkGarden(), camera = view();
  garden.update(camera, 0);
  const root = centre(garden, garden.strokes[0].start);
  const free = garden.leafRecords.flatMap((leaf, index) => leaf.free ? [index] : []);
  const initial = free.map((index) => leafPoint(garden, index));
  assert.equal(free.length, 33);
  assert.equal(garden.leafCount, 47);
  assert.equal(garden.submergedRecords.length, 24);
  assert.ok(garden.submergedRecords.every((leaf) => leaf.depth > .6 && leaf.point.y < -.9));
  garden.update(camera, 20);
  const moved = free.map((index, i) => leafPoint(garden, index).distanceTo(initial[i]));
  assert.ok(Math.max(...moved) > .15, 'floating objects should visibly drift');
  assert.ok(Math.max(...moved) < 2, 'drift stays gentle and local');
  assert.ok(centre(garden, garden.strokes[0].start).distanceTo(root) < .000001);
  const before = free.map((index) => leafPoint(garden, index));
  garden.update(camera, 20.1);
  for (let i = 0; i < free.length; i++) assert.ok(leafPoint(garden, free[i]).distanceTo(before[i]) < .03);
  const paused = Array.from(garden.leaves.geometry.attributes.aOrigin.array);
  garden.update(camera, 20.1);
  assert.deepEqual(Array.from(garden.leaves.geometry.attributes.aOrigin.array), paused);
  dispose(garden);
});

test('passing ripples carry pads and keep all painted leaf junctions connected', () => {
  const garden = new InkGarden(), camera = view(), water = new WaterSurface();
  garden.update(camera, 0);
  const freeIndex = garden.leafRecords.findIndex((leaf) => leaf.free);
  const anchor = garden.leafRecords[freeIndex].point;
  const root = centre(garden, garden.strokes[0].start);
  water.add(anchor.x - RIPPLE_SPEED, anchor.z, 0);
  let displacement = 0;
  for (let time = .5; time < 2; time += .05) {
    garden.update(camera, time);
    const before = leafPoint(garden, freeIndex);
    water.update(time); garden.update(camera, time, water.ripples);
    const food = { x: 1.25, z: -.7, seed: 9, size: .06, fade: 1 };
    garden.updateFood([food], time);
    assert.ok(Math.abs(garden.food.geometry.attributes.aOrigin.getX(0) - food.x) < .000001);
    assert.ok(Math.abs(garden.food.geometry.attributes.aOrigin.getZ(0) - food.z) < .000001);
    displacement = Math.max(displacement, leafPoint(garden, freeIndex).distanceTo(before));
    assert.ok(centre(garden, garden.strokes[0].start).distanceTo(root) < .000001);
    for (const joint of garden.branchJoints) assert.ok(centre(garden, joint.parentPair).distanceTo(centre(garden, joint.childPair)) < .000005);
    for (const joint of garden.attachments) assert.ok(leafPoint(garden, joint.leafIndex).distanceTo(centre(garden, joint.stemEndPair)) < .000005);
  }
  assert.ok(displacement > .15);
  dispose(garden);
});
