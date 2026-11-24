# Curb Cut — build spec

Curb Cut fixes the web for people it shuts out, from the outside, with video proof for every fix.
Kane CLI (installed: `kane-cli`, run `kane-cli --help`, `kane-cli run --help`) acts as a disabled user, runs a real task on a real site under real limits, an agent writes a declarative patch, Kane re-runs with the patch and proves the task now passes. Verified patches go into a public list that a browser extension applies for everyone.

Hackathon judging (equal weight): Ships (works end to end), Verified (Kane caught/proved something real), Closed loop (Kane result feeds back to the agent, tighter is better), Craft (a developer would install it tonight). The repo must be public later, so keep it clean.

## Hard rules
- No code comments anywhere. Self-explanatory names instead.
- No arbitrary remote JavaScript in patches. Patches are declarative JSON only.
- Public pages only. Stop before any login, payment or account creation. Low request rates.
- Never claim screen-reader parity beyond what the screen-reader view actually tests.
- Be frugal with Kane credits (`kane-cli balance`). Develop against the local fixture site first; real sites only for final proof runs.

## Components

### 1. Patch format (`patches/*.json`) + engine
One file per site. Shape:
```json
{
  "id": "example-com-add-to-cart",
  "site": "example.com",
  "match": "https://example.com/*",
  "persona": "keyboard-only",
  "task": "Using only the keyboard, search for headphones and add the first result to the cart",
  "barrier": "Add to cart is a div with a click handler; unreachable by Tab",
  "rules": [
    { "selector": "div.add-to-cart", "action": "makeFocusable" },
    { "selector": "div.add-to-cart", "action": "setRole", "value": "button" },
    { "selector": "div.add-to-cart", "action": "bindEnterToClick" }
  ],
  "status": "verified",
  "evidence": { "before": "evidence/<id>/before.mp4", "after": "evidence/<id>/after.mp4", "verifiedAt": "ISO date", "kaneRunIds": [] },
  "history": []
}
```
Allowed actions only: `addLabel`, `setRole`, `makeFocusable`, `bindEnterToClick`, `restoreFocusOutline`, `removeFocusTrap`, `setAltText`, `injectCSS`, `extendTimeout`, `setLang`, `mirrorHoverToFocus`, `toggleOnActivate`, `arrowKeyNavigation`, `dialogBehavior`, and `listboxBehavior`. Engine applies rules idempotently and re-applies on DOM mutations (MutationObserver). Same engine code is used by the extension and by the injection path Kane uses.

Status lifecycle: `candidate` → `verified` → (`broken` → re-patched) → `retired` when the task passes WITHOUT the patch (site fixed itself).

### 2. Persona harnesses (enforced, not requested)
Injected alongside the patch during Kane runs so Kane cannot cheat:
- `keyboard-only`: capture-phase listeners cancel pointer/mouse events and any `click` with `detail > 0`; keyboard-generated clicks (`detail === 0`) pass.
- `low-vision`: 400% zoom equivalent / 320px-wide viewport reflow.
- `screen-reader-view`: hides the visual page and renders a linearized accessibility-tree text view (role, accessible name, state, reading order) that is keyboard-navigable and activates the real underlying elements. Kane must complete the task using only this view.
- `color-blind` (stretch): CSS filter simulating deuteranopia.

### 3. Injection into Kane's browser
First find out how Kane's Chrome can get the patch + harness: `kane-cli config chrome-profile`, Chrome profile under `~/.testmuai/kaneai/`, loading an unpacked extension. If that is not possible, use a local MITM/rewriting proxy that injects the engine + harness + patch into HTML responses. Pick whichever works reliably and document it.

### 4. The loop (`curbcut fix <task-file>`)
1. Kane runs the task with harness, no patch → result JSON + video (before).
2. On fail, the agent receives Kane's failure output, the page DOM/a11y snapshot around the failure, and writes a candidate patch (JSON, allowed actions only). The agent is a non-interactive LLM CLI call (prefer `codex exec` with a fast model; `grok` CLI is an alternative if installed). Validate the JSON against a schema; reject anything outside allowed actions.
3. Kane re-runs with harness + patch. Pass → `verified`, save after video. Fail → feed the new Kane output back to the agent, repeat (max N iterations).
4. Also run the task once with NO harness to distinguish "site is broken for this persona" from "Kane got lost" (if it fails even with the mouse, the task itself is bad, not a barrier).

### 5. Nightly re-check (`curbcut recheck`)
For every verified patch: run without patch → if pass, mark `retired`. Run with patch → if fail, mark `broken` and invoke the loop to re-patch. Append to `history`. Provide a launchd/cron example, don't install it.

### 6. "I'm stuck" button (extension)
Hotkey in the extension captures URL, focused element, a DOM/a11y snapshot and a one-line "what I was trying to do", writes a task file (locally: download or POST to `curbcut serve` on localhost). `curbcut serve` turns it into a Kane task and runs the loop; the verified patch appears in the list and the extension picks it up.

### 7. Extension (Chrome MV3)
Loads the public patch list (bundled JSON + optional fetch of `patches/index.json` from a URL), applies matching verified patches with the engine, popup shows patches active on this page with links to before/after evidence, global on/off toggle (the demo moment), "I'm stuck" hotkey, optional screen-reader-view toggle for users.

### 8. Fixture site (`fixtures/shop/`)
A small local shop with deliberate, realistic barriers: div-button Add to cart, unlabeled search input, focus trap in a modal, invisible focus outline, session timeout, low-contrast error. Used for development, for judges to reproduce deterministically, and to demo patch retirement (a toggle that "fixes" the site itself so the patch retires).

### 9. Dashboard (`site/`)
Static page built from `patches/` + `evidence/`: sites, tasks, personas, blocked → fixed, broken/re-patched, retired, before/after videos side by side, the "Task Million" style headline numbers. Also the landing page for the launch.

### 10. Upstream evidence pack
For each verified patch generate `evidence/<id>/report.md`: task, persona, barrier, WCAG criterion, before/after video links, the equivalent source-level fix suggestion. Do not send anything anywhere.

## Real-site proof
Find real, well-known public sites where a keyboard-only or zoom task genuinely fails and loads in Kane without bot walls. Target 15+ sites; at least 3 with verified patches and before/after videos. Record honestly: if a site can't be patched declaratively, list it as a finding, don't fake it.

## Deliverables
- `README.md`: what it is, install (extension + CLI), how to reproduce on the fixture, how the loop works, results table, ethics section.
- `proof/`: an end-to-end run log showing fail → patch → pass on the fixture and on real sites, Kane run IDs, videos.
- Git repo initialized locally with sensible commits. Do NOT push to any remote.
