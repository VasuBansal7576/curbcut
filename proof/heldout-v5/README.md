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

## Seeded Kane sample

Kane verified **11 of 20 started cases** from a seeded random ordering of 95 locally fixed held-out v5 cases. The target was 20. The four cases from the original Kane selection were excluded. 20 cases reached all three phases and 14 had three decisive verdicts. [Committed registration](kane-sample-20/registration.json) · [Run ledger](kane-sample-20/summary.json)

A verification requires a failing unpatched persona run, a passing mouse control and a passing replay with the exact frozen candidate. The runner saved both attempts when it retried an inconclusive phase. The 3 failed cases each had at least one decisive verdict that disagreed with the local oracle. The 6 inconclusive cases lacked a decisive triplet.

Kane agreed with the local oracle on **50 of 53 decisive phases** and **11 of 14 fully assessed cases**. Seven final phases were inconclusive. Four lacked evidence of the full journey, two did not reach the registered passage, and one reported that the agent was stuck. Across all attempts, nine lacked full journey evidence, three did not reach the passage, one recorded a changed passage, and one reported a stuck agent. [Run ledger](kane-sample-20/summary.json)

The sample used **1532.2988 credits** and finished with **3392.1428**. The runner reached the 20-case target.

| Site | Before | Mouse control | After | Case verdict | Reason for disagreement or uncertainty | Credits |
| --- | --- | --- | --- | --- | --- | ---: |
| sacred-texts.com | [Pass](kane-sample-20/v5-a4b9c9c41e01-05222b52/before/result.json) | [Pass](kane-sample-20/v5-a4b9c9c41e01-05222b52/control/result.json) | [Pass](kane-sample-20/v5-a4b9c9c41e01-05222b52/after/result.json) | failed | before · The original page passed the registered task. | 73.3217 |
| www.crictracker.com | [Fail](kane-sample-20/v5-857ef2c1ce84-168863dc/before/result.json) | [Inconclusive](kane-sample-20/v5-857ef2c1ce84-168863dc/control-retry/result.json) | [Pass](kane-sample-20/v5-857ef2c1ce84-168863dc/after/result.json) | inconclusive | control · complete-journey-not-witnessed | 100.8198 |
| www.legitscript.com | [Inconclusive](kane-sample-20/v5-f2ad66f1be05-fa8c7355/before-retry/result.json) | [Pass](kane-sample-20/v5-f2ad66f1be05-fa8c7355/control/result.json) | [Pass](kane-sample-20/v5-f2ad66f1be05-fa8c7355/after/result.json) | inconclusive | before · complete-journey-not-witnessed | 87.6309 |
| www.forumotion.com | [Fail](kane-sample-20/v5-fcff2ddd132fff0edeae/before/result.json) | [Pass](kane-sample-20/v5-fcff2ddd132fff0edeae/control/result.json) | [Pass](kane-sample-20/v5-fcff2ddd132fff0edeae/after/result.json) | verified | — | 39.2270 |
| rtmark.net | [Fail](kane-sample-20/v5-ab1225a91bea3a027001/before/result.json) | [Pass](kane-sample-20/v5-ab1225a91bea3a027001/control/result.json) | [Pass](kane-sample-20/v5-ab1225a91bea3a027001/after/result.json) | verified | — | 58.4233 |
| rekhta.org | [Fail](kane-sample-20/v5-c46d9e085415a2e891b3/before/result.json) | [Pass](kane-sample-20/v5-c46d9e085415a2e891b3/control/result.json) | [Pass](kane-sample-20/v5-c46d9e085415a2e891b3/after/result.json) | verified | — | 53.2953 |
| goznak.ru | [Inconclusive](kane-sample-20/v5-2f50b19bf48c-e5978111/before-retry/result.json) | [Pass](kane-sample-20/v5-2f50b19bf48c-e5978111/control/result.json) | [Pass](kane-sample-20/v5-2f50b19bf48c-e5978111/after/result.json) | inconclusive | before · complete-journey-not-witnessed | 89.6427 |
| azgames.io | [Fail](kane-sample-20/v5-fcd52c5a5920e388762d/before/result.json) | [Pass](kane-sample-20/v5-fcd52c5a5920e388762d/control/result.json) | [Pass](kane-sample-20/v5-fcd52c5a5920e388762d/after/result.json) | verified | — | 44.3328 |
| uindex.org | [Fail](kane-sample-20/v5-cf5e31bb10aecd3af383/before/result.json) | [Pass](kane-sample-20/v5-cf5e31bb10aecd3af383/control/result.json) | [Pass](kane-sample-20/v5-cf5e31bb10aecd3af383/after/result.json) | verified | — | 44.1371 |
| armorgames.com | [Fail](kane-sample-20/v5-e35e95e464a0b456fb7a/before/result.json) | [Pass](kane-sample-20/v5-e35e95e464a0b456fb7a/control/result.json) | [Pass](kane-sample-20/v5-e35e95e464a0b456fb7a/after/result.json) | verified | — | 47.1582 |
| www.freedommortgage.com | [Pass](kane-sample-20/v5-003fd3b4076d-6079696a/before/result.json) | [Pass](kane-sample-20/v5-003fd3b4076d-6079696a/control/result.json) | [Pass](kane-sample-20/v5-003fd3b4076d-6079696a/after/result.json) | failed | before · The original page passed the registered task. | 95.6265 |
| www.e2open.com | [Fail](kane-sample-20/v5-b5c8c2309d78-653b97f8/before/result.json) | [Pass](kane-sample-20/v5-b5c8c2309d78-653b97f8/control/result.json) | [Fail](kane-sample-20/v5-b5c8c2309d78-653b97f8/after/result.json) | failed | after · Keyboard focus remained on Log In after the maximum action count, before reaching the requested tab. | 139.8139 |
| www.systemrequirementslab.com | [Fail](kane-sample-20/v5-9e9bb4ee04e0ed570269/before/result.json) | [Pass](kane-sample-20/v5-9e9bb4ee04e0ed570269/control/result.json) | [Pass](kane-sample-20/v5-9e9bb4ee04e0ed570269/after/result.json) | verified | — | 63.1495 |
| www.kyndryl.com | [Inconclusive](kane-sample-20/v5-d733df02c68b-e1ef840e/before-retry/result.json) | [Pass](kane-sample-20/v5-d733df02c68b-e1ef840e/control/result.json) | [Pass](kane-sample-20/v5-d733df02c68b-e1ef840e/after/result.json) | inconclusive | before · complete-journey-not-witnessed | 84.2024 |
| lawphil.net | [Fail](kane-sample-20/v5-78c6473662e589ae4e3e/before/result.json) | [Pass](kane-sample-20/v5-78c6473662e589ae4e3e/control/result.json) | [Pass](kane-sample-20/v5-78c6473662e589ae4e3e/after/result.json) | verified | — | 59.3680 |
| trackjs.com | [Fail](kane-sample-20/v5-7dc57bda3fb85932eb21/before/result.json) | [Pass](kane-sample-20/v5-7dc57bda3fb85932eb21/control/result.json) | [Pass](kane-sample-20/v5-7dc57bda3fb85932eb21/after/result.json) | verified | — | 61.6185 |
| www.expansion.com | [Fail](kane-sample-20/v5-1b0ce5c57b500551ae39/before/result.json) | [Inconclusive](kane-sample-20/v5-1b0ce5c57b500551ae39/control-retry/result.json) | [Inconclusive](kane-sample-20/v5-1b0ce5c57b500551ae39/after-retry/result.json) | inconclusive | control · passage-not-reached<br>after · passage-not-reached | 170.8218 |
| esim.holafly.com | [Fail](kane-sample-20/v5-b3a020e9a510-2d198473/before/result.json) | [Pass](kane-sample-20/v5-b3a020e9a510-2d198473/control/result.json) | [Pass](kane-sample-20/v5-b3a020e9a510-2d198473/after/result.json) | verified | — | 74.0340 |
| www.snhu.edu | [Inconclusive](kane-sample-20/v5-c29e58c404c0-f9350d36/before-retry/result.json) | [Pass](kane-sample-20/v5-c29e58c404c0-f9350d36/control/result.json) | [Pass](kane-sample-20/v5-c29e58c404c0-f9350d36/after/result.json) | inconclusive | before · complete-journey-not-witnessed | 87.9158 |
| www.shanghairanking.com | [Fail](kane-sample-20/v5-da5c14f912fb3f74fbbb/before/result.json) | [Pass](kane-sample-20/v5-da5c14f912fb3f74fbbb/control/result.json) | [Pass](kane-sample-20/v5-da5c14f912fb3f74fbbb/after/result.json) | verified | — | 57.7596 |

Free preflight skipped 1 ranked case.

- www.manhwaden.com · The attached task document did not finish loading. [Preflight record](kane-sample-20/v5-97763e796ed8-d549191b/preflight.json)

In the installed extension, all 11 Kane-verified tasks failed with the extension off and passed with it on. All three independently serving `www` twins passed as well. The audit used isolated headless Chromium. [Installed extension audit](kane-sample-20/extension-e2e.json)

## Sample and registration

The v5 run attempted all 2,050 preregistered Tranco sites at ranks 1,000–50,000. The new draw used three browser workers and excluded domains from earlier cohorts. The first draw was interrupted by a browser teardown race after 104 completed checks. The corrected workflow was frozen before a fresh sample was committed, and every domain from the first draw was excluded. [Committed sample](sample.json) · [Interrupted draw](../heldout-v5-aborted/README.md)

Playwright confirmed 144 barriers. The browser access preflight excluded two, leaving 142 registered tasks across 142 sites. The registration contains 89 multi-step journeys. Scouting also recorded 734 blocked site attempts, 490 inconclusive attempts, 317 sites with no candidate, 356 sites whose candidate tasks had no confirmed barrier, and nine category exclusions. [Scouting ledger](scouting.json) · [Task registration](registration.json)

The `curbcut-freeze-v5` tag identifies the workflow used to scout and repair the registered set. The source archive contains the exact tagged trees and blobs. The registration receipt binds the committed sample, prior exclusions, safety screen, scouting output, and registration. Run `node scripts/verify-v5.mjs` to reconstruct the frozen Git objects and verify the input hashes in any Git history. [Freeze receipt](freeze-integrity.json) · [Registration receipt](registration-integrity.json)
