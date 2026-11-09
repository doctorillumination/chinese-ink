# Verification: visible bites and tiny mouth ripples

November 8, 2026, America/Vancouver. Web edition v0.17.

## Bite feedback

Each confirmed food-contact event drives a 0.45-second mouth animation. The snout widens and reaches forward slightly, while the lip tips toward the surface and becomes a little more defined. This lets the opening read in the fixed overhead view. The movement closes smoothly, with exactly the previous resting geometry when no bite is active. It leaves the simulated spine, swimming path, fins, and food position unchanged.

Each bite also emits one faint, uneven single ripple at its recorded mouth position. It has strength 0.30, a 1.9-second lifetime, and propagation at 0.22 of the click-ripple speed. Its maximum nominal radius is below 1.1 world units and fades well before that limit. It shares the existing six spontaneous-wave slots, leaving all six click-wave slots intact. Repeated rendering of the same bite cannot emit another ring, and expired history cannot produce delayed ripples. No ripple slots or shader loops were added.

The current dispersed startup, swimming, schooling, close feeding approach, stationary food, depth, paper, plants, full-viewport ink view, and fixed camera remain. There are no visible controls or text.

## Preservation and tests

All 38 final checks pass. `test-output.txt` contains the complete output. The new checks cover the smooth bite envelope, overhead mouth opening, exact return to resting geometry, unchanged downstream body and fins, no simulation mutation, and one bounded ripple per bite without replacing click waves. Existing motion, schooling, clearance, occupancy, food-contact, depth, plant, and water checks remain.

`edition-17-bite-feedback.json` records a paired 40-second school run against v0.16, including feeding. Positions, headings, speed, tail phase, turning speed, effort, and fin drift match exactly for all twelve fish. The three bite events match exactly. Three pieces of food produce three bite ripples, with no replay during later frames. The mouth envelope reaches one and is active for 79 sampled frames at 60 Hz over the three bites.

A comparison over 40 poses and 322,320 resting body, mouth, and fin position/normal values found zero deviation from v0.16. The new body deformation stays within the first 8.5 percent of body length, with a peak change below 0.05 world units in the geometry check. The simulated spine, the rest of the body, and the fins stay unchanged.

Individual swimming, simulation math, schooling, rhythm, food/contact logic, ink materials, plants, HTML shell, and stylesheet are byte-identical to the preserved v0.16 edition. The four simulation sources are not edited for this feedback pass. Finite checks do not establish biological accuracy or collision-free movement for every possible interaction.

## Chrome and delivery

The final build is inspected in Chrome through the normal full-viewport pond. A real click starts feeding, the transient mouth-opening state is captured, and confirmed bite counts are compared with emitted ripple counts. The mouth returns to rest afterward. Camera position and rotation remain fixed. Projection continues to adapt to the native browser viewport.

`bite-opening-chrome.jpg` shows the pond during a bite; `bite-opening-detail.jpg` and `bite-ripple-detail.jpg` are native screenshot crops around the feeding spot. Browser diagnostics and captured artwork logs are in `bite-feedback-chrome.json`. Earlier evidence files retain their own edition labels. The Chrome preview and local server are retained.

The self-contained HTML includes the procedural assets, shaders, styles, and Three.js MIT license. It has one inline script, one inline style, two unique IDs, and no external asset tags. Sixteen earlier editions match their SHA-256 manifests, including the 86-file v0.16 snapshot. The ZIP includes the executable Mac launcher, finished HTML, editable source, verification evidence, and previous editions.

Localhost in Chrome is the verified launch method. Direct file launch, other browsers, physical mobile devices, and the 8-bit render-target fallback remain untested. Hosted deployment is not configured. Water, ink, depth, and the mouth motion remain artistic approximations.
