# Curb Cut film master

The full demo runs 3:05. Its opening 75 seconds form the launch film. Its first 15 seconds form the keyboard teaser. All three exports use the same 1920 × 1080, 30 fps picture and English narration, with selectable captions and matching WebVTT files.

## Edit and recording slots

Read [the edit](edit.json) for scene order and narration. Each row has a start time and duration in seconds. [The recording manifest](../pending.json) lists both delivered popup shots. Mass.edu opens its linked After recording. The film cuts to the matching repository MP4. The report shot uses the installed extension’s im-stuck handler on Mass.edu with focus on About. It shows the captured address, control and navigation keys, then the draft saved to the local verification queue. The trust recording uses the extension built at 93ce171. The intro uses crops of its actual Apply fixes switch.

From the repository root, install the locked Node dependencies and Playwright Chromium, then run:

```sh
node launch/film/a2/render.cjs
```

The renderer needs FFmpeg and reuses seconds 15–75 of the approved launch MP4. It renders the opening and exports all three cuts to launch. Set FILM_OUTPUT to a separate output directory for a review export. It creates and removes a private Chromium profile and intermediate frames.

The checked-in narration mix and word-group timings reproduce the edit without voice models. To regenerate the mix, set FILM_CACHE to a private temporary directory containing the Kokoro v1.0 model as kokoro.onnx and its voice pack as voices.bin. Run sound.py with Python, numpy, soundfile, onnxruntime and kokoro-onnx installed. English narration uses af_heart. The multilingual announcements use macOS file synthesis with Samantha, Anna and Mónica. Speech is synthesized in separate phrases and placed on the same sample clock as the caption cues.

## Picture sources

Mass.edu opens with fresh 2× captures from an isolated Chromium session with the extension paused and enabled. The final keyboard target was The DHE. The switch uses screenshots from the installed popup.

The Mass.edu evidence appears in the opening. The second chapter uses two uninterrupted 19-second excerpts from Calculator.net: the mouse control producing November 24 and the repaired Reading view receiving the value 2. The first Mass.edu rule was proposed from a local Playwright failure. [Mass.edu repair provenance](../../../proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/provenance.json)

The direct Kane-to-agent handoff is UnitConverters. Its source run is a496782e-9c55-4b05-86a4-5523941bb947. The agent’s provenance file records the failed viewport assertion, runner and writer. The proposal changes table and cell layout, and the after-run records a successful 0.001 result. The agent scene typesets the actual evidence. [Agent provenance](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/provenance.json) · [Rules and evidence](../../../proof/recheck/unitconverters-followup.json) · [Passing result](../../../proof/kane/unitconverters-length/2026-11-22T11-06-33.087Z/attempt-1/after/result.json)

Munich Airport and Meridiano were freshly captured at 2×. Meridiano was captured after its lead article photo and other news images loaded. Its masthead and lead-story crops omit the reserved ad space. The live names and 1.128-second application time come from the recorded Jev run. The voices perform the role and name from the extension’s Reading view. [Jev measurements](../../../proof/jev/live-naming-demo/capture.json)

The ExtremeTerrain macro uses the original 5× paired measurements. The report uses the actual Mass.edu source-change recommendation. The retirement slot plays the unpatched Stillroom shop recheck beside the recorded terminal output. [Plate index](../plates/index.json) · [Owner report](../../../evidence/v4-86f207deeb57-7bc09a21/report.md) · [Recheck evidence](../../../proof/recheck/README.md)

## Second chapter

“How it works” opens on the date calculator before the ExtremeTerrain measurement. Kane's four roles are spoken in one sentence. The mouse run shows the resulting calendar date. The Reading view run scrolls from the list of controls to the named field. The source-owner report appears once in the opening. The retirement recording shows the verified rule changing to retired. [Mouse control](../../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/control/result.json) · [Repaired run](../../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/after/result.json)

## Stillroom shop recordings

The check, gate and retirement slots pair verbatim excerpts of the terminal logs and Kane result files with the corresponding Kane recordings from [the footage manifest](../../footage/manifest.json). The renderer reads the original text into canvas directly. The check also quotes the proposal and its writer from the run. The shop check passed with Grok’s first proposal. A later publish step failed. The gate demonstrates the Claude Code Stop hook before and after a native button source fix. The retirement recheck passed with the patch disabled on the source-fixed shop fixture. [Run evidence and session IDs](../../../proof/demo/README.md)
