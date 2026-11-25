# www.uline.com

At 320 CSS pixels, read the passage beginning “Help Contact Us Careers Shipping Boxes Plastic Bags Catalog Request Uline.ca”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, #tdfooter is 980 pixels wide and lays out the passage in a single 877-pixel row. Horizontal clipping cuts off the links beyond the viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/uline-com-tr2/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/uline-com-tr2/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/uline-com-tr2/before/2c7e4b06-c048-4242-b43b-a143e749e00c.evidence) · Kane session 7c9b662c-baad-446a-b711-427de114e305 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v3/runs/uline-com-tr2/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/uline-com-tr2/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/uline-com-tr2/control/ca9325c8-1403-46a7-86da-bcdeadfca987.evidence) · Kane session 8df9e40c-d299-46a4-949c-6abb22c5f400 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/uline-com-tr2/attempt-1/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/uline-com-tr2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/uline-com-tr2/attempt-1/after/baaa61ec-f5e1-44d6-ba01-f56e2a7ecd2a.evidence) · Kane session 1bcdba5e-99a6-45db-b735-5338ff6aee95 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/uline-com-tr2/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/uline-com-tr2/attempt-1/provenance.json) · Failure session 7c9b662c-baad-446a-b711-427de114e305

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `#container` with `min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#divContent` with `min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#divContentFooterWrap` with `min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#divFooterwrap` with `min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#newfooter` with `min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `table` with `max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `#tdfooter` with `display: block; width: auto; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `table.default` with `display: block; min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `td.footerCell` with `display: inline-block; max-width: 100%; box-sizing: border-box; white-space: normal; overflow-wrap: anywhere`.

Verified 2026-11-23T05:38:40.240Z
