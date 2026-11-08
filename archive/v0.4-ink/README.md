# Ink pond: swimming study 03

An interactive, browser-based ink pond. Version 0.4, November 7, 2026. The current six-fish swimming, schooling, and spontaneous rhythms are retained. Earlier editions are preserved under `archive/`, including the v0.3 movement edition and its SHA-256 manifest.

## Run locally

Open `index.html` in your browser. All runtime code, including Three.js, is embedded in that one file. There are no remote fonts, textures, models, scripts, accounts, or runtime downloads. WebGL 2 is required. Viewing the finished study does not require Node.js or installation.

The test browser blocks `file:` URLs, so direct double-click launch remains unverified. The identical single-file artifact was verified over loopback HTTP. If you need a local server, run `python3 -m http.server 8876 --bind 127.0.0.1` in this folder and open http://127.0.0.1:8876. Choose another free port if 8876 is occupied.

## Ink edition

The default view draws the existing 3D fish as layered ink washes on textured paper. Dense heads and darker brushwork give way to paler bodies, translucent fin strokes, feathered edges, and diluted wakes. Fish have different ink loads, with a subtle wash change as their depth changes. Pigment markings stay attached to the body as it bends.

The paper, pigment variation, and wakes are generated in the browser. There are no image textures to download. The ink mode uses a body pigment pass, a small evolving wash field, and a final paper composite. The wash advects, spreads, and fades in world coordinates, so it stays with the pond when the camera moves. It is a stylized flow approximation, not a complete ink or fluid simulation. Swimming continues smoothly with the approved timing.

- **Ink density** adjusts pigment strength.
- **Edge bleed** softens and feathers the fish's edges.
- **Trailing wash** adjusts the soft pigment left in their wake.
- **Paper grain** adjusts the visible texture and pigment settling.
- **Ink / Form study** changes the rendering without restarting the school.
- **View artwork** hides the interface. **Show controls**, or **H**, brings it back.
- Clicking or tapping adds a soft expanding ripple and keeps the existing steering interaction.

The grid and cast shadows are shown in Form study. Spines begin hidden in Ink, and remain available in the inspection controls. The default camera looks almost straight down; orbiting and the other camera views remain available.

## Rhythm refinement retained from v0.3

The default cruise setting rises from 0.42 to 0.47 body lengths per second, about 12%. In a paired three-minute diagnostic run, mean actual school speed rose from about 0.405 to 0.449 body lengths per second, about 11%.

Each fish now makes seeded, irregular transitions between cruising, a brief flutter, coasting, and an occasional quiet drift. Faster tail beats and a small increase in tail effort create the spurts through acceleration. Momentum carries the fish into its next glide. The timers continue independently, so changing a control or making a group action does not synchronize the fish.

**Spurts & pauses**, inside **Swimming & individuality**, controls the strength of this variation. Set it to zero for steady swimming with the original beat-and-glide motor rhythm. The default is 65%. Braking retains priority during a flutter. Explicit Scatter and Regroup actions can interrupt a quiet intention while leaving its internal clock running.

## Schooling controls

- **Fish** changes the count and restarts the group with a reproducible, irregular arrangement.
- **Cruise speed** sets a preferred speed in body lengths per second. Actual speed responds through propulsion, drag, turning, and braking.
- **Togetherness** encourages a fish to approach local neighbours when the group spreads out. There is a comfortable zone with no attraction toward the neighbourhood center.
- **Alignment** encourages similar headings and some speed matching.
- **Personal space** adjusts the comfort distance around the body. Physical avoidance remains active at all settings, including the Independent preset.
- **Loose**, **School**, and **Independent** change social tendencies while the simulation continues.
- **Scatter** introduces a short outward swimming intention. **Regroup** temporarily strengthens local cohesion. Both act through movement controls, with no teleporting or forced formation.
- Click to set a temporary destination. **Follow pointer** updates the destination as the mouse moves. Each fish approaches a different part of the destination area, preserving room between them.
- **Direction: Straight swim** disables exploration and boundary containment. Local schooling and avoidance remain active, so the group can travel indefinitely through the reference space.

## Inspect movement

- Drag to orbit. Scroll to zoom. Touch supports orbiting and two-finger zoom.
- **3D**, **Top**, and **Side** change the camera angle.
- **Inspect** follows the whole school or a chosen fish. The school view frames the group's changing extent. Individual inspection moves closer and shows that fish's tail rhythm and effort.
- **Visible spines**, **Transparent body**, **Wireframe**, and **Head paths** expose motion and geometry. Each fish has a constant-length, 29-point spine.
- **Camera follows group** enables or disables tracking. With an individual selected, it tracks that fish.
- **Swimming & individuality** exposes spontaneous spurts and pauses, gait variation, tail effort, beat-and-glide rhythm, turning bias, tempo, front body stiffness, drag, and wandering. Gait settings apply to the group while retaining individual phase offsets.
- **Space** pauses outside form controls. **0.35×** slows simulation time. Reset restores the original settings.
- Reduced-motion browser preferences start the study paused.

School telemetry shows mean speed, heading alignment, and mean nearest-neighbour spacing. Alignment is the length of the mean heading vector, expressed as a percentage. It describes shared direction; it is not a realism or quality score. Spacing uses body centers and the reference fish's body length. The graph shows recent mean speed and effort, or the selected fish's values during individual inspection.

## How the school moves

Each animal has a different scale, preferred pace, tail phase, gait variation, sensing interval, and depth preference. Social observations are staggered in time. Fish respond to at most four nearby neighbours in a broad forward field of view. Safety perception also covers nearby animals behind them. The same pre-step state is used for all observations. There is no permanent leader or prescribed group route.

Separation, alignment, and a comfortable cohesion zone provide the social tendencies. Steering and angular acceleration are constrained. Each fish retains its own propulsion and recovery rhythm. Speed matching, braking fins, and small, smooth depth changes help resolve crowded turns and crossings.

Avoidance considers overlapping spheres along the actual bent torso. When a crossing is predicted, a short-horizon planner compares feasible turns and braking amounts. It predicts the body following the head's path, not just a point moving through space. Passing preferences persist through an encounter to reduce indecision. Candidate safety takes priority over social attraction. The torso envelope excludes flexible fins.

Individual swimming advances at 120 fixed steps per simulated second. The head's heading and depth history guide a constant-length spine. A traveling bending wave grows toward the tail. Pectoral fins tuck, spread, paddle, brake, and respond to turns. Dorsal and tail fin edges add delayed secondary movement. Spine markers use instancing to keep the group inexpensive to draw.

This remains a simplified procedural motion model. It does not solve water pressure or derive propulsion from full fluid forces on the fins. Biological accuracy is unverified. Avoidance tests cover selected configurations and finite simulation windows; they do not prove collision-free motion for every possible parameter combination. The ink and paper effects are stylized. Realistic water optics remain outside this edition.

The geometry, interface, and simulation are original to this study. The reference artwork prompted the investigation; its source code was not copied.

## Source and rebuilding

- `src/simulation.mjs`: individual propulsion, turning, depth control, path history, and spine.
- `src/school.mjs`: local social behaviour, individual traits, predictive avoidance, and group actions.
- `src/rhythm.mjs`: seeded, independent changes between cruising, fluttering, coasting, and quieter drift.
- `src/fish.mjs`: generated body, fins, details, instanced spine markers, and disposal.
- `src/app.mjs`: group rendering, camera framing, controls, and timing.
- `src/ink-material.mjs`: body-attached pigment and fin strokes.
- `src/ink-renderer.mjs`: evolving wash, paper, edge bleed, and mouse ripples.
- `src/shell.html` and `src/style.css`: interface.
- `vendor/`: Three.js r180 and its MIT license.
- `tools/`: standalone bundling and motion/schooling checks.
- `verification/`: current verification record and preview images.
- `archive/`: unchanged earlier editions and their hash manifests.

To rebuild after editing, run `npm install` and `npm run build`. Run `npm run check` for the 20 motion, geometry, rhythm, and schooling tests. Rebuilding requires Node.js; opening the finished HTML does not.

This is a local draft and has not been published.

## Put it on a website

Upload the finished `index.html` to any static web host and serve it as HTML. No application server, database, API key, CDN, or build step is required on the host. All runtime code and assets are inside the file. The source folder is needed only if you want to edit and rebuild it.

## Research references

- Craig Reynolds, [Steering Behaviors for Autonomous Characters](https://www.red3d.com/cwr/steer/gdc99/).
- Craig Reynolds, [Boids](https://red3d.com/cwr/boids/index.html).
- Xiaoyuan Tu and Demetri Terzopoulos, [Artificial Fishes: Physics, Locomotion, Perception, Behavior](https://faculty.cc.gatech.edu/~turk/bio_sim/articles/fish_terzopoulos.pdf), SIGGRAPH 1994.
- Graphics Noob / zz85, [Koi: a pond of painted fish and ink in water](https://zz85.github.io/random-sketches/vibes/koi/BLOG.html), the reference artwork's author explanation.
