# www.calculator.net

In Reading view, first assert that the exact row ‘textbox · Days to add’ is present. Set that textbox to 2 in Add to or Subtract from a Date. Activate the Calculate control for that section, then verify the displayed date is two days after the start date.

**Persona** screen-reader-view

**Observed barrier** The #c2day textbox has no accessible name, so Reading view cannot identify it as “Days to add.”

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/before/recording.mp4) · [Run result](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/before/result.json) · [Kane evidence pack](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/before/c1426ee2-59fc-4ba8-85c5-4b49d2888f36.evidence) · Kane session dd3fe745-35dd-47e6-a38e-d7e932cbfdf6 · Curb Cut verdict fail

- [control recording](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/control/recording.mp4) · [Run result](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/control/result.json) · [Kane evidence pack](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/control/3ae0c479-b0ac-4a81-bab2-2f7241e4f77f.evidence) · Kane session 1f663588-b62e-4cb3-9e7d-1a63e38af852 · Curb Cut verdict pass

- [after recording](../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/after/3065ea7f-7d8e-4bc6-ad7d-539fa2224dfc.evidence) · Kane session 15e8f204-b925-455f-bb0d-62d41867f890 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/calculator-net-add-days/2026-11-21T19-46-40.781Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/calculator-net-add-days/runtime-replay/attempt-1/provenance.json) · Failure session dd3fe745-35dd-47e6-a38e-d7e932cbfdf6

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#c2day` with value `Days to add`.

Verified 2026-11-21T19:58:32.722Z
