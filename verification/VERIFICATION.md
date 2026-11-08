# Verification: defined fish, paper, and surface light

November 8, 2026, America/Vancouver. Web edition v0.13.

## Preserved movement and depth

Swimming, rhythm, schooling, collision planning, tighter bounds, fish geometry, ink materials, and plant geometry are byte-for-byte identical to v0.12. Optical depth cycles, vertical layer offsets, pigment fading, the camera block, and pointer handling are retained. Source comparisons are recorded in `movement-preservation.json`.

Depth blur in the compositor is reduced: the extra depth blur radius coefficient changes from 1.25 to 0.40, and the interior blend toward the blurred image changes from at most 0.85 to about 0.20. Wet margins keep a little more softness. The depth fading multiplier is unchanged. This preserves body and fin definition while keeping the underwater fade and refraction.

## Organic waves and paper

Each click receives seeded orientation, stretch, phase, and speed variation. Its center drifts slowly, the wavefront bends, and inner arcs vary their spacing. The same geometry and normals drive fish refraction and leaf displacement. Waves taper smoothly during their last 1.8 seconds. A new directional-variation check measures different wavefront distances around a click; the travel and leaf tests now sample the passing wave rather than assuming a circular front.

The renderer adds paired, directional light and ink-shadow rims and a quiet ambient surface illumination. Surface light starts at 70%. Paper grain starts at 78%, using soft pulp mottling, fine tooth, and short, curved, randomly oriented fibres. There is no crossing weave, external paper image, or remote asset.

The supplied reference still was re-inspected for its fibrous background and light/dark ripple rims. No reference video was available to inspect in this turn.

## Checks and Chrome

All 28 tests pass. Complete output is in `test-output.txt`. Nine aspect-ratio and camera-angle combinations with shaped waves retain finite plant attributes, as recorded in `garden-layouts.json`.

The final HTML was reloaded in Chrome and visually checked for clearer submerged bodies and fins, textured paper, and the lit water surface. A real drag created several ripples while camera position, rotation, and projection remained identical. `paper-water-chrome.jpg` shows the default view with ripples.

`surface-light-off.jpg` and `surface-light-on.jpg` compare lighting at identical simulation time, fish position, optical depths, active wave count, and camera. Their diagnostics are in `surface-verification.json`. Defaults were then restored: six fish, depth 80%, refraction 65%, ripple ink 75%, surface light 70%, paper grain 78%, trailing wash off, and camera tracking off. Animation resumed.

No artwork shader, WebGL, or runtime warnings or errors were observed in the captured logs. Browser extension warnings and asynchronous message-channel errors are counted separately in `browser-verification.json`. Earlier comparisons remain labeled with their original editions.

## Delivery and limits

The finished HTML contains one inline script, one inline style, unique element IDs, the Three.js MIT license, and no external asset tags. `artifact-audit.json` records its hash and the preserved file counts. All twelve earlier editions retain matching SHA-256 manifests, including the 65-file v0.12 snapshot.

The localhost server is kept running for the user's Chrome session. The Mac launcher and `npm run preview` remain available. No hosted deployment is configured. Direct file launch, physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. These are artistic paper and water approximations rather than a full fluid or optical simulation.
