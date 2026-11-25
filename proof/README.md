# Proof index

On ColorHexa, a Kane failure led to a Codex repair that reached the reporting tab. [Agent input and rules](../README.md#inspect-a-kane-run) · [Original-tab timeline](live/live-loop.json) · [OpenSeaMap report to published ZIP](report-to-fix/README.md) · [Experimental results](#experimental)

Compare [Mass.edu before](hard-v4/kane/v4-86f207deeb57-7bc09a21/before/recording.mp4) and [after](hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/after/recording.mp4). The same keyboard task opens About and follows “The DHE” with the repair. [Pointer control](hard-v4/kane/v4-86f207deeb57-7bc09a21/control/recording.mp4) · [Kane evidence pack](hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/after/70a47b25-b707-443b-98dd-d8849884cec2.evidence)

## Installed extension and reliability

| Claim | Result | Evidence |
| --- | --- | --- |
| Release bundle | 106 active repairs. 62 with Kane recordings and 44 with local proof | [Bundled rules and evidence pointers](../extension/bundled.json) |
| Installed-extension audits | 43/43 original fixes, 11/11 new v5 fixes and 51/51 new v6 fixes passed their release audits | [Original audit](reliability/extension-e2e.json) · [New v5 audit](heldout-v5/kane-sample-20/extension-e2e.json) · [New v6 audit](heldout-v6/extension-e2e.json) · [V6 candidate exclusions](heldout-v6/extension-e2e-initial.json) |
| November 24, 2026 installed audit | 98/105 primary checks passed across that day’s bundle, seven unconfirmed | [Installed audit](reliability/submission-extension-e2e.json) · [Targeted local recheck](reliability/submission-recheck.json) |
| Developer fixture | Kane runs for Check, Gate and retirement | [CLI demo archive](demo/README.md) |
| Nightly replay | 43 checked, 38 still verified, 4 inconclusive. One broken result was subsequently retired | [Nightly runs and disposition](reliability/nightly.json) · [Earlier Kane rechecks](recheck/README.md) |
| Report to repair | ColorHexa’s color picker became keyboard-reachable in the reporting tab | [Live report recording and Kane sessions](live/README.md) · [Site-owner report](../evidence/report-d6870c43f8831c2d3b/report.md) |
| Local harness | Three fixture tasks recorded fail, pass with the rule, and pass after a native fix | [Fixture evidence](local.json) · [Replay instructions](methodology/README.md#local-demo) |

## Experimental

- **Cost.** The CLI reports estimated tokens and Kane balance changes. The model ladder and the large model alone each fixed 0/17 judged tasks. Reordering the prompt prefix produced no measurable product-cache benefit. Shared mouse controls can reuse a same-URL recording, but the archive has no equivalent-objective receipt demonstrating savings. [Cost study](cost/README.md)
- **Family scan.** One mdBook template repaired two of five documentation URLs locally. Both repaired pages were on doc.rust-lang.org. Kane confirmed zero of the two. [Family results](family/README.md)
- **Match mouse.** The experimental command compares DOM controls. It matched one of 22 held-out menus locally, with zero of one confirmed by Kane. The separate Jev screenshot classifier missed its precision threshold and was dropped. [DOM trial](mirror-dom/README.md) · [Classifier backtest](jev/mirror-backtest/README.md)
- **Census.** The study estimates the reach of recipe patterns on observed pages and measures recall on positive examples. [Sample and calibration](census/README.md)

<details>
<summary>Held-out cohorts, V1–V7</summary>

### Held-out v7

The v7 draw registered 14 naming tasks and one document-language task from 100 new Tranco sites. Jev confirmed 6 of 10 accepted names and repaired the one missing language in the local oracle. The median viewport naming time was 666 ms across 11 pages. Kane independently verified 2 of 5 seeded live-naming cases. [Protocol and results](heldout-v7/README.md) · [Registration](heldout-v7/registration.json) · [Local outcomes](heldout-v7/local-summary.json) · [Kane run ledger](heldout-v7/kane-summary.json)

### Held-out v6

| Claim | Result | Evidence |
| --- | --- | --- |
| Scouting and registration | 400 sites attempted, 118 tasks registered | [Sample](heldout-v6/sample.json) · [Scout ledger](heldout-v6/scouting.json) · [Registration](heldout-v6/registration.json) · [Integrity receipt](heldout-v6/study-integrity.json) |
| Local repairs | 76/118. Contrast 47/62, image alternatives 8/12, empty links 12/12, empty buttons 9/12, language 0/20 | [Measurements and outcomes](heldout-v6/local-summary.json) · [Example contrast measurement](heldout-v6/measurements/v6-02908098a5e1c23c7852.json) |
| Kane name-type sample | 7/15. Image alternatives 3/5, empty links 1/5, empty buttons 3/5 | [Seeded selection](heldout-v6/kane-selection.json) · [Run ledger with recordings and packs](heldout-v6/kane-summary.json) · [Example before](heldout-v6/kane/v6-170c2d7431ef79a6a7f9/before-1/recording.mp4) · [After](heldout-v6/kane/v6-170c2d7431ef79a6a7f9/after-1/recording.mp4) · [After pack](heldout-v6/kane/v6-170c2d7431ef79a6a7f9/after-1/8066e22d-33ca-4427-b30a-cbc0a91b792b.evidence) |
| Local proof scope | 41 contrast releases from v6 and 3 language releases from development pages | [V6 release manifest](heldout-v6/release.json) · [Language development measures](heldout-v6/development-language/summary.json) · [Contrast simulation calibration](heldout-v6/calibration/summary.json) |

[V6 protocol and results](heldout-v6/README.md) · [WebAIM’s six failure types](https://webaim.org/projects/million/)

### Held-out v5

| Claim | Result | Evidence |
| --- | --- | --- |
| Frozen evaluation | 2,050 sites attempted, 142 tasks registered | [Sample](heldout-v5/sample.json) · [Scout ledger](heldout-v5/scouting.json) · [Registration](heldout-v5/registration.json) · [Integrity receipt](heldout-v5/registration-integrity.json) |
| Local repairs | 99/142, including 51/89 multi-step journeys and 19/20 form labels | [Outcome and attempt ledger](heldout-v5/local-summary.json) |
| Random Kane sample | 11/20 verified, including 6/6 sampled form labels. Three failed, six inconclusive | [Seeded registration](heldout-v5/kane-sample-20/registration.json) · [Run ledger](heldout-v5/kane-sample-20/summary.json) · [Holafly before](heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/before/recording.mp4) · [After](heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/after/recording.mp4) · [After pack](heldout-v5/kane-sample-20/v5-b3a020e9a510-2d198473/after/46ecaa02-5a65-4a90-8297-c108ca4f81fe.evidence) |
| Original Kane sample | 0/4 selected, three started | [Selection](heldout-v5/kane-selection.json) · [Run ledger](heldout-v5/kane-summary.json) |
| 50-step rerun | 1/2 verified, WoRMS | [Rerun registration](heldout-v5/kane-rerun-50/registration.json) · [Run ledger](heldout-v5/kane-rerun-50/summary.json) · [Before](heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/recording.mp4) · [After](heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/recording.mp4) · [After pack](heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/eb14dcd6-443a-4fc5-9edc-e47e9028c267.evidence) |

[V5 protocol, deviations and per-case evidence](heldout-v5/README.md) · [Interrupted first draw](heldout-v5-aborted/README.md)

### V4 and earlier

| Cohort | Result | Evidence |
| --- | --- | --- |
| Hard v4 | 64/102 local repairs, including 29/54 journeys. Kane verified 2/21 selected | [Study and per-case results](hard-v4/README.md) · [Registration](hard-v4/registration.json) · [Kane ledger](hard-v4/kane-summary.json) · [CSC before](hard-v4/kane/v4-27c6f312c486-51e6e4ad/before/recording.mp4) · [After](hard-v4/kane/v4-27c6f312c486-51e6e4ad/attempt-1/after/recording.mp4) |
| Held-out v3 | 10/23 study-defined successes, including cases using a local oracle | [Study](heldout-v3/README.md) · [Ledger](heldout-v3/summary.json) |
| Held-out v2 | 13/39 Kane-verified among started cases | [Study](heldout-v2/README.md) · [Ledger](heldout-v2/summary.json) |
| Original held-out | 0/26 Kane-verified | [Study](heldout/README.md) · [Ledger](heldout/summary.json) |

The [Kane session ledger](kane/ledger.json) indexes archived sessions across cohorts. The [Kane evidence guide](kane/README.md) describes the recording, result JSON and sealed pack in each phase directory.

</details>

<details>
<summary>TypeSafe Jev naming, instant repair and archive studies</summary>

[Decision-model results](jev/README.md) · [Reading view demo before](jev/live-naming-demo/before.png) · [After](jev/live-naming-demo/after.png) · [Names and confidence JSON](jev/live-naming-demo/capture.json)

### Original instant repair and archive experiment

| Claim | Result | Evidence |
| --- | --- | --- |
| Immediate repair | 2/102 v4 development and 3/142 v5 held-out, all hover-menu repairs | [Benchmark](jev/benchmark.json) · [V4 replay](jev/hard-v4-replay.json) · [V5 replay](jev/heldout-v5-replay.json) |
| Latency | 801 ms median capture to installation across 66 timed v5 cases. 771 ms median for the 3 successful cases | [Benchmark timings](jev/benchmark.json) · [Demo video](jev/demo.mp4) · [Demo timing](jev/demo.json) |
| Kane follow-up | 3 eligible cases against a minimum of 5. Zero runs and zero credits | [Eligibility check](jev/kane-eligibility.json) |
| Kane archive experiments | Predictor scored 427 sessions. Frame auditor flagged 37 of 49 scored packs | [Predictor](jev/predict-summary.json) · [Frame audit](jev/audit-summary.json) |

[Jev protocol and limitations](jev/README.md)

</details>
