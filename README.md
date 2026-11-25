# Curb Cut

On Mass.edu, Tab to **About**, press **Arrow Down**, then **Tab**. The keyboard skips the submenu and lands on **Board Business**. Turn on Curb Cut and repeat. Focus lands on **The DHE**. Press Enter to follow the link.

Curb Cut is a Chrome extension that repairs controls in the page you already have open. Its CLI gives a coding agent the failed task, checks the repair, and saves the evidence you can inspect in the popup.

**[Try the extension](https://vasubansal7576.github.io/curbcut/assets/curbcut-extension.zip)** · **[Inspect a Kane run](#inspect-a-kane-run)** · [Try the interactive comparison](https://vasubansal7576.github.io/curbcut/)

**YouTube demo — [add the public watch URL here]**

## Try the extension

1. Download and unzip the [extension ZIP](https://vasubansal7576.github.io/curbcut/assets/curbcut-extension.zip) on a computer with Chrome.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.

Open Mass.edu and try the keys above. The toolbar popup lets you switch the fix off, replay the keyboard and mouse runs, or export the source change for the site owner. [Open Mass.edu](https://www.mass.edu/) · [Read the Mass.edu report](evidence/v4-86f207deeb57-7bc09a21/report.md)

## Inspect a Kane run

**ColorHexa’s picker worked with a mouse. Tab skipped the swatch.** Kane recorded the reason in session `3c57743a` and Codex’s proposal cites that exact session.

> The visible swatch is a non-focusable DIV, so keyboard-only controls cannot open it.

Codex wrote four rules for `div.sp-replacer.sp-light`. They put the swatch in the tab order, give it the button role, bind Enter to its click action, and restore its focus outline. [Agent input and session ID](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/provenance.json) · [Four-rule answer](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/agent-answer.txt)

| Kane session | What happened |
| --- | --- |
| [Keyboard before · 3c57743a](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/result.json) | Fail. The keyboard could not open the swatch. |
| [Mouse control · dedca760](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/result.json) | Pass. Clicking the swatch opened the picker. |
| [Keyboard after · cbcbc771](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/result.json) | Pass. The repaired swatch accepted keyboard activation. |

**Back in the original tab**, the installed extension picked up the published fix at 144.395 seconds. Shift+Tab from the search field reached the swatch. Enter opened the picker at 145.960 seconds. [Watch the original tab](https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/proof/live/chrome.mp4) · [Event timeline](proof/live/live-loop.json)

On **OpenSeaMap**, a shortcut opened a report draft. Grok wrote the View-menu fix 16.4 seconds after the local Playwright baseline finished. Curb Cut accepted the saved Kane trace after rechecking its event order. The same eight Tabs that skipped View with the old ZIP revealed **Sea Marks** with the published ZIP. [Report, recordings and package comparison](proof/report-to-fix/README.md)

## What Kane does

1. **Reproduce.** Run the task with the affected input method and capture where it breaks. The ColorHexa agent received that failure reason.
2. **Control.** Try the same task with a mouse to establish that the destination works.
3. **Verify.** Replay the task with the proposed rule installed. Curb Cut checks the trace and archives the result, recording and evidence pack.
4. **Retire.** Run the task again with the patch switched off. When the site passes unaided, Curb Cut can retire the rule. [Watch a patch retire](proof/demo/README.md#3-retirement)

The extension ships **106 active fixes**. **62** have Kane recordings and **44** have local browser measurements. Each library entry links its evidence. [Browse the fix library](https://vasubansal7576.github.io/curbcut/#evidence) · [Bundle](extension/bundled.json)

## Run the developer fixture

From a checkout with Node.js 22 or newer, run `npm ci` and `npx playwright install chromium`. A live Check needs an authenticated Kane CLI and your chosen repair agent on PATH (Codex by default, or Grok with `CURBCUT_AGENT=grok`).

**Terminal 1** — serve the shop and local report receiver from the repository root.

```sh
node curbcut.mjs serve
```

It prints `Curb Cut · http://127.0.0.1:4317/site/`. Open that address to preview the landing page with its sibling proof and recording directories. [Public Pages deployment](https://vasubansal7576.github.io/curbcut/)

**Terminal 2** — inspect the plan before spending credits.

```sh
node curbcut.mjs check http://127.0.0.1:4317/fixtures/shop/ "Search for headphones and add Field Headphones to the cart. Confirm Cart (1)." --dry-run
```

Expect `check dry-run`, the target selector, and estimated Kane credits. Remove `--dry-run` for the live repair. The archived fresh-clone run ended with `check verified` and published the repair. [Fixture replay and terminal results](proof/demo/README.md)

To check a source change, run Gate against the shop or your preview. The Claude Code Stop hook, pull request bot and scheduled retirement check are opt-in integrations. [Gate and Stop hook](docs/gate.md) · [PR bot](docs/pr-bot.md) · [Example cron entry](examples/curbcut.cron)

[Proof index and cohort results](proof/README.md) · [Experimental results](proof/README.md#experimental) · [Architecture](ARCHITECTURE.md) · [MIT license](LICENSE)
