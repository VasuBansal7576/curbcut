# Agent gate

A page can look finished while Tab skips **Add to cart**. `curbcut gate` runs tasks you specify against the running app with keyboard-only input and with Curb Cut’s screen-reader view. A failure prints Kane’s reason (or the local oracle’s reason with `--local`) and a compact DOM snippet. The coding agent should change the **source**, not a Curb Cut patch.

Point it at localhost or a public preview URL. Do not use it on login, payment, or account-creation flows.

```json
{
  "url": "http://127.0.0.1:4317/fixtures/shop/",
  "tasks": [
    "Search for headphones and add Field Headphones to the cart. Confirm Cart (1).",
    "Find the searchbox named Search products, search for speaker, and confirm one result named Porch Speaker."
  ]
}
```

The fixture config is checked in at `examples/curbcut.gate.json`. For your own app, save the example as `curbcut.gate.json`. The default personas are keyboard-only and screen-reader-view.

From the repository root, use Node.js 22 or newer, run `npm ci`, then `npx playwright install chromium`.

**Terminal 1** — start the fixture.

```sh
node curbcut.mjs serve
```

Expect `Curb Cut · http://127.0.0.1:4317/site/`. That address serves the local landing page with working proof paths. [Hosted landing page](https://vasubansal7576.github.io/curbcut/)

**Terminal 2** — run the local Gate.

```sh
node curbcut.mjs gate --local --config examples/curbcut.gate.json
```

The shop deliberately skips Add to cart. Expect a nonzero exit, a FAIL block and the control’s DOM snippet. To see the estimated live cost, replace `--local` with `--dry-run`. Remove the flag to run with an authenticated Kane CLI. [Archived Gate failure, source change and pass](../proof/demo/README.md#2-gate-in-a-coding-agent-curbcut-gate)

A failing case looks like:

```
FAIL  keyboard-only  Search for headphones and add Field Headphones to the cart. Confirm Cart (1).
reason: Tab traversal did not reach the target.
control: pass
dom:
  div.add-to-cart · div · Add to cart · tabIndex=-1
```

Fix the matching control in source (native button, accessible name, keyboard operation) and run the gate again.

## Claude Code Stop hook

Copy the [Stop hook example](../examples/claude/settings.json) into your app’s `.claude/settings.json` after installing the CLI:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curbcut gate --local --config curbcut.gate.json >&2 || exit 2"
          }
        ]
      }
    ]
  }
}
```

The command sends Gate output to stderr and returns exit code 2 on failure, so Claude Code receives the FAIL blocks and can fix the corresponding source.

## CI

```yaml
- name: Accessibility gate
  run: node curbcut.mjs gate --config curbcut.gate.json
  working-directory: .
```

Serve the app first, or set `url` in `curbcut.gate.json` to the preview URL. Use `--local` in inner-loop CI if Kane credits are not available. Keep Kane for a nightly or pre-merge job when you want recorded proof. `--json` writes the structured findings. A reusable GitHub Action posts Kane’s verdict on a pull request. [Pull request bot](pr-bot.md)

## Cursor and other coding agents

Add this to the agent’s project instructions:

> After changing UI, run `node curbcut.mjs gate --local --config curbcut.gate.json` against the running app. If the command exits non-zero, treat each FAIL block as a source bug: use the reason and the DOM snippet (selector, role, name, tabindex) to fix the page. Do not write a Curb Cut patch. Re-run the gate until it passes. Skip login, payment, and account-creation tasks.

The same instruction works for Codex, Gemini CLI, or a shell-driven agent loop.
