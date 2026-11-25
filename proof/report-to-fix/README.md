# Report a barrier to verified fix

**Published after rechecking the recorded evidence.** The original report-to-fix run stopped at Curb Cut's trace check. Publication and the installed-extension comparison happened later and used zero additional Kane credits.

On [OpenSeaMap](https://map.openseamap.org/), the task was to Tab to **View** in the map toolbar and confirm that the **Sea Marks** checkbox appears. The checkbox was left unchanged. The starting extension bundle contained no repair for the site.

A fresh headless Chromium profile loaded the unpacked extension. Trusted Tab presses skipped View. Ctrl+Shift+U opened the report with the URL, focused link and recent Tab presses. Browser automation filled and saved the popup form to an ephemeral loopback port. The CLI picked up the draft without edits and used Grok 4.5. [Original browser recording](browser.mp4) · [Full terminal log](terminal.log) · [Draft as received](draft.json) · [Queue result](queue-result.json)

## Kane sessions

| Lane | Session ID | Kane verdict | Live Curb Cut verdict | Kane credits | Balance before → after |
| --- | --- | --- | --- | ---: | --- |
| Unpatched keyboard | [700b66b7-5292-4f62-a065-f68e422ce5ea](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/before/result.json) | Fail | Fail | 22.363005 | 1,416.3422 → 1,389.3902 |
| Mouse hover control | [7168aa29-00c7-4051-8f07-5ef30704757e](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/control/result.json) | Pass | Pass | 17.4186525 | 1,389.3902 → 1,368.8928 |
| Patched keyboard | [006b53ce-69e2-485b-88a9-612d56890d6f](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after/result.json) | Pass | Inconclusive | 22.5098825 | 1,368.8928 → 1,344.0156 |
| Patched keyboard retry | [f9be2f79-0c82-4007-a92a-100ca4de1443](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/after-retry/result.json) | Pass | Inconclusive | 15.72694 | 1,344.0156 → 1,327.6340 |

Kane reported **78.01848 credits**. The account balance fell by **88.7082 credits**, below the 110-credit limit. The lowest observed balance was **1,327.6340**, above the 1,300 floor. All four evidence packs validated. Each run had a 20-step cap and checked the balance before launch.

## Agent patch and timing

Grok identified a toolbar list item that could only open its submenu on hover. Its patch targeted `#topmenu > ul > li:has(> img[alt="view"])` and used `makeFocusable`, `setRole` with `button`, `mirrorHoverToFocus`, `restoreFocusOutline` and `addLabel` with `View`. Local keyboard replay and the patched mouse control both passed. [Grok response](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/local/attempt-1/agent-answer.txt) · [Candidate patch](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/candidate.json)

All times are UTC on November 25, 2026. The Kane windows run from the recorded balance check to the final browser result.

| Stage | Time |
| --- | --- |
| Local report server started | 06:38:12.184 |
| Public page loaded | 06:38:14.894 |
| Keyboard skipped View | 06:38:17.232 |
| Shortcut opened the report | 06:38:18.115 |
| Draft saved | 06:38:19.351 |
| CLI balance checked and Grok selected | 06:38:21.775 |
| Local mouse and keyboard baseline complete | 06:38:27.489 |
| Grok's response saved | 06:38:43.889 |
| Local patched keyboard and pointer checks complete | 06:38:53.817 |
| Kane unpatched keyboard | 06:39:00.282–06:40:22.360 |
| Kane mouse control | 06:40:24.508–06:41:17.146 |
| Kane patched keyboard | 06:41:19.206–06:42:26.723 |
| Kane patched keyboard retry | 06:42:29.031–06:43:26.548 |
| CLI stopped before publication | 06:43:28.621 |

[Stage timestamps](timeline.json)

## What stopped publication

In the first patched run, the browser recorded a trusted Tab, the Sea Marks checkbox becoming visible and then View receiving focus. The original verifier required the visibility event to follow the focus event. The fix recognizes that exact sequence when all three events belong to the same Tab and document. Rechecking the unchanged trace gives a pass, while the retry stays inconclusive because it lacks the target focus event. The original results and terminal exit are preserved. [Trace recheck](trace-recheck.json) · [Verifier regression test](../../tests/loop.test.mjs)

In a separate headless profile, a temporary bundle used the same Grok rules and the three recorded lanes that passed the corrected check. The first three Tab presses followed the same path. The fourth Tab reached View after reloading the extension in that browser, and Sea Marks appeared with its original checked state. This replay used zero credits and did not publish the patch. An earlier temporary-bundle test used a locally verified status that the schema reserves for other types of repairs. [Local replay recording](local-reload.mp4) · [Local replay trace](local-reload.json) · [Local replay rehearsal](local-reload-rehearsal.log)

## Publication and packaged extension replay

On November 25 at 06:49:55 UTC, the normal Curb Cut publisher verified and bundled the Grok patch from the original before, mouse control and first after sessions. The publication command revalidated those three archived evidence packs and applied the corrected verifier to their unchanged traces. The archived first after run still records the original inconclusive outcome. The evidence ledger links to the later recheck and excludes the retry from the patch's evidence. [Publication log](publication.log) · [Published patch](../../patches/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147.json) · [Repair provenance](../kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1/provenance.json) · [Evidence report](../../evidence/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/report.md)

The comparison clip uses an isolated headless Chromium profile and the two actual extension ZIPs. Eight Tab presses skipped View with the pre-publication package. After replacing the unpacked files with the published package and reloading the extension, the same eight presses reached View and revealed the unchanged Sea Marks checkbox. The popup shows **Kane verified** and plays the before and after recordings. The extension's evidence URL setting pointed to the local archive so the branch's recordings could play before any remote release. The silent clip is 1920 × 1080. [Comparison clip](user-clip.mp4) · [Build hashes and captured key sequence](user-clip.json)

The active bundle contains **128 fixes**, including **84 Kane-verified** and **44 with local proof**. [Bundle](../../extension/bundled.json) · [Fix library](../../site/index.html#evidence)

## Site scouting

The World Time Buddy rehearsal saved a draft, but the input limit truncated its last character. A shorter report reached Grok and exposed the schema bug that rejected the agent's model metadata. Even after restoring focus, its click rule did not select the date in local replay. These rehearsals used zero Kane credits. [Capture rehearsal](capture-rehearsal.log) · [World Time Buddy rehearsal](world-time-rehearsal.log)

Two local backups were Lancaster's **Neighborhoods** menu and Washburn University's **Academics** menu. In temporary profiles with the installed extension, focus and ArrowDown left the selected menu item hidden, while mouse hover showed **Love Your Block Grants** and **Areas of Study**, respectively. Neither backup was sent to Kane.

## Validation

`npm test` passed all 122 tests. `npm run build` and `npm run package` passed. The evidence verifier checked 647 dashboard URLs and 232 videos. The v5, v6 and v7 integrity checks and both landing-page viewport checks passed.
