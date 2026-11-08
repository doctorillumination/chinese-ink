# Verification: ink web edition

November 7, 2026, America/Vancouver. Local draft v0.4.

## Movement preservation

The four simulation files are byte-for-byte identical to the archived v0.3 edition: `simulation.mjs`, `simulation-math.mjs`, `school.mjs`, and `rhythm.mjs`. Their hashes are recorded in `movement-preservation.json`.

A paired geometry diagnostic compared the new renderer's fish with the archived fish over 60 poses during a turn. Body positions, body normals, and fin positions had zero deviation. The new pigment coordinates were finite. The geometry and movement remain the same while materials change.

`npm run check`: all 20 motion, geometry, schooling, and spontaneous-rhythm checks pass. No new biological accuracy claims are made.

## Browser verification

The ink edition rendered in the in-app browser without observed shader, JavaScript, or WebGL warnings or errors. Default six-fish ink rendering was observed at about 60 fps in this session. This is an observation, not a hardware benchmark.

Checked ink materials, varied ink loads, the near-top camera, generated paper texture, trailing wash, and a click ripple. Ink density and Paper grain responded to changes. The live browser diagnostics confirmed the half-float wash path. The artwork view displayed the pond with its Show controls button. Nine fish rendered in ink without observed browser errors. Reset restored the six-fish ink view.

With the school paused, switching Ink to Form study and back left simulation time, mean speed, activity states, positions, alignment, spacing, and torso clearance unchanged. The original shaded materials and grid remain available in Form study.

## Web packaging

The finished HTML embeds the runtime, shaders, styles, procedural paper, and Three.js MIT license. It loads no remote image, model, font, script, or texture. The file is suitable for local browser use or a static web host. Earlier editions are retained with SHA-256 manifests.

The browser's security policy blocks `file:` URLs, so direct double-click launch remains unverified here. The same self-contained HTML was tested through loopback HTTP. No alternative browser surface was used to bypass that restriction.

## Remaining limits

Physical mobile devices, Safari, and Firefox have not been tested. Ink flow is a lightweight visual approximation. Body simulation remains the same simplified model as v0.3. The half-float wash path ran in this browser; the implemented 8-bit fallback has not been separately exercised on hardware.
