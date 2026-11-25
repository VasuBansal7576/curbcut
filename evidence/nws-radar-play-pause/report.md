# radar.weather.gov

Press Tab twice before making any accessibility assertion. Continue using Tab or Shift+Tab through the controls to reach Play in the radar animation timeline. Press Enter and verify the animation begins and the control changes to Pause.

**Persona** keyboard-only

**Observed barrier** The radar timeline’s Play control is a clickable div with a tabIndex of -1, so Tab and Shift+Tab skip it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/before/recording.mp4) · [Run result](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/before/result.json) · [Kane evidence pack](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/before/83a5bf7c-aeb3-4f2e-950d-7e960cc0863a.evidence) · Kane session 1eb14750-7d2e-42f0-82b6-022636b796f6 · Curb Cut verdict fail

- [control recording](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/control/recording.mp4) · [Run result](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/control/result.json) · [Kane evidence pack](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/control/c51f2fca-1f68-44cc-a07a-f53cfa74acee.evidence) · Kane session 6f3bfd87-2046-4189-8612-c67ab2b5cdf3 · Curb Cut verdict pass

- [after recording](../../proof/kane/nws-radar-play-pause/2026-11-22T11-04-37.984Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/nws-radar-play-pause/2026-11-22T11-04-37.984Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/nws-radar-play-pause/2026-11-22T11-04-37.984Z/attempt-1/after/b0be84b2-b325-415d-ab65-14a31a868735.evidence) · Kane session 4b4103c0-6910-4793-8935-e65ac74db402 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/nws-radar-play-pause/2026-11-22T11-04-37.984Z/attempt-1/provenance.json) · Failure session 1eb14750-7d2e-42f0-82b6-022636b796f6

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `.button.button-play`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `.button.button-play` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `.button.button-play`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `.button.button-play`.

Verified 2026-11-22T11:05:45.098Z
