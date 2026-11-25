# www.forumotion.com

In Reading view, find the “Search forums” textbox and type test without submitting.

**Persona** screen-reader-view

**Observed barrier** Reading view names the directory search textbox “Search for a forum in the directory,” so it cannot be found by the expected name “Search forums.”

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/before/ff8d90ba-c735-441c-8a44-73f400747f3d.evidence) · Kane session 0ada2477-e9ac-4abc-9f53-1a19a06596e3 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/control/47de466c-9cb9-41b8-9a8d-f7fcb129aa8f.evidence) · Kane session 86f34519-b230-4ce5-b583-11f73a873119 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/after/11159d5d-9223-4b88-8608-c8f4e04d378e.evidence) · Kane session 414f52f7-1fdc-46bc-93dd-dfcfd5430303 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-fcff2ddd132fff0edeae/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-fcff2ddd132fff0edeae/provenance.json) · [Frozen catalog candidate](../../patches/v5-fcff2ddd132fff0edeae/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-fcff2ddd132fff0edeae/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#search > div > div:nth-of-type(1) > div > form > div > input` with value `Search forums`.

Verified 2026-11-24T11:02:16.375Z
