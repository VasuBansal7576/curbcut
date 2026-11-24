# Curb Cut

Curb Cut is a Chrome extension that fixes accessibility barriers on public websites and shows the Kane CLI recordings for each fix.

[![Watch the Curb Cut launch film](launch/curbcut-launch-thumbnail.png)](launch/curbcut-launch.mp4)

[Watch the 2-minute film](launch/curbcut-launch.mp4) · [Watch the 15-second cut](launch/curbcut-launch-15s.mp4)\
Watch on YouTube: (link coming)

## The problem

A menu that opens only on hover can block keyboard users, and an unlabeled search box can leave screen reader users guessing. People who zoom can lose text and controls off the edge of the page. In 2026, WebAIM detected WCAG failures on 95.9% of the million home pages it tested. [WebAIM Million](https://webaim.org/projects/million/)

## How it works

1. Kane tries a task with the keyboard and records where it fails.
2. Kane repeats the task with a mouse. A pass isolates the barrier to keyboard use.
3. A Codex agent writes declarative JSON rules for the browser to apply.
4. Kane passes the keyboard replay with the rules in place. The extension ships the verified fix.

[Verification protocol](proof/methodology/README.md) · [Session ledger](proof/kane/ledger.json)

## Results

| Check | Result | Proof |
| --- | --- | --- |
| Held-out v5 | With the code frozen, local Playwright scouted 2,050 preregistered sites and confirmed **99 of 142 repairs (69.7%)**, including **51 of 89 multi-step journeys (57.3%)**. | [Results by barrier class and persona](proof/heldout-v5/README.md#local-playwright-results) |
| Kane sample | Kane verified **11 of 20** randomly selected, locally fixed held-out v5 cases: 6 screen reader labels, 4 zoom reflows and 1 of 5 keyboard journeys (Holafly tabs). Three failed the rule and six were inconclusive. | [Registration and per-case results](proof/heldout-v5/README.md#seeded-kane-sample) |
| Live fixes | The extension bundles **54** active Kane-verified fixes. All 11 new fixes failed off and passed on in the installed extension. The prior audit passed all 43 original fixes. San Antonio Public Library can be slow to load. | [New extension audit](proof/heldout-v5/kane-sample-20/extension-e2e.json) · [Prior extension audit](proof/reliability/extension-e2e.json) · [Kane sessions](proof/kane/README.md#verified-public-repairs) |

The original Kane sample verified **0 of 4**. WoRMS and TikFinity hit the step limit, Kaizheng Law lacked evidence of the full task, and the credit guard stopped Mordor Intelligence before it ran. The 50-step rerun verified **1 of 2**, WoRMS. TikFinity’s baseline missed the required Arrow Down and its patched run ended with an agent error. [Original sample](proof/heldout-v5/README.md#kane-verification) · [50-step rerun](proof/heldout-v5/README.md#post-amendment-kane-rerun)

## See it yourself

- **mass.edu.** Open About with the keyboard and follow “The DHE.” [Before](proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/before/recording.mp4) · [After](proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/after/recording.mp4)
- **csc.gov.in.** Open ABOUT with the keyboard and follow “About MeitY.” [Before](proof/hard-v4/kane/v4-27c6f312c486-51e6e4ad/before/recording.mp4) · [After](proof/hard-v4/kane/v4-27c6f312c486-51e6e4ad/attempt-1/after/recording.mp4)
- **WoRMS.** Tab to Tools, open it and reach “Match taxa.” [Before](proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/recording.mp4) · [After](proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/recording.mp4)

[Evidence dashboard](site/index.html) · [Recorded live report](proof/live/README.md)

## Try it

Run these commands from the repository root with Node 22 or later.

```sh
npm ci
npm test
npm run build
```

1. In Chrome, open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select [`extension/`](extension/).
4. Open one of the sites above and use the Curb Cut popup to turn the fix off and on while you repeat the task.

For the fixture demo, install Chromium with `npx playwright install chromium`, then run `npm run demo`. Run `npm run serve` to open the dashboard at `http://127.0.0.1:4317/site/`. [Local replay and Kane commands](proof/methodology/README.md#local-demo)

## Check our numbers

- `node scripts/verify-v5.mjs` reconstructs the frozen Git objects and checks the hashes for the preregistered site sample, task registration and Kane selection. [Freeze and registration](proof/heldout-v5/README.md#sample-and-registration)
- `node scripts/verify-evidence.mjs` checks dashboard links, layout at 320px and recording metadata. Run it with the demo server stopped and Chromium and ffmpeg installed.
- `node scripts/extension-e2e.mjs` audits the installed rules against live pages in isolated Chromium. It replays the registered tasks for the new fixes with the extension off and on. Pass patch IDs to audit just those fixes. [New extension audit](proof/heldout-v5/kane-sample-20/extension-e2e.json) · [Prior extension audit](proof/reliability/extension-e2e.json)

## Limits

Local Playwright confirmed 3 of 11 modal fixes and 5 of 14 tab and carousel fixes. Kane can hit its step limit or return an agent error before it can verify a task. The reading view uses the page’s DOM and has yet to be tested for screen reader parity. Each result covers a specific task under the recorded conditions. [Local and Kane results](proof/heldout-v5/README.md)

## Earlier cohorts

- V4 recorded 64/102 local repairs and 2/21 Kane verifications. [V4 proof](proof/hard-v4/README.md)
- V3 recorded 10/23 Kane verifications. [V3 proof](proof/heldout-v3/README.md)
- V2 recorded 13/39 Kane verifications. [V2 proof](proof/heldout-v2/README.md)
- The original test recorded 0/26 Kane verifications. [Original proof](proof/heldout/README.md)
