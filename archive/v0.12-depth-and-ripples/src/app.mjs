import * as THREE from '../vendor/three.module.js';
import { FIXED_STEP, clamp } from './simulation.mjs';
import { ProceduralFish } from './fish.mjs';
import { SchoolSimulation, SCHOOL_DEFAULTS, SCHOOL_MOTION, bodySamples, closestBodies } from './school.mjs';
import { InkRenderer } from './ink-renderer.mjs';

const $ = (id) => document.getElementById(id);
const school = new SchoolSimulation();
const state = { paused: matchMedia('(prefers-reduced-motion: reduce)').matches, slow: false, follow: false, trail: false, focus: 'all', rendering: 'ink', artwork: false };
let models = [];
let renderer;

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
const ink = new InkRenderer(renderer);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#e6ebe6', 32, 75);
scene.add(new THREE.HemisphereLight('#f7f8ed', '#677e70', 2.2));
const sun = new THREE.DirectionalLight('#fff6df', 3.1);
sun.position.set(-3, 8, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 0.1, far: 50 });
sun.shadow.normalBias = 0.025;
sun.shadow.bias = -0.00025;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#b7d1d2', 0.9);
fill.position.set(2, 2, -5);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#dce4d9', roughness: 1, metalness: 0 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.8;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(120, 120, '#bccdbc', '#cad7c7');
grid.position.y = -1.795;
grid.material.transparent = true;
grid.material.opacity = 0.26;
scene.add(grid);

function rebuildModels() {
  for (const model of models) model.dispose();
  models = school.fish.map((fish) => new ProceduralFish(scene, fish));
  for (const model of models) model.setStyle(state.rendering);
  $('focus').replaceChildren(new Option('Whole school', 'all'), ...school.fish.map((fish) => new Option(`Fish ${String(fish.id + 1).padStart(2, '0')}`, String(fish.id))));
  if (state.focus !== 'all' && Number(state.focus) >= models.length) state.focus = 'all';
  $('focus').value = state.focus;
}
rebuildModels();
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 360 * 6), 3).setUsage(THREE.DynamicDrawUsage));
const trail = new THREE.LineSegments(trailGeometry, new THREE.LineBasicMaterial({ color: '#82978a', transparent: true, opacity: 0.24 }));
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
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraState = { azimuth: 0, polar: 0.15, span: 17, zoom: 1 };
const viewPresets = {
  oblique: { azimuth: 0.2, polar: 0.68, span: 17, zoom: 1 },
  top: { azimuth: 0, polar: 0.15, span: 17, zoom: 1 },
  side: { azimuth: 0, polar: 1.46, span: 17, zoom: 1 },
};
let aspect = 1;
let viewportWidth = 956, viewportHeight = 720;
function resize() {
  const rect = $('scene').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  aspect = rect.width / rect.height;
  viewportWidth = rect.width;
  viewportHeight = rect.height;
  renderer.setSize(rect.width, rect.height);
  ink.resize(rect.width, rect.height, renderer.getPixelRatio());
  updateProjection();
}
function updateProjection() {
  const height = Math.max(cameraState.span * cameraState.zoom, (state.follow && state.focus !== 'all' ? 4.6 : 11) / aspect);
  const width = height * aspect;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
}
function updateCamera(dt) {
  const selected = state.focus === 'all' ? null : school.fish[Number(state.focus)];
  const center = selected ? school.center(selected) : school.centroid;
  if (state.follow) {
    const target = new THREE.Vector3(center.x, selected?.y ?? 0, center.z);
    let needed = selected ? 6.1 * selected.scale : 13;
    if (!selected) {
      const rightX = Math.cos(cameraState.azimuth), rightZ = -Math.sin(cameraState.azimuth);
      const upX = -Math.cos(cameraState.polar) * Math.sin(cameraState.azimuth);
      const upZ = -Math.cos(cameraState.polar) * Math.cos(cameraState.azimuth);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const fish of school.fish) for (const point of fish.spine) {
        const dx = point.x - center.x, dz = point.z - center.z;
        const x = dx * rightX + dz * rightZ;
        const y = dx * upX + dz * upZ + point.y * Math.sin(cameraState.polar);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const top = Math.min(180, viewportHeight * 0.23);
      const bottom = Math.min(235, viewportHeight * 0.31);
      const usableHeight = 1 - (top + bottom) / viewportHeight;
      const usableWidth = Math.max(0.7, 1 - 70 / viewportWidth);
      needed = Math.max(13, (maxX - minX + 1.8) / (aspect * usableWidth), (maxY - minY + 1.8) / usableHeight);
      const projectedX = (maxX + minX) / 2;
      const projectedY = (maxY + minY) / 2 - (bottom - top) / (2 * viewportHeight) * needed;
      target.add(new THREE.Vector3(rightX, 0, rightZ).multiplyScalar(projectedX));
      target.add(new THREE.Vector3(upX, Math.sin(cameraState.polar), upZ).multiplyScalar(projectedY));
    }
    cameraTarget.lerp(target, 1 - Math.exp(-dt * 3));
    cameraState.span += (needed - cameraState.span) * (1 - Math.exp(-dt * (needed > cameraState.span ? 4 : 0.8)));
    updateProjection();
  }
  const { azimuth, polar } = cameraState;
  camera.position.set(
    cameraTarget.x + 45 * Math.sin(polar) * Math.sin(azimuth),
    cameraTarget.y + 45 * Math.cos(polar),
    cameraTarget.z + 45 * Math.sin(polar) * Math.cos(azimuth),
  );
  camera.lookAt(cameraTarget);
  // Move the reference floor in whole tiles so straight swimming stays readable.
  grid.position.x = Math.round(cameraTarget.x);
  grid.position.z = Math.round(cameraTarget.z);
  floor.position.x = grid.position.x;
  floor.position.z = grid.position.z;
  sun.position.set(center.x - 4, 12, center.z + 6);
  sun.target.position.set(center.x, 0, center.z);
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
function projectPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(plane, pointerWorld);
}
function disturbAt(event, strength = 1) {
  if (projectPointer(event)) ink.ripple(pointerWorld.x, pointerWorld.z, school.time, strength);
}
function steerAt(event, persistent = false) {
  if (projectPointer(event)) {
    // A side view can intersect a distant plane. Keep input local to the fish.
    const center = school.centroid;
    const offset = pointerWorld.clone().sub(new THREE.Vector3(center.x, 0, center.z));
    if (offset.length() > 20) offset.setLength(20);
    school.setTarget(center.x + offset.x, center.z + offset.z, persistent);
    if (school.mode === 'straight') {
      school.mode = 'wander';
      $('mode').value = school.mode;
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
  if (state.rendering === 'ink') disturbAt(event);
  if (pointers.size === 2 && state.rendering !== 'ink') {
    const p = [...pointers.values()];
    pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (state.rendering === 'ink') {
    if (gesture && pointers.has(event.pointerId)) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 5) {
        gesture.moved = true;
        disturbAt(event, .60);
      }
    } else if (school.mode === 'pointer' && event.pointerType !== 'touch') steerAt(event, true);
    return;
  }
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    const distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (pinchDistance > 0 && distance > 0) cameraState.zoom = clamp(cameraState.zoom * pinchDistance / distance, 0.4, 2.5);
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
  } else if (school.mode === 'pointer' && event.pointerType !== 'touch') {
    steerAt(event, true);
  }
});
function releasePointer(event, cancelled = false) {
  if (!cancelled && gesture && !gesture.moved && !gesture.multiple && (state.rendering !== 'ink' || school.mode === 'pointer')) steerAt(event, school.mode === 'pointer');
  pointers.delete(event.pointerId);
  if (!pointers.size) gesture = null;
  pinchDistance = 0;
}
renderer.domElement.addEventListener('pointerup', (event) => releasePointer(event));
renderer.domElement.addEventListener('pointercancel', (event) => releasePointer(event, true));
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (state.rendering === 'ink') return;
  cameraState.zoom = clamp(cameraState.zoom * Math.exp(event.deltaY * 0.001), 0.4, 2.5);
  updateProjection();
}, { passive: false });
$('mode').addEventListener('change', () => {
  school.mode = $('mode').value;
  school.target = null;
});

const formatters = {
  count: (v) => `${v} fish`,
  cohesion: (v) => `${Math.round(v * 100)}%`,
  alignment: (v) => `${Math.round(v * 100)}%`,
  spacing: (v) => `${v.toFixed(2)} BL`,
  individuality: (v) => `${Math.round(v * 100)}%`,
  liveliness: (v) => `${Math.round(v * 100)}%`,
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
  for (const name of Object.keys(formatters)) {
    const input = $(name);
    const value = name in school.params ? school.params[name] : school.motion[name];
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
for (const name of Object.keys(formatters)) {
  $(name).addEventListener('input', (event) => {
    const params = name in school.params ? school.params : school.motion;
    params[name] = Number(event.target.value);
    if (name === 'count') {
      school.reset(); ink.clear(); rebuildModels(); updateInspection(); samples.length = 0; lastSample = -Infinity;
    }
    updateSliders();
    clearPreset();
  });
}
const presets = {
  loose: { cohesion: 0.24, alignment: 0.35, spacing: 1.35, individuality: 0.9 },
  school: { ...SCHOOL_DEFAULTS },
  independent: { cohesion: 0, alignment: 0, spacing: 1.15, individuality: 1 },
};
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const count = school.params.count;
    Object.assign(school.params, presets[button.dataset.preset], { count });
    school.mode = 'wander';
    school.target = null;
    $('mode').value = school.mode;
    clearPreset();
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    updateSliders();
  });
}

function updateInspection() {
  for (const fish of models) fish.setInspection({ spine: $('spine').checked, translucent: $('translucent').checked, wireframe: $('wireframe').checked });
  state.trail = $('trail').checked;
  state.follow = $('follow').checked;
  trail.visible = state.trail;
  $('spine-caption').textContent = `${school.fish.length} fish / ${$('spine').checked ? 'visible spines' : 'spines hidden'}`;
  $('focus-caption').textContent = state.focus === 'all' ? 'Whole school' : `Fish ${String(Number(state.focus) + 1).padStart(2, '0')}`;
}
$('focus').addEventListener('change', () => {
  state.focus = $('focus').value;
  if (state.follow) cameraState.zoom = 1;
  samples.length = 0; lastSample = -Infinity;
  updateInspection();
});
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
$('scatter').addEventListener('click', () => { school.scatter(); if (state.paused) togglePause(); });
$('regroup').addEventListener('click', () => { school.regroup(); if (state.paused) togglePause(); });
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

function applyRendering() {
  const isInk = state.rendering === 'ink';
  document.body.dataset.rendering = state.rendering;
  floor.visible = grid.visible = !isInk;
  renderer.shadowMap.enabled = !isInk;
  for (const model of models) model.setStyle(state.rendering);
  $('ink-controls').hidden = !isInk;
  $('gesture-hint').innerHTML = isInk ? 'Click for ripples <span>·</span> Drag to stir the water' : 'Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Click to steer';
  $('scene').setAttribute('aria-label', isInk ? 'Ink pond. Click for spreading ripples or drag to stir the water. The camera stays still.' : '3D fish. Drag to orbit, scroll to zoom, or click to steer.');
  for (const button of document.querySelectorAll('button[data-rendering]')) {
    const active = button.dataset.rendering === state.rendering;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  ink.clear();
}
for (const button of document.querySelectorAll('button[data-rendering]')) button.addEventListener('click', () => {
  state.rendering = button.dataset.rendering;
  applyRendering();
});
const inkControls = { 'ink-strength': 'strength', 'ink-bleed': 'bleed', 'ink-trails': 'trails', 'paper-grain': 'paper', 'water-refraction': 'water', 'water-depth': 'depth', 'ripple-ink': 'rippleInk' };
function updateInkControls() {
  for (const [id, key] of Object.entries(inkControls)) {
    const input = $(id), value = ink.params[key];
    input.value = value;
    $(id + '-value').textContent = key === 'strength' ? `${value.toFixed(2)}×` : `${Math.round(value * 100)}%`;
    input.style.setProperty('--fill', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  }
}
for (const [id, key] of Object.entries(inkControls)) $(id).addEventListener('input', () => {
  ink.params[key] = Number($(id).value);
  updateInkControls();
});
function toggleArtwork() {
  state.artwork = !state.artwork;
  document.body.classList.toggle('artwork-view', state.artwork);
  $('artwork').textContent = state.artwork ? 'Show controls' : 'View artwork';
  $('artwork').setAttribute('aria-pressed', String(state.artwork));
  if (!state.artwork) {
    document.body.classList.remove('controls-hidden');
    $('panel-toggle').setAttribute('aria-expanded', 'true');
    $('panel-toggle').setAttribute('aria-label', 'Hide controls');
  }
  $('artwork').focus();
  requestAnimationFrame(resize);
}
$('artwork').addEventListener('click', toggleArtwork);
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) toggleArtwork();
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
      const x = w - (school.time - sample.time) / 12 * w;
      const y = h - 3 - clamp(sample[key] / (key === 'speed' ? 1.3 : 1), 0, 1) * (h - 7);
      if (i) graph.lineTo(x, y); else graph.moveTo(x, y);
    });
    graph.stroke();
  }
}
function updateTelemetry() {
  const metrics = school.metrics;
  const selected = state.focus === 'all' ? null : school.fish[Number(state.focus)];
  const speed = selected ? selected.speed / selected.bodyLength : school.fish.reduce((sum, fish) => sum + fish.speed / fish.bodyLength, 0) / school.fish.length;
  const effort = selected ? selected.effort : school.fish.reduce((sum, fish) => sum + fish.effort, 0) / school.fish.length;
  const center = school.centroid;
  let clearance = Infinity;
  const bodies = school.fish.map(bodySamples);
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) clearance = Math.min(clearance, closestBodies(bodies[i], bodies[j]).clearance);
  Object.assign($('scene').dataset, {
    simulationTime: school.time.toFixed(4), speed: speed.toFixed(5), count: String(school.fish.length),
    effort: effort.toFixed(5), x: center.x.toFixed(5), z: center.z.toFixed(5),
    alignment: metrics.alignment.toFixed(5), spacing: metrics.spacing.toFixed(5),
    clearance: clearance.toFixed(5), focus: state.focus, fps: measuredFps.toFixed(1),
    activities: school.fish.map((fish) => fish.rhythm.state).join(','),
    fluttering: String(school.fish.filter((fish) => fish.activity.flutter > 0.25 && fish.braking < 0.4).length),
    rendering: state.rendering,
    inkPrecision: ink.precision,
    waterRefraction: ink.params.water.toFixed(2),
    waterDepth: ink.params.depth.toFixed(2),
    fishDepths: models.map((model) => model.inkDepth.toFixed(3)).join(','),
    activeRipples: String(ink.ripples.filter((ripple) => ripple.w > 0).length),
    rippleCount: String(ink.water.count),
    pointerAction: state.rendering === 'ink' ? 'water' : 'orbit',
    surfaceLeaves: String(ink.garden.leafCount),
    cameraTracking: String(state.follow),
    cameraPosition: camera.position.toArray().map((v) => v.toFixed(6)).join(','),
    cameraRotation: camera.quaternion.toArray().map((v) => v.toFixed(6)).join(','),
    cameraFrame: [camera.left, camera.right, camera.top, camera.bottom].map((v) => v.toFixed(6)).join(','),
    visibleFish: String(school.fish.filter((fish) => fish.spine.some((point) => {
      const p = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      return Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && Math.abs(p.z) <= 1;
    })).length),
  });
  const groupState = school.time < school.scatterUntil ? 'Scattering' : school.time < school.regroupUntil ? 'Regrouping' : school.params.alignment === 0 && school.params.cohesion === 0 ? 'Independent swimmers' : metrics.alignment > 0.72 ? 'Schooling' : 'Re-forming';
  $('swim-state').textContent = state.paused ? 'Paused' : selected ? `Fish ${String(selected.id + 1).padStart(2, '0')} / ${selected.state.toLowerCase()}` : groupState;
  $('state-dot').style.background = state.paused ? '#8b9883' : '#57765e';
  $('speed-readout').innerHTML = `${speed.toFixed(2)} <small>BL/s</small>`;
  $('second-label').textContent = selected ? 'Tail rhythm' : 'Alignment';
  $('third-label').textContent = selected ? 'Effort' : 'Spacing';
  $('tempo-readout').innerHTML = selected ? `${(selected.frequency * (0.55 + selected.effort * 0.45)).toFixed(2)} <small>Hz</small>` : `${Math.round(metrics.alignment * 100)} <small>%</small>`;
  $('effort-readout').innerHTML = selected ? `${Math.round(effort * 100)} <small>%</small>` : `${metrics.spacing.toFixed(2)} <small>BL</small>`;
  if (school.time - lastSample >= 0.08) {
    samples.push({ time: school.time, speed, effort });
    lastSample = school.time;
    while (samples.length && samples[0].time < school.time - 12) samples.shift();
  }
  drawGraph();
}
function updateTrail() {
  const attribute = trailGeometry.attributes.position;
  let count = 0;
  const visible = state.focus === 'all' ? school.fish : [school.fish[Number(state.focus)]];
  for (const fish of visible) {
    const h = fish.history.filter((point) => point.d >= 0).slice(-359);
    for (let i = 0; i < h.length; i++) {
      const a = h[i];
      const b = h[i + 1] ?? fish;
      attribute.setXYZ(count++, a.x, a.y - 0.15, a.z);
      attribute.setXYZ(count++, b.x, b.y - 0.15, b.z);
    }
  }
  attribute.needsUpdate = true;
  trailGeometry.setDrawRange(0, count);
}

function reset() {
  Object.assign(school.params, SCHOOL_DEFAULTS);
  Object.assign(school.motion, SCHOOL_MOTION);
  school.mode = 'wander';
  $('mode').value = school.mode;
  school.reset();
  state.focus = 'all';
  rebuildModels();
  accumulator = 0;
  state.paused = false;
  state.slow = false;
  samples.length = 0;
  lastSample = -Infinity;
  cameraTarget.set(0, 0, 0);
  Object.assign(cameraState, viewPresets.top);
  $('follow').checked = false;
  for (const name of ['spine', 'translucent', 'wireframe', 'trail']) $(name).checked = false;
  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === 'top';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  clearPreset();
  const cruise = document.querySelector('[data-preset="school"]');
  cruise.classList.add('active');
  cruise.setAttribute('aria-pressed', 'true');
  updateInspection();
  updateSliders();
  updatePlayback();
  updateProjection();
  state.rendering = 'ink';
  Object.assign(ink.params, { strength: 1, bleed: 0.85, trails: 0, paper: 0.65, water: 0.65, depth: .8, rippleInk: .75 });
  applyRendering();
  updateInkControls();
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
      school.step(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  }
  for (const fish of models) { fish.depthAmount = ink.params.depth; fish.update(); }
  if (state.trail) updateTrail();
  updateCamera(realDelta || 1 / 60);
  targetMarker.visible = Boolean(school.target) && state.rendering !== 'ink';
  if (school.target) {
    targetMarker.position.set(school.target.x, 0.02, school.target.z);
    ring.scale.setScalar(1 + 0.12 * Math.sin(school.time * 3));
  }
  telemetryClock += realDelta;
  if (telemetryClock > 0.08) { updateTelemetry(); telemetryClock = 0; }
  if (state.rendering === 'ink') ink.render(scene, camera, school);
  else {
    renderer.setRenderTarget(null);
    renderer.setClearColor('#e6ebe6', 1);
    renderer.render(scene, camera);
  }
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
  school, get models() { return models; }, state, renderer, scene, camera, ink, reset,
  snapshot: () => ({
    time: school.time, metrics: school.metrics,
    fish: school.fish.map((fish) => ({ id: fish.id, position: [fish.x, fish.y, fish.z], speed: fish.speed / fish.bodyLength, effort: fish.effort, omega: fish.omega, phase: fish.phase, state: fish.state, activity: fish.rhythm.state })),
    fps: measuredFps,
    triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
  }),
};
resize();
updateCamera(1);
updateSliders();
updateInspection();
applyRendering();
updateInkControls();
updatePlayback();
updateTelemetry();
requestAnimationFrame(animate);
