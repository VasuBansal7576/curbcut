# www.facer.io

In Reading view, find the “Search watch faces” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The desktop search input has a native textbox role but no accessible name, so it cannot be found as “Search watch faces” in Reading view.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/before/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/before/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/before/7e91ecc6-ceec-470a-b052-267efb5576b0.evidence) · Kane session de70cceb-6d00-46fc-9891-29dbf859664e · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/control/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/control/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/control/663e3103-a7e5-434f-9083-4cc6244d6f7e.evidence) · Kane session 75e4063d-1176-4773-897e-dc9cb5702c95 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/after/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/after/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-987edaaf216b0e19b87b/after/d0789d66-08d8-49df-95c7-9a56356814ac.evidence) · Kane session 5e3b5b6d-cb67-43eb-8979-02f41bb71449 · Curb Cut verdict pass · local oracle pass

[Locally verified proposal](../../proof/heldout-v5/local/v5-987edaaf216b0e19b87b/attempt-1/candidate.json) · [Batch ledger](../../proof/kane-batch-2026-11-25/README.md)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `nav.app-header--desktop #searchWatchfaces input#srch-term` with value `Search watch faces`.

Verified 2026-11-25T14:42:35.930Z
