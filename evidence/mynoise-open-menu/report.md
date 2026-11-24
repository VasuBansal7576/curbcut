# mynoise.net

First assert that the Menu icon at the top of the White Noise Generator is in the sequential keyboard focus order. Use Tab and Enter to open it. Verify the site navigation opens and the Full Index link is visible.

**Persona** keyboard-only

**Observed barrier** The clickable Menu icon (#hamburger) has tabIndex -1, so Tab skips it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/before/recording.mp4) · [Run result](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/before/result.json) · [Kane evidence pack](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/before/a1aa26a4-41e7-4b30-a37e-6dcb6ceaf94b.evidence) · Kane session 9188ab4a-437f-4536-aa41-c4b3244e2d21 · Kane verdict fail

- [control recording](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/control/recording.mp4) · [Run result](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/control/result.json) · [Kane evidence pack](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-31-34.469Z/control/c6f655be-9c58-42bd-ad5d-59e4cfef0c85.evidence) · Kane session 3c79c7d9-b09d-4072-ad36-a96e5b7790ce · Kane verdict pass

- [after recording](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-40-55.735Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-40-55.735Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-40-55.735Z/attempt-1/after/e1b2a9f4-b290-41dd-893f-3e823fc7d52f.evidence) · Kane session 680d1400-a8c3-4916-a717-40a3f132ef3f · Kane verdict pass

[Runtime repair proposal](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-40-55.735Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/mynoise-open-menu/resume-2026-11-22T03-40-55.735Z/attempt-1/provenance.json) · Failure session 9188ab4a-437f-4536-aa41-c4b3244e2d21

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#hamburger`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#hamburger` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#hamburger`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#hamburger`.

Verified 2026-11-22T03:42:05.087Z
