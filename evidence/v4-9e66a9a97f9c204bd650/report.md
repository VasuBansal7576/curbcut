# thewire.in

In Reading view, find the “Search news” searchbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The search input has a searchbox role but no accessible name, so screen-reader users cannot find it as “Search news” in Reading view.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/before/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/before/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/before/7e6c492f-2185-4278-96e8-9a5cf2d222a0.evidence) · Kane session e9a1e039-0a93-441d-9723-6321a487f0fd · Curb Cut verdict fail · Kane reported pass · local oracle fail

- [control recording](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/control/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/control/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/control/69f1dbe4-74ee-4e7e-aeeb-3fc4553048e8.evidence) · Kane session 32d6fafe-b39b-4710-8dc8-93c25abe54c6 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/after/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/after/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v4-9e66a9a97f9c204bd650/after/5870c4bb-8ca0-42fe-8b6e-04424b5165a8.evidence) · Kane session a475a547-48df-4317-976a-60de27b2f798 · Curb Cut verdict pass · local oracle pass

[Locally verified proposal](../../proof/hard-v4/local/v4-9e66a9a97f9c204bd650/attempt-1/candidate.json) · [Batch ledger](../../proof/kane-batch-2026-11-25/README.md)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#root > div > div > div:nth-of-type(1) > div > div:nth-of-type(1) > div > div:nth-of-type(2) > div > ul > li:nth-of-type(1) > div > div > input` with value `Search news`.

Verified 2026-11-25T15:14:04.337Z
