# doc.rust-lang.org

At 320 CSS pixels, read the passage beginning “> dir /B %= the /B option says to only show”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, white-space: pre keeps the CMD passage on an unwrapped line, giving the code block a scroll width of 532 px within 280 px of visible width.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/rust-book-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/rust-book-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/rust-book-reflow/heldout-v2/before/6c2f246d-4016-4925-9a76-2f4edbfcbd00.evidence) · Kane session e4ff09da-ae37-4e6b-b609-a5a30ed3e76e · Kane verdict fail

- [control recording](../../proof/kane/rust-book-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/rust-book-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/rust-book-reflow/heldout-v2/control/6f35df2d-de3b-439b-9266-7a078df16fd6.evidence) · Kane session fa72607f-1dab-4294-b288-def12605c76c · Kane verdict pass

- [after recording](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/after/88f879dd-42ca-4b3e-b870-b7150a5ef18e.evidence) · Kane session b04ddb19-6c75-405e-b78b-2f18d11b124e · Kane verdict pass

[Runtime repair proposal](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/provenance.json) · Failure session e4ff09da-ae37-4e6b-b609-a5a30ed3e76e

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `code.language-cmd.hljs` with `white-space: pre-wrap`.

Verified 2026-11-22T15:27:54.041Z
