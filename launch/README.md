# Curb Cut launch film

[Watch the 2:23 launch](curbcut-launch.mp4) · [Watch the 15-second teaser](curbcut-launch-15s.mp4) · [Watch the 4:29 demo](curbcut-demo.mp4) · [Thumbnail](curbcut-launch-thumbnail.png)

A shopper presses Tab and skips Add to cart. Kane repeats the purchase with a keyboard, with a mouse and with the fix. At 1:39 the launch follows an OpenSeaMap report from the keyboard shortcut to the published repair. Eight Tabs now reach View and reveal Sea Marks. The later evidence recheck and publication are identified in the cut. [Shot list and recording sources](shots.md) · [OpenSeaMap proof](../proof/report-to-fix/README.md)

The demo’s developer chapter starts at 2:22.933. It shows curbcut check, a Claude Code Stop hook, the trust popup, a report entering the queue and a patch retiring when the site works on its own. [Launch captions](captions/launch.vtt) · [Teaser captions](captions/teaser.vtt) · [Demo captions](captions/demo.vtt)

The bundle contains 106 active fixes. Kane verified 62 and 44 have local proof. Jev’s separate review found 13 of 15 names correct. [Bundled inventory](../extension/bundled.json) · [Jev evidence](../proof/jev/) · [WebAIM Million](https://webaim.org/projects/million/)

## Rebuild

Use Node, the repository’s Playwright Chromium, FFmpeg, Python with NumPy, Pillow, scipy, soundfile, kokoro-onnx and onnxruntime. Set FILM_MODELS to the directory containing the Kokoro v1.0 kokoro.onnx and voices.bin files. Run from the repository root. The picture stage uses headless Chromium and creates a fresh temporary profile.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
python3 launch/film/v8/prepare.py
python3 launch/film/v8/release/plates.py
python3 launch/film/v8/release/record.py
node launch/film/v8/release/render.cjs
python3 launch/film/v8/release/finish.py
```

The first 99.1 seconds and the closing voice use the original recording from `94189fb`. The insert uses the same voice, pace and 88 BPM score. The demo incorporates the recorded developer chapter from `66f12285`. [Benchmark study](direction/v8/benchmark.md) · [Palette and type](direction/v8/palette-type.png) · [Output measurements](out/demo-verification.json)
