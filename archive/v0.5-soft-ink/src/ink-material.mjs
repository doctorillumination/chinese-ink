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
      float brushStroke(float s, float across, float offset, float seed) {
        float bend = (noise2(vec2(s * 4.2, seed)) - .5) * .52;
        float width = mix(.16, .055, smoothstep(.12, .95, s));
        width *= .6 + noise2(vec2(s * 11., seed + 3.)) * .8;
        float distance = abs(across - offset - bend);
        float feather = .045 + noise2(vec2(s * 31., across * 8. + seed)) * .08;
        float stroke = 1. - smoothstep(width, width + feather, distance);
        float broken = smoothstep(.22, .64, fbm2(vec2(s * 13., across * 3.) + seed));
        return stroke * mix(.28, 1., broken) * (1. - smoothstep(.64, 1., s));
      }
      void main() {
        if (uFin > .5) {
          vec2 uv = vInk.xy;
          float wash = fbm2(uv * vec2(5., 3.) + uSeed);
          float strands = uv.x * 47. + noise2(vec2(uv.x * 9., uSeed)) * 4.;
          strands += (noise2(uv * vec2(7., 5.) + uSeed) - .5) * 2.;
          float bristle = pow(.5 + .5 * sin(strands), 10.);
          bristle *= smoothstep(.20, .70, fbm2(uv * vec2(17., 8.) + uSeed * 2.));
          float edge = 1. - smoothstep(.42 + wash * .15, .91 + (wash - .5) * .16, uv.y);
          float density = (.085 + .16 * wash + bristle * .12) * uLoad * uSubmerge;
          float alpha = (.52 + .24 * wash) * mix(1., .30, uv.y) * edge * uOpacity;
          gl_FragColor = vec4(vec3(density), alpha);
          return;
        }
        float s = vInk.x;
        float across = vInk.y;
        vec2 brush = vec2(s * 4., across * 1.7 + vInk.z * .35);
        vec2 drift = vec2(fbm2(brush + uSeed), fbm2(brush + uSeed + 19.)) - .5;
        float clouds = fbm2(brush + drift * 1.5 + uSeed);
        float dry = fbm2(vec2(s * 95., across * 23.) + uSeed * 2.7);
        float head = 1. - smoothstep(.05, .36 + (clouds - .5) * .14, s);
        float dorsal = smoothstep(-.05, .75, vInk.z);
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float wash = smoothstep(.20, .77, clouds);
        float strokes = brushStroke(s, across, -.37, uSeed);
        strokes += brushStroke(s, across, .15, uSeed + 7.4) * .72;
        strokes += brushStroke(s, across, .54, uSeed + 21.) * .48;
        float density = .035 + clouds * .085 + wash * .11;
        density += head * (.39 + clouds * .26);
        density += strokes * (.10 + dorsal * .18) * smoothstep(.07, .27, s);
        density *= mix(.65, 1.14, dry);
        // Pale, irregular margins allow the wash to dissolve into paper.
        float margin = smoothstep(.03, .57, facing + (clouds - .5) * .28);
        density *= mix(.26 + wash * .22, 1., margin);
        density *= mix(1., .34, smoothstep(.65, 1., s));
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
