# www.lua.org

At 320 CSS pixels, read the passage beginning “chunk ::= block block ::= {stat} [retstat] stat ::= ‘;’ |”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, the 354-pixel body extends beyond the viewport, and the grammar block’s white-space: pre prevents its lines from wrapping, producing 828 pixels of content that is clipped on the right.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/lua-manual-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/lua-manual-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/lua-manual-reflow/heldout-v2/before/5c47c58f-3363-45be-98b1-5ed8137f91fe.evidence) · Kane session b83f00cf-c90e-49d4-8ae2-4a6a4f310fc0 · Kane verdict fail

- [control recording](../../proof/kane/lua-manual-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/lua-manual-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/lua-manual-reflow/heldout-v2/control/87b66d81-ac8a-499e-8ecf-16e472dd1f0a.evidence) · Kane session 3472d244-23e5-41fa-8a90-587c7aa5d2cb · Kane verdict pass

- [after recording](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/after/3587676c-fce3-4ebc-a171-2e1beaea5663.evidence) · Kane session 06702ffd-7a8c-4145-b63e-a070b5bc9912 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/provenance.json) · Failure session b83f00cf-c90e-49d4-8ae2-4a6a4f310fc0

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `body` with `max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `pre:nth-of-type(301)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T14:53:51.881Z
