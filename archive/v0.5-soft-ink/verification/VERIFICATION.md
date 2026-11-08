# Verification: ink web edition

November 7, 2026, America/Vancouver. Local draft v0.5.

## Movement preservation

The four simulation files are byte-for-byte identical to the archived v0.4 edition: `simulation.mjs`, `simulation-math.mjs`, `school.mjs`, and `rhythm.mjs`. Their hashes are recorded in `movement-preservation.json`. These also retain the v0.3 movement source.

A paired geometry diagnostic compared the new renderer's fish with the archived v0.4 fish over 60 poses during a turn. Body positions, body normals, and fin positions had zero deviation. Pigment coordinates were finite. The geometry and movement remain the same while materials change.

`npm run check`: all 20 motion, geometry, schooling, and spontaneous-rhythm checks pass. No new biological accuracy claims are made.

## Browser verification

The softer ink edition rendered in the in-app browser without observed shader, JavaScript, or WebGL warnings or errors. The half-float wash path ran. The scene diagnostics showed about 120 fps at the session's native 555 by 763 browser viewport. This is an observation, not a hardware benchmark.

Checked the softer fish margins, uneven body strokes, less regular fin strokes, generated paper, and trailing wash in the artwork view. Edge bleed responded at both ends of its range. Reset restored six fish, Ink mode, 85% bleed, and camera tracking off. Existing ripple and nine-fish checks from v0.4 are recorded in that edition's archive, rather than repeated here.

With the school paused, switching Ink to Form study left simulation time, mean speed, activity states, positions, alignment, spacing, torso clearance, and camera matrices unchanged. Switching back, adjusting Edge bleed, and inspecting an individual kept simulation time and positions unchanged. Individual inspection changed the reported speed to the selected fish's measurement, while keeping tracking off and the camera unchanged. The original shaded materials and grid remain available in Form study.

The fixed camera was observed at simulation times 5.85 and 33.85 seconds with identical position, orientation, and projection extents. Fish crossed the frame edges while the view stayed still. `camera-verification.json` records the observed camera and visibility samples. Resizing the page or explicitly changing the view can still change its framing.

## Web packaging

The finished HTML embeds the runtime, shaders, styles, procedural paper, and Three.js MIT license. It loads no remote image, model, font, script, or texture. The file is suitable for local browser use or a static web host. Earlier editions are retained with SHA-256 manifests.

The browser's security policy blocks `file:` URLs, so direct double-click launch remains unverified here. The same self-contained HTML was tested through loopback HTTP. No alternative browser surface was used to bypass that restriction.

## Remaining limits

Physical mobile devices, Safari, and Firefox have not been tested. Ink flow is a lightweight visual approximation. Body simulation remains the same simplified model as v0.3. The half-float wash path ran in this browser; the implemented 8-bit fallback has not been separately exercised on hardware.
