# Development regression for held-out v2

This rerun uses the original 26 held-out objectives and the 18 previously verified public repairs. These are development cases. The [original 0 of 26 result](../heldout/README.md) remains the historical held-out score.

The original cohort goes through the repair loop. The existing repairs get a fresh Kane replay with their published patch and persona. The rerun leaves the historical evidence and published patch catalog intact. The run manifest records the 44 tasks and credit limit. The loop started on `d116298`, which contains the evidence, access gate and retry changes. The final v2 freeze also includes the popup selection and registration checks.

| Archived development observation | Generic change |
| --- | --- |
| Trusted activation occurred before the browser loaded the destination in the archived [TfL](../kane/tfl-plan-journey/heldout/before/result.json), [GOV.UK](../kane/govuk-services/heldout/before/result.json) and [The Verge](../kane/theverge-menu/heldout/before/result.json) runs. The destination document contained zero keypresses. | Each document and frame sends trusted input to the Playwright session. The final document still has to prove attachment. A multi-tab run links the uniquely identified recorded outcome page to its opener. |
| The [FDIC replay](../kane/fdic-bankfind/heldout/attempt-1/after/result.json) required entering text in a textbox. Its task failed the separate activation check. | Text-entry objectives can require trusted input on a focused textbox. Click objectives still require activation. |
| The [USA.gov](../kane/usa-gov-search/heldout/before/result.json) and [consumerfinance.gov](../kane/consumerfinance-tools/heldout/before/result.json) runs ended on browser error pages after public navigation. | The session permits same-site public navigation across related hosts and checks the destination. Network and access failures remain visible as failures. |
| The archived [REI task](../heldout/README.md) failed HTTP/2 navigation, and six tasks returned Kane CAPTCHA blockers. | The local browser gate detects navigation failures, HTTP errors and visible access challenges before Kane starts. |
| Nine archived baselines passed without a patch. The Linear proposal contained empty rules. | Registration requires the same objective to fail with the unpatched persona and pass with the normal pointer. A schema or selector rejection feeds the next proposal and consumes one of the three attempts. |
| Reflow and control diagnosis needed context beyond the first elements in DOM order. | The snapshot prioritizes the target and focused control, nearby elements and computed overflow geometry. |

Local Playwright checks reproduced the fixture barrier for each persona and returned no barrier against the matching native repair. An additional fixture check exercised SPA scope changes, trusted input inside a shadow root in a subframe and an ffprobe-validated recording across two tabs.

The new TfL run kept two trusted activations from the homepage and passed on the destination where the current document still recorded zero. The new USA.gov run reached the same-site search host and identified a reading-view task failure. The pointer control also failed to verify the result.

The Asana replay reached the patch agent after a failed baseline and passing control. All three responses had empty rule arrays. The validator retained the first, second, and third rejections. The run remained unresolved.

## Completed development results

**Development rerun fixed 0 of 26 old held-out tasks.** 13 already-accessible · 7 blocked · 1 unresolved · 5 inconclusive.

**12 of 18 existing repairs passed a fresh patched replay.** 12 still works · 1 blocked · 5 inconclusive.

Kane balance went from 6428.4876 to 5304.5725 credits. The difference was 1123.9151 credits.

[Machine-readable results](summary.json)

| Development set | Task | Outcome | Evidence and Kane sessions |
| --- | --- | --- | --- |
| old held-out | aljazeera-menu | already-accessible · Objective completed | before pass · bed01e2d-1678-4a42-8aae-6ec552cb1a89 |
| old held-out | arstechnica-search | blocked · HTTP 405 | before blocked · local Playwright |
| old held-out | asana-product-nav | unresolved · Invalid patch proposal: [{"instancePath":"/rules","schemaPath":"#/properties/rules/minItems","keyword":"minItems","params":{"limit":1},"message":"must NOT have fewer than 1 items"}] | before fail · 6372d25b-8712-4ddf-8466-b2de8f248b9f<br>control pass · 431c6867-869c-49c4-9187-c7ba36f61327 |
| old held-out | axios-open-search | blocked · HTTP 403 | before blocked · local Playwright |
| old held-out | bankofengland-rates | blocked · HTTP 403 | before blocked · local Playwright |
| verified repair | calculator-net-add-days | still works · AP(text) failed: | existing-repair pass · 8bfce661-46aa-478c-a632-cbb683809d5d |
| old held-out | canada-ca-menu | already-accessible · Objective completed | before pass · 105b040f-a219-40ac-8672-114258cab80f |
| verified repair | colorhexa-open-picker | still works · Objective completed | existing-repair pass · ad1dd160-e716-4186-8500-88bbc86f69ff |
| old held-out | consumerfinance-tools | already-accessible · Objective completed | before pass · fb16abf3-b6f3-44d0-a340-9295ac15a8ba |
| old held-out | crateandbarrel-search | blocked · HTTP 403 | before blocked · local Playwright |
| old held-out | csmonitor-main-menu | already-accessible · Objective completed | before pass · 9c4196ea-50b0-44b0-a89c-ad3e39a5f4bc |
| old held-out | edx-explore | already-accessible · Objective completed | before pass · e0e6c76c-3a26-46a0-a1df-915801cadbb7 |
| old held-out | fdic-bankfind | inconclusive · Could not confirm the persona and repair state on the recorded outcome page. | before inconclusive · c78a4873-1198-441f-bec7-5e88830cdcb1 |
| old held-out | federalreserve-press | already-accessible · Objective completed | before pass · 2240ca60-b6c2-4c1d-be71-8709dbffcaca |
| verified repair | fourmilab-prepare-latitude | still works · Objective completed | existing-repair pass · 755d1feb-538f-4f4c-9114-0137caf3f510 |
| verified repair | geeksforgeeks-open-search | still works · Objective completed | existing-repair pass · 1f2824da-789b-4232-807a-529415b24f20 |
| old held-out | govuk-services | already-accessible · Objective completed | before pass · 512b08c6-d7d1-4a51-8d86-03111643d228 |
| old held-out | jcrew-shop-nav | already-accessible · Objective completed | before pass · fa04525b-0241-402e-8c5b-2aa3f34ec8b7 |
| old held-out | khanacademy-topics | inconclusive · AP determined agent is stuck — no viable actions remain | before inconclusive · 13260a0f-440f-42a5-a7b4-9f7574634966 |
| verified repair | kidderminster-application-faq | blocked · page.goto: Timeout 30000ms exceeded. | existing-repair blocked · local Playwright |
| old held-out | linear-app-features | already-accessible · Objective completed | before pass · 59ab553d-24b9-4f26-9198-fd9a02d05113 |
| verified repair | meteoblue-weather-radar | inconclusive · Child agent failed: Maximum steps exceeded (21/18) | existing-repair inconclusive · 209b164f-b65b-4cd8-9b4b-e4b78be27c4c |
| verified repair | mynoise-open-menu | still works · Objective completed | existing-repair pass · 123d3ae1-232a-4f35-8c91-a12d92800060 |
| old held-out | nationalrail-timetable | already-accessible · Objective completed | before pass · d4b34338-a403-467f-8216-801cb0385ccb |
| old held-out | notion-marketing-cta | already-accessible · Objective completed | before pass · 2291dd26-88c9-40bd-96ed-d2c2b318b5fe |
| verified repair | nws-radar-play-pause | still works · Objective completed | existing-repair pass · d67387fc-a3be-4bb3-a568-43a948f2db0d |
| verified repair | online-conversion-length | still works · Objective completed | existing-repair pass · f2c957ca-4a41-434a-a946-dba9b6d506aa |
| old held-out | open-ac-uk-courses | blocked · HTTP 403 | before blocked · local Playwright |
| old held-out | patagonia-product-cta | inconclusive · The recorded baseline did not include the required trusted Tab traversal. | before inconclusive · 4de0957f-50a8-4a7c-83ae-d14b5fa35a83 |
| verified repair | procurement-journey-considerations | inconclusive · Maximum steps exceeded (25/18) | existing-repair inconclusive · 554a5d20-a848-44b1-941f-0dc3c1b98cac |
| old held-out | rei-open-search | blocked · page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://www.rei.com/ | before blocked · local Playwright |
| verified repair | report-605ca95e172608f662 | still works · Objective completed | existing-repair pass · d04e3ee3-88a1-42bb-b103-5f0c7feeb328 |
| verified repair | report-cb10e18073d48f295a | still works · Objective completed | existing-repair pass · 7ae020a1-4003-4da5-9e78-391bb6393b0e |
| verified repair | report-d6870c43f8831c2d3b | still works · Objective completed | existing-repair pass · c0bb1f4d-aa26-4c3b-ad79-8506724f9aaf |
| old held-out | rome2rio-search | blocked · HTTP 403 | before blocked · local Playwright |
| verified repair | sfmta-pause-carousel | inconclusive · Maximum steps exceeded (22/18) | existing-repair inconclusive · f7d3d0df-17cb-4382-86a1-84bcc1824bbb |
| verified repair | statcounter-edit-chart | still works · Objective completed | existing-repair pass · 9f9c646c-ecb9-44c5-ba0c-f323da9f5d44 |
| old held-out | tfl-plan-journey | already-accessible · Objective completed | before pass · fc956cee-ea5b-44a6-b83a-a53cc71b398b |
| old held-out | theverge-menu | already-accessible · Objective completed | before pass · 448bef4a-9a8b-4ab6-b099-28a4dc5e88c1 |
| verified repair | unitconverters-length | still works · Objective completed | existing-repair pass · 62b50f29-8281-410e-aaff-1c8debd5bf86 |
| old held-out | usa-gov-search | inconclusive · Final verification failed: "results appear" | before fail · 548eaa13-d2cf-4581-9180-fc0f8916fad4<br>control fail · 2a71ac98-5758-4509-beda-2d6d35ea259b |
| verified repair | ventusky-precipitation | inconclusive · Maximum steps exceeded (27/18) | existing-repair inconclusive · 5ca56951-b8e2-4bf8-aa9e-5c4eab73bd31 |
| verified repair | w3schools-select-swatch | inconclusive · Could not confirm the persona and repair state on the recorded outcome page. | existing-repair inconclusive · 9425dd56-80ff-4648-ae1a-369a52a07f35 |
| old held-out | wired-top-story | inconclusive · Could not confirm the persona and repair state on the recorded outcome page. | before inconclusive · ed53b5bb-22d0-4c51-854a-60a3e2477fcf |
