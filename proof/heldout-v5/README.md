# Held-out v5 accessibility results

## Local Playwright results

Playwright confirmed **99 of 142 repairs (69.7%)**, including **51 of 89 multi-step journeys (57.3%)**. The v4 development cohort recorded 64 of 102 repairs (62.7%) and 29 of 54 multi-step journeys (53.7%). The cohorts contain different sites and barrier mixes. [V5 local results and attempts](local-summary.json) · [V4 local results](../hard-v4/local-summary.json)

| Barrier | V4 fixed / registered | V5 fixed / registered |
| --- | ---: | ---: |
| Hover navigation | 26 / 39 | 31 / 43 |
| Disclosures | 3 / 10 | 11 / 20 |
| Tabs and carousels | 0 / 2 | 5 / 14 |
| Modal dialogs | 0 / 2 | 3 / 11 |
| Custom listboxes | 0 / 1 | 1 / 1 |
| Other multi-step journeys | 0 / 0 | 0 / 0 |
| Single-control objectives | 35 / 48 | 48 / 53 |

| Persona | V4 fixed / registered | V5 fixed / registered |
| --- | ---: | ---: |
| Keyboard only | 23 / 40 | 42 / 78 |
| 320px reflow | 20 / 37 | 38 / 44 |
| Reading view | 21 / 25 | 19 / 20 |

The remaining outcomes were 30 unresolved tasks, seven failing pointer controls, five already-accessible tasks and one inconclusive pointer control. The five already-accessible tasks passed unpatched during the repair run. [Local results and attempt records](local-summary.json)

## Kane verification

The seeded draw selected four locally fixed tasks across four barrier classes. Kane started three cases and verified **0 of 4 selected**. Its recorded before and after verdicts agreed with Playwright on **0 of 3 assessed pairs**. [Committed Kane selection](kane-selection.json) · [Session and credit ledger](kane-summary.json)

The World Register of Marine Species baseline failed and the pointer control passed. The first patched run declared completion without activating the Tools menu or reaching the visible outcome. The retry recorded the required activation and visible menu item, then hit Kane’s 24-step limit and ended inconclusive. That case used **103.6637 credits** and was skipped in the continuation. [Baseline](kane/v5-c22b9bdca86b-71a63d77/before/result.json) · [Pointer control](kane/v5-c22b9bdca86b-71a63d77/control/result.json) · [Patched run](kane/v5-c22b9bdca86b-71a63d77/attempt-1/after/result.json) · [Retry](kane/v5-c22b9bdca86b-71a63d77/attempt-1/after-retry/result.json)

The original batch stopped with 276.3363 credits available under the cap because a new case required a 300-credit reserve. Before the continuation, commit `9810593` recorded a **120-credit case reserve**, 16.3363 above the observed WoRMS cost. Each hosted invocation still required 100 credits above the protected floor of 153.8893. The continuation ran in an isolated checkout based on `1433cc9`, with the same deviation and runner committed there as `d088d6f` before its first run. [Protocol deviation](kane-protocol-deviation.json) · [Continuation journal](kane-continuation-journal.json)

| Continuation case | Before | Pointer control | Patched replay | Credits used |
| --- | --- | --- | --- | ---: |
| Kaizheng Law | [Inconclusive](kane/v5-cc3cea40d183-52a181e1/before/result.json) | [Inconclusive](kane/v5-cc3cea40d183-52a181e1/control/result.json) | [Pass](kane/v5-cc3cea40d183-52a181e1/attempt-1/after/result.json) | 94.3826 |
| TikFinity | [Inconclusive](kane/v5-39c81de4ef43-33ae7f34/before/result.json) | [Pass](kane/v5-39c81de4ef43-33ae7f34/control/result.json) | [Inconclusive](kane/v5-39c81de4ef43-33ae7f34/attempt-1/after/result.json), [retry inconclusive](kane/v5-39c81de4ef43-33ae7f34/attempt-1/after-retry/result.json) | 108.3680 |
| Mordor Intelligence | [Unrun after the budget stop](kane/v5-873b26b255a2-924a9a17/continuation-outcome.json) | — | — | 0.0000 |

Kaizheng Law’s baseline reported completion without evidence of the full journey. TikFinity’s baseline and first patched replay reached the step limit. The continuation used **202.7506 credits**. Across both batches Kane used **306.4143 of 380 credits** and ended at **227.4750**. The remaining 73.5857 credits above the floor fell short of the 120-credit reserve required to start Mordor Intelligence. [Session and credit ledger](kane-summary.json)

### Post-amendment Kane rerun

Four inconclusive runs reached the original 24-step cap. The rerun used Kane’s keyboard-only defaults of 50 steps and 360 seconds for WoRMS and TikFinity. It reused the original passing pointer controls and required a failed baseline and passing patched replay at the amended limits. [Committed preregistration](kane-rerun-50/registration.json)

| Case and phase | Verdict | Kane steps | Recorded reason |
| --- | --- | ---: | --- |
| WoRMS patched | [Pass](kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/result.json) | 26 | The keyboard opened Tools and made “Match taxa” visible. |
| TikFinity baseline | [Inconclusive](kane-rerun-50/v5-39c81de4ef43-33ae7f34/before/result.json) | 38 | Kane declared completion. The recording missed the required Arrow Down on the first option. |
| TikFinity patched | [Inconclusive](kane-rerun-50/v5-39c81de4ef43-33ae7f34/after/result.json) | 36 | The browser recorded the full sequence and selected value. Kane ended with `agent_error.child_failed`. |
| WoRMS baseline | [Fail](kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/result.json) | 24 | Tab skipped Tools between Statistics and Manual in both directions. |

Kane verified **1 of 2 rerun cases**. Both WoRMS runs used the 50-step limit, and the baseline reached its verdict after 24 steps. The original v5 result remains **0 of 4 selected**. The rerun used **129.1295 credits** and ended at **98.3455**. [Rerun sessions, sealed packs, and credit ledger](kane-rerun-50/summary.json)

In isolated Chromium, the site’s focus style turned the Tools label white on the white open-state background while keyboard focus remained on Tools, reproducing Kane’s step 24 screenshot. Opening the menu by mouse with the extension off showed blue text, and the same blue returned after Tab moved focus to “Match taxa” with the extension on.

## Sample and registration

The v5 run attempted all 2,050 preregistered Tranco sites at ranks 1,000–50,000. The new draw used three browser workers and excluded domains from earlier cohorts. The first draw was interrupted by a browser teardown race after 104 completed checks. The corrected workflow was frozen before a fresh sample was committed, and every domain from the first draw was excluded. [Committed sample](sample.json) · [Interrupted draw](../heldout-v5-aborted/README.md)

Playwright confirmed 144 barriers. The browser access preflight excluded two, leaving 142 registered tasks across 142 sites. The registration contains 89 multi-step journeys. Scouting also recorded 734 blocked site attempts, 490 inconclusive attempts, 317 sites with no candidate, 356 sites whose candidate tasks had no confirmed barrier, and nine category exclusions. [Scouting ledger](scouting.json) · [Task registration](registration.json)

The `curbcut-freeze-v5` tag identifies the workflow used to scout and repair the registered set. The source archive contains the exact tagged trees and blobs. The registration receipt binds the committed sample, prior exclusions, safety screen, scouting output, and registration. Run `node scripts/verify-v5.mjs` to reconstruct the frozen Git objects and verify the input hashes in any Git history. [Freeze receipt](freeze-integrity.json) · [Registration receipt](registration-integrity.json)
