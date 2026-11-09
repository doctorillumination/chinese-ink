# Verification: dispersed startup and mouth-contact feeding

November 8, 2026, America/Vancouver. Web edition v0.16.

## Starting in motion

The pond opens with twelve dispersed fish and no visible interface. Before placement, each independent motor advances through a seeded 7-to-30-second history. The first visible frame therefore includes established path curvature, tail phases, muscle effort, and different cruising or coasting states. The whole school is not simulated through a long startup wait.

Placement distributes body centres and headings through an oval. It checks actual bent torso clearance and forecasts 1.8 seconds ahead to avoid placing moving fish on an immediate crossing. The default first-frame heading alignment is about 0.152, compared with 0.994 in v0.15. Minimum initial torso clearance is about 0.930 world units. Construction took about 33 ms in the recorded Node run; this is not a browser load-time guarantee.

The fixed overhead camera, tighter roaming bounds, mixed grouping, fish models, ink materials, depth, paper, plants, and water remain. Fish, ink material, ink compositor, water, and rhythm sources match v0.15 exactly. Startup state and feeding motion intentionally change.

## Food stays at its landing point

The previous attraction of food toward a fish is removed. Food rendering now uses the same landing coordinates as the behaviour simulation, with no independent visual displacement. Fish must put their snout at a blot. The approach uses braking, a quieter final gait, and small pectoral station-keeping adjustments. Their target velocity is capped at 0.32 world units per second and their acceleration is bounded, with decay after feeding. Avoidance forecasts include the existing fin drift.

One fish takes the feeding position while up to two other interested fish approach the outside of the patch. This leaves room for the eater and reduces crowding at the blots. A stable destination remains through the approach and the eater can continue to the next piece.

A bite requires a near-surface fish, slow actual movement, and at least 0.075 seconds of contact in a small region directly in front of the mouth. Flanks, tails, fast passes, and deeper fish do not count. The blot shrinks and fades over 0.24 seconds at that location. Fish and food never snap together.

## Checks

All 36 final checks pass. `test-output.txt` contains the full suite. Coverage includes dispersed startup, every supported school size, three minutes of default swimming, torso clearance, independent rhythms, roaming occupancy, plants, optical depth, ripples, food lifetime, repeated drops, stationary food, and mouth contact. The steady-school versus independent comparison explicitly disables mixed social intentions in both cases, so it measures the social parameters without relying on the old shared starting heading.

`edition-16-behaviour.json` records four feeding placements after three simulated seconds of swimming: ahead, beside, behind, and at the pond centre. All twelve blots were eaten. Food position change was exactly zero throughout each run. Notice time was about 0.117 simulated seconds. First bites took about 3.51 to 7.37 simulated seconds; all three pieces were finished in about 7.28 to 11.12 seconds. Maximum recorded snout-to-blot distances were below 0.069 world units. Sampled torso clearance remained positive, at least 0.580 world units in these cases. Arrival time depends on heading, distance, and other fish.

The ordinary individual motor without feeding matches v0.15 exactly through separate 60-second straight and wandering runs. The predictive placement, mature initial state, feeding arrival, and pectoral adjustments are new. These checks do not establish biological accuracy or collision-free movement for every input and duration.

## Chrome evidence

`dispersed-start-chrome.jpg` shows the final opening frame. `dispersed-feeding-chrome.json` records an initial alignment of 0.1524, different swimming states, zero visible controls or artwork text, a canvas filling the 1504 by 851 viewport, and the fixed overhead camera.

A real click in the final build created three blots, and all three were eaten. The last recorded bite occurred at a snout distance of about 0.071 world units, with actual movement about 0.242 world units per second and surface interest near one. Camera position, rotation, and projection remained unchanged. `mouth-feeding-click.jpg` and `mouth-feeding-chrome.jpg` show the interaction and subsequent pond. No artwork runtime, shader, or WebGL warnings or errors were present in the captured log sample. The Chrome tab and localhost server remain open.

## Local delivery

The finished HTML embeds the runtime, procedural geometry, shaders, styles, and Three.js MIT license. It contains one inline script, one inline style, two unique element IDs, and no external asset tags. Fifteen preserved editions match their SHA-256 manifests, including the 81-file v0.15 snapshot.

The self-contained bundle includes the executable Mac launcher, finished HTML, editable source, verification evidence, and earlier editions. Localhost in Chrome is verified. Direct file launch, other browsers, physical mobile devices, and the 8-bit render-target fallback remain untested. Hosted deployment is not configured. Earlier evidence files retain their original edition labels.
