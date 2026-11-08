import * as THREE from '../vendor/three.module.js';
import { inkNoise, inkLoadForFish } from './ink-material.mjs';
import { InkGarden } from './ink-garden.mjs';

const quadVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

export class InkRenderer {
  constructor(renderer) {
    this.renderer = renderer;
    this.params = { strength: 1.0, bleed: 0.85, trails: 0, paper: 0.65, water: 0.45 };
    this.garden = new InkGarden();
    this.gardenTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.gardenTarget.samples = Math.min(2, renderer.capabilities.maxSamples);
    this.center = new THREE.Vector2();
    this.previousCenter = new THREE.Vector2();
    this.span = 64;
    this.fieldSize = 512;
    this.accumulator = 0;
    this.lastTime = 0;
    this.fishTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    this.fishTarget.samples = Math.min(2, renderer.capabilities.maxSamples);
    this.softTargets = [0, 1].map(() => new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }));
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: { uSource: { value: null }, uDirection: { value: new THREE.Vector2() } },
      vertexShader: quadVertex,
      fragmentShader: `
        uniform sampler2D uSource;
        uniform vec2 uDirection;
        varying vec2 vUv;
        void main() {
          vec3 ink = texture2D(uSource, vUv).rgb * .227027;
          ink += (texture2D(uSource, vUv + uDirection * 1.384615).rgb
                + texture2D(uSource, vUv - uDirection * 1.384615).rgb) * .316216;
          ink += (texture2D(uSource, vUv + uDirection * 3.230769).rgb
                + texture2D(uSource, vUv - uDirection * 3.230769).rgb) * .070270;
          gl_FragColor = vec4(ink, 1.);
        }
      `,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    const floatingInk = renderer.extensions.has('EXT_color_buffer_float');
    this.precision = floatingInk ? 'half-float' : '8-bit';
    this.fields = [0, 1].map(() => new THREE.WebGLRenderTarget(this.fieldSize, this.fieldSize, { type: floatingInk ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }));
    this.read = 0;
    this.heads = Array.from({ length: 9 }, () => new THREE.Vector4());
    this.tails = Array.from({ length: 9 }, () => new THREE.Vector4());
    this.forward = Array.from({ length: 9 }, () => new THREE.Vector4());
    this.ripples = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0));
    this.rippleStarts = Array(6).fill(-100);
    this.rippleIndex = 0;
    this.lastRippleTime = -100;
    this.flowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrevious: { value: null }, uCenter: { value: this.center }, uOldCenter: { value: this.previousCenter },
        uSpan: { value: this.span }, uTexel: { value: 1 / this.fieldSize },
        uTime: { value: 0 }, uDelta: { value: 0 }, uCount: { value: 0 },
        uQuantized: { value: floatingInk ? 0 : 1 },
        uHeads: { value: this.heads }, uTails: { value: this.tails }, uForward: { value: this.forward },
        uRipples: { value: this.ripples },
      },
      vertexShader: quadVertex,
      fragmentShader: `
        uniform sampler2D uPrevious;
        uniform vec2 uCenter, uOldCenter;
        uniform float uSpan, uTexel, uTime, uDelta, uQuantized;
        uniform int uCount;
        uniform vec4 uHeads[9], uTails[9], uForward[9];
        uniform vec4 uRipples[6];
        varying vec2 vUv;
        ${inkNoise}
        float oldInk(vec2 uv) {
          if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 0.;
          return texture2D(uPrevious, uv).r;
        }
        void main() {
          vec2 world = uCenter + (vUv - .5) * uSpan;
          vec2 velocity = vec2(sin(world.y * .19 + uTime * .12), cos(world.x * .17 - uTime * .10)) * .045;
          float source = 0.;
          for (int i = 0; i < 9; i++) {
            if (i >= uCount) break;
            vec2 dir = uForward[i].xy;
            vec2 side = vec2(-dir.y, dir.x);
            vec2 d = world - uTails[i].xy;
            float along = dot(d, dir), across = dot(d, side);
            float wake = exp(-across * across / .24) * exp(-pow((along + .55) / 1.05, 2.));
            float beat = sin(uForward[i].z);
            velocity += dir * wake * (.10 + uForward[i].w * .12);
            velocity += side * beat * wake * .15;
            vec2 swirl = d + dir * .8 - side * beat * .18;
            velocity += vec2(-swirl.y, swirl.x) * exp(-dot(swirl, swirl) / .85) * beat * .13;
            float seed = noise2(world * 4.3 + float(i) * 17.8);
            source += wake * (.065 + seed * .055) * (.7 + uForward[i].w * .3) * uHeads[i].w;
          }
          for (int i = 0; i < 6; i++) {
            if (uRipples[i].w < .5) continue;
            vec2 d = world - uRipples[i].xy;
            float r = length(d), age = uRipples[i].z;
            float push = exp(-pow((r - age * 1.7) / .3, 2.)) * exp(-age * 1.3);
            velocity += d / max(r, .01) * push * .18;
          }
          vec2 oldUv = (world - uOldCenter) / uSpan + .5 - velocity * uDelta / uSpan;
          float ink = oldInk(oldUv);
          float spread = (oldInk(oldUv + vec2(uTexel,0)) + oldInk(oldUv - vec2(uTexel,0))
                        + oldInk(oldUv + vec2(0,uTexel)) + oldInk(oldUv - vec2(0,uTexel))) * .25;
          ink = mix(ink, spread, min(.28, uDelta * 3.5));
          ink *= exp(-uDelta * (.75 + ink * .9));
          ink += source * uDelta;
          ink += (hash21(gl_FragCoord.xy + uTime * 17.1) - .5) * uQuantized / 255.;
          gl_FragColor = vec4(vec3(clamp(ink, 0., .75)), 1.);
        }
      `,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFish: { value: this.fishTarget.texture }, uSoft: { value: this.softTargets[1].texture }, uField: { value: this.fields[0].texture },
        uGarden: { value: this.gardenTarget.texture }, uTime: { value: 0 }, uWater: { value: .45 },
        uResolution: { value: new THREE.Vector2(1, 1) }, uRatio: { value: 1 },
        uInverseProjection: { value: new THREE.Matrix4() }, uCameraWorld: { value: new THREE.Matrix4() },
        uCenter: { value: this.center }, uSpan: { value: this.span },
        uStrength: { value: 1 }, uBleed: { value: .65 }, uTrails: { value: 0 }, uPaper: { value: .65 },
        uRipples: { value: this.ripples },
      },
      vertexShader: quadVertex,
      fragmentShader: `
        uniform sampler2D uFish, uSoft, uField, uGarden;
        uniform vec2 uResolution, uCenter;
        uniform mat4 uInverseProjection, uCameraWorld;
        uniform float uSpan, uRatio, uStrength, uBleed, uTrails, uPaper;
        uniform float uTime, uWater;
        uniform vec4 uRipples[6];
        varying vec2 vUv;
        ${inkNoise}
        void main() {
          vec2 pixel = 1. / uResolution;
          vec2 paperPixel = gl_FragCoord.xy / uRatio;
          float cotton = fbm2(paperPixel * vec2(.085, .34));
          float tooth = noise2(paperPixel * .75);
          float fibre = noise2(paperPixel * vec2(.026, .60));
          float broad = fbm2(paperPixel * .006);
          vec3 paper = vec3(.968, .965, .946);
          paper += (cotton * .018 + tooth * .013 + fibre * .012 + broad * .014 - .028) * uPaper;
          vec4 nearView = uInverseProjection * vec4(vUv * 2. - 1., -1., 1.);
          vec3 origin = (uCameraWorld * vec4(nearView.xyz, 1.)).xyz;
          vec3 ray = normalize((uCameraWorld * vec4(0., 0., -1., 0.)).xyz);
          float denominator = abs(ray.y) < .05 ? -.05 : ray.y;
          vec3 world = origin - ray * origin.y / denominator;
          vec2 surface = world.xz;
          vec2 slope = vec2(.80, .60) * cos(dot(surface, vec2(1.76, 1.32)) - uTime * .83) * .52;
          slope += vec2(-.44, .90) * cos(dot(surface, vec2(-1.43, 2.92)) + uTime * .64 + 1.7) * .30;
          slope += vec2(.95, -.31) * sin(dot(surface, vec2(3.23, -1.05)) - uTime * .41 + 3.1) * .13;
          for (int i = 0; i < 6; i++) {
            if (uRipples[i].w < .5) continue;
            vec2 d = surface - uRipples[i].xy;
            float r = length(d), age = uRipples[i].z;
            float front = r - age * 1.7;
            float pulse = cos(front * 7.) * exp(-front * front / .38) * exp(-age * 1.2);
            slope += d / max(r, .05) * pulse * 1.1;
          }
          vec2 warp = vec2(fbm2(paperPixel * .075), fbm2(paperPixel.yx * .069 + 13.)) - .5;
          vec2 uv = vUv + warp * pixel * uRatio * uBleed * 2.3;
          // Only the submerged ink is refracted. Paper and surface leaves stay quiet.
          uv += slope * pixel * uRatio * uWater * 2.2;
          vec3 coreInk = texture2D(uFish, uv).rgb;
          vec3 softInk = texture2D(uSoft, uv).rgb;
          vec2 softStep = pixel * uRatio * (2. + uBleed * 3.);
          float halo = (texture2D(uSoft, uv + vec2(softStep.x,0)).r + texture2D(uSoft, uv - vec2(softStep.x,0)).r
                      + texture2D(uSoft, uv + vec2(0,softStep.y)).r + texture2D(uSoft, uv - vec2(0,softStep.y)).r) * .25;
          float wetness = .72 + fbm2(paperPixel * .035) * .28;
          float interior = smoothstep(.60, .95, softInk.g);
          float fin = clamp(coreInk.b / max(coreInk.g, .001), 0., 1.);
          // Preserve brush detail inside bodies and fins, with wet margins outside.
          float softness = mix(mix(.80, .14, interior), .22, fin);
          float pigment = mix(coreInk.r, softInk.r, uBleed * softness);
          pigment += halo * uBleed * .10 * wetness;
          vec2 fieldUv = (world.xz - uCenter) / uSpan + .5;
          float trail = 0.;
          if (min(fieldUv.x,fieldUv.y) > 0. && max(fieldUv.x,fieldUv.y) < 1.) trail = texture2D(uField, fieldUv).r;
          pigment += trail * uTrails * 2.5;
          vec2 gardenWarp = (vec2(noise2(paperPixel * .11 + 7.), noise2(paperPixel.yx * .13)) - .5) * pixel * uRatio * .7;
          vec2 garden = texture2D(uGarden, vUv + gardenWarp).rg;
          pigment = pigment * (1. - garden.g) + garden.r;
          pigment *= 1. + (cotton - .5) * uPaper * .12 + (tooth - .5) * uPaper * .09;
          vec3 absorption = mix(vec3(3.3, 3.0, 2.75), vec3(3.5, 3.7, 3.95), smoothstep(.14, .8, pigment));
          vec3 colour = paper * exp(-pigment * uStrength * absorption);
          gl_FragColor = vec4(colour, 1.);
        }
      `,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.Camera();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.flowMaterial);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.clear();
  }

  clear() {
    const renderer = this.renderer;
    const oldTarget = renderer.getRenderTarget();
    const color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    for (const target of this.fields) { renderer.setRenderTarget(target); renderer.clear(); }
    renderer.setRenderTarget(oldTarget);
    renderer.setClearColor(color, alpha);
    this.accumulator = 0;
    this.lastTime = 0;
    this.rippleStarts.fill(-100);
    for (const ripple of this.ripples) ripple.w = 0;
    this.lastRippleTime = -100;
  }

  ripple(x, z, time) {
    if (time - this.lastRippleTime < .22) return;
    const i = this.rippleIndex++ % this.ripples.length;
    this.ripples[i].set(x, z, 0, 1);
    this.rippleStarts[i] = time;
    this.lastRippleTime = time;
  }

  resize(width, height, ratio) {
    this.fishTarget.setSize(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
    this.gardenTarget.setSize(this.fishTarget.width, this.fishTarget.height);
    for (const target of this.softTargets) target.setSize(Math.max(1, Math.round(width * ratio / 2)), Math.max(1, Math.round(height * ratio / 2)));
    this.displayMaterial.uniforms.uResolution.value.set(this.fishTarget.width, this.fishTarget.height);
    this.displayMaterial.uniforms.uRatio.value = ratio;
  }

  render(scene, camera, school) {
    const renderer = this.renderer;
    const delta = Math.max(0, Math.min(.1, school.time - this.lastTime));
    this.lastTime = school.time;
    this.ripples.forEach((ripple, i) => {
      ripple.z = school.time - this.rippleStarts[i];
      ripple.w = ripple.z < 2.4 ? 1 : 0;
    });
    this.accumulator += delta;
    if (this.accumulator >= 1 / 30) {
      this.previousCenter.copy(this.center);
      const centroid = school.centroid;
      if (Math.hypot(centroid.x - this.center.x, centroid.z - this.center.y) > 12) this.center.set(Math.round(centroid.x / 4) * 4, Math.round(centroid.z / 4) * 4);
      school.fish.forEach((fish, i) => {
        const tail = fish.spine.at(-1);
        this.heads[i].set(fish.x, fish.z, fish.y, inkLoadForFish(fish.id));
        this.tails[i].set(tail.x, tail.z, tail.y, fish.scale);
        this.forward[i].set(Math.cos(fish.yaw), Math.sin(fish.yaw), fish.phase, fish.effort);
      });
      Object.assign(this.flowMaterial.uniforms.uCount, { value: school.fish.length });
      this.flowMaterial.uniforms.uPrevious.value = this.fields[this.read].texture;
      this.flowMaterial.uniforms.uTime.value = school.time;
      this.flowMaterial.uniforms.uDelta.value = Math.min(this.accumulator, .1);
      this.quad.material = this.flowMaterial;
      renderer.setRenderTarget(this.fields[1 - this.read]);
      renderer.render(this.quadScene, this.quadCamera);
      this.read = 1 - this.read;
      this.accumulator = 0;
    }
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.fishTarget);
    renderer.clear();
    renderer.render(scene, camera);
    this.garden.update(camera, school.time);
    renderer.setRenderTarget(this.gardenTarget);
    renderer.clear();
    renderer.render(this.garden.scene, camera);
    const blur = this.blurMaterial.uniforms;
    const radius = (.18 + this.params.bleed * .45) * renderer.getPixelRatio();
    this.quad.material = this.blurMaterial;
    blur.uSource.value = this.fishTarget.texture;
    blur.uDirection.value.set(radius / this.softTargets[0].width, 0);
    renderer.setRenderTarget(this.softTargets[0]);
    renderer.render(this.quadScene, this.quadCamera);
    blur.uSource.value = this.softTargets[0].texture;
    blur.uDirection.value.set(0, radius / this.softTargets[1].height);
    renderer.setRenderTarget(this.softTargets[1]);
    renderer.render(this.quadScene, this.quadCamera);
    const u = this.displayMaterial.uniforms;
    u.uField.value = this.fields[this.read].texture;
    u.uInverseProjection.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);
    u.uStrength.value = this.params.strength;
    u.uBleed.value = this.params.bleed;
    u.uTrails.value = this.params.trails;
    u.uPaper.value = this.params.paper;
    u.uTime.value = school.time;
    u.uWater.value = this.params.water;
    this.quad.material = this.displayMaterial;
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }
}
