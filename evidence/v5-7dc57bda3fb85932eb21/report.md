# trackjs.com

At 320 CSS pixels, read the passage beginning “Shipping AI code is fast. Debugging it without context is hard. TrackJS” and confirm it fits without horizontal scrolling.

**Persona** low-vision

**Observed barrier** At 320 CSS pixels, the body's 375px minimum width and the containers' 345px minimum width keep the hero paragraph's right edge at 360px, beyond the visible viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/before/f29d37a6-ca83-4a30-ba06-a826b7a632e8.evidence) · Kane session 6a82cb5b-ad5a-40bd-8b19-8b4e34c87122 · Kane verdict fail · local oracle fail

- [control recording](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/control/61aa545c-782c-48aa-8f99-1afd4ef2b2c5.evidence) · Kane session 6d083a4c-7ad8-423f-a8de-a0954f7c944b · Kane verdict pass · local oracle pass

- [after recording](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/after/3161164f-9c7d-48b1-b1bf-df7f2d7ee4c5.evidence) · Kane session 0b89ade8-fc09-4169-9cfc-c8294fb0eed0 · Kane verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-7dc57bda3fb85932eb21/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane-sample-20/v5-7dc57bda3fb85932eb21/provenance.json) · [Frozen catalog candidate](../../patches/v5-7dc57bda3fb85932eb21/candidate.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-7dc57bda3fb85932eb21/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `body.product.index, body.product.index div.container` with `min-width: 0`.

Verified 2026-11-24T11:52:53.711Z
