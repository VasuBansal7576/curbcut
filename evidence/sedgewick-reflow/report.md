# algs4.cs.princeton.edu

At 320 CSS pixels, read the passage beginning “% java Scale mandrill.jpg 200 400”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, the sidebar offset leaves the reading column only 102 pixels wide. The 917-pixel table row places the passage at x=891, beyond the viewport, where horizontal clipping hides it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/sedgewick-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/sedgewick-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/sedgewick-reflow/heldout-v2/before/48c420c6-fa8d-460c-92c0-01499b1155a8.evidence) · Kane session 035de390-b0b6-417d-a112-45ca76f46841 · Kane verdict fail

- [control recording](../../proof/kane/sedgewick-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/sedgewick-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/sedgewick-reflow/heldout-v2/control/c9536f69-9c68-469f-bb9d-be03928c83a4.evidence) · Kane session 7b66edf0-0f93-4681-a93b-57ec96d56626 · Kane verdict pass

- [after recording](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/after/042200e9-02a4-4b6b-8f45-138fdd54f1cc.evidence) · Kane session 2a86e20d-930b-47c0-a192-0c7836f51718 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 035de390-b0b6-417d-a112-45ca76f46841

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `#content` with `display: contents`.

- 1.4.10 Reflow — Review the source stylesheet at `table` with `display: block; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `tbody` with `display: block`.

- 1.4.10 Reflow — Review the source stylesheet at `tr` with `display: block`.

- 1.4.10 Reflow — Review the source stylesheet at `td` with `display: block; width: auto; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `#content > center:nth-of-type(3) > table > tbody > tr > td:nth-of-type(3)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

- 1.4.10 Reflow — Review the source stylesheet at `img` with `max-width: 100%; height: auto`.

Verified 2026-11-22T14:51:46.402Z
