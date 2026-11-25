# Curb Cut landing review

[Desktop scroll-through](desktop-scroll.mp4) · [Mobile scroll-through](mobile-scroll.mp4)

[Desktop opening](desktop-opening.png) · [Mobile opening](mobile-opening.png) · [Desktop OpenSeaMap chapter](desktop-openseamap.png) · [Mobile OpenSeaMap chapter](mobile-openseamap.png)

[Desktop reveal](desktop-reveal.jpg) · [Mobile reveal](mobile-reveal.jpg)

The opening plays the recorded keystroke on Mass.edu. About receives focus and its links stay hidden. Scrolling or tabbing to “Try the repair” shows what the same key does with Curb Cut. Reduced motion presents stills from both recordings.

The OpenSeaMap comparison lets visitors inspect all eight Tab presses from each installed extension. On the eighth press, the earlier package returned focus to the page. The published package reached View and revealed Sea Marks. The original browser report, all three Kane recordings and the installed-package comparison open in the player. Grok wrote the candidate in 16 seconds. Publication followed a later recheck of the archived evidence. [Report and publication record](../../../proof/report-to-fix/README.md)

## Verification

| Check | Result |
| --- | --- |
| Axe-core 4.10.3 at 320, 390 and 1440 px | Zero violations at entry, in the OpenSeaMap comparison and after the keyboard journey |
| Keyboard only | Reached the opening reveal, Mass.edu repair, chapter selectors, all eight recorded stops, five OpenSeaMap players, ledger and captioned film |
| Reduced motion at 320, 390 and 1440 px | The hero showed the captured stills, the Tab key stayed still, and all controls remained available |
| Reflow | Zero horizontal overflow at all three widths |
| Repository layout check | 93 sampled scroll positions at 390 px and 96 at 1440 px without text collisions |
| Evidence check | 650 dashboard URLs and 232 videos validated. All three archived study integrity checks passed |
| Local and Pages builds | Both generated 106 active fixes, including 62 Kane-verified and 44 with local proof |

The downloadable extension matches the published ZIP hash from the comparison. The Pages build copies the five original OpenSeaMap recordings byte for byte. It also copies the current film and captions from the launch directory. The existing film still speaks the previous count of 105 while the replacement is in production.

## Capture sources

The opening uses the closed and repaired Mass.edu keystrokes. Each lasts about one second. The orange frame marks About in the recorded site. [Capture measurements](../../../launch/direction/v8/source/capture.json)

The OpenSeaMap scrubber follows the installed-package video at 1.60, 1.93, 2.27, 2.60, 2.94, 3.27 and 3.60 seconds, then holds the eighth stop at 5.00 seconds. The published-package frames come from six seconds later in the same video. Stops three and four magnify the real map footer where focus reaches OpenStreetMap attribution and Permalink. [Recorded focus sequence](../../../proof/report-to-fix/user-clip.json)

The desktop and mobile scroll-throughs show the starting problem, reveal, chapter interactions, each original OpenSeaMap recording, the matching fix library row and the film player. All browser checks and recordings used muted headless Chromium in temporary profiles.

## Final playback and Lighthouse

Reviewed the 79-second desktop and 80-second mobile recordings from opening to install. The mobile review caught the travelling outline resting over empty space. It now lands on “the menu” during the reveal.

Cold Lighthouse 12.8.2 runs used the generated Pages site mounted under a local project subpath.

| Profile | Accessibility | Performance | Largest contentful paint | Cumulative layout shift |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 100 | 90 | 3.3 s | 0 |
| Desktop | 100 | 100 | 0.7 s | 0 |
