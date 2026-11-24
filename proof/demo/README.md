# Demo runs for the hackathon film

Recorded 2026-11-24 against the Stillroom shop fixture on `http://127.0.0.1:4391/fixtures/shop/` (port 4391 so other agents on 4317 could not stop the server). Kane CLI 0.10.7. Agent backend `CURBCUT_AGENT=grok` (grok-4.5). Isolated headless Chromium with temp profiles. No login, payment, or account creation.

Starting Kane balance: **1981.1673**. Floor 1300, spend cap 500. Final balance after these runs: **1604.6401**. Credits used: **376.5272**.

The Claude Code Stop hook used for the gate shots ran the Kane path. The [portable Stop hook example](../../examples/claude/settings.json) runs the local path.

```
node curbcut.mjs gate --config proof/demo/gate/curbcut.gate.json
```

## 1. Closed loop (`curbcut check`)

Command:

```
CURBCUT_AGENT=grok node curbcut.mjs check http://127.0.0.1:4391/fixtures/shop/ "Search for headphones and add Field Headphones to the cart. Confirm Cart (1)."
```

Work directory: [proof/demo/check/2026-11-24T18-15-53.859Z](check/2026-11-24T18-15-53.859Z).

| Phase | Verdict | Kane session | Credits |
| --- | --- | --- | ---: |
| Local oracle | confirmed barrier | — | 0 |
| Kane before | fail | `f0760ff2-f04f-4de2-88b8-915b609b7e02` | 21.746745 |
| Grok proposal | candidate (`makeFocusable`, `setRole button`, `bindEnterToClick`, `restoreFocusOutline`) | — | 0 |
| Local replay | pass | — | 0 |
| Kane control | pass | `8987d2d8-c2c7-47b0-955a-1617d9c5327b` | 18.12928 |
| Kane after (attempt 1) | pass | `d942c3ca-79a9-4d2e-8c3b-0c7a18f5265b` | 30.005175 |

Attempt 1 passed. Kane did not fail a patched after-run, so there was no re-prompt. The first proposal was enough.

Publish then failed in `scripts/build-site.mjs` because the new evidence lived under `.curbcut/check/` rather than `proof/kane/`. The Kane loop itself was fail → control pass → after pass. The catalog patch was restored to the existing retired `keyboard-add-headphones` record.

Earlier attempts on this branch, kept as evidence:

- [2026-11-24T18-05-29.703Z](check/2026-11-24T18-05-29.703Z): Kane before fail `65f5fe0c-d95b-4aff-a77c-996b760c3a1a` (35.936875). Grok CLI aborted because `-p` / `--single` cannot be used with `--prompt-file`. `core/agent.mjs` now calls grok with `--prompt-file` only.
- [2026-11-24T18-09-54.850Z](check/2026-11-24T18-09-54.850Z): Grok proposed; Kane after had no sealed pack; after-retry was `ERR_CONNECTION_REFUSED` after another agent stopped the 4317 server. Not a product verdict.

## 2. Gate in a coding agent (`curbcut gate`)

Config: [proof/demo/gate/curbcut.gate.json](gate/curbcut.gate.json). One keyboard-only task, Kane path, not `--local`.

FAIL, unfixed source ([proof/demo/gate/fail/2026-11-24T18-22-04.735Z](gate/fail/2026-11-24T18-22-04.735Z)):

```
gate failed  1 cases, 1 failed

FAIL  keyboard-only  Search for headphones and add Field Headphones to the cart. Confirm Cart (1).
reason: Forward and reverse Tab traversal skipped the visible Field Headphones Add to cart control.
dom:
  div.add-to-cart · div · text · Add to cart · tabIndex=-1
```

Kane session `2f63df68-fe0f-47b5-8f34-918444b55049`, 29.1596875 credits.

Source fix, as a coding agent would: replace the Field Headphones `div.add-to-cart` with `<button type="button" class="add-to-cart">Add to cart</button>`. The derived observed selector was also `.add-to-cart` so the harness still sees the control after the tag change.

PASS ([proof/demo/gate/pass/2026-11-24T18-26-52.780Z](gate/pass/2026-11-24T18-26-52.780Z)):

```
gate passed  1 cases, 0 failed

PASS  keyboard-only  Search for headphones and add Field Headphones to the cart. Confirm Cart (1).
```

Kane session `2d512cc4-756e-4a96-bcfb-bec5ea33773a`, 32.6225825 credits.

One intermediate Kane run after the source fix was `inconclusive` (`keyboard-target-action-unproven`, session `369a9e32-6c85-426c-bc57-b423e0267163`) while the observed selector was still `div.add-to-cart`. Kept under [gate/pass-attempt-1](gate/pass-attempt-1/2026-11-24T18-24-40.217Z). The fixture source was restored after the passing gate.

## 3. Retirement

Bundled `keyboard-add-headphones` rules were set `verified` and pointed at the 4391 shop. The fixture server was restarted with `CURBCUT_FIXTURE_NATIVE=1` (site-fixed-itself mode). Then:

```
node curbcut.mjs recheck keyboard-add-headphones
```

First unpatched Kane run was inconclusive (`agent_error.child_failed`, session `ef41e65c-8638-4a96-bc8a-a71066ebc918`). Retry:

```
[recheck] keyboard-add-headphones · retired
```

Kane session `0c6e7186-06cc-4a75-8744-dbf3c5be066b`. Unpatched persona `pass`. Evidence: [proof/demo/retire](retire/) and `proof/kane/keyboard-add-headphones/2026-11-24T18-31-28.235Z/recheck-without/`. The catalog patch was restored to the original retired 4317 record after the demo.

## Footage

1920×1080 30 fps, durations from `t3/curb-cut-design-directions:launch/film/pending.json`. Mapping: [launch/footage/manifest.json](../../launch/footage/manifest.json).

| Slot | Terminal | Kane recordings |
| --- | --- | --- |
| check (12 s) | `launch/footage/check.mp4` | before, control, after |
| gate (11 s) | `launch/footage/gate.mp4` | fail, pass |
| retire (8 s) | `launch/footage/retire.mp4` | unpatched recheck |

Terminal lines are the real commands, Kane phase fields, and CLI stdout from these runs. Timing is compressed.

## Credits

| Run | Credits |
| --- | ---: |
| Check (successful loop) | 69.8812 |
| Gate FAIL | 29.1597 |
| Gate PASS | 32.6226 |
| Retirement (pass) | 19.78469 |
| Retirement (first inconclusive) | 20.70665 |
| Earlier interrupted / CLI-error runs | remainder of 376.5272 |
| **Total used** | **376.5272** |
| **Final balance** | **1604.6401** |
