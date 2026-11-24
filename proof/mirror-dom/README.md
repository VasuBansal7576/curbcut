# DOM parity trial

## Fresh trial

The seeded draw ran all 200 registered home pages. It used 32 civic sites from the finder study, 40 from its release draw, and 128 domains from the committed v5 sample. It excluded bundled domains. The stopping point was 30 eligible barriers or 200 scouted sites. [Registered draw](fresh-draw.json)

| Measure | Result |
| --- | --- |
| Sites scouted | 200 |
| Eligible hover barriers | 22 |
| Independently confirmed matches | 1 |
| No match | 21 |
| Wrong matches | 0 of 1 proposed repair |
| Pointer regressions | 0 of 1 checked repair |
| Time to fix | 4.498 s |
| Median time to return no match | 0.540 s |

Of the 178 ineligible sites, 106 were unavailable under the browser guard, 38 had no candidate navigation trigger, and 34 showed no bounded keyboard gap. The scout checked up to eight triggers and required a hover outcome of at most 12 controls, including a link. It used real Tab to reach the trigger, then ArrowDown and Tab to look for the revealed controls. Unavailable pages and larger or untested menus are outside the measured cohort.

The repair on uls.co.za made the Linux server solutions link keyboard-reachable. A fresh pointer replay revealed the same link and both lanes passed the existing journey oracle. Of the 21 no-match outcomes, 17 interrupted or failed the reset check, two hit a null-result error, and two had no supported trigger or bounded hover outcome in the installed-extension replay. [Per-site observations and replay results](fresh-results.json)

The draw was committed as `d764df9` before browsing. The extension under trial was `e710e14`. The scout and trial used isolated headless Chromium profiles. The build passed. The full test suite passed 60 of 60 with port 4317 free at startup and test files serialized to avoid competing fixture servers.

## Historical draw

The initial draw at `4977467` passed hostnames to a helper that expects URLs. The resulting zero count was invalid. The corrected historical draw contained 81 eligible domains. The historical draw was never run. [Corrected historical draw](draw.json)

An earlier installed-extension smoke check matched a synthetic CSS hover menu and Escape removed the rule. Three bundled patch checks passed on their canonical URLs. [Smoke results](results.json)

## Try it

Enable Match mouse in extension options. Focus a menu trigger and press Alt+Shift+M. Chrome shows its debugger bar during the probe. Escape stops the probe or removes a temporary match. The extension queues matching rules for local Kane verification.

The probe starts keyboard traversal from the selected trigger and sends trusted ArrowDown and Tab. It skips Enter and click lanes. It verifies that the visible control set resets between attempts and restores the original focus and scroll position when it finishes. The pointer ends away from the menu. Arbitrary page-script effects can outlast these resets.
