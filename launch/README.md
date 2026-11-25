# Curb Cut launch film

[Watch the 2:23 launch](curbcut-launch.mp4) · [Watch the 15-second teaser](curbcut-launch-15s.mp4) · [Watch the 4:29 demo](curbcut-demo.mp4) · [Thumbnail](curbcut-launch-thumbnail.png)

A shopper presses Tab and skips Add to cart. Kane repeats the purchase with a keyboard, with a mouse and with the fix. At 1:39 the launch follows an OpenSeaMap report from the keyboard shortcut to the published repair. Eight Tabs now reach View and reveal Sea Marks. The later evidence recheck and publication are identified in the cut. [Shot list and recording sources](shots.md) · [OpenSeaMap proof](../proof/report-to-fix/README.md)

The demo’s developer chapter starts at 2:22.933. It shows curbcut check, a Claude Code Stop hook, the trust popup, a report entering the queue and a patch retiring when the site works on its own. [Launch captions](captions/launch.vtt) · [Teaser captions](captions/teaser.vtt) · [Demo captions](captions/demo.vtt)

The bundle contains 106 active fixes. Kane verified 62 and 44 have local proof. Jev’s separate review found 13 of 15 names correct. [Bundled inventory](../extension/bundled.json) · [Jev evidence](../proof/jev/) · [WebAIM Million](https://webaim.org/projects/million/)

## Rebuild

The picture build uses Playwright’s headless Chromium in temporary profiles, FFmpeg, Python with NumPy and Pillow, and the three approved AAC masters. Run these commands from the repository root.

```sh
npm ci
npx playwright install chromium
export FILM_CACHE="$(mktemp -d)"
python3 launch/film/v9/media.py
node launch/film/v9/capture.cjs
node launch/film/v9/popup.cjs
node launch/film/v9/render.cjs
FILM_THUMBNAIL=1 node launch/film/v9/render.cjs
python3 launch/film/v9/finish.py
```

The archival Stillroom shopping replays use a grayscale grade. Third-party site recordings retain their native colours. Stillroom’s shopper shots use the neutral fixture. The three locked soundtracks are stream-copied into the final movies. [Approved blue direction](direction/v9/A/end-card.png) · [Story](direction/v9/story.md) · [Delivery measurements](out/demo-verification.json)
