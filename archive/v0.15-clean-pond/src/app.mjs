import * as THREE from '../vendor/three.module.js';
import { FIXED_STEP } from './simulation.mjs';
import { SchoolSimulation } from './school.mjs';
import { ProceduralFish } from './fish.mjs';
import { InkRenderer } from './ink-renderer.mjs';

const surface = document.getElementById('scene');
const school = new SchoolSimulation();
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  surface.append(renderer.domElement);
} catch (error) {
  document.getElementById('error').hidden = false;
  throw error;
}
const ink = new InkRenderer(renderer);
const scene = new THREE.Scene();
const models = school.fish.map((fish) => {
  const model = new ProceduralFish(scene, fish, 'pond');
  model.setStyle('ink');
  model.setInspection({ spine: false, translucent: false, wireframe: false });
  return model;
});
const camera = new THREE.OrthographicCamera(-5, 5, 8.5, -8.5, .1, 150);
camera.up.set(0, 0, -1);
camera.position.set(0, 45, 0);
camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
function resize() {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const aspect = rect.width / rect.height, height = Math.max(17, 11 / aspect);
  camera.left = -height * aspect / 2; camera.right = height * aspect / 2;
  camera.top = height / 2; camera.bottom = -height / 2; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, Math.sqrt(3800000 / (rect.width * rect.height))));
  renderer.setSize(rect.width, rect.height);
  ink.resize(rect.width, rect.height, renderer.getPixelRatio());
}
new ResizeObserver(resize).observe(surface);

const raycaster = new THREE.Raycaster(), water = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3(), pointer = new THREE.Vector2();
function atPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(water, hit);
}
const gestures = new Map();
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  renderer.domElement.setPointerCapture(event.pointerId);
  const multiple = gestures.size > 0;
  if (multiple) for (const gesture of gestures.values()) gesture.multiple = true;
  gestures.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: false, multiple });
  if (atPointer(event)) ink.ripple(hit.x, hit.z, school.time);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  const gesture = gestures.get(event.pointerId);
  if (!gesture) return;
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5) gesture.moved = true;
  if (gesture.moved && atPointer(event)) ink.ripple(hit.x, hit.z, school.time, .6);
});
function release(event, cancelled = false) {
  const gesture = gestures.get(event.pointerId);
  if (!cancelled && gesture && !gesture.moved && !gesture.multiple && atPointer(event)) school.feed(hit.x, hit.z);
  gestures.delete(event.pointerId);
}
renderer.domElement.addEventListener('pointerup', (event) => release(event));
renderer.domElement.addEventListener('pointercancel', (event) => release(event, true));
renderer.domElement.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
surface.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); school.feed(0, 0); ink.ripple(0, 0, school.time); }
});

let previous = null, accumulator = 0, frames = 0, frameWindow = 0, measuredFps = 0, diagnosticClock = 0;
const cost = { simulation: 0, models: 0, render: 0 };
function diagnostics() {
  Object.assign(surface.dataset, {
    version: '0.15', simulationTime: school.time.toFixed(4), count: String(school.fish.length),
    fps: measuredFps.toFixed(1), simulationMs: cost.simulation.toFixed(2), modelMs: cost.models.toFixed(2), renderMs: cost.render.toFixed(2),
    rendering: 'ink', geometryDetail: 'pond', inkPrecision: ink.precision,
    foodPieces: String(school.food.remaining), foodEaten: String(school.food.eaten),
    feedingFish: String(school.fish.filter((fish) => fish.foodGoal).length),
    automaticRipples: String(ink.water.ambientCount), rippleCount: String(ink.water.count),
    surfaceLeaves: String(ink.garden.leafCount), submergedObjects: String(ink.garden.submergedRecords.length),
    cameraTracking: 'false', cameraPosition: camera.position.toArray().map((v) => v.toFixed(6)).join(','),
    cameraRotation: camera.quaternion.toArray().map((v) => v.toFixed(6)).join(','),
    cameraFrame: [camera.left, camera.right, camera.top, camera.bottom].map((v) => v.toFixed(6)).join(','),
    viewport: `${surface.clientWidth},${surface.clientHeight}`,
  });
}
function animate(now) {
  requestAnimationFrame(animate);
  const wall = previous === null ? 0 : Math.max(0, (now - previous) / 1000); previous = now;
  if (document.hidden) return;
  frameWindow += wall; frames++;
  if (frameWindow > 1) { measuredFps = frames / frameWindow; frameWindow = 0; frames = 0; }
  const start = performance.now();
  accumulator += Math.min(wall, .1);
  while (accumulator + 1e-10 >= FIXED_STEP) { school.step(FIXED_STEP); accumulator -= FIXED_STEP; }
  const modelStart = performance.now(); cost.simulation += (modelStart - start - cost.simulation) * .08;
  for (const model of models) { model.depthAmount = ink.params.depth; model.update(); }
  const renderStart = performance.now(); cost.models += (renderStart - modelStart - cost.models) * .08;
  ink.render(scene, camera, school);
  cost.render += (performance.now() - renderStart - cost.render) * .08;
  diagnosticClock += wall;
  if (diagnosticClock >= 1) { diagnostics(); diagnosticClock = 0; }
}
document.addEventListener('visibilitychange', () => { previous = null; accumulator = 0; frameWindow = 0; frames = 0; });
renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); document.getElementById('error').hidden = false; });
resize(); diagnostics(); requestAnimationFrame(animate);
