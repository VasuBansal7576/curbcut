# www.kidderminster.ac.uk

First assert the FAQ disclosure What is a next of kin? is in the sequential keyboard focus order. Open it with Tab and Enter. Verify the answer beginning A next of kin is a relative is visible. Stay on the public information page.

**Persona** keyboard-only

**Observed barrier** The clickable div for “What is a next of kin?” has tabIndex -1, so Tab skips the disclosure.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/kidderminster-application-faq/2026-11-22T10-44-57.576Z/recheck-without/recording.mp4) · [Run result](../../proof/kane/kidderminster-application-faq/2026-11-22T10-44-57.576Z/recheck-without/result.json) · [Kane evidence pack](../../proof/kane/kidderminster-application-faq/2026-11-22T10-44-57.576Z/recheck-without/dc7f8be3-c8b2-4f29-b64f-962cb0f7b83b.evidence) · Kane session f2b2fda5-445b-42c9-999e-0bcbd292de0a · Curb Cut verdict fail

- [control recording](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-32-20.479Z/control/recording.mp4) · [Run result](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-32-20.479Z/control/result.json) · [Kane evidence pack](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-32-20.479Z/control/d26af1d7-60c2-4ff5-988e-a33c21d89344.evidence) · Kane session ba03fd24-2603-4a12-9f89-cdd58b382d0d · Curb Cut verdict pass

- [after recording](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-36-30.188Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-36-30.188Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-36-30.188Z/attempt-1/after/30bf4963-7a78-4902-93d7-d2d388fa8477.evidence) · Kane session 6f5385b0-d658-4193-af58-1302492f8a10 · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-36-30.188Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/kidderminster-application-faq/resume-2026-11-22T03-36-30.188Z/attempt-1/provenance.json) · Failure session 746a0a2b-5612-42be-b9e5-83b59eb02de9

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `div.m-expand__trigger[aria-controls="expand-f28d3621-47c4-495b-8993-bd8210e37d66"] > .m-expand-header`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `div.m-expand__trigger[aria-controls="expand-f28d3621-47c4-495b-8993-bd8210e37d66"] > .m-expand-header` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `div.m-expand__trigger[aria-controls="expand-f28d3621-47c4-495b-8993-bd8210e37d66"] > .m-expand-header`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `div.m-expand__trigger[aria-controls="expand-f28d3621-47c4-495b-8993-bd8210e37d66"] > .m-expand-header`.

Verified 2026-11-22T03:39:25.809Z
