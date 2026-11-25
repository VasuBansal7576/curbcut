# cloudconvert.com

At 320 CSS pixels, read the passage beginning “Vendor engines and open-source converters selected per file type”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** The grid track extends the passage’s list item to x=377 in a 320 CSS pixel viewport, where horizontal clipping cuts off the overflow.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/cloudconvert-com-tr2/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/cloudconvert-com-tr2/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/cloudconvert-com-tr2/before/40b3307b-219d-42b0-986c-52ca613c2c7a.evidence) · Kane session 5e97e502-0672-4af1-a8ef-3e3e3dd05b67 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v3/runs/cloudconvert-com-tr2/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/cloudconvert-com-tr2/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/cloudconvert-com-tr2/control/3f8776ad-d2ae-4aad-aed6-aecebe631476.evidence) · Kane session b44410ac-2107-4e72-a46c-2dc6134804de · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/cloudconvert-com-tr2/attempt-1/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/cloudconvert-com-tr2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/cloudconvert-com-tr2/attempt-1/after/dfdfef6a-402b-4845-8c66-d2a46a018f7d.evidence) · Kane session 8d678131-f9d8-460a-a0ac-90496a5c2967 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/cloudconvert-com-tr2/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/cloudconvert-com-tr2/attempt-1/provenance.json) · Failure session 5e97e502-0672-4af1-a8ef-3e3e3dd05b67

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `div.grid.gap-x-20` with `display: block`.

Verified 2026-11-23T05:31:06.237Z
