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

## Kane sample

The seeded sample included the sole independent match, uls.co.za. Kane verified **0 of 1**. The unpatched keyboard run failed as expected and the patched keyboard run passed. The pointer control failed its visibility assertion, so the three lanes did not establish verification.

Kane reported **59.183 credits** for the three runs. The shared balance fell by **122.7171 credits**, including concurrent work. The lowest observed balance was **1,604.6401 credits**. All three outcomes were decisive, so no retry was used. [Kane run ledger](kane-results.json)

## Development replay on the same 22 sites

We tuned Match mouse on the held-out sites after the trial. The original **1 of 22** remains the held-out result.

The instrumented baseline replay covered all 21 original misses before the recipe replay. None reached candidate enumeration. Twelve stopped while measuring the mouse reference, eight stopped while measuring the keyboard reference, and one stopped during setup. The baseline therefore produced zero examples of a candidate changing the keyboard or pointer set. [Per-site baseline diagnoses](development-baseline.json)

The extension now uses the deterministic CSS hover recipe from the CLI. It derives selectors from ancestors shared by the trigger and controls revealed on hover, then tests the resulting rules alongside the existing candidates.

The development replay matched **1 of 22**, with 21 no matches, zero wrong matches, and zero pointer regressions in the one accepted repair. The added recipe proposed the same rule on uls.co.za that passed in the held-out run. The extension accepted it in 3.268 seconds, and both independent lanes passed. No other site reached candidate evaluation. This round yielded no additional matches and used no Kane runs. The serialized test suite passed 77 of 77. [Development results](development-recipes.json)

## Historical draw

The initial draw at `4977467` passed hostnames to a helper that expects URLs. The resulting zero count was invalid. The corrected historical draw contained 81 eligible domains. The historical draw was never run. [Corrected historical draw](draw.json)

An earlier installed-extension smoke check matched a synthetic CSS hover menu and Escape removed the rule. Three bundled patch checks passed on their canonical URLs. [Smoke results](results.json)

## Try it

Enable Match mouse in extension options. Focus a menu trigger and press Alt+Shift+M. Chrome shows its debugger bar during the probe. Escape stops the probe or removes a temporary match. The extension queues matching rules for local Kane verification.

The probe starts keyboard traversal from the selected trigger and sends trusted ArrowDown and Tab. It skips Enter and click lanes. It verifies that the visible control set resets between attempts and restores the original focus and scroll position when it finishes. The pointer ends away from the menu. Arbitrary page-script effects can outlast these resets.
