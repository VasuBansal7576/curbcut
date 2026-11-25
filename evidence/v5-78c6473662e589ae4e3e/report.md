# lawphil.net

At 320 CSS pixels, read the passage beginning “About Us Contact Us Acceptable Use Policy Disclaimer Privacy Notice Copyright Notice” and confirm it fits without horizontal scrolling.

**Persona** low-vision

**Observed barrier** The footer paragraph inherits a 518-pixel width from its table cell. At 320 CSS pixels, horizontal clipping cuts off the links that extend past the viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/before/0da291d1-6de8-47ae-a7dd-850a139b3f46.evidence) · Kane session 28e33cf5-904c-4e22-b54d-7373706242bd · Curb Cut verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/control/abaa5a18-6275-4f81-9ef2-7382c0ecdfeb.evidence) · Kane session 545cbf49-75ae-4ec5-8b51-119942feb3a3 · Curb Cut verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/after/0367de78-4866-499c-8bce-275ffc4df071.evidence) · Kane session e149aa26-ec26-40d4-9329-2a2c348462f5 · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-78c6473662e589ae4e3e/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-78c6473662e589ae4e3e/provenance.json) · [Frozen catalog candidate](../../patches/v5-78c6473662e589ae4e3e/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-78c6473662e589ae4e3e/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `center > table:nth-of-type(2) > tbody > tr:nth-of-type(7) > td:nth-of-type(1) > p` with `max-width: 100%; width: auto; white-space: normal; overflow-wrap: anywhere`.

- 1.4.10 Reflow — Review the source stylesheet at `center > table:nth-of-type(2)` with `display: block; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `center > table:nth-of-type(2) > tbody, center > table:nth-of-type(2) > tbody > tr:nth-of-type(7), center > table:nth-of-type(2) > tbody > tr:nth-of-type(7) > td` with `display: block; width: auto; max-width: 100%; box-sizing: border-box`.

Verified 2026-11-24T11:49:48.682Z
