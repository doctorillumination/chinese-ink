import * as THREE from '../vendor/three.module.js';
import { fishWaterDepth } from './water.mjs';
import { BODY_LENGTH, JOINT_COUNT, clamp } from './simulation.mjs';
import { createInkMaterial, inkVariantForFish } from './ink-material.mjs';

const mix = (a, b, t) => a + (b - a) * t;
const PROFILE = [
  [0, 0.058, 0.075, 0.058], [0.045, 0.16, 0.14, 0.115],
  [0.13, 0.278, 0.255, 0.205], [0.26, 0.375, 0.345, 0.26],
  [0.38, 0.35, 0.34, 0.245], [0.53, 0.275, 0.285, 0.185],
  [0.68, 0.175, 0.205, 0.13], [0.82, 0.095, 0.12, 0.076],
  [0.94, 0.048, 0.066, 0.048], [1, 0.028, 0.045, 0.035],
];

export function profile(s) {
  s = clamp(s, 0, 1);
  let j = 0;
  while (j < PROFILE.length - 2 && PROFILE[j + 1][0] < s) j++;
  const a = PROFILE[j];
  const b = PROFILE[j + 1];
  const u = (s - a[0]) / (b[0] - a[0]);
  const out = [];
  // Monotone cubic interpolation keeps the profile smooth without overshoot.
  for (let k = 1; k <= 3; k++) {
    const m = (b[k] - a[k]) / (b[0] - a[0]);
    const slope = (index) => {
      if (index === 0) return (PROFILE[1][k] - PROFILE[0][k]) / (PROFILE[1][0] - PROFILE[0][0]);
      if (index === PROFILE.length - 1) return m;
      const l = (PROFILE[index][k] - PROFILE[index - 1][k]) / (PROFILE[index][0] - PROFILE[index - 1][0]);
      const r = (PROFILE[index + 1][k] - PROFILE[index][k]) / (PROFILE[index + 1][0] - PROFILE[index][0]);
      return l * r <= 0 ? 0 : 2 * l * r / (l + r);
    };
    const d = b[0] - a[0];
    out.push((2*u*u*u-3*u*u+1)*a[k]+(u*u*u-2*u*u+u)*d*slope(j)+(-2*u*u*u+3*u*u)*b[k]+(u*u*u-u*u)*d*slope(j+1));
  }
  return out;
}

function dynamicGeometry(count, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  if (indices) g.setIndex(indices);
  return g;
}

export class ProceduralFish {
  constructor(scene, simulation, detail = 'full') {
    this.sim = simulation;
    this.detail = detail;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rings = detail === 'pond' ? 41 : 81;
    this.radials = detail === 'pond' ? 16 : 32;
    const indices = [];
    for (let i = 0; i < this.rings - 1; i++) {
      for (let j = 0; j < this.radials; j++) {
        const a = i * this.radials + j;
        const b = i * this.radials + (j + 1) % this.radials;
        const c = a + this.radials;
        const d = b + this.radials;
        indices.push(a, b, c, b, d, c);
      }
    }
    // Caps close the snout and the tail peduncle.
    const count = this.rings * this.radials;
    for (let j = 0; j < this.radials; j++) {
      indices.push(count, (j + 1) % this.radials, j);
      const base = (this.rings - 1) * this.radials;
      indices.push(count + 1, base + j, base + (j + 1) % this.radials);
    }
    this.geometry = dynamicGeometry(count + 2, indices);
    const colors = new Float32Array((count + 2) * 3);
    const rest = new Float32Array((count + 2) * 3);
    const dark = new THREE.Color('#647672');
    const light = new THREE.Color('#c3c9be');
    for (let i = 0; i < this.rings; i++) {
      for (let j = 0; j < this.radials; j++) {
        const theta = j / this.radials * Math.PI * 2;
        const belly = Math.pow((1 - Math.sin(theta)) / 2, 1.8);
        const color = dark.clone().lerp(light, belly * 0.86);
        color.toArray(colors, (i * this.radials + j) * 3);
        const offset = (i * this.radials + j) * 3;
        rest[offset] = i / (this.rings - 1);
        rest[offset + 1] = Math.cos(theta);
        rest[offset + 2] = Math.sin(theta);
      }
    }
    dark.toArray(colors, count * 3);
    dark.toArray(colors, (count + 1) * 3);
    rest[(count + 1) * 3] = 1;
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aInk', new THREE.BufferAttribute(rest, 3));
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.035 });
    this.body = new THREE.Mesh(this.geometry, this.material);
    this.body.castShadow = true;
    this.body.frustumCulled = false;
    this.group.add(this.body);

    this.finMaterial = new THREE.MeshStandardMaterial({ color: '#8c9e97', roughness: 0.58, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.74, depthWrite: false });
    this.finRaysMaterial = new THREE.LineBasicMaterial({ color: '#536d64', transparent: true, opacity: 0.34 });
    this.fins = [];
    for (const side of [-1, 1]) {
      this.makeFin({ type: 'paired', side, s: 0.26, width: 0.335, height: -0.10, length: 0.64 });
      this.makeFin({ type: 'paired', side, s: 0.61, width: 0.205, height: -0.11, length: 0.33 });
    }
    this.makeFin({ type: 'dorsal' });
    this.makeFin({ type: 'anal' });
    this.makeFin({ type: 'tail' });

    this.details = new THREE.Group();
    this.group.add(this.details);
    this.eyes = [];
    const eyeGeometry = new THREE.SphereGeometry(1, 20, 14);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({ color: '#343f3d', roughness: 0.24 }));
      const pupil = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({ color: '#101b19', roughness: 0.18 }));
      eye.scale.set(0.065 * simulation.scale, 0.052 * simulation.scale, 0.032 * simulation.scale);
      pupil.scale.set(0.036 * simulation.scale, 0.035 * simulation.scale, 0.014 * simulation.scale);
      this.details.add(eye, pupil);
      this.eyes.push({ eye, pupil, side });
    }
    this.gills = [];
    for (const side of [-1, 1]) {
      const g = dynamicGeometry(30);
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#4d605a', transparent: true, opacity: 0.62 }));
      line.frustumCulled = false;
      this.details.add(line);
      this.gills.push({ line, side });
    }
    this.mouth = new THREE.LineLoop(dynamicGeometry(40), new THREE.LineBasicMaterial({ color: '#495c54', transparent: true, opacity: 0.8 }));
    this.mouth.frustumCulled = false;
    this.details.add(this.mouth);

    this.spineGroup = new THREE.Group();
    scene.add(this.spineGroup);
    const ballGeometry = new THREE.SphereGeometry(0.027 * simulation.scale, 10, 8);
    const linkGeometry = new THREE.CylinderGeometry(0.009 * simulation.scale, 0.009 * simulation.scale, 1, 7);
    const spineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
    this.joints = new THREE.InstancedMesh(ballGeometry, spineMaterial, JOINT_COUNT);
    this.links = new THREE.InstancedMesh(linkGeometry, spineMaterial, JOINT_COUNT - 1);
    this.joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.joints.renderOrder = 20;
    this.links.renderOrder = 19;
    this.joints.frustumCulled = false;
    this.links.frustumCulled = false;
    this.spineGroup.add(this.joints, this.links);
    for (let i = 0; i < JOINT_COUNT; i++) {
      const color = new THREE.Color('#f5d9a5').lerp(new THREE.Color('#c26943'), i / (JOINT_COUNT - 1));
      this.joints.setColorAt(i, color);
      if (i) this.links.setColorAt(i - 1, color);
    }
    this.instanceTransform = new THREE.Object3D();
    this.upAxis = new THREE.Vector3(0, 1, 0);
    this.v1 = new THREE.Vector3();
    this.v2 = new THREE.Vector3();
    this.studyMaterials = new Map();
    this.group.traverse((object) => { if (object.material) this.studyMaterials.set(object, object.material); });
    this.inkMaterial = createInkMaterial(simulation.id ?? 0);
    this.inkFinMaterial = createInkMaterial(simulation.id ?? 0, true);
    this.inkVariant = inkVariantForFish(simulation.id ?? 0);
    this.inkRayMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: this.inkVariant.rays, toneMapped: false });
    this.inkEyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.inkDetailMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: this.inkVariant.details, toneMapped: false });
    this.inkMouthMaterial = this.inkDetailMaterial.clone();
    this.style = 'study';
    this.localFrame = { center: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() };
    this.pointValue = new THREE.Vector3();
    this.bodyProfiles = Array.from({ length: this.rings }, (_, i) => profile(i / (this.rings - 1)));
    this.radialDirections = Array.from({ length: this.radials }, (_, j) => [Math.cos(j / this.radials * Math.PI * 2), Math.sin(j / this.radials * Math.PI * 2)]);
    this.update();
  }

  frame(s) {
    const spine = this.sim.spine;
    const n = spine.length;
    const u = clamp(s, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(u));
    const f = u - i;
    const a = spine[i];
    const b = spine[i + 1];
    const { center, forward, right, up } = this.localFrame;
    forward.set(a.x - b.x, a.y - b.y, a.z - b.z).normalize();
    center.set(mix(a.x, b.x, f), mix(a.y, b.y, f), mix(a.z, b.z, f));
    if (s > 1) center.addScaledVector(forward, -(s - 1) * this.sim.bodyLength);
    right.set(-forward.z, 0, forward.x).normalize();
    up.crossVectors(right, forward).normalize();
    return this.localFrame;
  }

  point(s, right, height) {
    const f = this.frame(s);
    return this.pointValue.copy(f.center).addScaledVector(f.right, right * this.sim.scale).addScaledVector(f.up, height * this.sim.scale);
  }

  makeFin(spec) {
    const nu = this.detail === 'pond' ? (spec.type === 'tail' ? 16 : 12) : (spec.type === 'tail' ? 20 : 16);
    const nv = this.detail === 'pond' ? 6 : 9;
    const indices = [];
    const rayIndices = [];
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j;
        const b = a + nv + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    for (let i = 0; i <= nu; i += 2) {
      for (let j = 0; j < nv; j++) rayIndices.push(i * (nv + 1) + j, i * (nv + 1) + j + 1);
    }
    const geometry = dynamicGeometry((nu + 1) * (nv + 1), indices);
    const inkUV = new Float32Array((nu + 1) * (nv + 1) * 3);
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const index = (i * (nv + 1) + j) * 3;
      inkUV[index] = i / nu;
      inkUV[index + 1] = j / nv;
    }
    geometry.setAttribute('aInk', new THREE.BufferAttribute(inkUV, 3));
    const mesh = new THREE.Mesh(geometry, this.finMaterial);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    const rays = new THREE.LineSegments(dynamicGeometry(rayIndices.length), this.finRaysMaterial);
    rays.frustumCulled = false;
    this.group.add(rays);
    this.fins.push({ spec, nu, nv, geometry, mesh, rays, rayIndices });
  }

  finPoint(spec, u, v) {
    const sim = this.sim;
    const phase = sim.phase;
    if (spec.type === 'paired') {
      const theta = mix(-0.42, 1.16, u);
      const slow = clamp(1 - sim.speed / (sim.bodyLength * 0.55), 0, 1);
      const inside = Math.max(0, sim.omega * spec.side);
      const spread = clamp(0.49 + slow * 0.36 + sim.effort * 0.15 + inside * 0.37 + sim.braking * 0.32, 0.35, 1.15);
      const radius = spec.length * (0.83 + Math.sin(u * Math.PI) * 0.17) * v;
      const s = spec.s + (Math.sin(theta) * radius + (1 - sim.effort) * radius * 0.38) / BODY_LENGTH;
      const paddle = Math.sin(phase * 0.63 - u * 1.2 - v * 0.7 + spec.side * 0.3) * (0.035 + slow * 0.075) * v;
      return this.point(s, spec.side * (spec.width + Math.cos(theta) * radius * spread), spec.height - radius * 0.16 + paddle);
    }
    if (spec.type === 'dorsal' || spec.type === 'anal') {
      const dorsal = spec.type === 'dorsal';
      const s = mix(dorsal ? 0.27 : 0.65, dorsal ? 0.77 : 0.85, u);
      const body = profile(s);
      const outline = (dorsal ? 0.27 : 0.13) * Math.pow(Math.sin(u * Math.PI), 0.85);
      const y = (dorsal ? body[1] * 0.93 + outline * v : -body[2] * 0.92 - outline * v);
      const lag = Math.sin(phase - s * 5.8 - v * 0.8) * sim.effort * 0.045 * v;
      return this.point(s + v * 0.028, lag, y);
    }
    const lobe = Math.abs(u * 2 - 1);
    const s = 0.985 + (0.165 + 0.085 * Math.pow(lobe, 1.7)) * v;
    const y = (u - 0.5) * mix(0.09, 1.02, v);
    const lag = Math.sin(phase - 5.8 - v * 1.1) * (0.022 + sim.effort * 0.17) * v;
    // A slight cup gives the vertical caudal fin volume when viewed from above.
    return this.point(s, lag + Math.sin(u * Math.PI) * v * 0.045, y);
  }

  update() {
    const sim = this.sim;
    const bite = clamp(this.biteAmount ?? 0, 0, 1);
    this.inkDepth = fishWaterDepth(sim, this.depthAmount ?? .8);
    this.group.position.y = this.style === 'ink' ? -this.inkDepth * .85 : 0;
    this.spineGroup.position.y = this.group.position.y;
    this.inkMaterial.uniforms.uDepth.value = this.inkDepth;
    this.inkFinMaterial.uniforms.uDepth.value = this.inkDepth;
    for (const material of [this.inkRayMaterial, this.inkEyeMaterial, this.inkDetailMaterial, this.inkMouthMaterial]) material.color.setRGB(1, 1, this.inkDepth);
    this.inkMouthMaterial.opacity = mix(this.inkVariant.details, .50, bite);
    this.inkMaterial.uniforms.uSubmerge.value = clamp(.90 + sim.y * .16, .65, 1.05);
    this.inkFinMaterial.uniforms.uSubmerge.value = this.inkMaterial.uniforms.uSubmerge.value;
    sim.updateSpine();
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < this.rings; i++) {
      const s = i / (this.rings - 1);
      const [width, back, belly] = this.bodyProfiles[i];
      const frame = this.frame(s);
      const pucker = bite * Math.pow(Math.max(0, 1 - s / .085), 2);
      for (let j = 0; j < this.radials; j++) {
        const [cosine, sine] = this.radialDirections[j];
        const y = sine * (sine >= 0 ? back : belly);
        const xScale = cosine * (width + pucker * .022) * sim.scale, yScale = y * sim.scale;
        const reach = pucker * .025 * sim.scale;
        positions.setXYZ(i * this.radials + j,
          frame.center.x + frame.right.x * xScale + frame.up.x * yScale + frame.forward.x * reach,
          frame.center.y + frame.right.y * xScale + frame.up.y * yScale + frame.forward.y * reach,
          frame.center.z + frame.right.z * xScale + frame.up.z * yScale + frame.forward.z * reach);
      }
    }
    const cap = this.rings * this.radials;
    const head = sim.spine[0];
    const tail = sim.spine[sim.spine.length - 1];
    const nose = this.frame(0).forward, reach = bite * .025 * sim.scale;
    positions.setXYZ(cap, head.x + nose.x * reach, head.y + nose.y * reach, head.z + nose.z * reach);
    positions.setXYZ(cap + 1, tail.x, tail.y, tail.z);
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    for (const fin of this.fins) {
      const p = fin.geometry.attributes.position;
      for (let i = 0; i <= fin.nu; i++) {
        for (let j = 0; j <= fin.nv; j++) {
          const point = this.finPoint(fin.spec, i / fin.nu, j / fin.nv);
          p.setXYZ(i * (fin.nv + 1) + j, point.x, point.y, point.z);
        }
      }
      p.needsUpdate = true;
      if (this.style !== 'ink') fin.geometry.computeVertexNormals();
      const rays = fin.rays.geometry.attributes.position;
      for (let k = 0; k < fin.rayIndices.length; k++) {
        const i = fin.rayIndices[k];
        rays.setXYZ(k, p.getX(i), p.getY(i), p.getZ(i));
      }
      rays.needsUpdate = true;
    }
    const headFrame = this.frame(0.085);
    const basis = new THREE.Matrix4().makeBasis(headFrame.forward, headFrame.up, headFrame.right);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(basis);
    for (const { eye, pupil, side } of this.eyes) {
      eye.position.copy(this.point(0.08, side * 0.218, 0.097));
      pupil.position.copy(this.point(0.077, side * 0.244, 0.101));
      eye.quaternion.copy(rotation);
      pupil.quaternion.copy(rotation);
    }
    for (const { line, side } of this.gills) {
      const p = line.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = mix(-0.72, 1.2, i / (p.count - 1));
        const s = 0.183 + 0.033 * Math.cos(a);
        const [w, h, b] = profile(s);
        const point = this.point(s, side * Math.cos(a) * (w + 0.004), Math.sin(a) * (a >= 0 ? h : b));
        p.setXYZ(i, point.x, point.y, point.z);
      }
      p.needsUpdate = true;
    }
    const mouth = this.mouth.geometry.attributes.position;
    for (let i = 0; i < mouth.count; i++) {
      const a = i / mouth.count * Math.PI * 2;
      // The lip tips toward the surface so the small opening reads from above.
      const lipHeight = mix(Math.sin(a) * .025 - .021, .105, bite);
      const point = this.point(-0.001, Math.cos(a) * (.043 + bite * .028), lipHeight);
      point.addScaledVector(this.frame(0).forward, (.004 + bite * (.015 + Math.sin(a) * .045)) * sim.scale);
      mouth.setXYZ(i, point.x, point.y, point.z);
    }
    mouth.needsUpdate = true;
    if (this.spineGroup.visible) for (let i = 0; i < sim.spine.length; i++) {
      const point = sim.spine[i];
      const transform = this.instanceTransform;
      transform.position.set(point.x, point.y, point.z);
      transform.quaternion.identity();
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      this.joints.setMatrixAt(i, transform.matrix);
      if (i) {
        const a = sim.spine[i - 1];
        this.v1.set(point.x - a.x, point.y - a.y, point.z - a.z);
        transform.position.set((point.x + a.x) / 2, (point.y + a.y) / 2, (point.z + a.z) / 2);
        transform.scale.y = this.v1.length();
        transform.quaternion.setFromUnitVectors(this.upAxis, this.v1.normalize());
        transform.updateMatrix();
        this.links.setMatrixAt(i - 1, transform.matrix);
      }
    }
    this.joints.instanceMatrix.needsUpdate = true;
    this.links.instanceMatrix.needsUpdate = true;
  }

  setInspection({ spine, translucent, wireframe }) {
    this.spineGroup.visible = spine;
    this.material.transparent = translucent;
    this.material.opacity = translucent ? 0.38 : 1;
    this.material.depthWrite = !translucent;
    this.material.wireframe = wireframe;
    this.material.needsUpdate = true;
    this.inkMaterial.uniforms.uOpacity.value = translucent ? 0.38 : 1;
    this.inkMaterial.transparent = translucent;
    this.inkMaterial.depthWrite = !translucent;
    this.inkMaterial.wireframe = wireframe;
    this.inkMaterial.needsUpdate = true;
  }

  setStyle(style) {
    this.style = style;
    if (style === 'study') {
      for (const [object, material] of this.studyMaterials) object.material = material;
      return;
    }
    this.body.material = this.inkMaterial;
    for (const fin of this.fins) { fin.mesh.material = this.inkFinMaterial; fin.rays.material = this.inkRayMaterial; }
    for (const { eye, pupil } of this.eyes) { eye.material = this.inkEyeMaterial; pupil.material = this.inkEyeMaterial; }
    for (const { line } of this.gills) line.material = this.inkDetailMaterial;
    this.mouth.material = this.inkMouthMaterial;
  }

  dispose() {
    const geometries = new Set();
    const materials = new Set();
    for (const root of [this.group, this.spineGroup]) {
      root.removeFromParent();
      root.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
        if (object.isInstancedMesh) object.dispose();
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of this.studyMaterials.values()) materials.add(material);
    for (const material of [this.inkMaterial, this.inkFinMaterial, this.inkRayMaterial, this.inkEyeMaterial, this.inkDetailMaterial, this.inkMouthMaterial]) materials.add(material);
    for (const material of materials) material.dispose();
  }
}
