# TypeSafe Jev decision experiments

Jev takes structured state and returns typed choices, yes/no probabilities, scores or image boxes against a declared answer space. Live naming asks it to select among common control functions and candidates drawn from the element. Document language uses the same approach with ISO 639-1 codes. Keyboard help asks for a yes/no probability over a short trace. [Frozen v7 sample and protocol](../heldout-v7/README.md)

## Decision results

| Use | Disposition | Measurement |
| --- | --- | --- |
| A. Live names | Keep, opt-in | In the installed extension, 13/15 applied names correct (86.7%), from 35 unnamed links and buttons. The median time to the first name was 1,137 ms on 7 sites. |
| B. Document language | Keep for local proof | 1/1 v7 and 3/3 development tasks passed the `setLang` replay. |
| F. Keyboard help | Keep, experimental and opt-in | Four synthetic development traces gave 3/3 true alerts and 0/1 false alerts at 0.75. The archive produced zero alerts on 154 screened traces, including 96 scorable traces. Precision was undefined and recall was 0/140. |
| C. Real barrier check | Drop as a Kane gate | At 0.07, the archive proxy skipped 3/19 passing baselines and lost zero verified cases. It skipped neither of the two passing baselines from the v5 random sample. Local screenshots yielded zero passing baselines skipped on 13 recoverable journeys. |
| D. Start screenshot | Keep as an advisory preflight | At 0.98, 5 inconclusive sessions flagged and zero decisive sessions flagged. Three flags matched archived bot challenges. |
| E. Persona simulator | Drop as a discovery tool | 0/5 decisive in the hard-v4 development pilot. Agreement was undefined. |

[Held-out naming and language](../heldout-v7/README.md) · [Language development](language-development.json) · [Keyboard archive](stuck-backtest.json) · [Keyboard development](stuck-development.json) · [Barrier archive proxy](barrier-backtest.json) · [Local journey frames](barrier-local.json) · [Screenshot preflight backtest](preflight-backtest.json)

## Public extension replay

Headless Chromium loaded the installed extension and visited 19 public sites drawn from earlier audits. Seventeen served their pages and 13 exposed 35 unnamed links or buttons in the sampled viewports. Two of those sites had populated fields, leaving 33 controls on 11 privacy-eligible sites. The extension named 15 controls on seven sites. First-name latency from enabling live naming on the loaded page was 1,137 ms median and 1,864 ms p95 across those seven sites.

Manual review found 13 correct, zero wrong and two vague names. The vague names were “stormhealth” and “quora.com.” The installed extension now applies a 0.80 confidence floor and scopes naming to links and buttons. Jev can use filenames, IDs and CSS classes as evidence. Candidate names come from common functions and destination or page text. The JSON includes every applied name, confidence, judgment, evidence, timing and per-page Reading view captures. [Public-site results](live-naming-real-sites.json)

Live naming captures the active viewport with Reading view closed. Opening Reading view shows the applied names. The Meridiano demo shows the adjacent menu and search buttons before and after naming at 1920×1080. Jev chose “Menú” at 0.92 and “Buscar” at 1.00. [Before](live-naming-demo/before.png) · [After](live-naming-demo/after.png) · [Capture JSON](live-naming-demo/capture.json)

On Mass.edu, with zero Curb Cut repairs active, keyboard focus and Arrow Down left The DHE link hidden, while pointer hover opened the submenu. Four Tab and Shift+Tab cycles around About produced no offer. A populated email field triggered the privacy gate before any Jev request. [Keyboard replay](stuck-live-mass-edu.json)

With Playwright Chromium installed and `CURBCUT_JEV_KEY_FILE` pointing to a Jev key file, run the public checks below. Use a fresh output directory to keep the adjudicated run and its screenshots.

```sh
npm run build
CURBCUT_JEV_PROOF_DIR=/tmp/curbcut-jev-replay node scripts/jev-live-extension-e2e.mjs
CURBCUT_JEV_PROOF_DIR=/tmp/curbcut-jev-replay node scripts/jev-stuck-live.mjs
```

## Earlier experiments

The keyboard archive compares task verdicts with the most recent key window from Kane events and local oracle steps. Many archived sessions omit intermediate focus identities or timestamps. The live experiment includes those signals when available, represented as temporary IDs and a named/unnamed flag. A high score offers a choice to reapply a known rule or ask Jev to name controls once. The extension waits for user consent before either action.

The barrier archive proxy used recorded Kane screenshots for 103 of 117 before sessions with decisive verdicts. The local replay separately sampled the original persona state and journey steps on 13 sites with reconstructable tasks. Archive labels and local site visits are recorded separately. The 0.07 threshold filtered one additional failing old baseline and saved an estimated 78.67 credits over the three old passing baselines. The trial applies no Kane gate.

The start-screen experiment scored 395 of 466 archived sessions using only the first available image and the task. The older archive selected the 0.98 cutoff. All five flags came from that older archive. The later v5/v6 archive had zero flags at that cutoff. Run `node curbcut.mjs visual-preflight <task.json>` for an advisory classification before selecting a case. This command uses isolated Chromium and makes no Kane request. [Screenshot results and threshold sweep](preflight-backtest.json)

The optional simulator let Jev choose each next key from the current screenshot and recent actions. The five archived tasks had decisive Kane verdicts, and the local oracle was rerun separately. Four Jev runs selected an activation outside the registered public targets, and the fifth reached the 14-key limit. No paired Jev verdicts were available for agreement. [Persona pilot](persona-pilot.json)

## Original instant repair experiment

Enable **Experimental instant fix (TypeSafe Jev)** in Curb Cut settings, then press **Alt+Shift+F** or choose **Try experimental instant fix** in the popup. The extension collects the focused element and surrounding controls, offers up to 16 repair candidates, and sends a visible-tab screenshot. One request asks Jev for a repair family, target, safety probability, and an accessible name when there are supported names to choose from. The extension applies only predefined Curb Cut actions against the original candidate. The decision score is the minimum of the relevant returned probabilities. The application threshold is **0.50** and was set during development before the full v5 replay.

The on-page badge labels the result **Fixed for you · unverified**. Press **Escape** or choose **Undo** to release the rules. The extension checks the page identity again before sending the capture and before applying a rule. It skips sensitive URLs, sign-in and payment forms, and pages with populated editable fields. Chromium requires the extension’s all-sites host permission for the fallback keyboard shortcut to take a screenshot. Capture happens on the requested action. Browser options explain the data sent to TypeSafe and allow a personal key stored in the extension’s own database.

Run `node curbcut.mjs serve` for the local bridge. It reads the TypeSafe key from `CURBCUT_JEV_KEY_FILE`, or from the demo key file at runtime. The extension submits the generated task and rule to the local queue and holds it in extension storage when the server is unreachable. Run `node curbcut.mjs verify-queue` to replay queued candidates with Kane and publish candidates that pass all three evidence lanes. The queue entries and keys live outside the public service routes.

## Reproduce the measurements

```sh
npm run build
node scripts/jev-benchmark.mjs hard-v4 heldout-v5 --fresh
node scripts/jev-codex-baseline.mjs
node scripts/jev-kane-backtest.mjs predict
node scripts/jev-kane-backtest.mjs audit
node scripts/jev-report.mjs
```

The Playwright replay opens each registered task in an isolated browser with the registered persona. The collector sees DOM and screenshot state from the resulting page. The registered destination and required accessible name belong to the separate outcome checks. For a reading passage the replay scrolls to the passage before capture. A success requires the unpatched persona to fail, the unpatched pointer control to pass, and both the patched persona and patched pointer control to pass. Below-threshold candidates are tried in isolated oracle browsers to populate the calibration table. Pages that drift, block access, or lack a reproducible barrier remain in the registered denominator.

The held-out latency includes collection, screenshot, API round trip, and installing the rule while the replay browser is open. The timing clock pauses during deliberate request pacing and stops before the oracle opens fresh browsers. The development capture-to-decision timing excludes rule installation because its early runner stopped the latency clock at the decision. The Codex timing sample starts at archived failed state and measures one proposal with live selector validation. The historic 99/142 and 64/102 repair counts include retries.

The first five v5 cases also ran during a smoke test. Three reached the model. The final replay covers all 142 registered cases with the development threshold fixed in advance of that run.

## Kane archive backtests

The predictor uses only the objective and run limits available before Kane starts. The archive deduplicates recorded sessions by run ID. Pass and fail count as decisive when the archived evidence supports the verdict. The step count is the last step started, including steps spent searching or stuck. Older archives set the test threshold and the v5 and v6 archives measure its effect.

The frame auditor evaluates the final claim using the last two selected evidence frames and the ordered step summaries. Its labeled subset uses the independent browser verdict for the known false passes and browser-supported passes. This is a review experiment. Kane and its browser evidence still determine the recorded verdict.

## Results

At a threshold of **0.50**, Jev alone fixed **2 of 102 development tasks (2.0%)** and **3 of 142 held-out tasks (2.1%)**. The previous Codex repair loop fixed **64 of 102 (62.7%)** and **99 of 142 (69.7%)**, respectively. [Benchmark data](benchmark.json)

| Barrier | Development v4 | Held-out v5 |
| --- | ---: | ---: |
| Hover navigation | 2 / 39 | 3 / 43 |
| Disclosures | 0 / 10 | 0 / 20 |
| Tabs and carousels | 0 / 2 | 0 / 14 |
| Modal dialogs | 0 / 2 | 0 / 11 |
| Custom listboxes | 0 / 1 | 0 / 1 |
| Single-control reflow | 0 / 24 | 0 / 33 |
| Other single-control tasks | 0 / 24 | 0 / 20 |

| Timing scope | Sample | Median | p95 |
| --- | ---: | ---: | ---: |
| Jev v4 capture through rule install, follow-up | 37 | 854 ms | 3,223 ms |
| Jev v5 capture through rule install | 66 | 801 ms | 3,333 ms |
| Jev v5 successful repairs only | 3 | 771 ms | 1,668 ms |
| Codex one successful proposal and selector validation | 4 | 17.0 s | 20.3 s |

The development installation follow-up retried capture through rule installation for the 40 tasks with a supported proposal and a reproduced barrier. The Codex timing sample started five archived v4 tasks. One proposal failed live selector validation after 25.5 seconds. [V4 installation follow-up](hard-v4-timing.json) · [Codex timing attempts](codex-timing.json)

| Jev score | V4 correct / evaluated | V5 correct / evaluated |
| --- | ---: | ---: |
| 0.00–0.29 | 3 / 12 | 1 / 14 |
| 0.30–0.39 | 3 / 5 | 2 / 10 |
| 0.40–0.49 | 4 / 8 | 5 / 10 |
| 0.50–0.59 | 1 / 9 | 2 / 7 |
| 0.60–0.69 | 1 / 1 | 1 / 3 |

The calibration table covers supported proposals with usable local outcomes. Accuracy varied across ranges. All 18 accepted held-out proposals remain in the success denominator, including cases where the current page or pointer control prevented a decisive replay. Jev-first in the repair CLI stays opt-in via `CURBCUT_JEV_FIRST=1`. The three held-out fixes estimate the share of tasks that could skip a Codex proposal under this policy. [All v5 outcomes](heldout-v5-replay.json)

The Kane run predictor scored all 427 archived sessions. It yielded an AUROC of **0.56** on the older archive and **0.72** on 88 v5/v6 sessions. The development-selected threshold of 0.40 saved **0 credits** while retaining every decisive verdict. At 0.60, an estimated 53.67 credits came from skipping two decisive passes. The step-count mean absolute error improved from **7.04** to **6.16** steps on the newer archive. The workflow uses no predictor guard. [Predictor results](predict-summary.json)

The frame auditor scored **49 of 51** selected packs and flagged **37**. Among the independently labeled flags, **2 of 28** were known false passes (7.1% precision). It missed the TikFinity Arrow Down failure. The auditor remains an offline experiment. [Frame audit results](audit-summary.json)

The seeded Kane protocol required five new, successful v5 candidates. **Three** qualified, so execution stopped before preregistration. **Zero runs started and zero Kane credits were spent.** [Eligibility check](kane-eligibility.json)

The Atlantic Council recording shows the original keyboard barrier, an instant repair after **1.099 seconds**, and navigation to the requested public destination. The file is a 1920×1080 headless Chromium recording with the extension loaded and the timing overlay off. [Recording](demo.mp4) · [Timing](demo.json)

A separate headless check on Mailinator applied a repair at confidence 0.58, restored the original submenu behavior with Escape, and found the candidate in the local server queue. The extension reported 708 ms through installation.
