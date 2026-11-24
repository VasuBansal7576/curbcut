# www.colorhexa.com

Open the color picker using the swatch next to the color search field. Stop when the color spectrum panel and hue slider are visible.

**Persona** keyboard-only

**Observed barrier** The color swatch next to the search field is a clickable div that Tab skips, so keyboard users cannot reach it to open the color picker.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/recording.mp4) · [Run result](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/result.json) · [Kane evidence pack](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/24168e76-22cf-450a-960f-f6db960114d5.evidence) · Kane session 3c57743a-4f8b-4c78-9f77-d6e4630e9d31 · Kane verdict fail

- [control recording](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/recording.mp4) · [Run result](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/result.json) · [Kane evidence pack](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/97bb0137-9ecd-46e8-8730-d350a038d56f.evidence) · Kane session dedca760-0bbb-4e0d-8c38-384f23fbe12d · Kane verdict pass

- [after recording](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/e898eb24-4385-4852-8b74-0e31cfed96da.evidence) · Kane session cbcbc771-f785-4a3c-aaa9-e9fdcc8e9f65 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/provenance.json) · Failure session 3c57743a-4f8b-4c78-9f77-d6e4630e9d31

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `div.sp-replacer.sp-light`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `div.sp-replacer.sp-light` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `div.sp-replacer.sp-light`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `div.sp-replacer.sp-light`.

Verified 2026-11-22T11:04:09.374Z
