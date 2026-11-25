# webhook.site

In Reading view, find the “Search Query” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The search textarea has the native textbox role but no accessible name, so Reading view cannot identify it as Search Query.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/before/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/before/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/before/1b9647a4-bb39-4c73-ad19-052e0c62082d.evidence) · Kane session 8ce0e552-c583-4bdd-af50-1d3c4370602d · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/control/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/control/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/control/f05292d2-bfc2-4961-9fec-0ee2d403a36f.evidence) · Kane session ceb33db9-9dcf-484a-bc2a-5ec7f65515ca · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/after/recording.mp4) · [Run result](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/after/result.json) · [Kane evidence pack](../../proof/kane-batch-2026-11-25/runs/v5-a9df85261cf0d47ce083/after/23d8a4ab-73c3-451a-84f5-6e4b50cf1709.evidence) · Kane session 5453eaa2-7f09-4a8e-8346-1e149ca9cb28 · Curb Cut verdict pass · local oracle pass

[Locally verified proposal](../../proof/heldout-v5/local/v5-a9df85261cf0d47ce083/attempt-1/candidate.json) · [Batch ledger](../../proof/kane-batch-2026-11-25/README.md)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#search-input` with value `Search Query`.

Verified 2026-11-25T14:35:06.493Z
