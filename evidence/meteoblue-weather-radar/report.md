# www.meteoblue.com

First assert the Weather Radar option in Popular Maps is in sequential keyboard focus order. If a consent dialog appears, use Manage options and Confirm choices. Select Weather Radar with Tab and Enter. Verify the map switches to Weather Radar.

**Persona** keyboard-only

**Observed barrier** The clickable Weather Radar option in Popular Maps is a div with tabIndex -1, so Tab skips it and keyboard users cannot reach it to activate it with Enter.

**Patch status** retired

## Recorded runs

- [before recording](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/before/recording.mp4) · [Run result](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/before/result.json) · [Kane evidence pack](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/before/b84c5a2c-a464-4ec3-a3d2-b80b9417334d.evidence) · Kane session 876f1634-e477-45e8-8197-960a5ab82c67 · Curb Cut verdict fail

- [control recording](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/control/recording.mp4) · [Run result](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/control/result.json) · [Kane evidence pack](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-40-19.199Z/control/043a7c80-6dda-4934-a570-dc0a270bde78.evidence) · Kane session 4bcad883-d37b-44d5-8d96-d56e33bf76b1 · Curb Cut verdict pass

- [after recording](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-47-55.923Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-47-55.923Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-47-55.923Z/attempt-1/after/531bfd9e-5744-47ef-a660-f370748e6695.evidence) · Kane session f6e2e4e0-3e20-45b9-b1ce-5339af098e51 · Curb Cut verdict pass

- [Local regression and retirement](../../proof/reliability/nightly.json) · Tab traversal did not reach the target.

[Runtime repair proposal](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-47-55.923Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/meteoblue-weather-radar/resume-2026-11-22T03-47-55.923Z/attempt-1/provenance.json) · Failure session 876f1634-e477-45e8-8197-960a5ab82c67

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `[data-map-id="radar"]`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `[data-map-id="radar"]` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `[data-map-id="radar"]`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `[data-map-id="radar"]`.

Verified 2026-11-22T03:50:08.127Z
