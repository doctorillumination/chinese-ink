# Verification: depth and interactive water

November 8, 2026, America/Vancouver. Web edition v0.12.

## Movement and depth

Individual swimming, rhythm, schooling, collision planning, and tighter bounds are byte-for-byte identical to v0.11. The camera block is also unchanged. Fish geometry generation remains unchanged after excluding the new optical depth setup. `movement-preservation.json` records these comparisons.

Each fish has a smooth optical rise-and-dive cycle influenced by its existing depth. The ink materials carry depth into the existing pigment target. The compositor uses it for selective softening, fading, and stronger refraction. A small vertical rendering offset separates deeper layers from the surface; visible spine inspection follows the same offset. This does not change the swimming or collision state. Surface leaves retain their definition.

All 27 tests pass. Four added checks cover outward wave propagation, expiry and pause behaviour, bounded drag input, independent smooth depth cycles, and pad displacement without broken plant junctions. After the final spine alignment adjustment, the nine motion and fish geometry checks were rerun and passed. The full suite output is in `test-output.txt`.

## Interaction and surface response

Ink mode uses click, touch, and drag for water interaction. Default clicks leave school steering unchanged. Pointer motion, wheel input, and pinch gestures do not rotate or zoom this view. Explicit camera view buttons remain available; Form study retains orbiting and zooming. Follow pointer remains an explicit steering mode.

Six bounded wave slots carry expanding rings for up to eight simulated seconds. Painted rings use thin, irregular, partly broken strokes. The same traveling field refracts the fish and displaces nearby pads and fragments. Rooted plants share their motion at leaf and branch junctions. Pausing holds depth, water, and plant motion. Nine aspect-ratio and camera-angle layouts produced finite plant attributes with passing waves, as recorded in `garden-layouts.json`.

## Chrome checks

A real click created a ripple, and a drag created several ripples while camera position, rotation, and projection stayed identical. Browser DOM diagnostics are in `camera-verification.json` and `depth-and-ripple-verification.json`. `depth-and-ripples-chrome.jpg` shows a stirred surface in Chrome.

`water-depth-off.jpg` and `water-depth-full.jpg` compare depth at an identical paused simulation time, position, speed, effort, clearance, and camera. These images change only the depth treatment and its optical positioning. The default was then restored to 80% depth, 75% ripple ink, 65% refraction, trailing wash off, and camera tracking off. The six-fish simulation continued animating.

No artwork shader, WebGL, or runtime warnings or errors were observed in the captured browser logs. Installed-extension warnings and browser message-channel errors are counted separately in `browser-verification.json`. Earlier comparisons retain their original edition labels and do not describe this edition's depth treatment.

## Self-contained delivery

The HTML contains one inline script, one inline style, unique element IDs, the Three.js MIT license, and no external asset tags. Its hash and check results are in `artifact-audit.json`. All eleven preserved editions match their SHA-256 manifests, including the 59-file v0.11 snapshot.

The loopback server is kept running for the user's Chrome session. The Mac launcher and `npm run preview` remain available. No hosted deployment is configured. Direct file launch, physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. This is an artistic optical and wave model, not a full fluid or light-transport simulation.
