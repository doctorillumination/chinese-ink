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

const INK_VARIANTS = Object.freeze([
  { name: 'Deep ink', family: 'dense', style: 2, load: 1.00, finGain: .95, rays: .075, details: .12 },
  { name: 'Pale contour', family: 'contour', style: 0, load: .95, finGain: .62, rays: .040, details: .07 },
  { name: 'Blotched wash', family: 'mottled', style: 1, load: 1.00, finGain: .80, rays: .065, details: .10 },
  { name: 'Silver contour', family: 'contour', style: 0, load: .78, finGain: .68, rays: .035, details: .065 },
  { name: 'Pooled ink', family: 'mottled', style: 1, load: 1.08, finGain: .78, rays: .060, details: .10 },
  { name: 'Charcoal wash', family: 'dense', style: 2, load: .79, finGain: .88, rays: .065, details: .10 },
  { name: 'Paper contour', family: 'contour', style: 0, load: .87, finGain: .60, rays: .035, details: .065 },
  { name: 'Scattered ink', family: 'mottled', style: 1, load: .94, finGain: .80, rays: .060, details: .10 },
  { name: 'Smoke wash', family: 'dense', style: 2, load: .89, finGain: .90, rays: .070, details: .11 },
].map(Object.freeze));

export const inkVariantForFish = (seed) => INK_VARIANTS[Math.abs(seed) % INK_VARIANTS.length];
export const inkLoadForFish = (seed) => inkVariantForFish(seed).load;

export function createInkMaterial(seed, fin = false) {
  const variant = inkVariantForFish(seed);
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: seed * 13.71 + 2.8 },
      uFin: { value: fin ? 1 : 0 },
      uOpacity: { value: 1 },
      uLoad: { value: variant.load * (fin ? variant.finGain : 1) },
      uStyle: { value: variant.style },
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
      uniform float uLoad, uSubmerge, uStyle;
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
      float inkBlot(vec2 p, vec2 center, vec2 radius, float seed) {
        vec2 q = (p - center) / radius;
        float ragged = (fbm2(q * 2.1 + seed) - .5) * .68;
        ragged += (noise2(q * 8. + seed) - .5) * .12;
        float d = length(q) + ragged;
        float wet = 1. - smoothstep(.66, 1.23, d);
        float pool = 1. - smoothstep(.38, .94, d);
        float granule = .80 + .20 * noise2(q * 28. + seed);
        return (wet * .40 + pool * .60) * granule;
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
          float density = (.10 + .18 * wash + bristle * .22) * uLoad * uSubmerge;
          float alpha = (.57 + .24 * wash) * mix(1., .36, uv.y) * edge * uOpacity;
          // Red stores pigment, green coverage, and blue the fin contribution.
          gl_FragColor = vec4(density, 1., 1., alpha);
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
        vec2 skin = vec2(s, across);
        vec2 a = vec2(.19 + hash21(vec2(uSeed, 4.)) * .15, -.42 + hash21(vec2(uSeed, 7.)) * .70);
        vec2 b = vec2(.49 + hash21(vec2(uSeed, 9.)) * .19, -.18 + hash21(vec2(uSeed, 3.)) * .55);
        vec2 c = vec2(.73 + hash21(vec2(uSeed, 6.)) * .10, -.40 + hash21(vec2(uSeed, 2.)) * .80);
        float blotches = inkBlot(skin, a, vec2(.10, .55), uSeed);
        blotches += inkBlot(skin, b, vec2(.13, .64), uSeed + 14.) * .92;
        blotches += inkBlot(skin, c, vec2(.065, .43), uSeed + 27.) * .58;
        blotches = min(1., blotches) * (.48 + dorsal * .52);
        float contourNoise = noise2(vec2(s * 18., across * 3.) + uSeed);
        float contour = 1. - smoothstep(.12, .52, facing + (contourNoise - .5) * .13);
        float density;
        if (uStyle < .5) {
          // Leave the paper visible inside a delicate, uneven ink contour.
          density = .006 + clouds * .019 + wash * .009;
          density += contour * (.105 + clouds * .070);
          density += head * .026 + strokes * dorsal * .010;
          density *= mix(.84, 1.08, dry);
        } else if (uStyle < 1.5) {
          density = .030 + clouds * .065 + wash * .045;
          density += blotches * (.53 + clouds * .23);
          density += contour * .055 + head * .047;
          density += strokes * dorsal * .023;
          density *= mix(.83, 1.12, dry);
        } else {
          density = .16 + clouds * .22 + wash * .12;
          density += head * (.13 + clouds * .12) + blotches * .22;
          density += strokes * (.045 + dorsal * .055);
          density *= mix(.73, 1.13, dry);
        }
        // Pale, irregular margins allow the wash to dissolve into paper.
        float margin = smoothstep(.03, .57, facing + (clouds - .5) * .28);
        density *= mix(uStyle < .5 ? .72 : .30 + wash * .22, 1., margin);
        density *= mix(1., .34, smoothstep(.65, 1., s));
        density *= uLoad * uSubmerge;
        gl_FragColor = vec4(clamp(density, 0., 1.), 1., 0., uOpacity);
      }
    `,
    side: fin ? THREE.DoubleSide : THREE.FrontSide,
    transparent: fin,
    depthWrite: !fin,
    toneMapped: false,
  });
}
