# www.shanghairanking.com

In Reading view, find the “Search for a university” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** The university search input has a native textbox role but no accessible name, so Reading view cannot identify it as “Search for a university”.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/before/b5446e89-8a5b-4711-8e21-48b1c1afe31e.evidence) · Kane session cbab0e05-ba35-4f4e-b2f6-9d32acc96367 · Curb Cut verdict fail · Kane reported pass · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/control/406c65c8-6a98-4161-893d-d011c8f61d85.evidence) · Kane session 184cc756-a913-47f9-85db-038144b8d2e5 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/after/0fd8d63f-b0a1-4cd9-a289-6665b8ab04c4.evidence) · Kane session 1b021df1-f46e-4a02-819e-a2711f92649e · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-da5c14f912fb3f74fbbb/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-da5c14f912fb3f74fbbb/provenance.json) · [Frozen catalog candidate](../../patches/v5-da5c14f912fb3f74fbbb/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-da5c14f912fb3f74fbbb/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `div.search-container > div.contain-wrap > div.input-box > div.input-wrap > input.input` with value `Search for a university`.

Verified 2026-11-24T12:18:46.370Z
