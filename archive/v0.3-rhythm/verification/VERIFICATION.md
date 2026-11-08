# Verification: rhythm refinement

November 7, 2026, America/Vancouver. Local draft v0.3.

## Automated checks

All 20 checks pass across the individual motion, geometry, schooling, and spontaneous-rhythm suites.

The new rhythm checks verify that:

- Spontaneous swimming produces brief speed increases and quiet drifts beyond the steady beat-and-glide range, with smooth acceleration.
- The six fish take their flutters and quieter periods on independent schedules.
- Avoidance braking continues to take priority during a flutter.

The school checks still cover three simulated minutes of six-fish schooling, one minute at every supported count from two to nine, head-on and crossing encounters, destination arrival, deterministic replay, local sensing, and shared headings. Torso-envelope clearance remained positive in those selected runs. Flexible fins are outside the envelope.

The Regroup check now compares paired, identically seeded scatter replays over the action's active interval, with and without the regroup instruction. It verifies faster gathering against the unassisted case. This replaces the earlier single-instant radius comparison, which was sensitive to outward momentum and later spontaneous drift. Group actions can interrupt a quiet intention and invite nearby fish behind them back into the group. Safety planning retains priority.

## Measured tuning

The default cruise setting is 0.47 BL/s, up from 0.42 BL/s (about 12%). Over a paired 180-second default diagnostic run, mean actual speed after the first ten seconds was 0.449 BL/s in v0.3 and 0.405 BL/s in v0.2 (about 11% faster). The revised run's minimum approximate torso-envelope gap was 0.319 world units.

In a separate 90-second straight-swimming diagnostic, one fish ranged from about 0.176 to 0.735 BL/s after its first five seconds. Its short flutters increased tail tempo and propulsion; quiet periods reduced active thrust and allowed drag to slow it. These are diagnostic observations, not biological measurements or guarantees for every control setting.

## Browser check

The final build rendered in the in-app browser at about 60 fps, without observed warning or error console messages. The new Spurts & pauses control displayed its 65% default and responded to a change to zero. Reload restored the revised 0.47 BL/s cruise setting and default variation. The browser exposed independent cruise and coast states in its live diagnostics. These observations are from the local session, not a hardware benchmark.

## Local packaging and limits

The runtime remains a single HTML file with embedded scripts, styles, and the Three.js MIT license. No external asset tags are needed. The previous editions are preserved with SHA-256 manifests.

The preview browser blocks local-file URLs, so direct double-click launch remains unverified. The same HTML is checked through loopback HTTP. No alternate browser surface was used to bypass the restriction. Physical mobile hardware, Safari, and Firefox remain untested. Full fluid forces and biological accuracy remain unverified.
