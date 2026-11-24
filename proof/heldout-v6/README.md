# Held-out v6

Curb Cut targets the six failure types that made up 96% of detected errors in WebAIM's 2026 study. The v6 sample adds contrast, image alternatives, empty links, empty buttons and document language to the existing form label coverage. [WebAIM Million 2026](https://webaim.org/projects/million/)

The [sample](sample.json) selects 400 registrable domains from the pinned Tranco list using a fixed seed and excludes previously sampled and tested domains by registrable domain. The sample was committed before the first scout request. The scout takes up to three tasks per site, one per category, and records free browser preflight before registering a task. The frozen workflow and the committed input hashes can be checked with `node scripts/verify-v6.mjs`.

The name scout uses the browser DOM and accessible name computation. It samples visible targets in the initial viewport and records a crop, nearby text, attributes and a same-site destination title when available. The repair agent can decline to propose a name. Reading view replays check trusted input on the exact row. The sighted control checks the exact pointer target. It suppresses activation in the name replays, which are identification tasks.

Contrast measurements cover opaque and translucent sRGB foregrounds and CSS solid backgrounds whose layer order the scout can establish. Background images, filtered presentation and ambiguous overlays are outside the local contrast oracle. The threshold is 4.5:1 for normal text and 3:1 for large text. The repair searches lighter and darker shades of the existing hue, changing the background only when needed. Semantic language detection uses an offline trigram detector and skips short or ambiguous samples.

## Low contrast sensitivity simulation

The fixture pilot used the fixed CSS filter `grayscale(1) contrast(0.22)`. Kane had to miss the exact 2.32:1 reference and read the exact 4.74:1 reference. It read both, so the simulation failed calibration. Contrast and document language use local browser proof. The pilot used 60.7034 credits. [Calibration results and run IDs](calibration/summary.json)

## Reading view pilot

The fixture has an unnamed icon button that controls site navigation. The naming agent received the crop, nearby heading and control relationship and proposed “Site navigation menu”. The first baseline found the named row absent and ended with an agent error. The sighted pointer control and patched Reading view replay passed. [Initial pilot recordings and verdicts](name-pilot/summary.json)

Before selecting any held-out Kane case, the replay instructions changed to ask Kane to complete the check by reporting an exact named row or reporting “target absent”. The amended baseline requires a sealed recording, Kane's explicit absence report and an unnamed visible target in the recorded Reading view state. The successful completion of the check is preserved as Kane's raw status. The task verdict is fail when that recorded check establishes the barrier. The amended fixture baseline met those conditions. [Amended baseline](name-pilot/revision/summary.json)

Development pages were checked locally as well. The local probe repaired the selected contrast case on csc.gov.in and the selected image link on marinespecies.org. The selected mass.edu contrast case stayed below AA and its button had insufficient evidence for a grounded name. [Local development results](name-pilot/dev-local.json)

## Local results

The scout attempted all 400 sites. It inspected 197 pages, recorded 62 blocked and 102 unavailable sites, and excluded 39 navigations that left the allowed scope. Six discovered tasks failed the free access preflight. The committed registration contains the other 118 tasks.

| Category | Local fixed / registered |
| --- | ---: |
| Low contrast text | 47 / 62 |
| Missing alternative text | 8 / 12 |
| Empty links | 12 / 12 |
| Empty buttons | 9 / 12 |
| Missing document language | 0 / 20 |
| Total | 76 / 118 |

A local fix needed an unpatched failure, a patched pass, and a failure after removing the rule. The frozen language threshold abstained on all 20 tasks. The five v6 categories are new to this cohort. The earlier v5 form-label study fixed 19 of 20 tasks locally and Kane verified all six form-label tasks in its later random sample. [Local v6 outcomes](local-summary.json) · [V5 results](../heldout-v5/README.md)

The language follow-up checked three known pages used in earlier development. It used the full sample and both halves as separate inputs to the offline detector and required all three to agree. It measured fail, pass, fail on all three pages. These are development results outside the 400-site cohort. [Local language checks](development-language/summary.json)
