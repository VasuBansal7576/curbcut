# Held-out v6

Curb Cut targets the six failure types that made up 96% of detected errors in WebAIM's 2026 study. The v6 sample adds contrast, image alternatives, empty links, empty buttons and document language to the existing form label coverage. [WebAIM Million 2026](https://webaim.org/projects/million/)

The [sample](sample.json) selects 400 registrable domains from the pinned Tranco list using a fixed seed and excludes previously sampled and tested domains by registrable domain. The sample was committed before the first scout request. The scout takes up to three tasks per site, one per category, and records free browser preflight before registering a task. The frozen workflow and the committed input hashes can be checked with `node scripts/verify-v6.mjs`.

The name scout uses the browser DOM and accessible name computation. It samples visible targets in the initial viewport and records a crop, nearby text, attributes and a same-site destination title when available. The repair agent can decline to propose a name. Reading view replays check trusted input on the exact row. The sighted control checks the exact pointer target. It suppresses activation in the name replays, which are identification tasks.

Contrast measurements cover opaque and translucent sRGB foregrounds and CSS solid backgrounds whose layer order the scout can establish. Background images, filtered presentation and ambiguous overlays are outside the local contrast oracle. The threshold is 4.5:1 for normal text and 3:1 for large text. The repair searches lighter and darker shades of the existing hue, changing the background only when needed. Semantic language detection uses an offline trigram detector and skips short or ambiguous samples.

## Low contrast sensitivity simulation

The fixture pilot used the fixed CSS filter `grayscale(1) contrast(0.22)`. Kane had to miss the exact 2.32:1 reference and read the exact 4.74:1 reference. It read both, so the simulation failed calibration. Contrast and document language use local browser proof. The pilot used 60.7034 credits. [Calibration results and run IDs](calibration/summary.json)
