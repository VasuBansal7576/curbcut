# Curb Cut landing review

[Desktop scroll-through, 54 seconds](desktop-scroll.mp4) · [Mobile scroll-through, 59 seconds](mobile-scroll.mp4) · [Chapter stills](storyboard.jpg) · [Palette and typography](type-and-colour.png)

The two silent recordings cover the page from the Tab key to the final download. They show the Mass.edu keyboard repair, Munich’s translated announcement, the contrast measurement, all three Kane runs, both Jev outcomes, the owner handoff, the retirement replay, developer workflows, ledger search and the captioned film.

## Accessibility

Headless Chromium used temporary profiles for all checks. Axe-core 4.10.3 ran at entry and again after keyboard navigation had selected alternate evidence, opened a retirement check and played the film.

| Viewport | Motion | Axe violations at entry / after interaction | Horizontal overflow | Keyboard journey |
| --- | --- | --- | --- | --- |
| 320 × 844 | Standard | 0 / 0 | 0 px | Passed |
| 390 × 844 | Standard | 0 / 0 | 0 px | Passed |
| 1440 × 900 | Standard | 0 / 0 | 0 px | Passed |
| 390 × 844 | Reduced | 0 / 0 | 0 px | Passed |
| 1440 × 900 | Reduced | 0 / 0 | 0 px | Passed |

Tab, Shift+Tab, arrows, Space, Enter and Escape operated the menus, chapter comparisons, players, source recheck, terminal summary, evidence dialog and final film. The terminal and Kane clips advanced, the English captions loaded, and switching away from a playing run paused it. Under reduced motion the key stayed still and the travelling outline stayed hidden.

## Performance

Lighthouse 12.8.2 tested the Pages build served under a local project subpath with a cold browser profile. These are local measurements.

| Lighthouse profile | Accessibility | Performance | Largest contentful paint | Cumulative layout shift |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 100 | 90 | 3.4 s | 0 |
| Desktop | 100 | 100 | 0.7 s | 0 |

## Build and proof

Both the ordinary build and the Pages build generated 105 fixes, with 61 Kane-verified and 44 locally proven. The repository evidence check validated 639 dashboard URLs and 229 videos. The Pages artifact contains a byte-for-byte copy of the current launch film. The build takes its film and captions from the launch directory, so the replacement film can arrive with its matching English captions at merge.

The contrast link leads to its local measurement. Jev’s 13/15 figure counts the names reviewers found correct among the 15 applied. The retirement replay is labelled as a test-shop recording. The developer check summary records both the passing Kane task and the later publishing error.

During review, the terminal recording’s small text on a phone prompted the addition of expandable, readable summaries beside both captures. The final recordings include the gate summary.
