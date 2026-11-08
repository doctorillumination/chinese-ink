# Verification: organic ink planting

November 8, 2026, America/Vancouver. Local draft v0.10.

## Retained behaviour

All eight runtime source files apart from `ink-garden.mjs` are byte-for-byte identical to v0.9. This includes the fish geometry and ink materials, individual swimming, schooling and tighter bounds, app controls and camera, and water refraction compositor. Their hashes are recorded in `movement-preservation.json`.

All 21 checks pass, including collision avoidance, Regroup, and fixed-view occupancy. Complete output is in `test-output.txt`.

## Planting changes

Broad leaves have warped, uneven silhouettes, irregular folds, and sparse curved veins. Variable feathering and pigment pooling soften the edges. Lance leaves have asymmetric widths, curved midribs, and varied sizes, angles, and spacing. Floating leaves have unequal lobes. Brush stems vary in pressure and width.

Nine combinations of aspect ratio and camera angle produced finite geometry, with the same fifteen leaf instances. These checks are recorded in `garden-layouts.json`. They do not constitute physical mobile-device testing.

## Chrome verification

The updated artwork was launched in Chrome at the user's request. Its artwork view, softer plant shapes, fish movement, and quiet water surface were visually checked. The running tab was retained as a deliverable. `organic-plants-chrome.jpg` shows the result. Application diagnostics and the native viewport are recorded in `browser-verification.json`.

No shader or WebGL errors were observed. Chrome reported installed-extension warnings and three asynchronous message-channel errors, recorded separately from other page logs. The artwork continued animating normally. No other page warnings or errors were observed. Fish count remained six, camera tracking remained off, Water refraction remained 45%, and Trailing wash remained 0%.

The water code is unchanged. The paused refraction comparison from v0.9 remains available with its original edition label. It showed identical simulation and camera state while the fish image changed, and negligible JPEG differences in a sampled quiet-paper region. That comparison was not repeated for this plant-only update.

## Packaging and limits

The HTML embeds all code, shaders, procedural geometry and paper, and the Three.js MIT license. It requires no remote assets. Earlier editions retain SHA-256 manifests.

The current artifact was verified over loopback HTTP in Chrome. Direct double-click launch remains unverified because the previous preview browser blocked file URLs; another browser was not used to bypass that restriction. Physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. The water is a stylized screen-space approximation.
