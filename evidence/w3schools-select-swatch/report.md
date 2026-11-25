# www.w3schools.com

First assert that the leftmost swatch in the top row of the color map, labeled #003366, has a link destination or an explicit tabindex of 0. Select that swatch with Tab and Enter, and verify the selected color reads #003366.

**Persona** keyboard-only

**Observed barrier** The #003366 image-map area has no link destination or explicit tabindex and is exposed as unnamed text. The consent dialog holds focus, so keyboard activation could not be verified.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/before/recording.mp4) · [Run result](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/before/result.json) · [Kane evidence pack](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/before/4eb7c217-d773-4512-964f-141ea9d4dcdd.evidence) · Kane session 7666526b-ae9b-491c-8b07-5dffb0ed9f55 · Curb Cut verdict fail

- [control recording](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/control/recording.mp4) · [Run result](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/control/result.json) · [Kane evidence pack](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-44-36.344Z/control/5de24c54-e4f6-45f3-ae4e-3e081ce13666.evidence) · Kane session de5015b3-1e03-47aa-9b06-0bd09b66caf4 · Curb Cut verdict pass

- [after recording](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-51-28.359Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-51-28.359Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-51-28.359Z/attempt-1/after/69f7a987-900d-49dc-ae1d-183a4a7f6e61.evidence) · Kane session 7bb23ef6-4d42-4a5f-8364-49a462a58513 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-49-55.859Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/w3schools-select-swatch/resume-2026-11-22T03-51-28.359Z/attempt-1/provenance.json) · Failure session 7666526b-ae9b-491c-8b07-5dffb0ed9f55

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#colormap area[alt="#003366"]`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#colormap area[alt="#003366"]` with value `button`.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#colormap area[alt="#003366"]` with value `#003366`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#colormap area[alt="#003366"]`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#colormap area[alt="#003366"]`.

Verified 2026-11-22T03:53:09.774Z
