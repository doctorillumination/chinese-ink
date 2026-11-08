import * as THREE from '../vendor/three.module.js';
import { FishSimulation, BODY_LENGTH, DEFAULTS, FIXED_STEP, JOINT_COUNT, clamp } from './simulation.mjs';
import { ProceduralFish } from './fish.mjs';

const $ = (id) => document.getElementById(id);
const sim = new FishSimulation();
const state = { paused: matchMedia('(prefers-reduced-motion: reduce)').matches, slow: false, follow: true, trail: true };
let renderer;

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor('#e6ebe6');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('scene').append(renderer.domElement);
} catch (error) {
  $('error').hidden = false;
  $('error-detail').textContent = error.message;
  for (const button of document.querySelectorAll('.playback button')) button.disabled = true;
  throw error;
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#e6ebe6', 32, 75);
scene.add(new THREE.HemisphereLight('#f7f8ed', '#677e70', 2.2));
const sun = new THREE.DirectionalLight('#fff6df', 3.1);
sun.position.set(-3, 8, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.1, far: 30 });
sun.shadow.normalBias = 0.025;
sun.shadow.bias = -0.00025;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#b7d1d2', 0.9);
fill.position.set(2, 2, -5);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#dce4d9', roughness: 1, metalness: 0 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.03;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(120, 120, '#bccdbc', '#cad7c7');
grid.position.y = -1.025;
grid.material.transparent = true;
grid.material.opacity = 0.26;
scene.add(grid);

const fish = new ProceduralFish(scene, sim);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(360 * 3), 3).setUsage(THREE.DynamicDrawUsage));
const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: '#82978a', transparent: true, opacity: 0.31 }));
trail.frustumCulled = false;
scene.add(trail);
const targetMarker = new THREE.Group();
const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.183, 48), new THREE.MeshBasicMaterial({ color: '#a26c47', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
targetMarker.add(ring);
const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: '#a26c47' }));
targetMarker.add(dot);
targetMarker.visible = false;
scene.add(targetMarker);

const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 150);
const cameraTarget = new THREE.Vector3(-BODY_LENGTH * 0.44, 0, 0);
const cameraState = { azimuth: 0.2, polar: 0.68, span: 6.1 };
const viewPresets = {
  oblique: { azimuth: 0.2, polar: 0.68, span: 6.1 },
  top: { azimuth: 0, polar: 0.015, span: 6.1 },
  side: { azimuth: 0, polar: 1.46, span: 5.6 },
};
let aspect = 1;
function resize() {
  const rect = $('scene').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  aspect = rect.width / rect.height;
  renderer.setSize(rect.width, rect.height);
  updateProjection();
}
function updateProjection() {
  const height = Math.max(cameraState.span * (aspect < 0.9 ? 1.24 : 1), 4.6 / aspect);
  const width = height * aspect;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
}
function updateCamera(dt) {
  if (state.follow) {
    const forward = new THREE.Vector3(Math.cos(sim.yaw), 0, Math.sin(sim.yaw));
    const center = new THREE.Vector3(sim.x, sim.y, sim.z).addScaledVector(forward, -BODY_LENGTH * 0.43);
    cameraTarget.lerp(center, 1 - Math.exp(-dt * 7));
  }
  const { azimuth, polar } = cameraState;
  camera.position.set(
    cameraTarget.x + 18 * Math.sin(polar) * Math.sin(azimuth),
    cameraTarget.y + 18 * Math.cos(polar),
    cameraTarget.z + 18 * Math.sin(polar) * Math.cos(azimuth),
  );
  camera.lookAt(cameraTarget);
  // Move the reference floor in whole tiles so straight swimming stays readable.
  grid.position.x = Math.round(cameraTarget.x);
  grid.position.z = Math.round(cameraTarget.z);
  floor.position.x = grid.position.x;
  floor.position.z = grid.position.z;
  sun.position.set(sim.x - 3, 8, sim.z + 4);
  sun.target.position.set(sim.x - 1.5, 0, sim.z);
}
new ResizeObserver(resize).observe($('scene'));
for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    Object.assign(cameraState, viewPresets[button.dataset.view]);
    updateProjection();
    for (const item of document.querySelectorAll('[data-view]')) {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    }
  });
}

const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointerWorld = new THREE.Vector3();
function steerAt(event, persistent = false) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(plane, pointerWorld)) {
    // A side view can intersect a distant plane. Keep input local to the fish.
    const offset = pointerWorld.clone().sub(new THREE.Vector3(sim.x, 0, sim.z));
    if (offset.length() > 14) offset.setLength(14);
    sim.setTarget(sim.x + offset.x, sim.z + offset.z, persistent);
    if (sim.mode === 'straight') {
      sim.mode = 'wander';
      $('mode').value = sim.mode;
    }
  }
}

const pointers = new Map();
let gesture = null;
let pinchDistance = 0;
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  renderer.domElement.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  gesture = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, multiple: pointers.size > 1 };
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    const distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (pinchDistance > 0 && distance > 0) cameraState.span = clamp(cameraState.span * pinchDistance / distance, 3.8, 18);
    pinchDistance = distance;
    gesture.multiple = true;
    gesture.moved = true;
    updateProjection();
    return;
  }
  if (gesture && pointers.has(event.pointerId)) {
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 5) gesture.moved = true;
    if (gesture.moved) {
      cameraState.azimuth -= dx * 0.006;
      cameraState.polar = clamp(cameraState.polar - dy * 0.005, 0.015, 1.51);
      for (const item of document.querySelectorAll('[data-view]')) {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      }
    }
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  } else if (sim.mode === 'pointer' && event.pointerType !== 'touch') {
    steerAt(event, true);
  }
});
function releasePointer(event, cancelled = false) {
  if (!cancelled && gesture && !gesture.moved && !gesture.multiple) steerAt(event, sim.mode === 'pointer');
  pointers.delete(event.pointerId);
  if (!pointers.size) gesture = null;
  pinchDistance = 0;
}
renderer.domElement.addEventListener('pointerup', (event) => releasePointer(event));
renderer.domElement.addEventListener('pointercancel', (event) => releasePointer(event, true));
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  cameraState.span = clamp(cameraState.span * Math.exp(event.deltaY * 0.001), 3.8, 18);
  updateProjection();
}, { passive: false });
$('mode').addEventListener('change', () => {
  sim.mode = $('mode').value;
  sim.target = null;
});

const formatters = {
  speed: (v) => `${v.toFixed(2)} BL/s`,
  amplitude: (v) => `${v.toFixed(2)}×`,
  rhythm: (v) => `${Math.round(v * 100)}%`,
  turn: (v) => Math.abs(v) < 0.01 ? 'Neutral' : `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'left' : 'right'}`,
  tempo: (v) => `${v.toFixed(2)}×`,
  stiffness: (v) => `${Math.round(v * 100)}%`,
  drag: (v) => `${Math.round(v * 100)}%`,
  wander: (v) => `${Math.round(v * 100)}%`,
};
function updateSliders() {
  for (const name of Object.keys(DEFAULTS)) {
    const input = $(name);
    const value = sim.params[name];
    input.value = value;
    $(name + '-value').textContent = formatters[name](value);
    input.style.setProperty('--fill', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  }
}
function clearPreset() {
  for (const button of document.querySelectorAll('[data-preset]')) {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  }
}
for (const name of Object.keys(DEFAULTS)) {
  $(name).addEventListener('input', (event) => {
    sim.params[name] = Number(event.target.value);
    updateSliders();
    clearPreset();
  });
}
const presets = {
  calm: { ...DEFAULTS, speed: 0.25, rhythm: 0.94, amplitude: 0.78, tempo: 0.85, wander: 0.5 },
  cruise: { ...DEFAULTS },
  turn: { ...DEFAULTS, speed: 0.34, turn: 0.7, wander: 0, rhythm: 0.55 },
};
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    Object.assign(sim.params, presets[button.dataset.preset]);
    sim.mode = button.dataset.preset === 'turn' ? 'straight' : 'wander';
    sim.target = null;
    $('mode').value = sim.mode;
    clearPreset();
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    updateSliders();
  });
}

function updateInspection() {
  fish.setInspection({ spine: $('spine').checked, translucent: $('translucent').checked, wireframe: $('wireframe').checked });
  state.trail = $('trail').checked;
  state.follow = $('follow').checked;
  trail.visible = state.trail;
  $('spine-caption').textContent = $('spine').checked ? `${JOINT_COUNT} spine points` : 'Spine hidden';
}
for (const name of ['spine', 'translucent', 'wireframe', 'trail', 'follow']) $(name).addEventListener('change', updateInspection);
function updatePlayback() {
  $('play-icon').textContent = state.paused ? '▷' : 'Ⅱ';
  $('play-label').textContent = state.paused ? 'Play' : 'Pause';
  $('pause').setAttribute('aria-label', state.paused ? 'Resume swimming' : 'Pause swimming');
  $('slow').setAttribute('aria-pressed', String(state.slow));
}
function togglePause() {
  state.paused = !state.paused;
  accumulator = 0;
  updatePlayback();
}
$('pause').addEventListener('click', togglePause);
$('slow').addEventListener('click', () => { state.slow = !state.slow; updatePlayback(); });
$('burst').addEventListener('click', () => { sim.burst(); if (state.paused) togglePause(); });
$('glide').addEventListener('click', () => { sim.glide(); if (state.paused) togglePause(); });
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'SUMMARY', 'TEXTAREA'].includes(event.target.tagName)) {
    event.preventDefault();
    togglePause();
  }
});
$('panel-toggle').addEventListener('click', () => {
  const hidden = document.body.classList.toggle('controls-hidden');
  $('panel-toggle').setAttribute('aria-expanded', String(!hidden));
  $('panel-toggle').setAttribute('aria-label', hidden ? 'Show controls' : 'Hide controls');
  requestAnimationFrame(resize);
});

const samples = [];
let lastSample = -Infinity;
const graph = $('motion-graph').getContext('2d');
function drawGraph() {
  const w = graph.canvas.width;
  const h = graph.canvas.height;
  graph.clearRect(0, 0, w, h);
  graph.strokeStyle = '#7a8d7220';
  graph.lineWidth = 1;
  graph.beginPath(); graph.moveTo(0, h - 3); graph.lineTo(w, h - 3); graph.stroke();
  for (const [key, color] of [['speed', '#4f6f60'], ['effort', '#bb835f']]) {
    graph.strokeStyle = color;
    graph.lineWidth = 1.5;
    graph.beginPath();
    samples.forEach((sample, i) => {
      const x = w - (sim.time - sample.time) / 12 * w;
      const y = h - 3 - clamp(sample[key] / (key === 'speed' ? 1.3 : 1), 0, 1) * (h - 7);
      if (i) graph.lineTo(x, y); else graph.moveTo(x, y);
    });
    graph.stroke();
  }
}
function updateTelemetry() {
  Object.assign($('scene').dataset, {
    simulationTime: sim.time.toFixed(4), speed: (sim.speed / BODY_LENGTH).toFixed(5),
    effort: sim.effort.toFixed(5), x: sim.x.toFixed(5), z: sim.z.toFixed(5),
    heading: sim.yaw.toFixed(5), fps: measuredFps.toFixed(1),
  });
  $('swim-state').textContent = state.paused ? 'Paused' : sim.state;
  $('state-dot').style.background = state.paused ? '#8b9883' : sim.effort < 0.22 ? '#a58c62' : '#57765e';
  $('speed-readout').innerHTML = `${(sim.speed / BODY_LENGTH).toFixed(2)} <small>BL/s</small>`;
  const hz = sim.frequency * (0.55 + sim.effort * 0.45);
  $('tempo-readout').innerHTML = `${hz.toFixed(2)} <small>Hz</small>`;
  $('effort-readout').innerHTML = `${Math.round(sim.effort * 100)} <small>%</small>`;
  if (sim.time - lastSample >= 0.08) {
    samples.push({ time: sim.time, speed: sim.speed / BODY_LENGTH, effort: sim.effort });
    lastSample = sim.time;
    while (samples.length && samples[0].time < sim.time - 12) samples.shift();
  }
  drawGraph();
}
function updateTrail() {
  const attribute = trailGeometry.attributes.position;
  const h = sim.history.filter((point) => point.d >= 0);
  const count = Math.min(attribute.count - 1, h.length);
  for (let i = 0; i < count; i++) {
    const point = h[Math.max(0, h.length - count + i)];
    attribute.setXYZ(i, point.x, -0.82, point.z);
  }
  attribute.setXYZ(count, sim.x, -0.82, sim.z);
  attribute.needsUpdate = true;
  trailGeometry.setDrawRange(0, count + 1);
}

function reset() {
  Object.assign(sim.params, DEFAULTS);
  sim.mode = 'wander';
  $('mode').value = sim.mode;
  sim.reset();
  accumulator = 0;
  state.paused = false;
  state.slow = false;
  samples.length = 0;
  lastSample = -Infinity;
  cameraTarget.set(-BODY_LENGTH * 0.44, 0, 0);
  Object.assign(cameraState, viewPresets.oblique);
  for (const name of ['spine', 'trail', 'follow']) $(name).checked = true;
  for (const name of ['translucent', 'wireframe']) $(name).checked = false;
  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === 'oblique';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  clearPreset();
  const cruise = document.querySelector('[data-preset="cruise"]');
  cruise.classList.add('active');
  cruise.setAttribute('aria-pressed', 'true');
  updateInspection();
  updateSliders();
  updatePlayback();
  updateProjection();
}
$('reset').addEventListener('click', reset);

let accumulator = 0;
let previous = null;
let telemetryClock = 0;
let frames = 0;
let elapsedReal = 0;
let measuredFps = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const realDelta = previous === null ? 0 : Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (document.hidden) return;
  frames++;
  elapsedReal += realDelta;
  if (elapsedReal > 1) { measuredFps = frames / elapsedReal; frames = 0; elapsedReal = 0; }
  if (!state.paused) {
    accumulator += realDelta * (state.slow ? 0.35 : 1);
    while (accumulator + 1e-10 >= FIXED_STEP) {
      sim.step(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  }
  fish.update();
  updateTrail();
  updateCamera(realDelta || 1 / 60);
  targetMarker.visible = Boolean(sim.target);
  if (sim.target) {
    targetMarker.position.set(sim.target.x, 0.02, sim.target.z);
    ring.scale.setScalar(1 + 0.12 * Math.sin(sim.time * 3));
  }
  telemetryClock += realDelta;
  if (telemetryClock > 0.08) { updateTelemetry(); telemetryClock = 0; }
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { previous = null; accumulator = 0; });
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  state.paused = true;
  updatePlayback();
  $('error').hidden = false;
  $('error-detail').textContent = 'The graphics context was interrupted. Reload this file to restart the study.';
});

// Expose the study for local inspection and reproducible verification.
window.__swimStudy = {
  sim, fish, state, renderer, scene, camera, reset,
  snapshot: () => ({
    time: sim.time, position: [sim.x, sim.y, sim.z], speed: sim.speed / BODY_LENGTH,
    effort: sim.effort, omega: sim.omega, phase: sim.phase, state: sim.state,
    spine: sim.spine.map((p) => [p.x, p.y, p.z]), fps: measuredFps,
    triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
  }),
};
resize();
updateCamera(1);
updateSliders();
updateInspection();
updatePlayback();
updateTelemetry();
requestAnimationFrame(animate);
