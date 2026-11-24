# Curb Cut launch film

The [launch film](curbcut-launch.mp4) follows a skipped shopping button through a keyboard test, pointer control, repair and replay. It then follows real repairs on Mass.edu, Munich Airport and ExtremeTerrain, and an experimental live naming run on Meridiano. The [15-second teaser](curbcut-launch-15s.mp4) follows the Mass.edu menu. [Thumbnail](curbcut-launch-thumbnail.png) · [Captions](captions/launch.vtt) · [Scene and word timestamps](shots.md)

## What the numbers describe

| Evidence | What was counted |
|---|---|
| WebAIM Million 2026 | 95.9% of the one million home pages had detectable WCAG failures. Six failure types accounted for 96% of detected errors. [WebAIM study](https://webaim.org/projects/million/) |
| Held-out v5 | Frozen code, 2,050 previously unseen Tranco domains, 142 registered barriers and 99 local repairs. Of 89 multi-step journeys, 51 passed. V5 also covered form labels. [Sample](../proof/heldout-v5/sample.json) · [Local outcomes](../proof/heldout-v5/local-summary.json) |
| Held-out v6 | A fresh draw of 400 sites yielded 118 registered barriers in five additional categories. Local tests confirmed 47/62 contrast repairs, 8/12 alternative-text repairs, 12/12 empty links, 9/12 empty buttons and 0/20 document-language repairs. Total 76/118. [Sample](../proof/heldout-v6/sample.json) · [Local outcomes](../proof/heldout-v6/local-summary.json) |
| Independent Kane samples | Kane verified 11/20 sampled v5 repairs. Three failed and six were inconclusive. Kane verified 7/15 v6 naming repairs, from five selected cases per naming category. [V5 run ledger](../proof/heldout-v5/kane-sample-20/summary.json) · [V6 run ledger](../proof/heldout-v6/kane-summary.json) |
| Release inventory | 105 active fixes across releases. Of those, 61 have Kane proof and 44 have local proof. [Bundled inventory](../extension/bundled.json) |
| Experimental Jev naming | Reviewers judged 13/15 applied names correct on seven real sites. The median time to the first name was 1,137 ms. On Meridiano, the menu and search buttons received “Menú” and “Buscar.” [Adjudication](../proof/jev/live-naming-real-sites.json) · [Capture](../proof/jev/live-naming-demo/capture.json) |

The render reads the local, Kane and release counts from the ledgers and checks them against the narrated figures before encoding. [Study data loader](scripts/study.mjs)

## Picture sources

The [plate index](film/plates/index.json) identifies the source file, screenshot member and step for Kane evidence. The Munich baseline pack records the unsuccessful search at the top of Reading view. The paired close-ups show the exact carousel selector in fresh installed-extension captures. The word outlines use Chromium text ranges, and the patched Kane outline follows the clicked row’s recorded rectangle. [Munich evidence](../evidence/v6-5193be8805ece27f858e/report.md)

The ExtremeTerrain meter uses two fresh installed-extension captures. The “Details” link measured 4.386958:1 before and 4.501341:1 after. Both values round to two decimals in the film. This is local contrast proof. The Meridiano close-up re-typesets seven adjacent rows from the recorded Reading view. The two target strings and their model confidence values (92% for Menú and 100% for Buscar) come from the saved capture. [Contrast measurement](../proof/heldout-v6/measurements/v6-035402528fb5fd67e4c6.json) · [Meridiano evidence](../proof/jev/live-naming-demo/)

The owner scene shows the supplied 2× popup captures and a typeset copy of the Markdown produced by the extension’s report generator for Mass.edu. The retirement scene returns to the shopping case. [Extension screenshots](ui/) · [Report generator](../extension/lib/report.js)

## Render from the repository root

Use Node 22 or later, the locked Playwright dependency, Playwright Chromium, FFmpeg with libx264, and ffprobe. The film, captions, shot list and thumbnail can be rebuilt offline from the checked-in sources, word timings and master audio. The renderer uses muted, isolated headless Chromium. It preserves the checked-in teaser.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
node launch/scripts/render.mjs render
```

## Rebuild speech and verify

Use Python 3.11 and whisper.cpp’s whisper-cli. The model files and the instrumented timing model belong in the temporary build directory. Install dependencies into its virtual environment.

```sh
export FILM_MODELS="$FILM_CACHE/models"
mkdir -p "$FILM_MODELS"
python3.11 -m venv "$FILM_CACHE/venv"
export FILM_PYTHON="$FILM_CACHE/venv/bin/python"
"$FILM_PYTHON" -m pip install numpy==2.4.6 scipy==1.17.1 Pillow==13.0.0 soundfile==0.14.0 kokoro-onnx==0.6.1 onnx==1.23.2 onnxruntime==1.32.0
curl -fL https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx -o "$FILM_MODELS/kokoro.onnx"
curl -fL https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin -o "$FILM_MODELS/voices.bin"
curl -fL https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin -o "$FILM_MODELS/ggml-small.en.bin"
"$FILM_PYTHON" launch/scripts/voice.py
"$FILM_PYTHON" launch/scripts/score.py
node launch/scripts/render.mjs render
node launch/scripts/render.mjs verify
```

Kokoro uses af_heart at 1.04×. Both spoken instances of “live” use /laɪv/. Jev uses /dʒɛv/. “Menú” and “Buscar” appear as original on-screen labels. The 88 BPM score ducks beneath speech. The five motion effects are supplied under the [Pixabay Content License](https://pixabay.com/service/license-summary/). [Approved narration](film/narration.json) · [Synthesized phonemes](film/pronunciation.json)

To rebuild the evidence plates, run the commands below. The live-site captures measure the target in an isolated browser. The Jev script renders the recorded Meridiano rows offline at 3× device scale. Each script closes its browser when finished.

```sh
node launch/scripts/capture-contrast.mjs
node launch/scripts/capture-reader.mjs
node launch/scripts/capture-report.mjs
node launch/scripts/jev-plates.mjs
```

## Delivery checks

[Word-to-frame sync](out/sync.json) measures consecutive decoded frames in the event region. [Geometry](out/geometry.json) measures the visible union of real source rectangles after overlays and the maximum source-pixel scale on every product frame. [Delivery verification](out/verification.json) includes format, loudness, speech recognition, frame motion, source-pack identity and decoded-still sharpness. [Midpoint review](out/beats/index.json) identifies one full-resolution decoded image for each beat in both cuts and records the visible letter heights of both button labels at each Jev midpoint. [Navigation review](out/stills/navigation/README.md) measures lettering at both desktop and phone sizes.

| Encoded measurement | Launch film | Teaser |
|---|---:|---:|
| Duration | 2:25.133 | 0:15.000 |
| 1920 × 1080 H.264 frames at 30 fps | 4,354 | 450 |
| Word-linked visual changes within ±0.2 s | 60/60 | 7/7 |
| Largest absolute offset | 0.0323 s | 0.026334 s |
| Integrated loudness | −16.0 LUFS | −16.0 LUFS |
| True peak | −1.6 dBTP | −2.2 dBTP |
| Words matched in full-cut Whisper pass | 415/418 | 34/34 |

Whisper recovered every narrated count and both instances of “live.” Its uninterrupted master pass heard “then” for “Step one” and “lock” for “locked.” Rechecking those two encoded scenes separately recovered both phrases. The pronunciation record confirms /laɪv/ in both lines. Speech measured 13.7 dB above the ducked score in the approved mix. The Jev picture revision retains those stem measurements from the identical AAC track. [Full transcript](out/transcript.txt) · [Scene rechecks](out/verification.json)

All 67 beat midpoints were inspected. Across the 15 product scenes, the lowest visible source area was 71.01% and the largest source scale was 1.25×. All 15 Kane stills matched their archived evidence-pack members byte for byte.
