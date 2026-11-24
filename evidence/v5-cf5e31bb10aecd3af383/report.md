# uindex.org

In Reading view, find the “Search torrents...” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The native textbox #search has no accessible name, so it cannot be found by its expected name in Reading view.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/before/412921e1-8c78-4770-b427-1938672a6e4c.evidence) · Kane session 595e3b5c-7a24-4d04-9552-e1b1b54e0cda · Kane verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/control/0a4a6922-46fa-4c14-8449-016059fe8695.evidence) · Kane session efcd7807-9b36-4519-80cc-ec808f2f9ea5 · Kane verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/after/3c1acdd6-4a9e-4308-aaf4-1d02d3601e02.evidence) · Kane session 3607af22-d90d-4865-8df7-cc19d3fdeb86 · Kane verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-cf5e31bb10aecd3af383/attempt-2/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-cf5e31bb10aecd3af383/provenance.json) · [Frozen catalog candidate](../../patches/v5-cf5e31bb10aecd3af383/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-cf5e31bb10aecd3af383/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#searchform > input#search` with value `Search torrents...`.

Verified 2026-11-24T11:21:07.030Z
