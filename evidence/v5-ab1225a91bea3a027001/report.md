# rtmark.net

At 320 CSS pixels, read the passage beginning “This Privacy Statement presents our privacy policy, including our privacy practices. Below” and confirm it fits without horizontal scrolling.

**Persona** low-vision

**Observed barrier** At a 320 CSS pixel viewport, the body's 900px minimum width keeps the wrapper 900px wide and the privacy passage 585px wide, leaving part of the text outside the visible area.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/before/a6f007cd-24e3-403b-b860-06b701439fc2.evidence) · Kane session 8ffd095e-08a0-4153-8e01-304acbc3a42a · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/control/32b68437-2374-4a10-9ae5-03a630a0f33b.evidence) · Kane session c0c9745b-78ca-47e9-ae84-6bf48ac00f0d · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/after/28a8c2df-f75a-420e-b49b-2b4eece740df.evidence) · Kane session 5cbe80a2-5c41-468b-b408-c1e931b77ca4 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-ab1225a91bea3a027001/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-ab1225a91bea3a027001/provenance.json) · [Frozen catalog candidate](../../patches/v5-ab1225a91bea3a027001/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-ab1225a91bea3a027001/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `body` with `min-width: 0`.

- 1.4.10 Reflow — Review the source stylesheet at `body > div.wrapper` with `max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `body > div.wrapper > div.main_column` with `max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere`.

Verified 2026-11-24T11:05:09.374Z
