# www.colorhexa.com

First assert the red color swatch next to the color search box is in the sequential keyboard focus order. Open that swatch with Tab and Enter. Verify the color picker panel with the color spectrum and hue slider is visible.

**Persona** keyboard-only

**Observed barrier** The red swatch (.sp-replacer) has tabIndex -1 and is exposed as text, so Tab skips the color picker trigger.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/before/recording.mp4) · [Run result](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/before/result.json) · [Kane evidence pack](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/before/78de2d90-e585-461c-b795-7070185a3b9c.evidence) · Kane session b5819fca-5d89-41d7-aaa2-6e69f1520b52 · Kane verdict fail

- [control recording](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/control/recording.mp4) · [Run result](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/control/result.json) · [Kane evidence pack](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/control/a0cf631f-a1c8-4e2a-aae7-7ac73085bb3a.evidence) · Kane session 3887cc4e-dd27-4319-99cb-8bfc74442eb6 · Kane verdict pass

- [after recording](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/attempt-1/after/938992ef-bd3e-400e-a47e-4c520d89e8fd.evidence) · Kane session 931741ab-d134-4943-b9a8-d86fc1d3a330 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/colorhexa-open-picker/resume-2026-11-22T03-33-20.437Z/attempt-1/provenance.json) · Failure session b5819fca-5d89-41d7-aaa2-6e69f1520b52

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `.sp-replacer`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `.sp-replacer` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `.sp-replacer`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `.sp-replacer`.

Verified 2026-11-22T03:36:41.404Z
