# Verification: defined ink web edition

November 8, 2026, America/Vancouver. Local draft v0.6.

## Movement and camera preservation

The four simulation files are byte-for-byte identical to the archived v0.5 edition: `simulation.mjs`, `simulation-math.mjs`, `school.mjs`, and `rhythm.mjs`. The only change to `app.mjs` is the trailing-wash reset default, from 0.55 to 0. Its fixed camera, movement controls, input handling, and simulation loop are unchanged. Hashes are recorded in `movement-preservation.json`.

A paired diagnostic compared the revised fish with the archived v0.5 fish over 60 turning poses. Body positions, fin positions, and normals had zero deviation. Pigment coordinates remained finite.

`npm run check`: all 20 motion, geometry, schooling, and spontaneous-rhythm checks pass.

## Browser verification

The revised ink shaders rendered six fish in the in-app browser without observed JavaScript, shader, or WebGL warnings or errors. The half-float wash path ran. Body markings, fin rays, tail shapes, and translucent fin strokes were visible while the silhouettes retained soft ink margins. The artwork and controls views were checked. Current previews are `defined-ink-artwork.jpg` and `definition-controls.jpg`.

Edge bleed responded at 0% and 100%. Reset restored six fish, Ink mode, 85% bleed, and camera tracking off. The final saved artifact starts with Trailing wash at 0%, and Reset also leaves it at 0%. The grey wake was removed from the live view and checked again after reloading the saved artifact. With swimming paused, changing from Form study back to Ink preserved simulation time, speed, effort, activity states, positions, alignment, spacing, torso clearance, and the camera's position, orientation, and projection extents.

`camera-verification.json` records current camera samples as swimming continues. `browser-verification.json` records the paused rendering comparison and the actual viewport. Earlier long-running camera, ripple, and nine-fish checks are preserved in the relevant edition archives.

## Web packaging

The finished HTML embeds the runtime, shaders, styles, procedural paper, and Three.js MIT license. It loads no remote image, model, font, script, or texture. The file is suitable for local browser use or a static web host. Earlier editions are retained with SHA-256 manifests.

The browser's security policy blocks `file:` URLs, so direct double-click launch remains unverified here. The same self-contained HTML was tested through loopback HTTP. No alternative browser surface was used to bypass that restriction.

## Remaining limits

Physical mobile devices, Safari, and Firefox have not been tested. Ink flow is a lightweight visual approximation. The body simulation remains the same simplified model. The half-float wash path ran in this browser; the implemented 8-bit fallback has not been separately exercised on hardware. No new biological accuracy claims are made.
