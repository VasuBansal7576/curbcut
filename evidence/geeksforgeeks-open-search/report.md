# www.geeksforgeeks.org

First assert the search icon in the homepage header is in sequential keyboard focus order. Use Tab and Enter to open the site search. Verify the Search text box is visible.

**Persona** keyboard-only

**Observed barrier** The header search toggle is a span with tabIndex -1, so Tab skips it.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/geeksforgeeks-open-search/2026-11-22T11-06-33.087Z/before/recording.mp4) · [Run result](../../proof/kane/geeksforgeeks-open-search/2026-11-22T11-06-33.087Z/before/result.json) · [Kane evidence pack](../../proof/kane/geeksforgeeks-open-search/2026-11-22T11-06-33.087Z/before/b84f79dd-4166-4f6d-8d8e-1876a611b576.evidence) · Kane session be57692b-7d07-4262-b4b8-faa6f3ecbf02 · Kane verdict fail

- [control recording](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/control/recording.mp4) · [Run result](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/control/result.json) · [Kane evidence pack](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/control/a3656253-4a3f-44c6-a75a-4f696c63d13d.evidence) · Kane session 4cb865bf-3f65-433d-b457-e48e75862893 · Kane verdict pass

- [after recording](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/attempt-1/after/f0dfa649-dc54-4aef-bb8b-4b9d94ca2184.evidence) · Kane session 9ce17c2d-6422-4fc6-83ed-e23b8b0a8a89 · Kane verdict pass

[Runtime repair proposal](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/geeksforgeeks-open-search/resume-2026-11-22T03-40-55.719Z/attempt-1/provenance.json) · Failure session 53fedd9d-0cf3-4b93-a04b-71c5da1b81e4

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `.gs-toggle-icon`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `.gs-toggle-icon` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `.gs-toggle-icon`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `.gs-toggle-icon`.

Verified 2026-11-22T03:43:23.669Z
