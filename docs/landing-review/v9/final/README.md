# Curb Cut landing page review

| Capture | Desktop · 1440 × 900 | Mobile · 390 × 844 |
| --- | --- | --- |
| Silent scroll-through | [Watch desktop](desktop-scroll.mp4) | [Watch mobile](mobile-scroll.mp4) |
| Mass.edu opening | [Desktop opening](desktop-hero.png) | [Mobile opening](mobile-hero.png) |
| OpenSeaMap proof | [Desktop proof](desktop-openseamap.png) | [Mobile proof](mobile-openseamap.png) |

Both recordings follow the page from the Mass.edu repair through installation and the FAQ. Around 0:23, the OpenSeaMap comparison replays the eight recorded Tab stops in each installed version. The three Kane recordings follow the comparison. The original report and the later publication are identified separately. [OpenSeaMap evidence](../../../../proof/report-to-fix/README.md)

## Verification

| Check | Result |
| --- | --- |
| Lighthouse 12.8.2 on a cold Pages build | Mobile scored 93 for performance and 100 for accessibility. Desktop scored 100 for both |
| axe-core 4.10.3 | Zero violations at 320, 390 and 1440 px with standard and reduced motion, including after operating the examples |
| Reflow | Zero horizontal overflow at all three widths |
| Keyboard only | Passed the mobile menu, toolbar popup, repaired and unrepaired keyboard paths, radio groups, all 16 map stops, evidence playback, library filters, pagination, captions and FAQ |
| Reduced motion | The manual Tab path and recorded steps work with the scroll-driven focus movement disabled |
| Layout verifier | All 384 sampled positions passed text collision, cross-section media collision and section containment checks. Each motion mode covered 69 positions at 320 px, 68 at 390 px and 55 at 1440 px |
| Pages and local builds | Both produced 106 fixes, 62 Kane-verified and 44 with local proof. The Pages artifact loaded under the repository subpath with all 106 rows and 38 local resource URLs |
| Evidence verifier | 642 dashboard URLs and 232 videos validated. All three frozen-study integrity checks passed |
| Install archive | SHA-256 matched the published archive used in the OpenSeaMap comparison |

The launch player loads the repository film and its English captions. The Pages build copies both from their release paths, so replacing the film and captions on the film branch updates the player on the next build. The scroll-throughs show the film available at capture time. [Film](../../../../launch/curbcut-launch.mp4) · [Captions](../../../../launch/captions/launch.vtt)

## Normal-motion desktop layout

A second headless Chromium walk paused for 2.5 seconds after each 900 px scroll. All seven screenshots matched the supplied individual captures pixel for pixel. At 1440 × 900, “How it works” ended at page y=2316. The OpenSeaMap figure ran from y=2589 to 3209, the Kane checks ended at y=3062, and the site-owner section started at y=3281. Those positions held throughout the walk. The apparent overlap in the two-column overview occurred where one viewport met another. [How it works at full width](how-it-works-desktop.png) · [Normal-motion scroll-through](desktop-layout-walk.mp4)

The layout verifier waits for document animations to finish at each scroll position. It compares visible text and media rectangles after overflow clipping. As a regression check, moving the proof figure over the first How column in a temporary browser triggered a collision at scroll 900 between “Match the page.” and the proof figure. [Verifier](../../../../scripts/verify-landing-layout.mjs)
