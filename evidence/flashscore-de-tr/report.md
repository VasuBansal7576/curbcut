# www.flashscore.de

At 320 CSS pixels, read the passage beginning “U17 Weltmeisterschaft 2026 Fussball Live Ergebnisse, Aktuelle Fussball Ergebnisse, Bundesliga, Champions”. Verify the complete passage fits within the visible width using vertical scrolling only.

**Persona** low-vision

**Observed barrier** The heading uses white-space: nowrap, so its text spans 619 CSS pixels inside a 320-pixel container and requires horizontal scrolling.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/flashscore-de-tr/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/flashscore-de-tr/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/flashscore-de-tr/before/0aee9f28-855f-4e01-9f76-2b772e3834b9.evidence) · Kane session 5ae1d6ea-b3ce-414a-9435-509999296cd2 · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v3/runs/flashscore-de-tr/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/flashscore-de-tr/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/flashscore-de-tr/control/17cee09c-bb3d-4a34-9061-6d9023df492b.evidence) · Kane session 97e62f2a-2358-45d2-8831-ba52d60213cd · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/flashscore-de-tr/attempt-1/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/flashscore-de-tr/attempt-1/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/flashscore-de-tr/attempt-1/after/9046082b-a906-4965-8a21-695ad5eff220.evidence) · Kane session bf0fe7a7-3883-41b0-b79d-4d060cbd5867 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/flashscore-de-tr/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/flashscore-de-tr/attempt-1/provenance.json) · Failure session 5ae1d6ea-b3ce-414a-9435-509999296cd2

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `div:nth-of-type(3) > div:nth-of-type(1) > div > h1` with `white-space: normal`.

Verified 2026-11-23T05:23:23.274Z
