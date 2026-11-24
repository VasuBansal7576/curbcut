# go.dev

At 320 CSS pixels, read the passage beginning “// Allocate the top-level slice, the same as before. picture :=”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At a 320 CSS pixel viewport, the preformatted code block prevents lines from wrapping, so its 776-pixel scroll width exceeds its 272-pixel visible width and requires horizontal scrolling.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/go-doc-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/go-doc-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/go-doc-reflow/heldout-v2/before/e250d7cb-d82d-4f81-871b-d263b87b9880.evidence) · Kane session 4019a447-a62c-4231-9e75-dc0de126a000 · Kane verdict fail

- [control recording](../../proof/kane/go-doc-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/go-doc-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/go-doc-reflow/heldout-v2/control/4c2a0ce2-fb54-4d8f-86fc-79995068794e.evidence) · Kane session 8f57b6d1-c998-4265-a932-fb1707ef5cd7 · Kane verdict pass

- [after recording](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/after/d00c9a06-7f93-45d0-b4e9-d2cb9db59427.evidence) · Kane session 3d9e0e3a-5caf-4ca2-9268-f58699eb8e7c · Kane verdict pass

[Runtime repair proposal](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 4019a447-a62c-4231-9e75-dc0de126a000

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `#main-content > article > pre:nth-of-type(55)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T15:27:10.628Z
