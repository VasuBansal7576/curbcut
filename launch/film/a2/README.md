# Curb Cut film master

The full demo runs 3:05. Its opening 75 seconds form the launch film. Its first 15 seconds form the keyboard teaser. All three exports use the same 1920 × 1080, 30 fps picture and English narration, with selectable captions and matching WebVTT files.

## Edit and recording slots

Read [the edit](edit.json) for scene order and narration. Each row has a start time and duration in seconds. [The pending manifest](../pending.json) names the five replacement recordings and their exact frame counts. Place a recording at the indicated repository-relative path and render again. The renderer uses its picture, preserves the narration, and reports a short source. Each missing recording has an on-screen pending label and an identified reference replay.

From the repository root, install the locked Node dependencies and Playwright Chromium, then run:

```sh
node launch/film/a2/render.cjs
```

The renderer needs FFmpeg and uses the approved launch MP4 as its first 75 seconds and writes the revised demo to launch. Set FILM_OUTPUT to a separate output directory for a review export. It creates and removes a private Chromium profile and intermediate frames.

The checked-in narration mix and word-group timings reproduce the edit without voice models. To regenerate the mix, set FILM_CACHE to a private temporary directory containing the Kokoro v1.0 model as kokoro.onnx and its voice pack as voices.bin. Run sound.py with Python, numpy, soundfile, onnxruntime and kokoro-onnx installed. English narration uses af_heart. The multilingual announcements use macOS file synthesis with Samantha, Anna and Mónica. Speech is synthesized in separate phrases and placed on the same sample clock as the caption cues.

## Picture sources

Mass.edu opens with fresh 2× captures from an isolated Chromium session with the extension paused and enabled. The final keyboard target was The DHE. The switch graphic uses the real Apply fixes control and its states in a film-only rendering of the approved mark. The trust-popup slot is separately labeled pending.

The Mass.edu evidence appears in the opening. The second chapter uses two uninterrupted 19-second excerpts from Calculator.net: the mouse control producing November 24 and the repaired Reading view receiving the value 2. The first Mass.edu rule was proposed from a local Playwright failure. [Mass.edu repair provenance](../../../proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/provenance.json)

The direct Kane-to-agent handoff is UnitConverters. Its source run is a496782e-9c55-4b05-86a4-5523941bb947. The agent’s provenance file records the failed viewport assertion, runner and writer. The proposal changes table and cell layout, and the after-run records a successful 0.001 result. The agent scene typesets the actual evidence. [Agent provenance](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/provenance.json) · [Rules and evidence](../../../proof/recheck/unitconverters-followup.json) · [Passing result](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/after/result.json)

Munich Airport and Meridiano were freshly captured at 2×. Meridiano was captured after its lead article photo and other news images loaded. Its masthead and lead-story crops omit the reserved ad space. The live names and 1.128-second application time come from the recorded Jev run. The voices perform the role and name from the extension’s Reading view. [Jev measurements](../../../proof/jev/live-naming-demo/capture.json)

The ExtremeTerrain macro uses the original 5× paired measurements. The report uses the actual Mass.edu source-change recommendation. The retirement slot uses a public Kane recheck as labeled reference footage. [Plate index](../plates/index.json) · [Owner report](../../../evidence/v4-86f207deeb57-7bc09a21/report.md) · [Recheck evidence](../../../proof/recheck/README.md)

## Second chapter

“How it works” opens on the date calculator before the ExtremeTerrain measurement. Kane's four roles are spoken in one sentence. The mouse run shows the resulting calendar date. The Reading view run scrolls from the list of controls to the named field. The source-owner report appears once in the opening. The final retirement slot explains when the rule comes out of the extension. [Mouse control](../../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/control/result.json) · [Repaired run](../../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/after/result.json)
