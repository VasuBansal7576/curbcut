# Curb Cut launch film

[Watch the launch](curbcut-launch.mp4) · [Watch the 15-second teaser](curbcut-launch-15s.mp4) · [Watch the 3:11 demo](curbcut-demo.mp4) · [Thumbnail](curbcut-launch-thumbnail.png)

Press Tab on Mass.edu and watch the orange ring. About stays closed. Turn on Curb Cut and repeat the task. Focus moves to The DHE inside the open menu. The launch follows that repair with a screen-reader name, a contrast change, two Kane recordings, Jev naming buttons and a source change for the site owner.

The demo opens with the complete launch. At 1:15.5 it follows a developer using curbcut check and a Claude Code Stop hook, then shows a visitor opening the evidence, reporting a barrier and a site repair allowing the extension’s fix to retire. [Shot list and recording sources](shots.md) · [Launch captions](captions/launch.vtt) · [Teaser captions](captions/teaser.vtt) · [Demo captions](captions/demo.vtt)

## Picture and sound

The colour system uses Mist lilac, Damson, Signal orange and Slate plum. The physical Tab key shares its cap, spring and base with the landing page. Inter Tight carries the film typography and JetBrains Mono identifies sources. The original launch narration and 120 BPM score also supply the teaser. The developer chapter uses the same Kokoro voice and a new mix of the original score. [Benchmark study](direction/v8/benchmark.md) · [Colour and type sheet](direction/v8/palette-type.png) · [Music source](scripts/score.py)

The 95.9% figure describes home pages with detectable accessibility failures. Curb Cut’s inventory contains 105 active fixes, including 61 Kane-verified and 44 with local proof. The Meridiano recording demonstrates two specific names. The separate review assessed fifteen names. [WebAIM Million](https://webaim.org/projects/million/) · [Bundled inventory](../extension/bundled.json) · [Jev evidence](../proof/jev/)

## Rebuild from the recorded soundtracks

Use FFmpeg, Python with NumPy and Pillow, Node and the repository’s Playwright Chromium. The renderer starts headless Chromium with a separate temporary profile. Run from the repository root.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
python3 launch/film/v8/prepare.py
node launch/film/v8/render.cjs
python3 launch/film/v8/finish.py --mux-only
```

To regenerate the developer voice, put the Kokoro v1.0 ONNX model and voices in FILM_MODELS as kokoro.onnx and voices.bin. Install kokoro-onnx, onnxruntime, soundfile and scipy in the Python environment. Use whisper.cpp’s English base model to time the new captions.

```sh
python3 launch/film/v8/audio.py
ffmpeg -y -i "$FILM_CACHE/chapter.wav" -ar 16000 -ac 1 "$FILM_CACHE/align.wav"
whisper-cli -m "$WHISPER_MODEL" -f "$FILM_CACHE/align.wav" -ojf -of "$FILM_CACHE/demo-words" -ml 1 -sow
node launch/film/v8/render.cjs
python3 launch/film/v8/finish.py
```

[Output measurements](out/demo-verification.json) · [Launch half-second contact sheet](out/contact.png) · [Demo overview](out/demo-contact.png)
