import * as THREE from '../vendor/three.module.js';
import { inkNoise } from './ink-material.mjs';

export class InkGarden {
  constructor() {
    this.scene = new THREE.Scene();
    this.layoutKey = '';
    this.leafCount = 0;
    this.leafMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 aOrigin;
        attribute vec4 aAxis;
        attribute vec4 aPigment;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vPigment;
        void main() {
          vUv = uv;
          vPigment = aPigment.xyz;
          float sway = sin(uTime * .19 + aPigment.y) * aPigment.w;
          float c = cos(aAxis.x + sway), s = sin(aAxis.x + sway);
          vec2 local = (uv - .5) * aAxis.zw;
          vec2 p = aOrigin.xz + vec2(c * local.x - s * local.y, s * local.x + c * local.y);
          p += vec2(sin(uTime * .13 + aPigment.y), cos(uTime * .16 + aPigment.y)) * aPigment.w;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, aOrigin.y, p.y, 1.);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPigment;
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
          } else if (kind < 1.5) {
            float t = clamp(p.y + .5, 0., 1.);
            float bend = sin(t * 3.14159) * (.035 + hash21(vec2(seed, 1.)) * .09);
            bend += sin(t * 6. + seed) * .025;
            float width = pow(max(0., sin(t * 3.14159)), .77 + hash21(vec2(seed, 4.)) * .26) * (.31 + cloud * .085);
            width *= p.x < bend ? .86 + noise2(vec2(t * 6., seed)) * .18 : .92 + noise2(vec2(t * 4., seed + 6.)) * .20;
            float distance = abs(p.x - bend) - width;
            alpha = (1. - smoothstep(-.009, wick, distance)) * smoothstep(0., .055, t) * (1. - smoothstep(.94, 1., t));
            veins = exp(-pow((p.x - bend) / .022, 2.)) * (.25 + noise2(vec2(t * 13., seed)) * .5);
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
          gl_FragColor = vec4(density, 1., 0., alpha);
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
  }

  update(camera, time) {
    this.leafMaterial.uniforms.uTime.value = time;
    const key = [...camera.projectionMatrix.elements, ...camera.matrixWorld.elements].map((v) => v.toFixed(4)).join(',');
    if (key === this.layoutKey) return;
    this.layoutKey = key;
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
    const random = (seed, salt) => { const n = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };
    const leaf = (point, angle, width, length, kind, seed, load, floating = false) => {
      leaves.push({ point, angle, width, length, kind, seed, load, drift: floating ? .026 : 0 });
    };
    const stem = (a, b, bend, width, seed) => {
      const n = 28, start = positions.length / 3;
      const delta = b.clone().sub(a), across = new THREE.Vector3(-delta.z, 0, delta.x).normalize();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const wobble = Math.sin(t * 9. + seed) * width * .18 + Math.sin(t * 21. + seed * .7) * width * .07;
        const center = a.clone().lerp(b, t).addScaledVector(across, Math.sin(t * Math.PI) * bend + wobble * Math.sin(t * Math.PI));
        const pressure = 1 + Math.sin(t * 9. + seed) * .25 + Math.sin(t * 23. + seed) * .10;
        const half = width * (.35 + .65 * (1 - t)) * pressure * .5;
        for (const side of [-1, 1]) {
          const p = center.clone().addScaledVector(across, half * side);
          positions.push(p.x, .035, p.z); uvs.push((side + 1) / 2, t); seeds.push(seed);
        }
        if (i < n) { const j = start + i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      }
    };
    // Broad pond leaves grow into the upper left margin.
    const root = at(-.045, .98);
    for (const [u, v, size, angle, load, seed] of [
      [.025, .81, 2.65, -.30, 1.14, 3.1], [.105, .92, 1.85, .55, .75, 12.8], [-.015, .64, 2.05, -.8, .88, 27.4],
    ]) {
      const p = at(u, v);
      stem(root, p, .38, .045, seed);
      leaf(p, angle, size, size * .91, 0, seed, load);
    }
    // A curved sprig with alternating brush leaves enters at the lower right.
    const a = at(1.035, -.025), b = at(.845, .245);
    stem(a, b, -.28, .050, 39.1);
    const delta = b.clone().sub(a), angle = Math.atan2(-delta.x, delta.z);
    const side = new THREE.Vector3(-delta.z, 0, delta.x).normalize();
    for (let i = 0; i < 8; i++) {
      const t = .17 + i * .101 + (random(i, 1) - .5) * .038, sign = i % 2 ? -1 : 1;
      const origin = a.clone().lerp(b, t).addScaledVector(side, Math.sin(t * Math.PI) * -.28);
      const length = 1.30 + random(i, 2) * .48 - t * .36;
      const rotation = angle + sign * (.55 + random(i, 3) * .48) + (random(i, 4) - .5) * .18;
      const p = origin.clone().add(new THREE.Vector3(-Math.sin(rotation), 0, Math.cos(rotation)).multiplyScalar(length * .42));
      leaf(p, rotation, .30 + random(i, 5) * .20, length, 1, 40 + i * 2.7, .60 + random(i, 6) * .30);
    }
    const pad = at(.985, .29);
    stem(at(1.05, .12), pad, -.2, .032, 65.);
    leaf(pad, -.55, 1.85, 1.65, 0, 65., .64);
    // A few small floating leaves sit on the surface, outside the central opening.
    for (const [u, v, size, angle, load, seed] of [
      [.18, .29, .83, -.65, .72, 81.], [.88, .70, .78, .8, .86, 93.], [.65, .105, .66, .1, .59, 107.],
    ]) leaf(at(u, v), angle, size, size * 1.08, 2, seed, load, true);

    const geometry = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    geometry.index = plane.index.clone();
    for (const name of ['position', 'uv']) geometry.setAttribute(name, plane.attributes[name].clone());
    plane.dispose();
    geometry.instanceCount = leaves.length;
    geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => l.point.toArray())), 3));
    geometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => [l.angle, 0, l.width, l.length])), 4));
    geometry.setAttribute('aPigment', new THREE.InstancedBufferAttribute(new Float32Array(leaves.flatMap((l) => [l.kind, l.seed, l.load, l.drift])), 4));
    this.leaves.geometry.dispose(); this.leaves.geometry = geometry;
    this.leafCount = leaves.length;
    const stems = new THREE.BufferGeometry();
    stems.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    stems.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    stems.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    stems.setIndex(indices);
    this.stems.geometry.dispose(); this.stems.geometry = stems;
  }
}
