# www.ventusky.com

First assert the Precipitation anchor in the Forecast panel has either a link destination or an explicit tabindex of 0. Use Tab and Enter to switch from Temperature to Precipitation and verify the 3 hours accumulation option.

**Persona** keyboard-only

**Observed barrier** The Forecast panel’s Precipitation control is an anchor exposed as text with no href or explicit tabindex, so it lacks native Tab focus and Enter activation.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/ventusky-precipitation/2026-11-22T10-55-11.916Z/recheck-without/recording.mp4) · [Run result](../../proof/kane/ventusky-precipitation/2026-11-22T10-55-11.916Z/recheck-without/result.json) · [Kane evidence pack](../../proof/kane/ventusky-precipitation/2026-11-22T10-55-11.916Z/recheck-without/ce7ecc3c-473b-471e-a8ef-fc8897d8c07b.evidence) · Kane session c78d6006-c215-48b2-9e3b-6d4519c89c45 · Kane verdict fail

- [control recording](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/control/recording.mp4) · [Run result](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/control/result.json) · [Kane evidence pack](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/control/f11af9a9-679f-4a4d-bf28-b68069a34b92.evidence) · Kane session ee2bae32-d42c-4d5c-b0d9-54c82b6e4fe7 · Kane verdict pass

- [after recording](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/attempt-1/after/0a9baf37-0c2b-46ab-90ee-5a68d85b440c.evidence) · Kane session 8559edaa-1afe-42f7-9068-5e7048846ba8 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/ventusky-precipitation/resume-2026-11-22T03-36-41.810Z/attempt-1/provenance.json) · Failure session aefafb4e-c1c2-49d7-9ee8-18a7c615aa28

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#i > a:has(> span.rain)`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#i > a:has(> span.rain)` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#i > a:has(> span.rain)`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#i > a:has(> span.rain)`.

Verified 2026-11-22T03:40:21.390Z
