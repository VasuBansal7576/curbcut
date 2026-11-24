# www.colorhexa.com

Open the color picker from the red swatch next to the search field. Press Tab through at least three controls unless the swatch gets focus sooner. If it gets focus, press Enter. Verify the color spectrum and hue slider appear.

**Persona** keyboard-only

**Observed barrier** The red swatch next to the search field is a div with tabIndex -1 and no tabindex attribute, so Tab skips the color picker trigger.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/before/recording.mp4) · [Run result](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/before/result.json) · [Kane evidence pack](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/before/660f8c31-6b7a-45ad-aefb-a44a982f5987.evidence) · Kane session 6720c02b-9036-4249-b024-7595cd02a99f · Kane verdict fail

- [control recording](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/control/recording.mp4) · [Run result](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/control/result.json) · [Kane evidence pack](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/control/0e1e3ec1-902c-442a-9439-bcd1b563aae8.evidence) · Kane session 068d27c9-2a32-4a17-822e-b4506ed26fb7 · Kane verdict pass

- [after recording](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/attempt-1/after/228c2952-6b0a-404e-a1ee-161bb4f95de3.evidence) · Kane session 4974ddb7-cbc1-4bb5-884a-41d71d5f980d · Kane verdict pass

[Runtime repair proposal](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/report-605ca95e172608f662/2026-11-22T08-37-56.352Z/attempt-1/provenance.json) · Failure session 6720c02b-9036-4249-b024-7595cd02a99f

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `div.sp-replacer.sp-light`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `div.sp-replacer.sp-light` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `div.sp-replacer.sp-light`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `div.sp-replacer.sp-light`.

Verified 2026-11-22T08:43:08.299Z
