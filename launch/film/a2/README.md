# Curb Cut film master

The full demo runs 3:38. Its opening 75 seconds form the launch film. Its first 15 seconds form the keyboard teaser. All three exports use the same 1920 × 1080, 30 fps picture and English narration, with selectable captions and matching WebVTT files.

## Edit and recording slots

Read [the edit](edit.json) for scene order and narration. Each row has a start time and duration in seconds. [The pending manifest](../pending.json) names the five replacement recordings and their exact frame counts. Place a recording at the indicated repository-relative path and render again. The renderer uses its picture, preserves the narration, and reports a short source. Each missing recording gets an explicitly labeled slate.

From the repository root, install the locked Node dependencies and Playwright Chromium, then run:

```sh
node launch/film/a2/render.cjs
```

The renderer needs FFmpeg and writes the three MP4s to launch. Set FILM_OUTPUT to a separate output directory for a review export. It creates and removes a private Chromium profile and intermediate frames.

The checked-in narration mix and word-group timings reproduce the edit without voice models. To regenerate the mix, set FILM_CACHE to a private temporary directory containing the Kokoro v1.0 model as kokoro.onnx and its voice pack as voices.bin. Run sound.py with Python, numpy, soundfile, onnxruntime and kokoro-onnx installed. English narration uses af_heart. The multilingual announcements use macOS file synthesis with Samantha, Anna and Mónica. Speech is synthesized in separate phrases and placed on the same sample clock as the caption cues.

## Picture sources

Mass.edu opens with fresh 2× captures from an isolated Chromium session with the extension paused and enabled. The final keyboard target was The DHE. The switch graphic uses the real Apply fixes control and its states in a film-only rendering of the approved mark. The trust-popup slot is separately labeled pending.

The three full-width mass.edu replays are excerpts from the original keyboard, mouse and repaired keyboard recordings. The first pair shows the barrier and control. The longer replay finishes at the department destination. The first Mass.edu rule was proposed from a local Playwright failure. [Mass.edu repair provenance](../../../proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/provenance.json)

The direct Kane-to-agent handoff is UnitConverters. Its source run is a496782e-9c55-4b05-86a4-5523941bb947. The agent’s provenance file records the failed viewport assertion, runner and writer. The proposal changes table and cell layout, and the after-run records a successful 0.001 result. The agent scene typesets the actual evidence. [Agent provenance](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/provenance.json) · [Rules and evidence](../../../proof/recheck/unitconverters-followup.json) · [Passing result](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/after/result.json)

Munich Airport and Meridiano were freshly captured at 2×. Meridiano was captured after its lead article photo and other news images loaded. Its masthead and lead-story crops omit the reserved ad space. The live names and 1.128-second application time come from the recorded Jev run. The voices perform the role and name from the extension’s Reading view. [Jev measurements](../../../proof/jev/live-naming-demo/capture.json)

The ExtremeTerrain macro uses the original 5× paired measurements. The report uses the actual Mass.edu source-change recommendation. The recheck scene distinguishes the scheduled local task from the public Kane runs. [Plate index](../plates/index.json) · [Owner report](../../../evidence/v4-86f207deeb57-7bc09a21/report.md) · [Recheck evidence](../../../proof/recheck/README.md)

## Review changes

In the first half-second review the mass.edu opening had an unloaded feature image. The second capture waited for the site media and preserved the same keyboard target. The keyboard replay now cuts through to the actual destination, and the replay caption changes on arrival. Keiki returns to a familiar exchange with a changed outcome. Here the equivalent return is the same menu operated by the same input. [Keiki](https://aceoframes.com/case-studies/keiki)

The first agent scene held on an identifier and a fragment of CSS. The revision carries the ring from the failed assertion into the agent’s output and reveals the selector, action and value. The report frames now follow the two lines of the source recommendation. Paper uses alignment to make a handoff visible. Here the moving outline connects the evidence to the rule it caused. [Paper](https://aceoframes.com/case-studies/paper)
