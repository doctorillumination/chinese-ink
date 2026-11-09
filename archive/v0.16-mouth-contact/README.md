# Ink pond

A self-contained browser artwork, version 0.16, November 8, 2026. Twelve fish swim through an ink-painted pond with textured paper, drifting plants, submerged fragments, optical depth, and gentle surface ripples. The artwork fills the browser viewport from a fixed, directly overhead camera. There are no visible labels, menus, buttons, measurements, or settings.

Click or tap to drop three small ink blots of food and send ripples across the water. Nearby fish notice promptly, approach the food, rise toward the surface, slow at the blots, and place their snouts against them to eat. Drag to stir the water without dropping food. Keyboard users can focus the pond and press Enter to feed its centre. Interaction never rotates or zooms the view.

## Run locally

On macOS, double-click **Open Ink Pond.command**. It starts a local server and opens Chrome. Keep its Terminal window open while viewing and reloading. Press Control-C in that window when you want to stop the server. The launcher requires Python 3 and does not install anything. It reuses an existing server for this pond or chooses another port if needed.

For a manual launch, run `python3 tools/preview.py --no-browser` in this folder and open the printed address. The usual address is http://127.0.0.1:8876/. The address works while the server is running.

The finished `index.html` contains all runtime code, geometry, shaders, styles, and the Three.js MIT license. It makes no external asset requests. No account, API key, CDN, or network connection is needed to view it locally. Localhost in Chrome is the verified launch method. Direct file launch has not been browser-verified.

## Motion and feeding

Fish are already dispersed and swimming when the page appears. Each independent motor is advanced through a different short history before its first visible pose. This establishes different cruising and coasting rhythms, effort, curved spines, and tail phases. Seeded placement distributes their body centres and headings through the pond, checking current torso clearance and the next 1.8 seconds of movement. It does not make the user wait for the whole pond to simulate a long warm-up.

Loose groups continue to form and separate, while some fish explore independently. A soft roaming oval brings fish back toward the composition while allowing them to leave the frame. Individual movement advances at 120 fixed steps per simulated second. The fixed overhead camera, no-controls presentation, ink definition, depth, plants, and ripples remain.

Feeding selects a nearby fish using travel distance and heading. Up to two other interested fish approach the outside of the patch, leaving room for the feeding fish. The eater keeps its destination, brakes before reaching it, and uses small pectoral adjustments for the final placement of its snout. These adjustments have bounded velocity and acceleration. They never move the food.

Food remains at the spot where it lands. A bite requires slow movement, a near-surface fish, and brief contact inside a small region directly in front of the mouth. Passing with a flank or tail does not count. Each swallowed blot shrinks away over 0.24 seconds at the snout. The fish can then make another small adjustment to the next blot. Up to four patches can be active, and uneaten food fades after 28 simulated seconds. Fish never teleport to food.

The ordinary individual swimming motor matches v0.15 in paired, 60-second straight and wandering runs without feeding. Startup configuration and close feeding movement intentionally change. The lighter display geometry and ink materials from v0.15 are retained.

This is an artistic motion model with simplified propulsion and optical water effects. It does not solve full fluid pressure or light transport. Collision checks cover selected configurations and finite simulation windows.

## Ink and water

Fish retain the hollow, pale, blotched, and dark ink families, readable fins, soft wet margins, and body-attached pigment patterns. Deeper fish fade and refract while retaining body definition. The paper combines irregular fibres, fine grain, and soft pulp clouds. Broad surface light and uneven ripple highlights suggest the water above the fish.

Near-surface fish emit occasional faint ripples without interaction. Click ripples have seeded variation in stretch, orientation, drift, spacing, and speed. The shared wave field refracts fish and gently moves floating leaves. Rooted stems remain connected. Surface plants and submerged objects retain their different optical depths and motion.

## Edit, verify, or host

Run `npm install` and `npm run build` to rebuild the single HTML file after source changes. Run `npm run check` for the 36 motion, geometry, schooling, occupancy, rhythm, feeding, plants, depth, and ripple checks. `node tools/verify-edition.mjs` checks dispersed startup, the ordinary swimming motor against v0.15, fixed food positions, mouth-contact bites, and feeding timing. Results and Chrome evidence are under `verification/`.

The simulation is in `src/simulation.mjs`, `src/school.mjs`, `src/rhythm.mjs`, and `src/pond-life.mjs`. Procedural fish geometry is in `src/fish.mjs`. Ink, water, and plants are in `src/ink-material.mjs`, `src/ink-renderer.mjs`, `src/ink-garden.mjs`, and `src/water.mjs`. `src/app.mjs`, `src/shell.html`, and `src/style.css` provide the full-viewport artwork and pointer interaction. Source APIs retain development capabilities, but the current artwork exposes no inspection interface.

Earlier editions are preserved under `archive/` with SHA-256 manifests. The complete v0.14 edition retains the earlier inspection interface; v0.15 preserves the first interface-free edition. The reference artwork prompted the investigation; its source code was not copied.

To host the artwork, upload `index.html` to a static web host and serve it as HTML. No host-side build or application server is required. Hosted deployment is not configured as part of this local edition.

Source repository: [doctorillumination/chinese-ink](https://github.com/doctorillumination/chinese-ink).

## References

- Craig Reynolds, [Steering Behaviors for Autonomous Characters](https://www.red3d.com/cwr/steer/gdc99/).
- Craig Reynolds, [Boids](https://red3d.com/cwr/boids/index.html).
- Xiaoyuan Tu and Demetri Terzopoulos, [Artificial Fishes: Physics, Locomotion, Perception, Behavior](https://faculty.cc.gatech.edu/~turk/bio_sim/articles/fish_terzopoulos.pdf), SIGGRAPH 1994.
- Graphics Noob / zz85, [Koi: a pond of painted fish and ink in water](https://zz85.github.io/random-sketches/vibes/koi/BLOG.html), the reference artwork author's explanation.
