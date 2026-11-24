# Agent gate

`curbcut gate` runs declared tasks against a running app as a keyboard user and as the screen-reader view. A failure prints Kane’s reason (or the local oracle’s reason with `--local`) and a compact DOM snippet. The coding agent should change the **source**, not a Curb Cut patch.

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

Save that as `curbcut.gate.json` in the app repo. Optional `personas` defaults to `["keyboard-only","screen-reader-view"]`.

```sh
node curbcut.mjs serve
node curbcut.mjs gate --local --config examples/curbcut.gate.json
node curbcut.mjs gate --dry-run --config curbcut.gate.json
```

`--local` uses the Playwright oracle and spends no Kane credits. Omit it to run Kane. `--dry-run` prints the derived checks and the Kane credit estimate.

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

In `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/curbcut/curbcut.mjs gate --local --config curbcut.gate.json"
          }
        ]
      }
    ]
  }
}
```

On a non-zero exit, read the FAIL blocks and change the source for those selectors. Re-run the Stop hook until the gate passes.

## CI

```yaml
- name: Accessibility gate
  run: node curbcut.mjs gate --config curbcut.gate.json
  working-directory: .
```

Serve the app first, or set `url` in `curbcut.gate.json` to the preview URL. Use `--local` in inner-loop CI if Kane credits are not available. Keep Kane for a nightly or pre-merge job when you want recorded proof.

## Cursor and other coding agents

Add this to the agent’s project instructions:

> After changing UI, run `node curbcut.mjs gate --local --config curbcut.gate.json` against the running app. If the command exits non-zero, treat each FAIL block as a source bug: use the reason and the DOM snippet (selector, role, name, tabindex) to fix the page. Do not write a Curb Cut patch. Re-run the gate until it passes. Skip login, payment, and account-creation tasks.

The same instruction works for Codex, Gemini CLI, or a shell-driven agent loop.
