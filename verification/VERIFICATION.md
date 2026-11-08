# Verification: drifting ink pond

November 8, 2026, America/Vancouver. Web edition v0.11.

## Retained behaviour

Fish geometry, ink materials, individual swimming, rhythm, schooling, and tighter bounds are byte-for-byte identical to v0.10. The only change in `app.mjs` is the water refraction reset value, from 0.45 to 0.65. Its camera and simulation code are unchanged. Source hashes are recorded in `movement-preservation.json`.

All 23 checks pass. Complete output is in `test-output.txt`. The existing 21 motion, geometry, rhythm, schooling, avoidance, Regroup, and fixed-view occupancy checks remain. Two new checks measure the rendered plant attributes: branch and petiole junctions remain connected at several times; free pads and fragments move smoothly while rooted ends remain anchored. Repeated updates at an identical simulation time produce an identical pose.

## Planting and water

The forked sprig and smaller opposite sprig have ten leaves, each attached at its painted base to a petiole. Shared motion fields keep junctions continuous. Rooted pads and branches flex progressively toward their tips. Two free pads and ten fallen fragments drift and rotate gently. Twenty-six surface leaf instances leave the central opening available for fish.

Nine combinations of aspect ratio and camera angle produced finite plant geometry at 0, 20, and 60 seconds. Counts remained consistent. `garden-layouts.json` records these cases; they do not constitute physical mobile-device testing.

Refraction combines directional waves, two circular lapping wave fields, and a small pigment-only brightness modulation. It samples the submerged fish layer and leaves paper and surface plants outside the optical effect. The default increases to 65%. Trailing wash remains off.

`flow-water-off.jpg` and `flow-water-on.jpg` compare 0% and 100% water at an identical paused fish pose and camera. Their DOM diagnostics are in `flow-refraction-verification.json`. The earlier v0.9 numeric JPEG comparison remains separately labeled in `refraction-verification.json`; its pixel measurements do not describe this edition.

## Chrome verification

The updated artwork was visually checked in Chrome over loopback HTTP. `flowing-pond-chrome.jpg` shows the result. Browser diagnostics record v0.11, six fish, 26 surface leaves, water at 65%, trailing wash at zero, and tracking off. The artwork continued animating. Two uninterrupted artwork-view samples, 45.475 simulated seconds apart, retained identical camera position, rotation, and projection. Showing controls deliberately changes the scene aspect ratio and projection.

No artwork shader, WebGL, or other runtime warnings or errors were observed. Installed-extension warnings and asynchronous browser message-channel errors were counted separately in `browser-verification.json`. The loaded Chrome tab was retained as the deliverable.

## Packaging and limits

The HTML embeds code, shaders, procedural geometry and paper, and the Three.js MIT license. It contains one inline script and style, unique element IDs, and no external asset tags. `artifact-audit.json` records its hash and the verified file counts for all ten preserved editions. Every archived file matches its SHA-256 manifest.

The artifact was verified over loopback HTTP. Direct double-click launch remains unverified because the previous preview browser blocked file URLs; another browser was not used to bypass that restriction. Physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. The water and plant currents are stylized approximations. No hosted deployment is configured.
