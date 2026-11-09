import * as THREE from '../vendor/three.module.js';
import { inkNoise } from './ink-material.mjs';
import { sampleWaterRipples } from './water.mjs';
import { MAX_FOOD_PIECES } from './pond-life.mjs';

function leafGeometry(leaves) {
  const geometry = new THREE.InstancedBufferGeometry(), plane = new THREE.PlaneGeometry(1, 1);
  geometry.index = plane.index.clone();
  for (const name of ['position', 'uv']) geometry.setAttribute(name, plane.attributes[name].clone());
  plane.dispose(); geometry.instanceCount = leaves.length;
  geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => l.point.toArray())), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => [l.angle, l.anchor, l.width, l.length])), 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aPigment', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => [l.kind, l.seed, l.load, l.depth ?? 0])), 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(leaves.map(() => 1)), 1).setUsage(THREE.DynamicDrawUsage));
  return geometry;
}

export class InkGarden {
  constructor() {
    this.scene = new THREE.Scene();
    this.submergedScene = new THREE.Scene();
    this.submergedRecords = [];
    this.layoutKey = '';
    this.leafCount = 0;
    this.leafRecords = [];
    this.strokes = [];
    this.attachments = [];
    this.branchJoints = [];
    this.ripples = [];
    this.waterSample = { x: 0, z: 0, height: 0 };
    this.leafMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aOrigin;
        attribute vec4 aAxis;
        attribute vec4 aPigment;
        attribute float aFade;
        varying vec2 vUv;
        varying vec3 vPigment;
        varying float vDepth, vFade;
        void main() {
          vUv = uv;
          vPigment = aPigment.xyz;
          vDepth = aPigment.w; vFade = aFade;
          float c = cos(aAxis.x), s = sin(aAxis.x);
          vec2 local = (uv - vec2(.5, aAxis.y)) * aAxis.zw;
          vec2 p = aOrigin.xz + vec2(c * local.x - s * local.y, s * local.x + c * local.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, aOrigin.y, p.y, 1.);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPigment;
        varying float vDepth, vFade;
        ${inkNoise}
        void main() {
          float kind = vPigment.x, seed = vPigment.y, load = vPigment.z;
          vec2 p = (vUv - .5) * (kind < .5 ? 1.18 : 1.05);
          vec2 flow = vec2(fbm2(p * 4.1 + seed), fbm2(p.yx * 3.7 + seed + 9.)) - .5;
          p += flow * (kind < .5 ? .14 : .085);
          float cloud = fbm2(p * 4.6 + flow * .7 + seed);
          float tooth = noise2(p * vec2(100., 78.) + seed);
          float alpha, veins, rim;
          float wick = .014 + noise2(p * 16. + seed + 2.) * .022;
          if (kind < .5) {
            float angle = atan(p.y, p.x), r = length(p);
            float edge = .405 + sin(angle * 2. + seed) * .027 + cos(angle * 3. + seed * 1.7) * .019;
            edge += (noise2(p * 9. + seed) - .5) * .075;
            alpha = 1. - smoothstep(edge - .012, edge + wick, r);
            float fold = sin(p.y * 11. + seed) * .018 + (noise2(vec2(p.y * 14., seed)) - .5) * .025;
            float gap = max(0., -p.y + .035) * (.10 + hash21(vec2(seed, 3.)) * .075);
            float slit = smoothstep(gap - .008, gap + .018, abs(p.x - fold));
            alpha *= mix(slit, 1., smoothstep(-.015, .075, p.y));
            veins = 0.;
            for (int i = 0; i < 5; i++) {
              float index = float(i), ink = hash21(vec2(seed, index + 7.));
              float direction = index * 1.2566 + seed * .37 + (ink - .5) * .65;
              vec2 axis = vec2(cos(direction), sin(direction));
              float along = dot(p, axis);
              float across = dot(p, vec2(-axis.y, axis.x)) - sin(along * 9. + seed) * .012;
              veins += exp(-pow(across / (.008 + ink * .008), 2.)) * smoothstep(.06, .25, along) * ink;
            }
            rim = exp(-pow((r - edge + .023) / .045, 2.)) * (.4 + cloud * .6);
          } else if (kind > 3.5) {
            float r = length(p * vec2(.90, 1.08));
            float edge = .31 + (noise2(p * 6. + seed) - .5) * .10;
            alpha = 1. - smoothstep(edge - .025, edge + wick, r);
            veins = 0.; rim = exp(-pow((r - edge + .025) / .055, 2.)) * .5;
          } else if (kind < 1.5 || kind > 2.5) {
            float t = vUv.y;
            float bend = sin(t * 3.14159) * (.025 + hash21(vec2(seed, 1.)) * .13);
            bend += sin(t * 6.28318) * .025;
            float across = (vUv.x - .5) * 1.05;
            across += flow.x * .075 * smoothstep(.05, .30, t);
            float bladeT = clamp((t - .17) / .80, 0., 1.);
            float width = pow(max(0., sin(bladeT * 3.14159)), .76 + hash21(vec2(seed, 4.)) * .25) * (.29 + cloud * .075);
            width *= across < bend ? .84 + noise2(vec2(t * 6., seed)) * .19 : .95 + noise2(vec2(t * 4., seed + 6.)) * .16;
            float distance = abs(across - bend) - width;
            float blade = (1. - smoothstep(-.009, wick, distance)) * smoothstep(.16, .23, t) * (1. - smoothstep(.94, 1., t));
            float petiole = (1. - smoothstep(.012, .039, abs(across - bend))) * (1. - smoothstep(.23, .33, t));
            alpha = max(blade, petiole * .88);
            veins = exp(-pow((across - bend) / .022, 2.)) * (.25 + noise2(vec2(t * 13., seed)) * .5);
            rim = exp(-pow((distance + .022) / .042, 2.)) * (.35 + cloud * .65);
          } else {
            float angle = atan(p.y, p.x), r = length(p);
            float edge = .33 + sin(angle * 3. + seed) * .045 + cos(angle * 5. + seed * .7) * .027;
            edge += (noise2(p * 10. + seed) - .5) * .060;
            alpha = 1. - smoothstep(edge - .010, edge + wick, r);
            float midrib = p.x - sin(p.y * 6. + seed) * .025;
            veins = exp(-pow(midrib / .017, 2.)) * (.35 + cloud * .4);
            rim = exp(-pow((r - edge + .022) / .042, 2.)) * (.35 + cloud * .65);
          }
          float pooling = smoothstep(.37, .70, fbm2(p * 6. + flow + seed * 1.8));
          float wash = fbm2(p * vec2(3., 7.) + seed + 21.);
          float density = (.035 + cloud * .17 + pooling * .30 + wash * .075 + veins * .055 + rim * .050) * load;
          density *= .79 + tooth * .28;
          float dry = smoothstep(.17, .34, fbm2(p * vec2(31., 18.) + seed * 2.));
          alpha *= (.88 + cloud * .12) * mix(.82, 1., dry);
          // Surface ink uses premultiplied pigment in red and coverage in green.
          gl_FragColor = vec4(density * mix(1., .65, vDepth), 1., vDepth, alpha * vFade);
        }
      `,
      side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.stemMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSeed;
        varying vec2 vUv;
        varying float vSeed;
        void main() { vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vSeed;
        ${inkNoise}
        void main() {
          float dry = fbm2(vec2(vUv.y * 29., vUv.x * 5.) + vSeed);
          float spread = .19 + noise2(vec2(vUv.y * 33., vSeed)) * .14;
          float edge = smoothstep(0., spread, vUv.x) * (1. - smoothstep(1. - spread, 1., vUv.x));
          float density = .15 + dry * .25;
          gl_FragColor = vec4(density, 1., 0., edge * (.34 + dry * .48));
        }
      `,
      side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.stems = new THREE.Mesh(new THREE.BufferGeometry(), this.stemMaterial);
    this.stems.frustumCulled = false;
    this.scene.add(this.stems);
    this.leaves = new THREE.Mesh(new THREE.BufferGeometry(), this.leafMaterial);
    this.leaves.frustumCulled = false;
    this.leaves.renderOrder = 1;
    this.scene.add(this.leaves);
    this.submerged = new THREE.Mesh(new THREE.BufferGeometry(), this.leafMaterial);
    this.submerged.frustumCulled = false;
    this.submergedScene.add(this.submerged);
    const empty = Array.from({ length: MAX_FOOD_PIECES }, (_, seed) => ({ point: new THREE.Vector3(), angle: 0, anchor: .5, width: .2, length: .2, kind: 4, seed, load: 1.8 }));
    this.food = new THREE.Mesh(leafGeometry(empty), this.leafMaterial);
    this.food.frustumCulled = false; this.food.renderOrder = 2;
    this.scene.add(this.food);
  }

  update(camera, time, ripples = []) {
    this.ripples = ripples;
    const key = [...camera.projectionMatrix.elements, ...camera.matrixWorld.elements].map((v) => v.toFixed(4)).join(',');
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.layout(camera);
    }
    this.pose(time);
  }

  movePoint(point, motion, weight, time, out) {
    const seed = motion.seed, amplitude = motion.amplitude;
    const dx = (Math.sin(time * .085 + seed) - Math.sin(seed)) * amplitude
      + (Math.sin(time * .17 + seed * 1.7) - Math.sin(seed * 1.7)) * amplitude * .22;
    const dz = (Math.cos(time * .073 + seed * .8) - Math.cos(seed * .8)) * amplitude * .76
      + (Math.sin(time * .13 + seed * 2.1) - Math.sin(seed * 2.1)) * amplitude * .20;
    const flowX = (Math.sin(point.z * .43 + time * .34) - Math.sin(point.z * .43)) * .065;
    const flowZ = (Math.cos(point.x * .36 - time * .29) - Math.cos(point.x * .36)) * .055;
    const water = sampleWaterRipples(this.ripples, point.x, point.z, this.waterSample);
    const response = motion.depth ? 1 - motion.depth * .8 : 1;
    return out.set(point.x + (dx + (flowX + water.x) * response) * weight, point.y + water.height * weight * response, point.z + (dz + (flowZ + water.z) * response) * weight);
  }

  pose(time) {
    const point = this.posePoint || (this.posePoint = new THREE.Vector3());
    const origins = this.leaves.geometry.attributes.aOrigin;
    const axes = this.leaves.geometry.attributes.aAxis;
    this.leafRecords.forEach((leaf, i) => {
      this.movePoint(leaf.point, leaf.motion, leaf.weight, time, point);
      origins.setXYZ(i, point.x, point.y, point.z);
      const hinge = leaf.kind === 1 ? .040 : .055;
      const sway = (Math.sin(time * .19 + leaf.seed) - Math.sin(leaf.seed)) * hinge * leaf.weight;
      axes.setX(i, leaf.angle + sway);
    });
    origins.needsUpdate = axes.needsUpdate = true;
    const positions = this.stems.geometry.attributes.position;
    for (const stroke of this.strokes) {
      stroke.rows.forEach((row, i) => {
        this.movePoint(row.point, stroke.motion, row.weight, time, point);
        const index = stroke.start + i * 2;
        positions.setXYZ(index, point.x - stroke.across.x * row.half, point.y, point.z - stroke.across.z * row.half);
        positions.setXYZ(index + 1, point.x + stroke.across.x * row.half, point.y, point.z + stroke.across.z * row.half);
      });
    }
    positions.needsUpdate = true;
    const submerged = this.submerged.geometry.attributes;
    this.submergedRecords.forEach((leaf, i) => {
      this.movePoint(leaf.point, leaf.motion, leaf.weight, time, point);
      submerged.aOrigin.setXYZ(i, point.x, point.y, point.z);
    });
    submerged.aOrigin.needsUpdate = true;
  }

  updateFood(pieces, time) {
    const attributes = this.food.geometry.attributes, point = this.posePoint;
    for (let i = 0; i < MAX_FOOD_PIECES; i++) {
      const piece = pieces[i];
      attributes.aFade.setX(i, piece?.fade ?? 0);
      if (!piece) continue;
      point.set(piece.x, .07, piece.z);
      attributes.aOrigin.setXYZ(i, point.x, point.y, point.z);
      attributes.aAxis.setXYZW(i, piece.seed, .5, piece.size * 2.8, piece.size * 2.6);
      attributes.aPigment.setXYZW(i, 4, piece.seed, 1.8, 0);
    }
    for (const attribute of Object.values(attributes)) attribute.needsUpdate = true;
  }

  layout(camera) {
    const raycaster = new THREE.Raycaster();
    const water = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const at = (u, v) => {
      raycaster.setFromCamera(new THREE.Vector2(u * 2 - 1, v * 2 - 1), camera);
      const hit = raycaster.ray.intersectPlane(water, new THREE.Vector3());
      if (!hit || Math.hypot(hit.x, hit.z) > 90) return new THREE.Vector3((u - .5) * 18, .04, (.5 - v) * 18);
      hit.y = .04;
      return hit;
    };
    const leaves = [], positions = [], uvs = [], seeds = [], indices = [];
    this.strokes = []; this.attachments = []; this.branchJoints = [];
    const random = (seed, salt) => { const n = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };
    const leaf = (point, angle, width, length, kind, seed, load, motion, weight = 1, free = false) => {
      const index = leaves.length;
      leaves.push({ point: point.clone(), angle, width, length, kind, seed, load, motion, weight, free, anchor: kind === 1 ? 0 : .5 });
      return index;
    };
    const stem = (a, b, bend, width, seed, motion, weightA = 0, weightB = 1) => {
      const segments = 28, start = positions.length / 3;
      const delta = b.clone().sub(a), across = new THREE.Vector3(-delta.z, 0, delta.x).normalize();
      const rows = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const wobble = Math.sin(t * 9. + seed) * width * .18 + Math.sin(t * 21. + seed * .7) * width * .07;
        const center = a.clone().lerp(b, t).addScaledVector(across, Math.sin(t * Math.PI) * bend + wobble * Math.sin(t * Math.PI));
        const pressure = 1 + Math.sin(t * 9. + seed) * .25 + Math.sin(t * 23. + seed) * .10;
        const half = width * (.35 + .65 * (1 - t)) * pressure * .5;
        rows.push({ point: center, half, weight: weightA + (weightB - weightA) * t });
        for (const side of [-1, 1]) {
          const p = center.clone().addScaledVector(across, half * side);
          positions.push(p.x, p.y, p.z); uvs.push((side + 1) / 2, t); seeds.push(seed);
        }
        if (i < segments) { const j = start + i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      }
      const record = { start, segments, rows, across, motion };
      this.strokes.push(record);
      return record;
    };
    const attachedLeaf = (parent, t, angle, length, width, seed, load) => {
      const node = Math.round(t * parent.segments), row = parent.rows[node];
      const direction = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const base = row.point.clone().addScaledVector(direction, .14 + random(seed, 3) * .10);
      const weight = Math.min(1, row.weight + .07);
      const petiole = stem(row.point, base, (random(seed, 4) - .5) * .035, .026, seed, parent.motion, row.weight, weight);
      const index = leaf(base, angle, width, length, 1, seed, load, parent.motion, weight);
      this.branchJoints.push({ parentPair: parent.start + node * 2, childPair: petiole.start });
      this.attachments.push({ leafIndex: index, stemEndPair: petiole.start + petiole.segments * 2 });
    };

    // Pads drift at their petioles while the roots remain beyond the frame.
    const root = at(-.045, .98);
    for (const [u, v, size, angle, load, seed] of [
      [.025, .81, 2.65, -.30, 1.14, 3.1], [.105, .92, 1.85, .55, .75, 12.8], [-.015, .64, 2.05, -.8, .88, 27.4],
    ]) {
      const p = at(u, v), motion = { seed, amplitude: .32 + random(seed, 8) * .16 };
      stem(root, p, .38, .045, seed, motion);
      leaf(p, angle, size, size * .91, 0, seed, load, motion);
    }

    // Two gestural branches share a moving junction. Every leaf has a petiole.
    const a = at(1.035, -.025), b = at(.855, .25);
    const sprigMotion = { seed: 39.1, amplitude: .18 };
    const main = stem(a, b, -.35, .060, 39.1, sprigMotion);
    const mainAngle = Math.atan2(-(b.x - a.x), b.z - a.z);
    for (let i = 0; i < 5; i++) {
      const sign = i % 2 ? -1 : 1;
      const angle = mainAngle + sign * (.72 + random(i, 3) * .45);
      attachedLeaf(main, .22 + i * .175, angle, 1.05 + random(i, 2) * .45, .29 + random(i, 5) * .18, 40 + i * 3.7, .58 + random(i, 6) * .30);
    }
    const forkNode = 10, forkRow = main.rows[forkNode];
    const forkEnd = at(.97, .285);
    const fork = stem(forkRow.point, forkEnd, .23, .041, 56.2, sprigMotion, forkRow.weight, .96);
    this.branchJoints.push({ parentPair: main.start + forkNode * 2, childPair: fork.start });
    const forkAngle = Math.atan2(-(forkEnd.x - forkRow.point.x), forkEnd.z - forkRow.point.z);
    for (let i = 0; i < 3; i++) {
      const angle = forkAngle + (i % 2 ? -.85 : .90) + (random(i, 7) - .5) * .25;
      attachedLeaf(fork, .28 + i * .28, angle, .82 + random(i, 9) * .33, .25 + random(i, 10) * .14, 63 + i * 4.1, .61 + random(i, 11) * .20);
    }
    const pad = at(.985, .31), padMotion = { seed: 75.2, amplitude: .36 };
    stem(at(1.05, .13), pad, -.2, .032, 75.2, padMotion);
    leaf(pad, -.55, 1.85, 1.65, 0, 75.2, .64, padMotion);

    // A smaller brush sprig enters the opposite edge.
    const reedMotion = { seed: 121.3, amplitude: .14 };
    const reedA = at(1.025, .955), reedB = at(.925, .835);
    const reed = stem(reedA, reedB, -.17, .031, 121.3, reedMotion);
    const reedAngle = Math.atan2(-(reedB.x - reedA.x), reedB.z - reedA.z);
    attachedLeaf(reed, .55, reedAngle + .8, .86, .24, 124.1, .56);
    attachedLeaf(reed, .91, reedAngle - .7, .72, .26, 129.4, .68);

    for (const [u, v, size, angle, load, seed] of [
      [.285, .825, 1.22, .4, .57, 135.], [.79, .335, 1.02, -.75, .68, 149.],
    ]) leaf(at(u, v), angle, size, size * .94, 0, seed, load, { seed, amplitude: .53 }, 1, true);

    // Debris follows slow, bounded currents around the open centre.
    for (const [u, v, size, angle, load, seed, kind] of [
      [.18, .29, .83, -.65, .72, 81., 2], [.88, .70, .78, .8, .86, 93., 2], [.65, .105, .66, .1, .59, 107., 2],
      [.12, .55, .47, -.35, .62, 163., 3], [.35, .875, .36, 1.4, .48, 176., 3], [.73, .825, .41, -.8, .58, 187., 2],
      [.925, .44, .48, .5, .70, 198., 3], [.34, .145, .42, -.2, .49, 211., 2], [.715, .205, .44, 1.1, .66, 227., 3], [.075, .12, .35, -.7, .52, 239., 3],
    ]) leaf(at(u, v), angle, size * (kind === 3 ? .54 : 1), size * (kind === 3 ? 1.32 : 1.08), kind, seed, load, { seed, amplitude: .35 + random(seed, 2) * .22 }, 1, true);

    for (const [u, v, size, seed] of [[.17, .13, 1.35, 251.], [.87, .54, 1.15, 264.], [.46, .91, .95, 279.]]) {
      leaf(at(u, v), seed, size, size * .94, 0, seed, .55, { seed, amplitude: .30 }, 1, true);
    }
    for (let i = 0; i < 18; i++) {
      const seed = 301 + i * 13.7;
      let u = .07 + random(seed, 1) * .86, v = .07 + random(seed, 2) * .86;
      if (Math.hypot((u - .5) / .48, (v - .5) / .48) < .58) u = u < .5 ? u - .20 : u + .20;
      const kind = i % 3 ? 3 : 2, size = .24 + random(seed, 3) * .34;
      leaf(at(u, v), seed, size * (kind === 3 ? .48 : 1), size * 1.15, kind, seed, .38 + random(seed, 4) * .31, { seed, amplitude: .25 }, 1, true);
    }

    this.submergedRecords = Array.from({ length: 24 }, (_, i) => {
      const seed = 607 + i * 17.3, depth = .62 + random(seed, 8) * .33;
      const u = .08 + random(seed, 1) * .84, v = .07 + random(seed, 2) * .86;
      const point = at(u, v); point.y = -depth * 1.5;
      const kind = i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 4;
      const size = .48 + random(seed, 3) * .72;
      return { point, angle: seed, anchor: .5, width: size * (kind === 3 ? .42 : 1), length: size * (kind === 3 ? 1.4 : .86), kind, seed, load: .24 + random(seed, 4) * .26, depth,
        motion: { seed, amplitude: kind === 4 ? 0 : .065, depth }, weight: kind === 4 ? 0 : 1 };
    });

    const geometry = leafGeometry(leaves);
    this.leaves.geometry.dispose(); this.leaves.geometry = geometry;
    this.submerged.geometry.dispose(); this.submerged.geometry = leafGeometry(this.submergedRecords);
    this.leafRecords = leaves;
    this.leafCount = leaves.length;
    const stems = new THREE.BufferGeometry();
    stems.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    stems.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    stems.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    stems.setIndex(indices);
    this.stems.geometry.dispose(); this.stems.geometry = stems;
  }
}
