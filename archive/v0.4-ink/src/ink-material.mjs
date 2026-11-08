import * as THREE from '../vendor/three.module.js';

export const inkNoise = `
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
             mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}
float fbm2(vec2 p) {
  return .57 * noise2(p) + .28 * noise2(p * 2.07 + 8.3) + .15 * noise2(p * 4.17 - 5.1);
}
`;

export const inkLoadForFish = (seed) => [1, .67, .90, .50, .80, .96][Math.abs(seed) % 6];

export function createInkMaterial(seed, fin = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: seed * 13.71 + 2.8 },
      uFin: { value: fin ? 1 : 0 },
      uOpacity: { value: 1 },
      uLoad: { value: inkLoadForFish(seed) },
      uSubmerge: { value: .9 },
    },
    vertexShader: `
      attribute vec3 aInk;
      varying vec3 vInk;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vInk = aInk;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -view.xyz;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform float uSeed;
      uniform float uFin;
      uniform float uOpacity;
      uniform float uLoad, uSubmerge;
      varying vec3 vInk;
      varying vec3 vNormal;
      varying vec3 vView;
      ${inkNoise}
      void main() {
        if (uFin > .5) {
          vec2 uv = vInk.xy;
          float wash = fbm2(uv * vec2(9., 5.) + uSeed);
          float ribs = pow(.5 + .5 * sin(uv.x * 66. + sin(uv.y * 5.) * .7), 12.);
          float edge = 1. - smoothstep(.65, .98, uv.y);
          float density = (.08 + .12 * wash + ribs * .16) * uLoad * uSubmerge;
          float alpha = (.52 + .20 * wash) * mix(1., .38, uv.y) * edge * uOpacity;
          gl_FragColor = vec4(vec3(density), alpha);
          return;
        }
        float s = vInk.x;
        vec2 brush = vec2(s * 5.4, vInk.y * .65 + vInk.z * .41);
        float clouds = fbm2(brush * vec2(1.2, 5.) + uSeed);
        float dry = fbm2(brush * vec2(15., 34.) + uSeed * 2.7);
        float head = 1. - smoothstep(.04, .34, s);
        float dorsal = smoothstep(-.05, .75, vInk.z);
        float rim = pow(1. - abs(dot(normalize(vNormal), normalize(vView))), 2.1);
        float shoulder = smoothstep(.12, .24, s) * (1. - smoothstep(.68, .92, s));
        float markings = smoothstep(.40, .68, clouds) * (.25 + .75 * dorsal);
        float spine = exp(-vInk.y * vInk.y * 13.) * dorsal;
        float density = .075 + clouds * .10 + dorsal * .065;
        density += head * (.43 + clouds * .23);
        density += shoulder * markings * .33 + spine * .12;
        density += rim * (.10 + head * .16);
        density *= mix(.77, 1.13, dry);
        density *= mix(1., .42, smoothstep(.67, 1., s));
        density *= uLoad * uSubmerge;
        gl_FragColor = vec4(vec3(clamp(density, 0., 1.)), uOpacity);
      }
    `,
    side: fin ? THREE.DoubleSide : THREE.FrontSide,
    transparent: fin,
    depthWrite: !fin,
    toneMapped: false,
  });
}
