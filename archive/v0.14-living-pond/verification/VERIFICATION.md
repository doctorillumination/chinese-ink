# Verification: living pond and feeding

November 8, 2026, America/Vancouver. Web edition v0.14.

## Activity and interaction

The default pond has twelve fish, with controls for two through sixteen. Natural grouping varies social interest smoothly, with exploratory individuals alongside temporary groups. Individual propulsion, tail rhythm, the procedural fish shape, ink materials, paper, and surface lighting are retained. Larger groups anticipate encounters with a wider avoidance margin, and Regroup provides a shared gathering cue.

Clicking adds a ripple and three food-like ink blots. Food patches are bounded to four, with up to five nearby fish interested in one patch. Interest reduces as pieces disappear. Fish approach through their existing swimming and avoidance, rise optically toward the surface, nibble, and leave for a satiety interval. Remaining food fades after 28 simulated seconds. Dragging disturbs the surface without creating a trail of food.

Near-surface moving fish produce faint single ripples in six separate slots. Their strength is below 0.22 and lifetime is 4.8 seconds. Six click-ripple slots retain the stronger, layered eight-second waves. Deep or stationary fish do not emit surface ripples. Pausing holds the simulation clock for food, depth, and water.

## Objects and depth

The surface has 47 painted leaves, pads, and fragments, including 33 freely drifting objects. Twenty-four faint submerged leaves and stones render beneath the fish with depth metadata, refraction, reduced contrast, and smaller movement. Rooted plant junctions remain connected during passing waves. Nine aspect-ratio and camera-angle checks, including food geometry, produced finite attributes.

## Checks and preservation

All 32 final checks pass. Complete output is in `test-output.txt`. Coverage includes every supported fish count for one simulated minute, three minutes of the twelve-fish default, avoidance, Regroup, fixed-view occupancy, smooth mixed social intentions, food attraction and consumption, satiety, bounded food lifetime, gentle spontaneous ripples, and connected plants.

The individual simulation, simulation math, rhythm, and fish ink material sources remain byte-for-byte identical to v0.13. Model rendering now reuses vectors and static profiles. A comparison over 60 poses and 1,394,640 body/fin/detail position and normal values found zero deviation from v0.13. Body resolution remains 81 rings by 32 radial samples. Results are in `fish-pose-preservation.json`. Peer avoidance predictions are shared within a pre-step snapshot, and bounded-distance calculations use a direct square root. Final checks cover these optimizations.

The camera orientation, target, and projection logic are retained. Large canvases use a roughly 3.8-million-pixel rendering budget. Internal timing fields are diagnostic only; changing concurrent machine load and browser-control delays prevent a sustained frame-rate claim.

## Chrome evidence

The final pond was reloaded and visually inspected in Chrome. Sixteen fish were selected and rendered, then the twelve-fish default was restored. A no-click observation recorded spontaneous ripples. A real click placed three blots; nearby fish approached, ate food, and later stopped pursuing it. Camera position, rotation, and projection stayed unchanged through the click. `living-pond-verification.json` records the observations, and `living-pond-chrome.jpg` shows the fuller composition.

No artwork shader, WebGL, or runtime warnings or errors were observed in captured logs. Installed-extension warnings and asynchronous browser message-channel errors are counted separately in `browser-verification.json`. The live Chrome tab and localhost server are retained for the user. Native window resizing changes the projection's aspect ratio; pointer interaction does not orbit or zoom Ink mode.

## Delivery and limits

The finished HTML embeds the runtime, procedural assets, shaders, styles, and Three.js MIT license. It has one inline script, one inline style, unique element IDs, and no external asset tags. All thirteen preserved editions match their SHA-256 manifests, including the 69-file v0.13 snapshot.

The self-contained local bundle includes the Mac launcher and editable source. No hosted deployment is configured. Direct file launch, physical mobile devices, Safari, Firefox, and the 8-bit rendering fallback remain untested. Feeding and water are artistic behavioural and optical approximations. Finite checks do not prove collision-free motion for every setting and duration.
