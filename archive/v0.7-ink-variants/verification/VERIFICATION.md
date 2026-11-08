# Verification: ink variation web edition

November 8, 2026, America/Vancouver. Local draft v0.7.

## Movement and camera preservation

The four simulation files are byte-for-byte identical to the archived v0.6 edition: `simulation.mjs`, `simulation-math.mjs`, `school.mjs`, and `rhythm.mjs`. The complete `app.mjs` and `ink-renderer.mjs` files are also unchanged. The fixed camera, controls, input handling, simulation loop, soft edge composite, and default trailing-wash setting are retained. Hashes are recorded in `movement-preservation.json`.

A paired diagnostic compared the revised fish with the archived v0.6 fish over 60 turning poses. Body positions, fin positions, and normals had zero deviation. Pigment coordinates remained finite.

`npm run check`: all 20 motion, geometry, schooling, and spontaneous-rhythm checks pass.

## Ink variation checks

`ink-variants.json` records nine persistent variants. The default six fish include two contour fish, two mottled fish, and two dense fish. Each variant's body and fin shader received its intended family and finite pigment load. Fish-specific pigment placement uses fixed body coordinates and a stable seed, with no frame-time input. The geometry and motion are not used as random-number sources.

Contour fish have pale interiors and light, irregular margins. Mottled fish have grey washes with warped, feathered dark patches. Dense fish have broad charcoal washes with uneven pooling and lighter breaks. Fin loads, ray opacity, and detail opacity vary with the family.

## Browser verification

The six-fish and nine-fish ink mixes rendered in the in-app browser without observed JavaScript, shader, or WebGL warnings or errors. The half-float wash path ran. Pale interiors, gentle contours, distinct dark blotches, and dense washes were visually checked in the artwork view. The fixed view can crop fish at its edges, including in the nine-fish setting.

Reset restored the six-fish mix, 85% Edge bleed, camera tracking off, and Trailing wash at 0%. The grey wake remains off. Current previews are `ink-variants-artwork.jpg`, `ink-variants-controls.jpg`, and `nine-ink-variants.jpg`.

`browser-verification.json` records the two school sizes and final defaults. `camera-verification.json` records current camera samples as the school continues swimming. Earlier rendering-control, ripple, and camera checks are retained in their edition archives.

## Web packaging and limits

The finished HTML embeds the runtime, shaders, styles, procedural paper, and Three.js MIT license. It loads no remote image, model, font, script, or texture. Earlier editions are retained with SHA-256 manifests.

The browser's security policy blocks `file:` URLs, so direct double-click launch remains unverified here. The same self-contained HTML was tested through loopback HTTP. No alternative browser surface was used to bypass that restriction.

Physical mobile devices, Safari, and Firefox have not been tested. Ink flow is a lightweight visual approximation. The body simulation remains the same simplified model. The implemented 8-bit fallback has not been separately exercised on hardware. No new biological accuracy claims are made.
