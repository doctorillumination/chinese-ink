# Verification: tighter pond and pooled ink

November 8, 2026, America/Vancouver. Local draft v0.8.

## Navigation and swimming

The individual propulsion, drag, tail rhythm, path history, body geometry, fixed camera, controls, and final paper composite retain their source from v0.7. The unchanged source hashes are recorded in `movement-preservation.json`.

`school.mjs` now uses a smaller soft oval, with predictive steering beginning before the fish reaches its edge. Fish remain free to pass outside the frame. Regroup starts its gathering cue at closer separations so it remains effective within the smaller pond. The underlying collision planner, separation, alignment, and individual swimming model are retained.

All 21 checks pass. This includes the existing 20 movement, schooling, geometry, and rhythm checks, plus a new three-minute fixed-view occupancy regression. Complete output is in `test-output.txt`.

## Paired visibility comparison

`roaming-comparison.json` records a 180-second comparison at the same default settings, using a fixed near-top camera with an 11 by 17 world-unit frame. This narrow frame is contained within both the taller and wider default views. Visibility is sampled every quarter second from the projected spine points.

The earlier bounds left the view empty in 46.7% of samples, with a longest empty interval of 21.75 seconds. The tighter bounds had no empty samples, a minimum of three visible fish, and a mean of 5.53 visible fish. At least one fish was outside the frame in 35% of samples, preserving entry and exit. These results describe this finite default simulation, not every possible interaction or camera setting. Straight swim deliberately remains unbounded.

## Ink and browser checks

The pale contour, mottled wash, and dense ink families are retained. Blotches now have warped outlines, defined pooled centres, and a narrow feathered fringe that varies around the mark. Small body washes and contour pressure vary locally. The final blur and paper renderer is unchanged. The grey trailing wake remains off by default.

The final build rendered in the in-app browser without observed JavaScript, shader, or WebGL warnings or errors. Ink patch shapes, pale contours, body and fin definition, and the running school were visually checked. `bounded-ink-artwork.jpg` shows the current edition. Current browser diagnostics and fixed-camera samples are recorded in their JSON files.

## Packaging and limits

The single HTML file embeds its runtime, shaders, styles, procedural paper, and Three.js MIT license. It loads no external assets. Earlier editions are preserved with SHA-256 manifests.

The browser's security policy blocks file URLs, so direct double-click launch remains unverified here. The self-contained HTML was verified over loopback HTTP. Physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. The swimming and ink flow are simplified procedural models.
