# esim.holafly.com

Focus “Countries”, move once with ArrowRight, activate “Regions” and read its panel.

**Persona** keyboard-only

**Observed barrier** ArrowRight from Countries does not move focus to Regions, and Regions has tabindex="-1", so Tab skips it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/before/6d534fe9-bacf-4b96-9e28-10b97c6a96e2.evidence) · Kane session ce28867a-857f-40fd-a13e-931e617917a3 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/control/269b55b6-df5c-4a43-be0b-275a83e3093f.evidence) · Kane session 56947950-3912-48c0-b7b0-5b834b0fcb9e · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/after/46ecaa02-5a65-4a90-8297-c108ca4f81fe.evidence) · Kane session 92ff5286-3610-4bbf-8b87-89ae677bfea1 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-b3a020e9a510-2d198473/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/provenance.json) · [Frozen catalog candidate](../../patches/v5-b3a020e9a510-2d198473/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-b3a020e9a510-2d198473/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Implement keyboard navigation among the widget controls. Target `#Destinations .destinations__segmented [role="tablist"]`.

Verified 2026-11-24T12:10:12.616Z
