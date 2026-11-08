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
          vec2 p = vUv - .5;
          float cloud = fbm2(p * 5.2 + seed);
          float tooth = noise2(p * vec2(100., 78.) + seed);
          float alpha, veins, rim;
          if (kind < .5) {
            float angle = atan(p.y, p.x), r = length(p);
            float edge = .43 + sin(angle * 7. + seed) * .014 + (noise2(p * 18. + seed) - .5) * .025;
            alpha = 1. - smoothstep(edge - .009, edge + .018, r);
            float slit = smoothstep(.012, .032, abs(p.x) - max(0., -p.y) * .23);
            alpha *= p.y < 0. ? slit : 1.;
            veins = pow(.5 + .5 * cos(angle * 11. + sin(r * 7.) * .24), 20.) * smoothstep(.07, .28, r);
            rim = exp(-pow((r - edge + .025) / .035, 2.));
          } else if (kind < 1.5) {
            float bend = sin(vUv.y * 3.14159) * .075;
            float width = pow(max(0., sin(vUv.y * 3.14159)), .86) * (.35 + cloud * .065);
            float distance = abs(p.x - bend) - width;
            alpha = (1. - smoothstep(-.012, .025, distance)) * smoothstep(0., .06, vUv.y) * (1. - smoothstep(.94, 1., vUv.y));
            veins = exp(-pow((p.x - bend) / .017, 2.)) * .8;
            veins += pow(.5 + .5 * sin(vUv.y * 58. + abs(p.x - bend) * 24.), 18.) * .22;
            rim = exp(-pow((distance + .025) / .030, 2.));
          } else {
            float angle = atan(p.y, p.x), r = length(p);
            float edge = .33 + cos(angle * 5. + .5) * .070 + cos(angle * 10. - .2) * .014;
            edge += (noise2(p * 21. + seed) - .5) * .025;
            alpha = 1. - smoothstep(edge - .008, edge + .022, r);
            veins = pow(.5 + .5 * cos(angle * 5. + .5), 24.) * smoothstep(.03, .20, r);
            rim = exp(-pow((r - edge + .025) / .035, 2.));
          }
          float pooling = smoothstep(.38, .72, fbm2(p * 8. + seed * 1.8));
          float density = (.09 + cloud * .24 + pooling * .21 + veins * .12 + rim * .075) * load;
          density *= .84 + tooth * .24;
          alpha *= .94 + cloud * .06;
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
          float edge = smoothstep(0., .22, vUv.x) * (1. - smoothstep(.78, 1., vUv.x));
          float density = .19 + dry * .22;
          gl_FragColor = vec4(density, 1., 0., edge * (.55 + dry * .35));
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
    const leaf = (point, angle, width, length, kind, seed, load, floating = false) => {
      leaves.push({ point, angle, width, length, kind, seed, load, drift: floating ? .026 : 0 });
    };
    const stem = (a, b, bend, width, seed) => {
      const n = 28, start = positions.length / 3;
      const delta = b.clone().sub(a), across = new THREE.Vector3(-delta.z, 0, delta.x).normalize();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const center = a.clone().lerp(b, t).addScaledVector(across, Math.sin(t * Math.PI) * bend);
        const half = width * (.35 + .65 * (1 - t)) * .5;
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
      const t = .19 + i * .099, sign = i % 2 ? -1 : 1;
      const origin = a.clone().lerp(b, t).addScaledVector(side, Math.sin(t * Math.PI) * -.28);
      const length = 1.55 - t * .50;
      const rotation = angle + sign * .78;
      const p = origin.clone().add(new THREE.Vector3(-Math.sin(rotation), 0, Math.cos(rotation)).multiplyScalar(length * .42));
      leaf(p, rotation, .36 + t * .12, length, 1, 40 + i * 2.7, .68 + (i % 3) * .10);
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
