# 127.0.0.1

Using only the keyboard, search for headphones and add Field Headphones to the cart. Confirm Cart (1).

**Persona** keyboard-only

**Observed barrier** The visible Add to cart control for Field Headphones is a clickable div with tabIndex -1, so Tab skips it and keyboard users cannot activate it.

**Patch status** retired

## Recorded runs

- [before recording](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/before/recording.mp4) · [Run result](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/before/result.json) · [Kane evidence pack](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/before/98a4cc0f-462d-4828-a102-71b5a1fdddc2.evidence) · Kane session 001bf033-ff00-4be9-bbe1-d2a4672ce742 · Curb Cut verdict fail

- [control recording](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/control/recording.mp4) · [Run result](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/control/result.json) · [Kane evidence pack](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/control/0eafa29d-d1b6-4699-a126-c0d7f0a3daa6.evidence) · Kane session f1123b3e-9440-4c2b-9548-d24878c2fc5f · Curb Cut verdict pass

- [after recording](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/after/8675a8cb-fdb6-4b13-a59d-3b7500fc4cc6.evidence) · Kane session f86e31e4-4d53-4232-9580-5635cafd398b · Curb Cut verdict pass

- [retirement recording](../../proof/kane/keyboard-add-headphones/2026-11-21T19-48-03.277Z/recheck-without/recording.mp4) · [Run result](../../proof/kane/keyboard-add-headphones/2026-11-21T19-48-03.277Z/recheck-without/result.json) · [Kane evidence pack](../../proof/kane/keyboard-add-headphones/2026-11-21T19-48-03.277Z/recheck-without/0e103d8a-8b5a-4830-b879-d010c8fbc9b5.evidence) · Kane session 958f7f45-30bc-474b-850c-696ddec10ffc · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/provenance.json) · Failure session 001bf033-ff00-4be9-bbe1-d2a4672ce742

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `div.add-to-cart`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `div.add-to-cart` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `div.add-to-cart`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `div.add-to-cart`.

Verified 2026-11-21T19:42:51.945Z
