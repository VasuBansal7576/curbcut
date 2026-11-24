# poets.org

In Reading view, locate the searchbox named “search”. Enter the text test and confirm the field contains it. Do not submit.

**Persona** screen-reader-view

**Observed barrier** The Reading view searchbox has an empty accessible name despite displaying the placeholder “search”.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/poets-org-tr2/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/poets-org-tr2/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/poets-org-tr2/before/72fd6177-14ae-4f1a-8d27-b9070a3bb04d.evidence) · Kane session a6039b7a-2d1d-40c2-91b1-04593fcbd871 · Kane verdict fail · local oracle fail

- [control recording](../../proof/heldout-v3/runs/poets-org-tr2/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/poets-org-tr2/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/poets-org-tr2/control/0c96063e-d6a3-43a3-99f8-2a8859422aea.evidence) · Kane session f773f524-c19a-4b56-bd9f-16289c00a68d · Kane verdict pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/poets-org-tr2/attempt-1/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/poets-org-tr2/attempt-1/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/poets-org-tr2/attempt-1/after/7ba378a8-faab-41d4-bf49-8ed10cb21a2f.evidence) · Kane session 68fac404-263b-461c-b97f-c4aae40f2fe5 · Kane verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/poets-org-tr2/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/poets-org-tr2/attempt-1/provenance.json) · Failure session a6039b7a-2d1d-40c2-91b1-04593fcbd871

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `input[placeholder="search"]` with value `search`.

Verified 2026-11-23T05:28:23.772Z
