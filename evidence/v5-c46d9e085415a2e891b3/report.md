# rekhta.org

In Reading view, find the “Find Meaning...” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The dictionary input has a native textbox role but an empty accessible name, so it cannot be found as “Find Meaning...” in Reading view.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/before/b8579ebf-d8ee-45a5-b557-2dba5cf8b6f8.evidence) · Kane session 1150c058-a8c7-404c-8589-4f8551757234 · Kane verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/control/05a39d6b-6e4d-4716-a3d2-e49ab46f1e07.evidence) · Kane session 4b370e20-4899-4231-bfb3-b90a81b525fe · Kane verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/after/6cff9827-d146-490a-95a0-0eb4a80339b2.evidence) · Kane session bf0e29ab-2c28-4402-9c3d-107e1d24608a · Kane verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-c46d9e085415a2e891b3/attempt-2/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-c46d9e085415a2e891b3/provenance.json) · [Frozen catalog candidate](../../patches/v5-c46d9e085415a2e891b3/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-c46d9e085415a2e891b3/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#dictSearchText` with value `Find Meaning...`.

Verified 2026-11-24T11:07:29.569Z
