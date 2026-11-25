# www.sfmta.com

Assert that the visible Play/Pause control for the homepage carousel is keyboard focusable. Activate it with Tab and Enter to pause the carousel. Verify the control reports aria-pressed false.

**Persona** keyboard-only

**Observed barrier** The visible carousel Play/Pause control is a span with a button role and tabIndex -1, so Tab skips it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/before/recording.mp4) · [Run result](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/before/result.json) · [Kane evidence pack](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/before/3b5e6f66-7626-44b1-bef3-48d6dbe844e0.evidence) · Kane session cf5ef348-c917-42a8-88c6-a12b55a51dc1 · Curb Cut verdict fail

- [control recording](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/control/recording.mp4) · [Run result](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/control/result.json) · [Kane evidence pack](../../proof/kane/sfmta-pause-carousel/2026-11-21T19-54-37.487Z/control/7c5fe133-eb4c-4cf0-bff1-2ab865b3096f.evidence) · Kane session e8c80f58-6d81-4087-888d-496ad11882f7 · Curb Cut verdict pass

- [after recording](../../proof/kane/sfmta-pause-carousel/resume-2026-11-22T03-37-05.332Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/sfmta-pause-carousel/resume-2026-11-22T03-37-05.332Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/sfmta-pause-carousel/resume-2026-11-22T03-37-05.332Z/attempt-1/after/81bb2177-b414-42de-b8be-0cc6127af58a.evidence) · Kane session 19b9337d-a774-4d11-81ed-a96824e48fd0 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/sfmta-pause-carousel/resume-2026-11-22T03-37-05.332Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/sfmta-pause-carousel/resume-2026-11-22T03-37-05.332Z/attempt-1/provenance.json) · Failure session cf5ef348-c917-42a8-88c6-a12b55a51dc1

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `span.play_pause`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `span.play_pause`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `span.play_pause`.

Verified 2026-11-22T03:40:14.102Z
