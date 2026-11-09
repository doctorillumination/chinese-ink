# Verification: full-viewport ink pond

November 8, 2026, America/Vancouver. Web edition v0.15.

## Presentation and interaction

The current page contains only the full-viewport pond and a normally hidden WebGL error message. It has no visible text, buttons, menus, measurements, sliders, pause, scatter, regroup, or camera controls. The orthographic camera looks directly down from (0, 45, 0), with screen-up along negative Z. It never follows fish or responds to orbit or zoom gestures. Viewport resizing adjusts the projection aspect ratio.

Twelve fish retain loose grouping, independent exploration, tighter roaming bounds, optical depth, defined ink bodies and fins, and gentle spontaneous ripples. All ink, paper, water, plant, and rhythm sources are byte-identical to v0.14. The surface retains 47 shapes, including 33 drifting objects, and 24 submerged leaves and stones. Direct overhead layouts at three aspect ratios and three wave ages have finite geometry.

Clicks and taps make a ripple and add three small food blots. Dragging stirs the surface without feeding. Enter feeds the centre when the artwork has keyboard focus. Food is bounded to four patches. Up to three nearby responders are ranked by distance and heading, notice promptly, and commit to a pellet. Feeding supplies a stronger preferred turn, modestly higher cruise and thrust, quicker tail beats, and a faster optical rise. Predictive avoidance and smooth acceleration retain priority. Close food draws toward the mouth, with a brief interval between nibbles. A fish can finish nearby pieces before leaving, and fresh drops can attract recently fed fish.

## Motion and performance checks

All 34 checks pass. `test-output.txt` contains the final full-suite output. Coverage includes the supported two-to-sixteen fish counts, long default schooling, torso clearance, turning, rhythm, roaming occupancy, plants, depth, ripples, bounded food, prompt feeding, stable commitments, repeated drops, and lower-resolution geometry.

`edition-15-comparison.json` records a paired 30-second no-food run against the preserved v0.14 school. Positions, heading, speed, tail phase, turning speed, and effort match exactly for all twelve fish. Feeding-specific changes do not affect this normal swimming path. Snapshots are built only when a social observation is due. Forecast AABBs conservatively reject pairs more than one unit apart before detailed body testing; their existing safety score would be zero at that distance.

Display bodies now use 41 rings and 16 radial samples rather than 81 by 32. Body vertices fall from 2,594 to 658 per fish. Fin vertices fall from 1,230 to 665. Forty animated poses compare 78,720 shared body position values with zero deviation, and shared analytical fin landmarks match. Ink fin materials do not use normals, so their per-frame normal computation is skipped. Hidden spine transforms and the visible interface graph and telemetry work are removed. The full-resolution source model remains available for development.

The fixed-pose CPU benchmark measured about 0.835 ms per previous model update and 0.214 ms per current model update, approximately a 74% reduction. This is a Node CPU benchmark, not a browser FPS result. The browser retains the existing roughly 3.8-million-pixel budget. Wall-clock FPS reporting now uses uncapped elapsed time. Concurrent graphics load and browser automation caused substantial variation in live samples, so sustained smoothness at a particular frame rate is not certified.

Three representative deterministic feeding placements were tested after three simulated seconds of swimming. Food was noticed in about 0.117 simulated seconds. First bites occurred at about 2.64, 7.14, and 5.39 seconds; all three pieces were consumed at about 3.14, 7.72, and 6.10 seconds. Minimum sampled torso clearance stayed positive in each case. In the same 18-second windows, v0.14 left food uneaten in all three cases. These selected tests do not guarantee a fixed arrival time for every possible click, crowd, or heading.

## Chrome evidence

`clean-pond-verification.json` records the final Chrome inspection. The canvas exactly filled a 1612 by 1428 viewport, the artwork had zero visible controls or text, and the WebGL error panel remained hidden. A real click led to three consumed food pieces. Dragging increased the manual ripple count without creating food. Click, drag, and wheel input retained camera position, rotation, and projection. Fish continued moving, and spontaneous ripple counts increased. No artwork runtime, shader, or WebGL warnings or errors were present in the captured log sample.

`clean-pond-chrome.jpg` shows the final artwork without interface. `clean-pond-feeding.jpg` records the click interaction. The live Chrome tab and local server are retained for the user. Earlier evidence files keep their own edition labels.

## Self-contained delivery

The finished HTML contains one inline script, one inline style, two unique element IDs, and no external asset tags. It embeds the procedural assets, shaders, styles, and Three.js MIT license. Fourteen previous editions match their SHA-256 manifests, including the 75-file v0.14 snapshot. The local bundle contains the executable Mac launcher, finished HTML, editable source, verification records, and preserved editions.

No hosted deployment is configured. Localhost in Chrome is verified. Direct file launch, physical mobile devices, other browsers, and the 8-bit render-target fallback remain untested. Motion, ink diffusion, depth, and surface light are artistic approximations. Finite checks do not establish collision-free movement for every input and duration.
