# www.unicode.org

At 320 CSS pixels, read the passage beginning “Tech Site | Site Map | Search”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** The header table keeps its three cells in one row that is 441 CSS pixels wide. The “Tech Site | Site Map | Search” cell extends from x=225 to x=441, so horizontal clipping hides part of it in the 320-pixel viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/unicode-standard-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/unicode-standard-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/unicode-standard-reflow/heldout-v2/before/16ebeee3-3e25-4291-a2c6-d9e2c1f0280f.evidence) · Kane session c2ffd38a-25c1-4c2e-a1ba-038995c281fd · Curb Cut verdict fail

- [control recording](../../proof/kane/unicode-standard-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/unicode-standard-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/unicode-standard-reflow/heldout-v2/control/5a7cd6b9-0eb4-43e3-8819-fd72954b860f.evidence) · Kane session 40d95c87-85fa-46e5-a225-98c1de0d5c4c · Curb Cut verdict pass

- [after recording](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/after/7185fc0e-0c1d-4ee5-9e04-6a512363034b.evidence) · Kane session c7f3783a-11cb-483c-a120-5b385f7b671e · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/provenance.json) · Failure session c2ffd38a-25c1-4c2e-a1ba-038995c281fd

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `table` with `max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `tr` with `display: flex; flex-wrap: wrap`.

- 1.4.10 Reflow — Review the source stylesheet at `td` with `min-width: 0; max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere`.

Verified 2026-11-22T15:09:04.415Z
