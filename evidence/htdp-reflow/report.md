# htdp.org

At 320 CSS pixels, read the passage beginning “function call:expected a function after the open parenthesis, found a number”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** The error-message cell uses white-space: pre, which prevents wrapping and pushes its right edge to 479 CSS pixels. The main column also has a 370-pixel minimum width, and the page clips content beyond the 320-pixel viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/htdp-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/htdp-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/htdp-reflow/heldout-v2/before/398b4c3a-0dc5-4209-82b0-173a11830490.evidence) · Kane session 51f6f29f-8f4e-43ca-8518-036c9c3069c5 · Curb Cut verdict fail

- [control recording](../../proof/kane/htdp-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/htdp-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/htdp-reflow/heldout-v2/control/b0300814-8c53-4ab4-8bf0-7aee5048273f.evidence) · Kane session ddc1f68e-d0de-47ec-ad42-6cbbe562f7b7 · Curb Cut verdict pass

- [after recording](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/after/0dea5499-721f-47a7-a4cc-b9b0dadc493c.evidence) · Kane session dae2063b-f9b1-4e68-b8eb-a17f7cf646bc · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 51f6f29f-8f4e-43ca-8518-036c9c3069c5

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `div.maincolumn` with `min-width: 0`.

- 1.4.10 Reflow — Review the source stylesheet at `div:nth-of-type(2) > div > div:nth-of-type(21) > blockquote > table > tbody > tr:nth-of-type(2) > td` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T14:43:56.635Z
