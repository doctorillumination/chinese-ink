# Swimming study 01

One procedural 3D fish with a visible spine and adjustable swimming. Version 0.1, November 7, 2026.

## Open locally

Double-click `index.html`, or open it in a current Safari, Chrome, Edge, or Firefox browser. Everything needed to run is inside that one file, including Three.js. It does not load fonts, models, scripts, or textures from the internet. WebGL 2 is required.

You can copy or share `index.html` by itself. There is no installation, server, account, or build step required to view it.

If your browser prevents opening local files, run `python3 -m http.server 8765 --bind 127.0.0.1` from this folder and open http://127.0.0.1:8765. The server is optional.

## Controls

- Drag the view to orbit. Scroll to zoom. Touch supports dragging and two-finger zoom.
- Choose **3D**, **Top**, or **Side** to inspect the body.
- Click the space to set a temporary destination. **Follow pointer** updates that destination as the mouse moves. Touch sets a destination on tap.
- **Cruise speed** is a preferred speed measured in body lengths per second. The actual speed responds through thrust and drag.
- **Tail effort** changes propulsion strength and bending amplitude together.
- **Beat & glide** blends continuous propulsion with alternating effort and recovery.
- **Turning bias** adds a persistent left or right preference. The direction menu's **Straight swim** disables exploration; the turning bias remains available for circular turn studies.
- **Fine tuning** exposes tail tempo, front body stiffness, water drag, and wandering.
- **Tail burst** adds 2.2 seconds of stronger effort. **Glide** stops active propulsion for 3.5 seconds. Neither teleports the fish or changes its velocity instantly.
- **Visible spine**, **Transparent body**, **Wireframe**, **Head path**, and **Camera follows fish** support inspection.
- **Space** pauses when focus is outside a form control. **0.35×** slows simulation time. Reset restores the original settings and deterministic exploration.
- Reduced-motion browser preferences start the study paused. Press Play to start it.

## Motion model

The simulation advances at a fixed 120 steps per simulated second. Its forward speed comes from a simplified thrust and drag model. Acceleration and angular acceleration are bounded. Steering uses persistent, seeded wandering, look-ahead containment, or a destination with gradual arrival.

The head's heading history is sampled by distance traveled. Each of 28 spine segments takes an orientation from that history plus a traveling angular wave that grows toward the tail. Integrating those directions with fixed segment lengths prevents the spine from stretching. The front stays comparatively stable. The body's cross sections follow the resulting centerline. Pectoral fins spread, tuck, paddle, and respond asymmetrically during turns. The dorsal and caudal fin edges add phase-delayed movement.

This is a controllable, simplified swimming model. It does not solve water pressure or derive thrust from the full fluid forces on the fins. Tail tempo is an artistic gait adjustment. Biological accuracy has not been established. There is one fish; schooling, ink rendering, and realistic water are outside this first study.

The model, swimming code, and interface are original to this study. The reference artwork prompted the investigation; its source code was not copied.

## Source and rebuilding

- `src/simulation.mjs`: propulsion, steering, motion history, and constant-length spine.
- `src/fish.mjs`: generated body, fins, details, and spine inspection geometry.
- `src/app.mjs`: rendering, camera, controls, and timing.
- `src/shell.html` and `src/style.css`: interface.
- `vendor/`: Three.js r180, under its MIT license.
- `tools/build.mjs`: bundles the source into the standalone HTML.

To edit and rebuild, install Node.js, run `npm install`, then `npm run build`. Run `npm run check` for motion and geometry checks. Viewing the finished file does not require Node.js.

Keep this source folder alongside any later editions. This study is a local draft and has not been published.

## Research references

- Craig Reynolds, [Steering Behaviors for Autonomous Characters](https://www.red3d.com/cwr/steer/gdc99/).
- Craig Reynolds, [Boids](https://red3d.com/cwr/boids/index.html), relevant to a later schooling study.
- Xiaoyuan Tu and Demetri Terzopoulos, [Artificial Fishes: Physics, Locomotion, Perception, Behavior](https://faculty.cc.gatech.edu/~turk/bio_sim/articles/fish_terzopoulos.pdf), SIGGRAPH 1994.
- Graphics Noob / zz85, [Koi: a pond of painted fish and ink in water](https://zz85.github.io/random-sketches/vibes/koi/BLOG.html), the reference artwork's author explanation.
