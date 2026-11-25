# www.systemrequirementslab.com

At 320 CSS pixels, read the passage beginning “See for yourself, takes less than a minute. The question of Can” and confirm it fits without horizontal scrolling.

**Persona** low-vision

**Observed barrier** The table-based layout holds the main content at 1000 CSS pixels. At a 320 CSS pixel viewport, the passage extends from x=10 to x=675, where the page’s horizontal clipping cuts off the text.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/before/29a96c81-1485-45f1-8891-bfa3350c0042.evidence) · Kane session 460c7499-3ea1-4bc3-9a09-363f33035a52 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/control/9a378e91-05b3-450d-ad6c-e2fcd1a40e1b.evidence) · Kane session b435dc9f-d3d2-47e9-9340-8995d195ef44 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/after/12a30db7-681f-47a1-85dd-1beee8c95b49.evidence) · Kane session 4ea72be2-0206-4c0b-b67d-8e7b22ecd2de · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-9e9bb4ee04e0ed570269/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-9e9bb4ee04e0ed570269/provenance.json) · [Frozen catalog candidate](../../patches/v5-9e9bb4ee04e0ed570269/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-9e9bb4ee04e0ed570269/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `#main-table, #main-table > tbody, #main-table > tbody > tr, #main-table > tbody > tr > td:nth-of-type(2)` with `display: block; width: auto; min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#main-table > tbody > tr > td:nth-of-type(2) > div, #main-table > tbody > tr > td:nth-of-type(2) > div > div:nth-of-type(2), #main-table main[role="main"]` with `width: auto; min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#main-table main[role="main"] > .row.row-layout` with `display: block; width: auto; min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#main-table main[role="main"] > .row.row-layout > .col.col-layout:first-of-type` with `width: auto; min-width: 0; max-width: 100%; box-sizing: border-box`.

Verified 2026-11-24T11:41:25.941Z
