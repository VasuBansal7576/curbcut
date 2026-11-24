# Curb Cut launch film

Curb Cut is a Chrome extension that fixes accessibility barriers on live websites for keyboard, screen reader and low-vision users. [Get Curb Cut for Chrome](https://github.com/VasuBansal7576/curbcut)

The 75.50-second film starts with a Tab key and a closed Mass.edu menu. The same key opens it after Curb Cut is enabled. Other shots show the actual previous-slide label on Munich Airport, a contrast repair on ExtremeTerrain, a Kane keyboard replay, the extension popup, Jev naming two Meridiano buttons and a site-owner report. The 15-second teaser follows the Mass.edu interaction. Both cuts have English caption tracks.

[Launch film](curbcut-launch.mp4) · [Teaser](curbcut-launch-15s.mp4) · [Thumbnail](curbcut-launch-thumbnail.png) · [Launch captions](captions/launch.vtt) · [Teaser captions](captions/teaser.vtt) · [Word and cut times](shots.md)

## What the numbers describe

- WebAIM found detectable WCAG failures on 95.9% of the top million home pages in its 2026 automated scan. [WebAIM Million](https://webaim.org/projects/million/)
- The extension bundles 105 active fixes. Each has evidence available from the popup. The inventory marks 61 fixes as Kane-verified and 44 as locally verified. The film shows the paired Kane recordings of the Mass.edu task. [Inventory](../extension/bundled.json) · [Evidence archive](../proof/README.md)

## Picture and sound

The plate index records each source and the two original Kane screenshot members. Mass.edu uses the same keyboard focus and crop in both states. Munich Airport and Meridiano were captured on the public sites with the installed extension in isolated headless Chromium. Meridiano uses the live Jev service. The ExtremeTerrain crop isolates the actual Details link. Its source measurements are 4.386958:1 before and 4.501341:1 after. The site-owner report uses the source-change paragraph returned by the extension’s report generator. [Plate index](film/plates/index.json) · [Design references and revisions](film/benchmark-notes.md)

A physical Tab key, a curb that opens into a ramp and matched browser frames connect the scenes. The film, Reading view and popup share cobalt, white, ink, lime and coral tokens. Inter Tight, Instrument Serif Italic and JetBrains Mono are served locally for the film. The mix uses Kokoro af_heart at 1.04×, a 120 BPM score, and individually timed keypresses, impacts and short motion sounds. The English adjective “live” is pronounced /laɪv/. [Colour tokens](../core/brand-palette.json) · [Pronunciation record](film/pronunciation.json) · [Cut and sound cues](film/cues.json)

## Reproduction

Use Node 22+, the locked Playwright dependency, Playwright Chromium, FFmpeg and ffprobe. Set a temporary cache. The renderer rebuilds both movies and the poster from checked-in audio, pictures and word timings. Set FILM_OUTPUT to a temporary directory to make a review export.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
node launch/scripts/render.mjs render
```

For new speech or independent verification, use Python 3.11 and whisper.cpp’s whisper-cli. Install Python packages and download models into the temporary cache. After verification that directory can be deleted.

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

For fresh captures, build the extension runtime before capturing Reading view. The live Meridiano capture uses the repository’s configured Jev key. Site changes can alter future results.

```sh
node scripts/build-runtime.mjs
node launch/scripts/capture-popup.mjs
node launch/scripts/capture-reader.mjs
node launch/scripts/capture-contrast.mjs
node launch/scripts/capture-report.mjs
CAPTURE_SITE=mass CAPTURE_DIR="$FILM_CACHE/navigation" node launch/scripts/capture.mjs
"$FILM_PYTHON" launch/scripts/nav-plates.py "$FILM_CACHE/navigation"
```

## Delivery checks

Verification decodes consecutive frames across each edit and measures signed offsets against the spoken word. It also checks frame count, source magnification, both caption tracks, master and teaser transcripts, pronunciation, loudness and the archived Kane screenshot bytes. The contact sheet contains one decoded frame every half second from both cuts. [Contact sheet](out/contact.png) · [Word sync](out/sync.json) · [Verification](out/verification.json) · [Full transcript](out/transcript.txt)
