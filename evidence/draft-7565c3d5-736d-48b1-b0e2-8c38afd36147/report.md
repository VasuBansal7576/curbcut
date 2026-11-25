# map.openseamap.org

Use Tab to focus the View menu in the map toolbar. Verify the Sea Marks layer checkbox appears while View has focus. Leave the checkbox unchanged.

**Persona** keyboard-only

**Observed barrier** View toolbar item is a non-focusable li whose submenu opens only via CSS :hover (.menu li:hover > ul { display:block }), so Tab never reaches it and Sea Marks stays hidden

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/before/recording.mp4) · [Run result](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/before/result.json) · [Kane evidence pack](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/before/fccd145e-025e-491a-bbcf-8f4c86a87aca.evidence) · Kane session 700b66b7-5292-4f62-a065-f68e422ce5ea · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/control/recording.mp4) · [Run result](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/control/result.json) · [Kane evidence pack](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/control/94a8863a-cf65-4076-a98a-67d33ba6cb1f.evidence) · Kane session 7168aa29-00c7-4051-8f07-5ef30704757e · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after/92c3edec-40c8-463b-8b87-e6464139203e.evidence) · Kane session 006b53ce-69e2-485b-88a9-612d56890d6f · Curb Cut verdict pass · [Trace recheck](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after/trace-review.json) · Original Curb Cut outcome inconclusive · local oracle pass

[Local failure](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/local/before.json) · [Local replay](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/local/attempt-1/after.json) · [Repair provenance](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/provenance.json) · [Agent proposal](../../proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/local/attempt-1/candidate.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#topmenu > ul > li:has(> img[alt="view"])`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#topmenu > ul > li:has(> img[alt="view"])` with value `button`.

- 2.1.1 Keyboard — Expose the submenu to keyboard focus as well as pointer hover. Target `#topmenu > ul > li:has(> img[alt="view"])`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#topmenu > ul > li:has(> img[alt="view"])`.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#topmenu > ul > li:has(> img[alt="view"])` with value `View`.

Verified 2026-11-25T06:49:55.659Z
