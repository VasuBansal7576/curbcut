# Curb Cut launch film

The [two-minute film](curbcut-launch.mp4) follows a keyboard user from the About menu on Mass.edu to the Department of Higher Education page. The [15-second cut](curbcut-launch-15s.mp4) shows the same keys with repairs off and on. The master also follows Kane’s held-out keyboard test on the World Register of Marine Species. The [shot list](shots.md) gives the spoken lines, source files, Kane step numbers and verdicts.

## Render from the repository root

Use Node 22 or later, the repository’s locked Playwright dependency, Playwright’s Chromium build, FFmpeg with libx264, and ffprobe. The checked-in stills, fonts, word timings and audio mixes are sufficient for an offline render. No live site access or speech model is needed for this path.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
node launch/scripts/render.mjs render
```

The renderer uses isolated, headless, muted Chromium and writes both MP4s and the thumbnail. It also regenerates the word-linked events, captions and shot list. Intermediate scene encodes and lossless references stay in `FILM_CACHE`. Use the same cache for verification.

## Check the delivery

The verification tools use Python 3.11, NumPy, SciPy, Pillow, soundfile, and the whisper.cpp CLI. Set `FILM_MODELS` to a directory containing whisper.cpp’s `ggml-small.en.bin`.

```sh
python3 -m venv "$FILM_CACHE/venv"
export FILM_PYTHON="$FILM_CACHE/venv/bin/python"
"$FILM_PYTHON" -m pip install numpy==2.4.6 scipy==1.17.1 Pillow==13.0.0 soundfile==0.14.0
node launch/scripts/render.mjs verify
```

[Sync measurements](out/sync.json) compare consecutive decoded frames inside the region belonging to each visual beat. [Delivery measurements](out/verification.json) include stream formats, audio levels, transcript coverage, frame motion, sharpness and minimum unobscured page area across every frame of each product scene. The area calculation subtracts overlaid titles, callouts, outlines, provenance chips, inserted panels and subtitles. The two sizes of [scene stills](out/stills/) and the [two-second contact sheet](out/contact.png) come from the encoded movies.

## Source and timing

[Story and shot definitions](scripts/story.mjs) associate words with footage and actions. [Frame drawing](film/film.js) positions the source image, native focus target, large callout and one provenance chip. [Graphic scenes](film/graphics.js) draw the curb, lanes, WebAIM sample and frozen local results. [Source metadata](film/plates/index.json) identifies each used screenshot, including the original evidence-pack member or browser key press. The files supplied here preserve the particular pages seen in the film.

To record fresh source material, run the following from the repository root. Each run creates and removes its own temporary Chromium profile. The scripts load the repository’s unpacked extension, press real keys, save a 5464 × 3400 frame per key on the government sites at 2× device scale and 200% browser zoom, record the focused element and menu visibility, and check the repaired destination. The 320 CSS pixel CloudConvert capture uses six device pixels per CSS pixel. Live sites may have changed since the film.

```sh
export CAPTURE_DIR="$(mktemp -d)"
node launch/scripts/capture.mjs
node launch/scripts/capture-detail.mjs
"$FILM_PYTHON" launch/scripts/nav-plates.py "$CAPTURE_DIR"
```

The [approved narration](film/narration.json) and [phoneme record](film/pronunciation.json) accompany the final mixes. To regenerate speech, place the Kokoro v1.0 ONNX model and compatible voices binary in `FILM_MODELS` as `kokoro.onnx` and `voices.bin`. The audio scripts use af_heart at 1.04×, preserve the spoken adjective /laɪv/, extract word onsets from Kokoro’s duration output, synthesize and duck the score, and mix the effects before normalizing.

```sh
"$FILM_PYTHON" -m pip install kokoro-onnx==0.6.1 onnx==1.23.2 onnxruntime==1.32.0
"$FILM_PYTHON" launch/scripts/voice.py
"$FILM_PYTHON" launch/scripts/score.py
node launch/scripts/render.mjs render
node launch/scripts/render.mjs verify
```

The musical score is original. The five offline motion effects are used in the mix under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Local font licenses accompany the font files.

## What the numbers describe

The repair code was frozen before a draw of 2,050 previously unseen Tranco sites. Scouting confirmed 144 barriers. Two failed browser access preflight, leaving 142 registered barriers. Local Playwright tests confirmed 99 automatic repairs, including 51 of 89 hard journeys. [Held-out study](../proof/heldout-v5/README.md) · [Local results](../proof/heldout-v5/local-summary.json)

| Hard journey | Fixed locally / registered |
|---|---:|
| Hover menu | 31 / 43 |
| Disclosure | 11 / 20 |
| Tabs or carousel | 5 / 14 |
| Modal dialog | 3 / 11 |
| Custom listbox | 1 / 1 |

Kane independently verified 0 of 4 selected cases in the original v5 draw. It verified WoRMS in a two-case rerun with a 50-step limit. The baseline failed after 24 steps. With the fix, the Tools menu opened, “Match taxa” was visible at step 24, and the run passed after 26 steps. TikFinity remained inconclusive. Across releases, the extension ships 43 Kane-verified fixes. [Rerun evidence](../proof/heldout-v5/README.md#post-amendment-kane-rerun) · [Bundled inventory](../extension/bundled.json)

The [held-out results graphic](out/stills/results.png) starts at 01:30.000. The WoRMS scene starts at 01:46.067. FAIL appears at 01:52.533 on the [baseline failure frame](film/plates/5fc7e627-23.jpg). PASS appears at 01:54.033 on the [patched menu frame](film/plates/eb14dcd6-24.jpg). Both screenshots fill the frame at native scale. The callouts transcribe the menu labels.

## Delivery checks

Both files are 1920 × 1080 H.264 at 30 fps with stereo 48 kHz AAC. The master runs 133.733 seconds (4,012 frames). The teaser runs 15.000 seconds (450 frames).

| Measurement | Master | Teaser |
|---|---:|---:|
| Beats within ±0.2 seconds | 73/73 | 7/7 |
| Largest offset | 0.033233 s | 0.026334 s |
| Integrated loudness | -16.0 LUFS | -16.0 LUFS |
| True peak | -1.6 dBTP | -2.2 dBTP |
| Full-band mean | -19.1 dBFS | -20.1 dBFS |
| Mean after 300 Hz high-pass | -21.2 dBFS | -22.2 dBFS |
| Script lines represented in Whisper transcription | 28/28 | 3/3 |
| Normalized script words matched | 375/380 | 34/34 |
| Pixel-static half-second comparisons | 0/267 | 0/29 |
| Longest interval below the motion threshold | 1.5 s | 0 s |

Kokoro produced **lˈaɪv** for “43 are live” and **ɹᵻkˈɔːɹdɪŋ** for “a recording.” Whisper recognized all held-out counts and both WoRMS verdicts. Transcribing the results, WoRMS and release scenes individually also recovered “locked” and “Fixes,” which the full-film pass heard as “lock” and “This.” The narration measured 13.3 dB above the ducked music. Between 200 Hz and 4 kHz, the narration retained 78.93% of its energy and the score retained 99.99%. [Whisper transcript](out/transcript.txt) · [Word-level differences](out/verification.json)

Verification covered 21 master scenes and three teaser scenes at 1920 × 1080 and 640 × 360, plus a 67-frame contact sheet. The lowest decoded-still luma PSNR against the lossless canvas was 42.46 dB. All 27 Kane stills matched their original evidence-pack JPEGs byte for byte.

| Product scene | Minimum visible page area | Product scene | Minimum visible page area |
|---|---:|---|---:|
| Shopping | 82.09% | Mass.edu, Kane replay | 74.78% |
| Tab skips Add to cart | 81.65% | CSC.gov.in | 74.62% |
| Keyboard test | 80.69% | Screen reader | 80.81% |
| Mouse control | 75.06% | Zoomed text | 82.66% |
| Proof | 78.54% | ColorHexa report | 75.94% |
| Share the fix | 74.39% | Patch retirement | 76.10% |
| Mass.edu, extension off | 80.10% | Teaser, extension off | 82.33% |
| Mass.edu, extension on | 76.39% | Teaser, extension on | 76.37% |
| WoRMS, Kane rerun | 84.82% | | |

## Government-site navigation review

The [beat-by-beat still index](out/stills/navigation/README.md) links the 1920×1080 and 640×360 exports for all 29 navigation samples, including the exact 54 s and 56 s frames. At both times the Mass.edu About text measures 60 pixels in the master and 20 pixels at phone width. On the skipped-link beat the outline lands on Board Business. On the repaired keyboard journey it moves inside the open menu to The DHE, then Enter shows the destination heading and the recorded URL.

The open-menu overview shows The DHE at 44 / 15 pixels (master / phone). Its focused close-up measures 55 / 19 pixels. CSC.gov.in’s focused About MeitY measures 42 / 14 pixels. These heights count contrasting glyph rows inside the actual link. Chromium recorded each site at 5464×3400 in a fresh profile. The film uses losslessly cropped 3000×2100 source plates with the original tab URL and key-event metadata.

Kane’s original evidence appears in labeled, tightly cropped insets at 1.25× native pixels. Its navigation lettering measures 12–17 pixels in the master. The surrounding high-resolution Chromium capture shows the corresponding keyboard state. The 19 master scenes carried over from the preceding cut retain identical encoded video packets. The 15-second teaser retains the same file hash. [Encoded-frame measurements](out/navigation.json)
