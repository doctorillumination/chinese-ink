# Paper Water publication

The November 10, 2026 thumbnail update is recorded in [thumbnail-60fps](thumbnail-60fps/). The new loop has 450 distinct frames at 60 fps, captured from the artwork canvas with `capture_frames.py`. The records below describe the original November 8 release.

Prepared November 8, 2026, America/Vancouver. Machine timestamps use UTC.

Paper Water is the title of the self-contained version 0.17 ink pond. The rename changes only the document title, description, accessibility name, and README. The embedded artwork script and styles are identical to the preceding edition. Swimming, schooling, feeding, bite feedback, optical depth, ripples, and the fixed overhead camera remain intact.

## Destinations

- Fieldworks: https://fieldworks.space/paper-water/
- Cyberdelic Space: https://cyberdelic.space/fieldworks/paper-water/
- Artwork source: https://github.com/doctorillumination/chinese-ink
- Fieldworks publication: https://github.com/doctorillumination/fieldworks/pull/15
- Cyberdelic Space publication: https://github.com/doctorillumination/cyberdelic-space/pull/97

The artwork opens without visible text or controls. A separate gallery About and listen link, or the I key, opens the optional introduction. Closing it returns to the uninterrupted pond. Narration does not start automatically.

## Source and media

`release.json` binds the publication to artwork revision `5d64233fb7d398e7d74a74d8b0b5a24e90a02f59`, the complete inline runtime, and the retained Three.js MIT licence. `rename-preservation.json` records the identical script and style hashes.

The cover and silent preview come from the real browser artwork canvas. `capture.html` and `serve_capture.py` record that canvas without camera, microphone, or audio capture. `canvas.webm` is the raw capture. `capture.json` describes it without the browser's transient canvas device identifier. The final H.264 loop is 960 by 720, 24 frames per second, 180 encoded frames, and 7.5 seconds, with a one-second crossfade. The raw recording has variable timing; its frame density is not evidence of sustained browser performance.

`paper-water.md` is the artwork introduction. `overview.md` is the updated twelve-work gallery reading. Both have source-bound recordings from the approved Studio Kokoro environment, voice `bm_lewis` at speed 1.0. Existing recordings, writings, runtimes, media, and portable parts were retained. The eleven-work overview remains available as an archived reading.

## Validation

The Fieldworks `npm run check` gate passes for twelve runtime imports, twenty source-bound readings, 308 internal links, JavaScript syntax, and hosting bounds, together with its existing artwork checks. Chrome checks cover the gallery entry, full-screen viewer, absence of visible controls or text, and optional Lewis playback.

Cyberdelic Space passes `validate_tending_site.py --no-mirror`, including 49 exact sources, 5,337 internal references, syntax, and catalogue evidence. Its current repository mirror validator separately checks all portable parts and all 88 recordings. The older Studio mirror validator predates the repository's generic artwork-part support, so the current repository validator supplies that part of the gate. Approved narration validation also passes.

Paper Water has its own complete artwork ZIP. The rebuilt core mirror is 26,133,484 bytes, below the 26,214,400-byte hosting bound. Earlier audio parts remain unchanged; only the new recordings occupy `audio-bundles/lewis-27.zip`.

`install.py` and `finish.py` are one-time publication helpers for the recorded eleven-work bases and isolated local worktrees. They are audit material, not a command to rerun over a newer site. `verify_live.py` compares production assets against those reviewed worktrees, accounting for hosting-injected analytics when comparing runtime HTML. `deployment.json`, `live-*.json`, and the browser evidence record the actual publication outcome.
