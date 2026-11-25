# www.fourmilab.ch

In Reading view, first assert that the exact row ‘textbox · Latitude’ is present. Set that textbox to 10 and press Tab to commit the change. Verify its value is 10 and the ‘radio · Lat: · checked’ row confirms custom latitude mode. Stop at that selection without using Update.

**Persona** screen-reader-view

**Observed barrier** The latitude textbox has no accessible name, so Reading view cannot display the exact row ‘textbox · Latitude’.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/before/recording.mp4) · [Run result](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/before/result.json) · [Kane evidence pack](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/before/fd665dd9-9127-43d4-9692-3b7c1f9708b5.evidence) · Kane session b34808ae-3ab2-4eda-aab8-8a1a588d7897 · Curb Cut verdict fail

- [control recording](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/control/recording.mp4) · [Run result](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/control/result.json) · [Kane evidence pack](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/control/ad1cf255-f96c-4b05-a902-42da7e9f663a.evidence) · Kane session 592a6158-2060-420c-89cd-eac2d4b8adf7 · Curb Cut verdict pass

- [after recording](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/attempt-1/after/60e35721-0238-444d-a916-4c3c468d71c7.evidence) · Kane session e2bdbf3a-68fe-4e00-ad0a-aca05fd75b00 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/fourmilab-prepare-latitude/2026-11-21T19-50-18.388Z/attempt-1/provenance.json) · Failure session b34808ae-3ab2-4eda-aab8-8a1a588d7897

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `input[name="lat"]` with value `Latitude`.

Verified 2026-11-21T19:53:12.452Z
