# guide.elm-lang.org

At 320 CSS pixels, read the passage beginning “> madlib animal adjective = | "The ostentatious " ++ animal”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, white-space: pre prevents the madlib passage from wrapping. Its content spans 718 pixels inside a 251-pixel paragraph, and the enclosing section clips the overflow.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/elm-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/elm-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/elm-reflow/heldout-v2/before/431d9f2a-bf64-4166-97b5-a598f851379b.evidence) · Kane session 2a8eb0a4-fbb3-42c1-af11-b39a952069a4 · Kane verdict fail

- [control recording](../../proof/kane/elm-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/elm-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/elm-reflow/heldout-v2/control/2007ae94-22ed-404e-aa64-66282951804f.evidence) · Kane session 6a2c9caa-d27f-4bc0-a18a-d651b3593374 · Kane verdict pass

- [after recording](../../proof/kane/elm-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/elm-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/elm-reflow/heldout-v2/attempt-1/after/61a5cba3-ffe4-46a1-9188-4cdd5e56b40c.evidence) · Kane session 075dfc0d-46dc-47f2-966e-0f3a6cd38830 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/elm-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/elm-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 2a8eb0a4-fbb3-42c1-af11-b39a952069a4

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `#book-search-results > div:nth-of-type(1) > section > div:nth-of-type(4) > p:nth-of-type(1)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T15:34:13.362Z
