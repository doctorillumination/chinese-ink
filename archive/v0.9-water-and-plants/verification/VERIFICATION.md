# Verification: edge planting and quiet refraction

November 8, 2026, America/Vancouver. Local draft v0.9.

## Preserved fish, bounds, and camera

The individual simulation, schooling and tighter bounds, rhythm, fish geometry, and fish ink-material source files are byte-for-byte identical to the archived v0.8 edition. The camera and simulation-timing sections of `app.mjs` are also unchanged. Hashes and comparisons are recorded in `movement-preservation.json`.

All 21 existing checks pass, including collision avoidance, Regroup, and the three-minute fixed-view occupancy regression. Complete output is in `test-output.txt`. The v0.8 paired roaming comparison remains relevant to the unchanged schooling code.

## Garden and refraction

The surface garden contains broad pond leaves, a curved leafy sprig, and three small floating leaves. Its stems and leaf silhouettes are generated locally. Fifteen leaf instances and the brush stems use two meshes within a separate surface layer. Nine combinations of aspect ratio and camera angle produced finite geometry, recorded in `garden-layouts.json`. These are geometry checks, not physical mobile-device tests.

The fish image is sampled through a small analytical wave displacement. Paper is sampled independently, and the garden is composited afterwards. The broad negative space therefore has no moving water texture. A click adds a short local displacement pulse instead of drawing an ink ring on the paper. Water refraction defaults to 45%; Trailing wash remains 0%.

## Browser checks

The default planted pond rendered in the in-app browser without observed JavaScript, shader, or WebGL warnings or errors. Edge plants, veins, scattered leaves, fish definition, and the new Water refraction control were checked. The half-float path ran. Reset restored six fish, fixed camera tracking off, Water refraction 45%, and Trailing wash 0%.

With the school paused, Water refraction was changed from 0% to 100%. Simulation time, activity, position, speed, effort, clearance, and camera matrices were identical while the fish image changed. The comparison JPEGs changed 46,370 pixels by more than two channel values. A quiet paper sample had a mean difference of 0.000413 on the 0 to 255 scale, with a maximum of two, within the stated JPEG tolerance. This checks a sampled blank region, rather than every pixel or possible view. Details are in `refraction-verification.json`.

A click on the artwork exercised the local ripple and steering input without browser errors. Current browser diagnostics and camera samples are recorded separately. `planted-water-artwork.jpg` and `planted-water-controls.jpg` show this edition; `refraction-off.jpg` and `refraction-on.jpg` show the paused comparison.

## Packaging and limits

The single HTML file embeds all runtime code, shaders, styles, procedural plants and paper, and the Three.js MIT license. No remote assets are required. Earlier editions retain SHA-256 manifests.

The preview browser blocks file URLs, so direct double-click launch remains unverified here. The HTML was verified over loopback HTTP. Physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. Water refraction is a stylized screen-space approximation, not a full optical or fluid solver.
