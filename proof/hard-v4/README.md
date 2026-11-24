# Hard accessibility barriers v4

The [sample](sample.json), [primary scout](scouting.json), [follow-up](followup.json), and [eligibility review](eligibility-review.json) describe the public discovery run. The [registration](registration.json) binds the eligible tasks to the frozen workflow. Results from [local Playwright repair](local-summary.json) and the [Kane selection](kane-selection.json) have separate evidence.

## Verify the frozen workflow and registration

Run `node proof/hard-v4/verify-integrity.mjs` from the repository root. The verifier checks the [frozen source archive](frozen-source.tar.gz), rebuilds its Git objects in a temporary repository, and hashes the exact sample and registration bytes. It uses the SHA-1 object format recorded in the [freeze receipt](freeze-integrity.json). The [registration receipt](registration-integrity.json) carries the same hashes for the original registration, so verification also works in a fresh Git history.

| Frozen path | Git object | SHA-1 |
| --- | --- | --- |
| `core` | tree | `d529707228ff9d20a943e0447efa7d76f4c7f71c` |
| `extension` | tree | `8fa11e10e9be724d0e2937da317c9dbba3174ecb` |
| `schemas` | tree | `49f28c15c1babee7d1f68adea76479983e39aa7a` |
| `schemas/patch.json` | blob | `9a4ced6f9606f6192490d5286d8b3360d4a96fcc` |
| `scripts` | tree | `1b276248cae3f464e6ff672b488ebafe2f61e73d` |
| `fixtures` | tree | `3e5d0a22804c6edbf8902dc6c5e36beeeb631169` |
| `tests` | tree | `a165ac7bc1f8f914500b334eccdc813d3ddb3e93` |
| `curbcut.mjs` | blob | `c0c60888638f68c4feffd97e8e63bbe1130020e6` |
| `package.json` | blob | `7798a43012fe16ff2e218a229389fee8e6216982` |
| `package-lock.json` | blob | `7dc55e3cabfd99432d8a495d762d6a9fc03f585f` |
| `site/style.css` | blob | `a10275e05ca88309a9381f1ca15c4ff43b1a12f2` |

| Registered input | Git blob SHA-1 |
| --- | --- |
| [sample.json](sample.json) | `1c602503840c48bb47451f8261b316196e6429fc` |
| [registration.json](registration.json) | `40c1f35a40f11c7945cfd56c579822c6b4113a38` |
| [kane-selection.json](kane-selection.json) | `9557efa3090f5a404b4e346920aead33e8df340f` |

The original commits and tag appear in the receipts for repositories that retain that history.

## Results

The primary scout attempted 1,541 public sites from the 1,600-site Tranco sample. Access blocked 581 sites. The follow-up revisited 480 sites from the same sample and found no additional confirmed tasks.

The pinned domain screen excluded 59 sample entries. Six of those domains had already been visited in the initial pass, including two read-only layout probes. Their observations were removed before registration.

Playwright initially confirmed 107 tasks. The eligibility review excluded 5 tasks and left 102 tasks across 102 sites, with 54 hard journeys. The discovery targets were 150 tasks, 100 hard journeys, and 120 sites.

Playwright confirmed **64 of 102 repairs**, including **29 of 54 hard journeys**. Each passing repair reproduced the original failure and reached the declared outcome in the patched persona and pointer lanes.

Kane verified **2 of 21 selected tasks** with a failed baseline, passing pointer control, and passing patched replay. It used **967.61 credits** and ended at **533.89**. The selection lacked locally passing candidates for Tabs and carousels, Modal dialogs, Custom listboxes, Other multi-step journeys.

Kane started 13 cases. The committed credit guard stopped before the next case and 8 selected cases had no Kane run.

[Local outcomes and attempts](local-summary.json) · [Kane outcomes and credits](kane-summary.json) · [Kane selection](kane-selection.json)

The v5 visibility replay used all 102 v4 tasks and the saved local candidates. It reconfirmed 56 of the 64 saved repairs. Six journeys passed without patches and 16 tasks changed their overall classification. Of the 95 tasks with a comparable v4 repair baseline, four changed baseline status. Among the four sites that previously passed unpatched in Kane, RaptorTech passed the current local replay. Moveworks, Audience.io and OutSystems failed the unpatched keyboard lane and passed pointer control. The replay used current live pages, so the change counts include page drift. [Stage 1 replay](visibility-replay-v5.json)

The three v4 browser navigation errors followed parent `/about` links outside the registered journeys. The saved network traces show status 0 for those requests after the task homepages loaded. All three sites passed the free CDP access preflight in both personas. The harness now suppresses those out-of-journey link activations before Chrome navigates. The three historical runs debited 90.88 credits. [Stage 2 diagnostics and preflight](preflight-v5.json)

The updated repair agent fixed the CSS hover fixture on its first proposal. Three selected v4 cases received five attempts each and remained unresolved. Cursor’s pointer control passed after its public locale navigation was allowed. The keyboard selection still stopped at the third step. [Stage 3 agent runs](agent-v5.json)

The widget scout found 15 candidate tasks across six v4 development sites, including five navigation menus, five disclosures, two tab or carousel tasks, two modal tasks, and one custom select. These are discovery candidates. [Stage 4 widget discovery](widget-discovery-v5.json)

### Barrier classes

| Barrier | Local Playwright fixed / registered | Kane verified / started |
| --- | ---: | ---: |
| Hover navigation | 26 / 39 | 2 / 10 |
| Disclosures | 3 / 10 | 0 / 3 |
| Tabs and carousels | 0 / 2 | 0 / 0 |
| Modal dialogs | 0 / 2 | 0 / 0 |
| Custom listboxes | 0 / 1 | 0 / 0 |
| Other multi-step journeys | 0 / 0 | 0 / 0 |
| Single-control objectives | 35 / 48 | 0 / 0 |

### Persona lanes

| Persona | Local Playwright fixed / registered | Kane verified / started |
| --- | ---: | ---: |
| Keyboard only | 23 / 40 | 2 / 10 |
| 320px reflow | 20 / 37 | 0 / 2 |
| Reading view | 21 / 25 | 0 / 1 |

### Kane-verified real-site journeys

| Site | Journey | Class | Kane before | Kane after |
| --- | --- | --- | --- | --- |
| www.mass.edu | Open “About” from keyboard focus or with Arrow Down and follow “The DHE”. Confirm the public destination /about/aboutdhe.asp. | Hover navigation | [efcfdd9f-fe30-4b4e-a7e7-f95a0d71eba3](kane/v4-86f207deeb57-7bc09a21/before/result.json) | [cb96e3af-bc33-467f-adce-1b4d19ce6cde](kane/v4-86f207deeb57-7bc09a21/attempt-1/after/result.json) |
| csc.gov.in | Open “ABOUT” from keyboard focus or with Arrow Down and follow “About MeitY”. Confirm the public destination /meity. | Hover navigation | [ad931ab3-4cf2-4a29-92b0-6e6c9a988dbc](kane/v4-27c6f312c486-51e6e4ad/before/result.json) | [ebcd0a03-29f8-4c4f-9f6d-c068c2920ad6](kane/v4-27c6f312c486-51e6e4ad/attempt-1/after/result.json) |

### Kane cases without verification

| Site | Outcome | Reason | Recorded phases |
| --- | --- | --- | --- |
| moz.com | inconclusive | before · inconclusive · complete-journey-not-witnessed | [before inconclusive](kane/v4-8db63969d2dd-03167342/before/result.json) · [control pass](kane/v4-8db63969d2dd-03167342/control/result.json) · [attempt-1/after pass](kane/v4-8db63969d2dd-03167342/attempt-1/after/result.json) |
| www.first.org | blocked | before · blocked · Recorded browser access failed: Browser navigation error | [before blocked](kane/v4-0a57adb0d3db-c95f0ca7/before/result.json) |
| builtin.com | inconclusive | before · inconclusive · complete-journey-not-witnessed | [before inconclusive](kane/v4-8e846cd4fb4e-f025deca/before/result.json) · [control inconclusive](kane/v4-8e846cd4fb4e-f025deca/control/result.json) · [attempt-1/after inconclusive](kane/v4-8e846cd4fb4e-f025deca/attempt-1/after/result.json) · [attempt-1/after-retry inconclusive](kane/v4-8e846cd4fb4e-f025deca/attempt-1/after-retry/result.json) |
| www.earthcam.com | unresolved | control · inconclusive · complete-journey-not-witnessed | [before fail](kane/v4-785089b6fcc2-26f574b6/before/result.json) · [control inconclusive](kane/v4-785089b6fcc2-26f574b6/control/result.json) · [attempt-1/after fail](kane/v4-785089b6fcc2-26f574b6/attempt-1/after/result.json) |
| www.um-surabaya.ac.id | blocked | before · blocked · Recorded browser access failed: Browser navigation error | [before blocked](kane/v4-cc24dd9e10e4-3d3faa5f/before/result.json) |
| www.audience.io | already-accessible | before · pass · Objective completed | [before pass](kane/v4-52c7859b6fdc-1dbfa8c6/before/result.json) · [control pass](kane/v4-52c7859b6fdc-1dbfa8c6/control/result.json) · [attempt-1/after pass](kane/v4-52c7859b6fdc-1dbfa8c6/attempt-1/after/result.json) |
| www.outsystems.com | already-accessible | before · pass · Objective completed | [before pass](kane/v4-d14950f24a8c-24c68b67/before/result.json) · [control inconclusive](kane/v4-d14950f24a8c-24c68b67/control/result.json) · [attempt-1/after fail](kane/v4-d14950f24a8c-24c68b67/attempt-1/after/result.json) |
| bsky.network | inconclusive | before · inconclusive · complete-journey-not-witnessed | [before inconclusive](kane/v4-133129e4da0d-df1d4593/before/result.json) · [control pass](kane/v4-133129e4da0d-df1d4593/control/result.json) · [attempt-1/after pass](kane/v4-133129e4da0d-df1d4593/attempt-1/after/result.json) |
| www.ycombinator.com | blocked | before · blocked · Recorded browser access failed: Browser navigation error | [before blocked](kane/v4-9e4636960a02-49f50676/before/result.json) |
| www.moveworks.com | already-accessible | before · pass · Objective completed | [before pass](kane/v4-3b4eda89b814-c75d4162/before/result.json) · [control pass](kane/v4-3b4eda89b814-c75d4162/control/result.json) · [attempt-1/after inconclusive](kane/v4-3b4eda89b814-c75d4162/attempt-1/after/result.json) · [attempt-1/after-retry inconclusive](kane/v4-3b4eda89b814-c75d4162/attempt-1/after-retry/result.json) |
| raptortech.com | already-accessible | before · pass · Objective completed | [before pass](kane/v4-a2c44b1b92d5-916d2c8a/before/result.json) · [control pass](kane/v4-a2c44b1b92d5-916d2c8a/control/result.json) · [attempt-1/after pass](kane/v4-a2c44b1b92d5-916d2c8a/attempt-1/after/result.json) |
| sana.sy | budget stop | The remaining balance could not reserve all three phases above the protected floor. |  |

### Unresolved local cases

| Site | Persona | Barrier | Outcome | Last recorded reason |
| --- | --- | --- | --- | --- |
| www.vg247.com | 320px reflow | Single-control objectives | unresolved | The unique target was not visible. |
| www.class.com | Keyboard only | Tabs and carousels | unresolved | Use selectors observed in the patchable DOM. |
| www.11alive.com | 320px reflow | Single-control objectives | unresolved | The target does not fit the visible width. |
| www.elong.com | 320px reflow | Single-control objectives | unresolved | The target does not fit the visible width. |
| washingtoncitypaper.com | Keyboard only | Hover navigation | unresolved | The proposal repeated the previous rules. |
| replicate.com | Keyboard only | Tabs and carousels | already-accessible | The complete journey reached the declared outcome. |
| www.factors.ai | 320px reflow | Single-control objectives | unresolved | Checked the declared outcome after the read action. |
| www.hillspet.com | Keyboard only | Disclosures | unresolved | Journey step 2 was unavailable after the prior step. |
| www.lafayette.edu | Keyboard only | Hover navigation | unresolved | Journey step 3 was unavailable after the prior step. |
| bogos.io | 320px reflow | Hover navigation | unresolved | Journey step 1 was unavailable after the prior step. |
| www.9game.cn | 320px reflow | Single-control objectives | control-inconclusive | The unique target was not visible. |
| www.pair.com | Keyboard only | Hover navigation | control-blocked | page.goto: Timeout 15000ms exceeded. |
| suzuri.jp | Reading view | Single-control objectives | unresolved | The proposal repeated the previous rules. |
| quay.io | Reading view | Single-control objectives | unresolved | The expected usable role and name were absent from Reading view. |
| www.localstack.cloud | Keyboard only | Hover navigation | unresolved | Journey step 3 was unavailable after the prior step. |
| www.ucsfhealth.org | Reading view | Single-control objectives | unresolved | The expected usable role and name were absent from Reading view. |
| cursor.com | Keyboard only | Custom listboxes | control-blocked | The journey left the public task site. |
| www.clickcease.com | Keyboard only | Hover navigation | control-fail | locator.hover: Timeout 1500ms exceeded. |
| www.riu.com | Reading view | Single-control objectives | unresolved | The expected usable role and name were absent from Reading view. |
| rssing.com | Keyboard only | Hover navigation | control-fail | locator.click: Timeout 1500ms exceeded. |
| www.afr.com | 320px reflow | Hover navigation | unresolved | Journey step 3 was unavailable after the prior step. |
| www.howrse.com | 320px reflow | Single-control objectives | already-accessible | Checked the declared outcome after the read action. |
| www.kgw.com | 320px reflow | Single-control objectives | unresolved | The target does not fit the visible width. |
| oct8ne.com | Keyboard only | Hover navigation | unresolved | The proposal repeated the previous rules. |
| reshak.ru | 320px reflow | Hover navigation | unresolved | locator.click: Timeout 1500ms exceeded. |
| skorozvon.ru | Keyboard only | Disclosures | unresolved | Journey step 2 was unavailable after the prior step. |
| www.ukrainealarm.com | 320px reflow | Single-control objectives | unresolved | The target does not fit the visible width. |
| www.doc88.com | 320px reflow | Single-control objectives | unresolved | The target does not fit the visible width. |
| uk.yotoplay.com | Keyboard only | Disclosures | already-accessible | The complete journey reached the declared outcome. |
| www.psi.ch | Keyboard only | Modal dialogs | unresolved | The final journey outcome did not hold. |
| domains.lt | 320px reflow | Hover navigation | unresolved | Journey step 3 was unavailable after the prior step. |
| lionic.com | Keyboard only | Disclosures | unresolved | Journey step 2 was unavailable after the prior step. |
| www.skilljar.com | 320px reflow | Hover navigation | unresolved | Journey step 1 was unavailable after the prior step. |
| vietjack.com | 320px reflow | Hover navigation | unresolved | Journey step 1 extends past the visible width. |
| www.eeoc.gov | 320px reflow | Disclosures | unresolved | Journey step 2 extends past the visible width. |
| www.zype.com | Keyboard only | Disclosures | control-fail | locator.scrollIntoViewIfNeeded: Timeout 1498.0859999998938ms exceeded. |
| kingcounty.gov | Keyboard only | Modal dialogs | control-fail | locator.click: Timeout 1500ms exceeded. |
| www.airbnb.es | 320px reflow | Disclosures | unresolved | locator.evaluate: Timeout 30000ms exceeded. |

### Existing patch recheck

The local nightly path reviewed 41 active patch objectives. Outcomes included 36 still-verified, 5 inconclusive. [Per-patch records](regression-summary.json)
