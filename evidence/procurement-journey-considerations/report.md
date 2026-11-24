# www.procurementjourney.scot

First assert the Considerations Before Proceeding accordion title is in the sequential keyboard focus order. Dismiss the cookie banner with Reject using the keyboard if it covers the page. Open Considerations Before Proceeding with Tab and Enter. Verify the first question, Are the good/services you are buying business critical?, is visible.

**Persona** keyboard-only

**Observed barrier** The Considerations Before Proceeding accordion title is exposed as text with tabIndex -1, so Tab skips the clickable title.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/before/recording.mp4) · [Run result](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/before/result.json) · [Kane evidence pack](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/before/5277ccd9-4b92-48a4-9bfc-2bb8880fce4a.evidence) · Kane session 643d778f-0790-4ac3-acdc-b460b52e6581 · Kane verdict fail

- [control recording](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/control/recording.mp4) · [Run result](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/control/result.json) · [Kane evidence pack](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/control/21f6be54-3168-4834-9562-d8cf7e8cc527.evidence) · Kane session bc09b927-b8eb-4034-9c25-ca3350da9a18 · Kane verdict pass

- [after recording](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/attempt-1/after/f1c02e1d-8cac-43e4-8e3f-679933b81394.evidence) · Kane session 97f4a622-59cc-4d3f-a327-2421fc656e19 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/procurement-journey-considerations/resume-2026-11-22T03-32-20.478Z/attempt-1/provenance.json) · Failure session 643d778f-0790-4ac3-acdc-b460b52e6581

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `.accordion__container > .accordion__item:first-child .accordion__title`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `.accordion__container > .accordion__item:first-child .accordion__title` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `.accordion__container > .accordion__item:first-child .accordion__title`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `.accordion__container > .accordion__item:first-child .accordion__title`.

Verified 2026-11-22T03:38:42.261Z
