import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { SchoolSimulation } from '../src/school.mjs';
import { FIXED_STEP } from '../src/simulation.mjs';

test('the fixed view stays inhabited while individual fish can leave the frame', () => {
  const school = new SchoolSimulation();
  // This narrow frame is contained in both the wider and taller default views.
  const camera = new THREE.OrthographicCamera(-5.5, 5.5, 8.5, -8.5, .1, 150);
  camera.position.set(0, 45 * Math.cos(.15), 45 * Math.sin(.15));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const point = new THREE.Vector3();
  let samples = 0, visibleTotal = 0, partial = 0, emptyRun = 0, longestEmpty = 0;
  for (let i = 0; i < 180 / FIXED_STEP; i++) {
    school.step();
    if (i % 30) continue;
    let visible = 0;
    for (const fish of school.fish) {
      fish.updateSpine();
      if (fish.spine.some((p) => frustum.containsPoint(point.set(p.x, p.y, p.z)))) visible++;
    }
    samples++;
    visibleTotal += visible;
    if (visible < school.fish.length) partial++;
    emptyRun = visible === 0 ? emptyRun + .25 : 0;
    longestEmpty = Math.max(longestEmpty, emptyRun);
  }
  assert.ok(longestEmpty <= 2, `longest empty view: ${longestEmpty} seconds`);
  assert.ok(visibleTotal / samples >= 3, `mean visible fish: ${visibleTotal / samples}`);
  assert.ok(partial > samples * .05, 'fish must still be able to swim outside the frame');
});
