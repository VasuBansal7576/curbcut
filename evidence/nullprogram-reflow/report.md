# nullprogram.com

At 320 CSS pixels, read the passage beginning “echo -ne '\x31\xFF\xB8\x3C\x00\x00\x00\x0F\x05' >> true”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, white-space: pre prevents the code line from wrapping, giving the block a scroll width of 513 pixels and a client width of 270 pixels.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/nullprogram-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/nullprogram-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/nullprogram-reflow/heldout-v2/before/1a8cca04-9b2a-470b-8e88-334bc832e86b.evidence) · Kane session 369f3837-a6c7-4b5e-bb0a-d975ac08b4e3 · Kane verdict fail

- [control recording](../../proof/kane/nullprogram-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/nullprogram-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/nullprogram-reflow/heldout-v2/control/3f1ca67a-d8d4-4e4b-a8b5-1cb78b3d2df5.evidence) · Kane session c4dd0c0e-bd90-4d6a-917f-12de14adde81 · Kane verdict pass

- [after recording](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/after/7e6bc5a0-9a81-4aee-a564-de940f6367a6.evidence) · Kane session 067d24f5-232c-4616-956e-fcd3f47259dc · Kane verdict pass

[Runtime repair proposal](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 369f3837-a6c7-4b5e-bb0a-d975ac08b4e3

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `main > article > pre:nth-of-type(35)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T15:05:06.049Z
