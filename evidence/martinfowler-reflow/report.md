# martinfowler.com

At 320 CSS pixels, read the passage beginning “Usually the best way to fix the build is to revert”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** The soundbite container is 418 CSS pixels wide inside a 300 CSS pixel section. At a 320 CSS pixel viewport, the paragraph extends to x=407 and is clipped by the main content container.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/martinfowler-reflow/heldout-v2/before/recording.mp4) · [Run result](../../proof/kane/martinfowler-reflow/heldout-v2/before/result.json) · [Kane evidence pack](../../proof/kane/martinfowler-reflow/heldout-v2/before/4a53cc0e-ea6c-40a3-822f-63130e01e9a5.evidence) · Kane session f031352b-1b1b-4bb9-939a-7a3759d03f2f · Kane verdict fail

- [control recording](../../proof/kane/martinfowler-reflow/heldout-v2/control/recording.mp4) · [Run result](../../proof/kane/martinfowler-reflow/heldout-v2/control/result.json) · [Kane evidence pack](../../proof/kane/martinfowler-reflow/heldout-v2/control/7588bb07-a594-491c-8af8-6fc5e54b5f94.evidence) · Kane session 505fae71-bccf-4078-a602-00017edef53b · Kane verdict pass

- [after recording](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/after/3bef6ef5-50e0-445d-9726-ff9c627c9f39.evidence) · Kane session a0edaaf1-3574-41b5-9d46-96f41f93a543 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/provenance.json) · Failure session f031352b-1b1b-4bb9-939a-7a3759d03f2f

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `div.soundbite` with `max-width: 100%; box-sizing: border-box`.

Verified 2026-11-22T14:59:23.458Z
