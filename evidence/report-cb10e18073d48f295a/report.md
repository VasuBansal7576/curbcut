# www.colorhexa.com

Open the color picker using the swatch next to the color search field. Stop when the color spectrum panel and hue slider are visible.

**Persona** keyboard-only

**Observed barrier** The color swatch next to the search field is a non-focusable div, so Tab and Shift+Tab skip it and keyboard users cannot open the picker.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/before/recording.mp4) · [Run result](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/before/result.json) · [Kane evidence pack](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/before/3595fec0-1de0-47b8-8f27-6efe126ccb74.evidence) · Kane session 2ae38955-0460-4dce-8ac9-04a6ad432feb · Curb Cut verdict fail

- [control recording](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/control/recording.mp4) · [Run result](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/control/result.json) · [Kane evidence pack](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/control/49b11e0a-cd88-4beb-823b-191a3aad72c6.evidence) · Kane session 101907ec-59a0-4b59-a225-b855c62461ba · Curb Cut verdict pass

- [after recording](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/attempt-1/after/93a03b5b-b630-44c8-9f49-0d38327421b2.evidence) · Kane session 68d9f2ee-2aa1-4387-8330-95f8d54a4e68 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/report-cb10e18073d48f295a/2026-11-22T10-36-24.408Z/attempt-1/provenance.json) · Failure session 2ae38955-0460-4dce-8ac9-04a6ad432feb

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `div.sp-replacer.sp-light`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `div.sp-replacer.sp-light` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `div.sp-replacer.sp-light`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `div.sp-replacer.sp-light`.

Verified 2026-11-22T10:38:46.617Z
