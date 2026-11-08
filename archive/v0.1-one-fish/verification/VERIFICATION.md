# Verification

November 7, 2026, America/Vancouver. Local draft v0.1.

## Completed

- `npm run check`: all 9 motion and geometry checks pass.
- Seeded exploration repeats exactly.
- Spine segments retain their lengths through 90 simulated seconds of strong turning and maximum tail effort.
- Glide reduces forward speed and effort without an instantaneous velocity change.
- Stopping decays to rest without reversing.
- Angular acceleration remains bounded through a steering reversal.
- Default cruise includes active propulsion and low-effort recovery.
- Historical headings guide the body through turns.
- Five simulated minutes of exploration stay finite and contained.
- Generated body and fin positions and normals stay finite in changing poses; dorsal body normals face outward.
- Local browser preview renders with WebGL 2. No warning or error console messages were observed.
- Observed desktop preview size: 1280 by 720 CSS pixels, with a 1912 by 1440 drawing buffer for the 956-pixel-wide scene at device scale 2.
- Also inspected the current 562 by 1243 CSS pixel preview after the browser panel narrowed. The layout moved controls below the scene, with no horizontal overflow.
- Observed default rendering rate: approximately 60 frames per second in the in-app browser. This is a session observation, not a device benchmark.
- Checked 3D, top, and side camera views; pause, slow motion, presets, transparency, wireframe, and changes to speed, tail tempo, and stiffness.
- Checked click-to-steer with a visible destination marker, the Glide action, orbit dragging, keyboard pause, and reset. Paused simulation time stayed unchanged across subsequent browser observations.
- The built HTML contains one inline script, one inline style element, no external asset tags, and the full Three.js MIT license. It includes all runtime code.

## Limits

The preview browser's security policy blocks navigation to `file:` URLs. Direct double-click launch could not be tested through that browser. The identical single-file artifact was tested over loopback HTTP. No alternate browser surface was used to bypass that restriction.

Safari, Firefox, mobile hardware, and a disconnected machine have not been tested. The motion is a simplified procedural model; its biological accuracy and fluid forces have not been validated.
