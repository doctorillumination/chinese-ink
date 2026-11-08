# Verification: schooling edition

November 7, 2026, America/Vancouver. Local draft v0.2.

## Automated checks

`npm run check`: all 17 checks pass. The original nine individual-motion and geometry checks remain in place.

The eight schooling checks verify:

1. Deterministic group behaviour with distinct sizes, tail phases, and speeds.
2. Positive torso-envelope clearance, finite motion, constrained depth velocity, and containment over three simulated minutes with six fish.
3. Positive torso-envelope clearance during one simulated minute at every supported count, from two to nine fish.
4. Positive torso-envelope clearance during head-on and crossing encounters.
5. Scatter and regroup actions preserve positions at activation, then the group draws together through swimming.
6. Fish retain positive torso-envelope clearance around a shared pointer destination.
7. Fish outside the sensing range do not become social neighbours.
8. The School preset produces shared headings more often than the Independent preset over the tested interval.

A diagnostic run of the default school recorded a minimum torso-envelope gap of about 0.48 world units over 180 simulated seconds. This envelope approximates the torso, excludes flexible fins, and is not a proof of safety for every setting.

## Browser checks

The standalone artifact was served over loopback HTTP and inspected in the in-app browser. The school rendered without warning or error console messages. Six-fish rendering was observed at about 60 fps. The nine-fish scene also rendered successfully, and count changes rebuilt the models without observed browser errors. This is a session observation, not a hardware benchmark.

Checked whole-school framing, top view, scatter and regroup actions, fish count adjustment, and individual inspection with transparent bodies. The school view reports shared headings and spacing; individual inspection reports tail rhythm and effort. The narrow preview places controls below the scene, with no horizontal overflow. Automatic group framing leaves room for the interface as the fish spread out. Reducing the count below the selected fish returns inspection to the whole school. Reset restores the six-fish scene.

The first one-fish edition remains unchanged under `archive/v0.1-one-fish/`, with a SHA-256 manifest of its files.

## Packaging and limits

The finished `index.html` embeds its runtime script, styles, and the full Three.js MIT license. It uses no external asset tags. The file can be moved independently of the source folder.

The preview browser's security policy blocks `file:` URLs. Direct double-click launch could not be verified through that browser. The same HTML was verified over loopback HTTP; no alternate browser surface was used to bypass the restriction.

Safari, Firefox, and physical mobile devices have not been tested. Biological accuracy and full fluid forces remain unverified. The artwork retains plain materials; ink and realistic water rendering are deferred.
