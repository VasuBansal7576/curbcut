# www.openbsd.org

At 320 CSS pixels, read the passage beginning “From: user@example.com To: bugs@openbsd.org Subject: 3.3-beta panics on a SPARCStation2 OpenBSD”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** At a 320 CSS pixel viewport, the bug report sample uses white-space: pre, so its lines do not wrap. Its scroll width is 615 CSS pixels and its client width is 298 CSS pixels.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/openbsd-faq-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/openbsd-faq-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/openbsd-faq-reflow/heldout-v2/before/88f5c549-27ae-4a4f-b195-83074fe90530.evidence) · Kane session 6a2d7209-1ee5-4bd1-b65e-7b4cf9c371fd · Curb Cut verdict fail

- [control recording](../../proof/kane/openbsd-faq-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/openbsd-faq-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/openbsd-faq-reflow/heldout-v2/control/2745d01f-9790-40fe-a643-2a575cc4fd98.evidence) · Kane session 8f980a9e-99aa-4842-b3a0-057bde42f302 · Curb Cut verdict pass

- [after recording](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/after/56698fe0-9114-407c-92c2-f7c0a96fb8b8.evidence) · Kane session 96a83db9-497a-4b81-aade-25ca01e8f12f · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/provenance.json) · Failure session 6a2d7209-1ee5-4bd1-b65e-7b4cf9c371fd

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `pre:nth-of-type(3)` with `white-space: pre-wrap; overflow-wrap: anywhere`.

Verified 2026-11-22T14:39:18.297Z
