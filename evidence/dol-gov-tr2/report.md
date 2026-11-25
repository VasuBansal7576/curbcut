# www.dol.gov

Use Tab and Enter to reach and activate “FEDERAL GOVERNMENT”. Verify its content becomes visible.

**Persona** keyboard-only

**Observed barrier** The Federal Government footer trigger is a span exposed as text with a tabIndex of -1, so Tab skips it and keyboard users cannot reach it to activate it with Enter.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/dol-gov-tr2/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/dol-gov-tr2/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/dol-gov-tr2/before/424038d6-db95-4784-9e72-df4a32f44e45.evidence) · Kane session 25c40444-823c-4c61-8d28-4051f38dd66b · Curb Cut verdict inconclusive · local oracle fail

- [control recording](../../proof/heldout-v3/runs/dol-gov-tr2/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/dol-gov-tr2/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/dol-gov-tr2/control/d2be3bb7-ee38-4875-a65d-a9efbe8d3dca.evidence) · Kane session 99cca2f3-749d-41a1-98a8-2ab78aa9d888 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/dol-gov-tr2/attempt-1/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/dol-gov-tr2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/dol-gov-tr2/attempt-1/after/4d0a141b-1c14-423b-be20-1c9f02f04032.evidence) · Kane session daebfc1c-b797-45e2-a223-c3f94de253aa · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/dol-gov-tr2/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/dol-gov-tr2/attempt-1/provenance.json) · Failure session 25c40444-823c-4c61-8d28-4051f38dd66b

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#block-dolfootermenu-3 > section > span`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#block-dolfootermenu-3 > section > span` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#block-dolfootermenu-3 > section > span`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#block-dolfootermenu-3 > section > span`.

Verified 2026-11-23T05:54:57.391Z
