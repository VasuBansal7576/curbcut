# Curb Cut

**The web is broken for anyone who doesn't use a mouse. Curb Cut repairs keyboard barriers in your browser and shows the evidence behind each fix.**

Go to [Mass.edu](https://www.mass.edu/). Tab to **About**. Press **Arrow Down**, then **Tab**.

The menu never opens. Focus jumps straight past it to **Board Business**. If you navigate by keyboard, half the site doesn't exist.

Turn on Curb Cut and do it again. Focus lands on **The DHE**. Press Enter. You're in.

No site owner shipped anything. No overlay vendor asked you to trust them. The fix was verified by [Kane CLI](https://kaneclihack.sh) on the real site before it ever reached your browser.

**[Install the extension](https://vasubansal7576.github.io/curbcut/assets/curbcut-extension.zip)** · **[Watch the demo (MP4)](https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/launch/curbcut-demo.mp4)** · **[Inspect a Kane run](#receipts-not-promises)** · [Live site](https://vasubansal7576.github.io/curbcut/)

---

## Receipts, not promises

Every accessibility overlay on the market asks for the same thing: trust. Curb Cut doesn't. To earn the Kane-verified label, a repair needs three runs of the same task:

| Run | Expected |
| --- | --- |
| Keyboard, without the fix | **Fails** |
| Mouse | **Passes**, so the destination really works |
| Keyboard, with the fix | **Passes** |

If the evidence doesn’t match that pattern, the repair doesn’t earn the Kane-verified label. Kane-verified repairs link to the recordings; the other repairs link to local browser evidence.

**128 fixes ship today. 84 are proven by Kane on the live site.** The other 44 are measured in a real browser, such as contrast ratios computed from rendered pixels. [Browse every fix](https://vasubansal7576.github.io/curbcut/#evidence) · [Bundle](extension/bundled.json)

## The loop, end to end

ColorHexa's color picker works with a mouse. With a keyboard, Tab walks straight past it.

**1. Kane catches it.** Session [`3c57743a`](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/result.json) fails and says why:

> The visible swatch is a non-focusable DIV, so keyboard-only controls cannot open it.

**2. The agent reads Kane, not a guess.** Codex gets that exact session as input and writes four rules for `div.sp-replacer.sp-light`: add it to the tab order, give it the button role, bind Enter to its click, and restore its focus ring. [What Codex received](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/provenance.json) · [What it wrote](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/agent-answer.txt)

**3. Kane checks the work.** The mouse control [`dedca760`](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/result.json) passes. The repaired keyboard run [`cbcbc771`](proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/result.json) passes.

**4. It lands in the tab you already had open.** The installed extension picks up the fix at 144.4 seconds. Shift+Tab reaches the swatch, and Enter opens the picker at 146.0 seconds. No reload. [Watch it happen](https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/proof/live/chrome.mp4) · [Event timeline](proof/live/live-loop.json)

That's the whole product: **Kane finds it, the agent fixes it, Kane proves it, and the user gets it.**

It works on sites nobody has touched yet, too. On OpenSeaMap the keyboard skipped the View menu entirely. One shortcut filed the report, and Grok wrote the fix in 16 seconds. Curb Cut initially stopped at the trace check, then published the repair after rechecking Kane’s recorded runs. Now the same eight Tabs reveal **Sea Marks**. [Report, recordings and before/after packages](proof/report-to-fix/README.md)

## Fixes retire themselves

A patch is a stopgap, not a business model. Curb Cut reruns each task with its patch switched off, and when the site passes on its own, the patch retires. Site owners get a report with the exact source change to make, so they can fix it properly. [Watch a patch retire](proof/demo/README.md#3-retirement)

## For developers: a gate your agent can't talk past

Your coding agent says the UI is done. Is it, for someone on a keyboard?

```sh
curbcut gate --config curbcut.gate.json
```

Gate runs your keyboard and screen-reader tasks through Kane and hands the agent the failing selector and Kane's reason, so it fixes **your source**, not an overlay. Wire it into a [Claude Code Stop hook](docs/gate.md#claude-code-stop-hook) and the agent can't finish until Kane passes. Or drop in the [PR bot](docs/pr-bot.md) to get Kane's verdicts and recordings on every preview.

| Command | What it does |
| --- | --- |
| `curbcut check <url> "<task>"` | Reproduce, repair and verify a barrier from a plain-English task. Add `--dry-run` to see the Kane credit estimate first. |
| `curbcut gate` | Fail the build when a keyboard user can't finish a task. Add `--local` for a free Playwright pass. |
| `curbcut serve` | Receive barrier reports from the extension. |
| `curbcut verify-queue` | Turn saved reports into replayable Kane tasks. |
| `curbcut cost` | Tokens and Kane credits spent, per run. |

## Try it in 60 seconds

**The extension:**
1. [Download the ZIP](https://vasubansal7576.github.io/curbcut/assets/curbcut-extension.zip) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the folder.

Open Mass.edu and try the keys above. The popup lets you switch the fix off to compare, replay Kane's recordings, or export the fix for the site owner.

**The CLI** (Node.js 22 or newer):

```sh
git clone --depth 1 https://github.com/VasuBansal7576/curbcut.git && cd curbcut
npm ci && npx playwright install chromium

node curbcut.mjs serve   # terminal 1: demo shop on http://127.0.0.1:4317
node curbcut.mjs check http://127.0.0.1:4317/fixtures/shop/ \
  "Search for headphones and add Field Headphones to the cart. Confirm Cart (1)." --dry-run   # terminal 2
```

Drop `--dry-run` to run it live. That needs an authenticated Kane CLI and Codex (the default) or Grok (`CURBCUT_AGENT=grok`) on your PATH. [Archived run of this exact command](proof/demo/README.md)

## Scale

More than 2,500 sites scouted across seven held-out studies, with every pass, failure and blocked run archived along with Kane's reason. In the November 25 batch, Kane verified 22 more fixes on the live web. [Proof index](proof/README.md) · [November 25 batch](proof/kane-batch-2026-11-25/README.md) · [Research and experiments](proof/README.md#experimental)

---

[Architecture](ARCHITECTURE.md) · [MIT license](LICENSE)
