# Ink pond: swimming study 03

An interactive, browser-based ink pond. Version 0.11, November 8, 2026. Connected brush branches now sway in the water, pads drift, and more fallen leaves gather around the margins. Water refraction is more visible on the fish while the paper stays quiet. Fish materials, swimming, schooling, tighter bounds, and fixed camera are retained. Earlier editions are preserved under `archive/`, including the v0.10 organic planting edition and its SHA-256 manifest.

## Run locally

On macOS, double-click **Open Ink Pond.command** to start the local server and open Chrome. Keep its Terminal window open while viewing, including when reloading the page. Press Control-C in that window when you want to stop it. The launcher requires Python 3 and does not install anything. If the pond is already served on its usual port, the launcher reuses it; if another project occupies that port, it chooses a free one.

For a manual launch, run `python3 tools/preview.py --no-browser` in this folder and open the printed local URL in Chrome. The usual address is http://127.0.0.1:8876/. That address is available only while the server is running.

All runtime code, including Three.js, is embedded in `index.html`. There are no remote fonts, textures, models, scripts, accounts, or runtime downloads. WebGL 2 is required. Viewing the finished study does not require Node.js or installation. Opening `index.html` directly may also work, but direct file launch remains unverified because the test browser blocks `file:` URLs. The single-file artifact was verified over loopback HTTP.

## Ink edition

The default view draws the existing 3D fish as layered ink washes on textured paper. The six-fish school now contains two of each ink family:

- **Pale contours:** almost paper-white interiors, delicate grey body contours, and lightly drawn fins.
- **Blotched washes:** light grey bodies with broad, irregular pools of dark ink. Blotches have uneven margins, diluted fringes, and pigment variation within them.
- **Deep ink:** charcoal bodies with denser pooling, lighter breaks, and translucent fin strokes.

Each fish has its own persistent pigment placement and ink load. Fin and detail strengths vary with its ink family. The nine-fish setting adds a further contour fish, blotched fish, and dark fish. These are material variations on the existing model; body shape and swimming remain unchanged. Pigment markings stay attached to the body as it bends, rather than being regenerated each frame.

The definition work from v0.6 is retained inside the bodies and fins, together with pale, irregular margins. The renderer keeps more of the original pigment detail inside each fish, and concentrates the two-pass diffusion near its silhouette. Fin strokes and fine rays are more visible, with translucent, fading tips. Uneven, tapered brush strokes, broken bristles, and broad pooling remain. Ink patches now have more irregular lobes and a narrow, uneven feathered fringe around a defined core. Contour pressure and small pooled washes vary along the bodies; the overall blur filter is unchanged. Edge bleed starts at 85% and remains adjustable. These changes affect the rendering only.

The camera starts still over the pond, with no automatic tracking or zoom. Exploration now uses a smaller soft oval and predicts earlier return turns. Fish can swim across the frame edges and curve back through their existing steering, acceleration, and avoidance. In a paired three-minute check of the default school, the previous view was empty in 46.7% of samples; the new view stayed inhabited, with at least three fish visible while others still passed outside it. This is a finite check of the default settings, rather than a guarantee for every manual command or zoom level. Reset restores the fixed view. Drag, zoom, and camera buttons remain available for deliberate changes to the view.

The paper and pigment variation are generated in the browser. The trailing wake is off by default, so the fish leave no grey blur behind them. There are no image textures to download. The ink mode uses a body pigment pass, a small evolving wash field, and a final paper composite. The wash advects, spreads, and fades in world coordinates, so it stays with the pond when the camera moves. It is a stylized flow approximation, not a complete ink or fluid simulation. Swimming continues smoothly with the approved timing.

- **Ink density** adjusts pigment strength.
- **Edge bleed** softens and feathers the fish's edges.
- **Trailing wash** is an optional wake effect, off by default. Reset keeps it off.
- **Paper grain** adjusts the visible texture and pigment settling.
- **Ink / Form study** changes the rendering without restarting the school.
- **View artwork** hides the interface. **Show controls**, or **H**, brings it back.
- Clicking or tapping keeps the steering interaction and adds a brief local water distortion through the submerged ink.

The grid and cast shadows are shown in Form study. Spines begin hidden in Ink, and remain available in the inspection controls. The default camera looks almost straight down. **Follow inspected fish** is an optional tracking control, off by default. Choosing a fish for inspection leaves the camera still until tracking is enabled.

## Edge plants and water

A few broad pond leaves enter from the upper left, a forked brush sprig enters from the lower right, and a smaller sprig enters the upper-right edge. Each narrow leaf meets a painted petiole that stays connected to its branch during movement. Rooted stems flex more toward their tips, carrying the leaves with them. Pads slowly drift and rotate. Two free pads and ten fallen fragments follow gentle, bounded currents around the margins, leaving the central opening clear.

The plants use warped, asymmetric silhouettes, uneven folds, sparse broken veins, pooled washes, and soft bleeding margins. Leaf size, angle, and spacing vary, while stems vary in width and ink pressure. Floating fragments mix irregular lobed and narrow shapes. They are drawn as a separate surface layer, so a fish can pass beneath them. The layout follows the view edges when the viewport changes.

**Water refraction** starts at 65%. Several directional waves and two broad circular wave fields gently displace the submerged fish image. A slight change in pigment brightness adds a passing lens effect. These effects leave fish geometry and the camera unchanged. Set the control to zero to remove refraction, or increase it to compare the effect. The paper texture is sampled independently and stays visually still. Surface leaves remain above the refraction. Clicking creates a short local refractive pulse through the fish layer.

Water and floating-leaf animation use simulation time, so Pause, slow motion, and the reduced-motion starting preference remain consistent. This is a stylized optical approximation rather than a full water simulation. All geometry and shaders are embedded in the HTML; no plant images or models are downloaded.

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
- **Inspect** chooses the whole school's measurements or a chosen fish's tail rhythm and effort. It leaves the fixed camera unchanged. With **Follow inspected fish** enabled, the camera follows and frames that selection.
- **Visible spines**, **Transparent body**, **Wireframe**, and **Head paths** expose motion and geometry. Each fish has a constant-length, 29-point spine.
- **Follow inspected fish** enables or disables tracking. With Whole school selected, it follows and frames the group; with an individual selected, it follows that fish. It starts off and Reset turns it off.
- **Swimming & individuality** exposes spontaneous spurts and pauses, gait variation, tail effort, beat-and-glide rhythm, turning bias, tempo, front body stiffness, drag, and wandering. Gait settings apply to the group while retaining individual phase offsets.
- **Space** pauses outside form controls. **0.35×** slows simulation time. Reset restores the original settings.
- Reduced-motion browser preferences start the study paused.

School telemetry shows mean speed, heading alignment, and mean nearest-neighbour spacing. Alignment is the length of the mean heading vector, expressed as a percentage. It describes shared direction; it is not a realism or quality score. Spacing uses body centers and the reference fish's body length. The graph shows recent mean speed and effort, or the selected fish's values during individual inspection.

## How the school moves

The soft roaming oval encourages earlier returns without moving the camera or clamping positions. Regroup begins its gathering cue at closer separations to retain its effect inside the smaller pond. Each animal has a different scale, preferred pace, tail phase, gait variation, sensing interval, and depth preference. Social observations are staggered in time. Fish respond to at most four nearby neighbours in a broad forward field of view. Safety perception also covers nearby animals behind them. The same pre-step state is used for all observations. There is no permanent leader or prescribed group route.

Separation, alignment, and a comfortable cohesion zone provide the social tendencies. Steering and angular acceleration are constrained. Each fish retains its own propulsion and recovery rhythm. Speed matching, braking fins, and small, smooth depth changes help resolve crowded turns and crossings.

Avoidance considers overlapping spheres along the actual bent torso. When a crossing is predicted, a short-horizon planner compares feasible turns and braking amounts. It predicts the body following the head's path, not just a point moving through space. Passing preferences persist through an encounter to reduce indecision. Candidate safety takes priority over social attraction. The torso envelope excludes flexible fins.

Individual swimming advances at 120 fixed steps per simulated second. The head's heading and depth history guide a constant-length spine. A traveling bending wave grows toward the tail. Pectoral fins tuck, spread, paddle, brake, and respond to turns. Dorsal and tail fin edges add delayed secondary movement. Spine markers use instancing to keep the group inexpensive to draw.

This remains a simplified procedural motion model. It does not solve water pressure or derive propulsion from full fluid forces on the fins. Biological accuracy is unverified. Avoidance tests cover selected configurations and finite simulation windows; they do not prove collision-free motion for every possible parameter combination. The ink, paper, and water refraction are stylized visual approximations.

The geometry, interface, and simulation are original to this study. The reference artwork prompted the investigation; its source code was not copied.

## Source and rebuilding

- `src/simulation.mjs`: individual propulsion, turning, depth control, path history, and spine.
- `src/school.mjs`: local social behaviour, individual traits, predictive avoidance, soft roaming oval, and group actions.
- `src/rhythm.mjs`: seeded, independent changes between cruising, fluttering, coasting, and quieter drift.
- `src/fish.mjs`: generated body, fins, details, instanced spine markers, and disposal.
- `src/app.mjs`: group rendering, camera framing, controls, and timing.
- `src/ink-material.mjs`: persistent ink families, body-attached blotches, contours, washes, and fin strokes.
- `src/ink-renderer.mjs`: evolving wash, selective pigment diffusion, water refraction, surface compositing, and paper.
- `src/ink-garden.mjs`: procedural edge plants, brush stems, and floating leaves.
- `src/shell.html` and `src/style.css`: interface.
- `vendor/`: Three.js r180 and its MIT license.
- `tools/`: standalone bundling, movement checks, and plant connection/drift checks.
- `verification/`: current verification record and preview images. `flowing-pond-chrome.jpg` shows v0.11 running in Chrome. The paired `flow-water-off.jpg` and `flow-water-on.jpg` show refraction at an identical paused pose. Earlier previews retain their original edition labels.
- `archive/`: unchanged earlier editions and their hash manifests.

To rebuild after editing, run `npm install` and `npm run build`. Run `npm run check` for the 23 motion, geometry, rhythm, schooling, fixed-view occupancy, and moving-plant checks. Rebuilding requires Node.js; opening the finished HTML does not.

Source repository: [doctorillumination/chinese-ink](https://github.com/doctorillumination/chinese-ink). The repository contains the finished HTML and editable source. Hosted deployment is not configured as part of this edition.

## Put it on a website

Upload the finished `index.html` to any static web host and serve it as HTML. No application server, database, API key, CDN, or build step is required on the host. All runtime code and assets are inside the file. The source folder is needed only if you want to edit and rebuild it.

## Research references

- Craig Reynolds, [Steering Behaviors for Autonomous Characters](https://www.red3d.com/cwr/steer/gdc99/).
- Craig Reynolds, [Boids](https://red3d.com/cwr/boids/index.html).
- Xiaoyuan Tu and Demetri Terzopoulos, [Artificial Fishes: Physics, Locomotion, Perception, Behavior](https://faculty.cc.gatech.edu/~turk/bio_sim/articles/fish_terzopoulos.pdf), SIGGRAPH 1994.
- Graphics Noob / zz85, [Koi: a pond of painted fish and ink in water](https://zz85.github.io/random-sketches/vibes/koi/BLOG.html), the reference artwork's author explanation.
