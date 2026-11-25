# www.discuz.vip

Use Tab and Enter to reach and activate “更多解决方案请联系官方客服进行交流。”. Verify its content becomes visible.

**Persona** keyboard-only

**Observed barrier** The exact target is a text span with no tabindex, so Tab skips it. The prior repair made its parent anchor focusable.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v3/runs/discuz-vip-tr2/before/recording.mp4) · [Run result](../../proof/heldout-v3/runs/discuz-vip-tr2/before/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/discuz-vip-tr2/before/4066b1f5-f548-4773-b3ac-33d151ffc4e8.evidence) · Kane session 8287f79a-9102-4626-928a-d06f3fc0a4f5 · Curb Cut verdict inconclusive · Kane reported fail · local oracle fail

- [control recording](../../proof/heldout-v3/runs/discuz-vip-tr2/control/recording.mp4) · [Run result](../../proof/heldout-v3/runs/discuz-vip-tr2/control/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/discuz-vip-tr2/control/ee8bff5e-21cb-43be-8fd7-ab2c2b0a8c21.evidence) · Kane session 75bb431b-9b2d-42dd-a23a-35040a4badb6 · Curb Cut verdict fail · Kane reported pass · local oracle pass

- [after recording](../../proof/heldout-v3/runs/discuz-vip-tr2/attempt-2/after/recording.mp4) · [Run result](../../proof/heldout-v3/runs/discuz-vip-tr2/attempt-2/after/result.json) · [Kane evidence pack](../../proof/heldout-v3/runs/discuz-vip-tr2/attempt-2/after/64a4c71d-dc5e-4d99-b4e3-d404af762ad1.evidence) · Kane session cec6d56f-3783-4140-90f6-24007d32438a · Curb Cut verdict pass · local oracle pass

[Runtime repair proposal](../../proof/heldout-v3/runs/discuz-vip-tr2/attempt-2/candidate.json) · [Repair provenance](../../proof/heldout-v3/runs/discuz-vip-tr2/attempt-2/provenance.json) · Failure session 8287f79a-9102-4626-928a-d06f3fc0a4f5

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#gaoyanzhi_3__plans > div > div > p > a > span`.

- 4.1.2 Name, Role, Value — Choose a semantic HTML element matching the interaction. Target `#gaoyanzhi_3__plans > div > div > p > a > span` with value `button`.

- 2.1.1 Keyboard — Prefer a native button with built-in keyboard activation. Target `#gaoyanzhi_3__plans > div > div > p > a > span`.

- 2.4.7 Focus Visible — Style :focus-visible with a clearly visible outline. Target `#gaoyanzhi_3__plans > div > div > p > a > span`.

Verified 2026-11-23T05:39:36.180Z
