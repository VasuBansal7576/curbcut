# gs.statcounter.com

Assert that the Edit Chart Data control below the main chart is keyboard focusable. Open it using the keyboard and verify the chart settings form shows the Region selector.

**Persona** keyboard-only

**Observed barrier** The snapshot exposes Edit Chart Data as text with tabIndex -1, leaving it out of the keyboard tab order.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/statcounter-edit-chart/2026-11-22T10-51-35.095Z/recheck-without/recording.mp4) · [Run result](../../proof/kane/statcounter-edit-chart/2026-11-22T10-51-35.095Z/recheck-without/result.json) · [Kane evidence pack](../../proof/kane/statcounter-edit-chart/2026-11-22T10-51-35.095Z/recheck-without/ee086f3e-d852-4836-9650-57273af0c8fb.evidence) · Kane session f55589b9-3c10-473c-ad12-810a1318a2a0 · Kane verdict fail

- [control recording](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-30-36.444Z/control/recording.mp4) · [Run result](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-30-36.444Z/control/result.json) · [Kane evidence pack](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-30-36.444Z/control/a53187df-9456-4797-b2b6-f8aab2ccddf9.evidence) · Kane session 3440409a-ddc0-4aab-8970-c15388c4ef01 · Kane verdict pass

- [after recording](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-34-12.618Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-34-12.618Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-34-12.618Z/attempt-1/after/ad3a5001-1368-40e4-b647-442f5887ba14.evidence) · Kane session f48152cc-02a0-4c6b-bb2c-baac48869a75 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-34-12.618Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/statcounter-edit-chart/resume-2026-11-22T03-34-12.618Z/attempt-1/provenance.json) · Failure session 795097ec-b1b1-4511-9a13-2f68c5fa359b

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#btn-edit-chart`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#btn-edit-chart` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#btn-edit-chart`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#btn-edit-chart`.

Verified 2026-11-22T03:35:35.039Z
