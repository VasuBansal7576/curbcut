# Verification protocol

Kane CLI 0.10.7 performed the live verification. The [Kane results table](../../proof/kane/README.md) gives the exact sessions for each failed baseline, passing pointer control, passing repair, and unpatched retirement. Its [session ledger](../../proof/kane/ledger.json) also records incomplete runs and the harness smoke test. The [dashboard](../../site/index.html) displays verified repairs and open findings. Each verified report links to the runtime proposal, viewport recordings, and sealed evidence packs. Some repair replays reused the baseline and pointer control from an earlier attempt at the same task. Recent run results include the exact replay instructions in `objective`.

Run `node curbcut.mjs recheck --local` for a Playwright regression check of the active Kane-verified catalog and `node scripts/extension-e2e.mjs` to audit its installed rules in isolated Chromium. [Nightly recheck](../../proof/reliability/nightly.json) · [Extension audit](../../proof/reliability/extension-e2e.json)

The familiar-site scout produced one Kane-verified repair on the National Weather Service radar. CNN and Spotify reached inconclusive baselines when their public content failed to load in the recorded browser. [Scout and Kane results](../../proof/famous/README.md)

The three Stillroom fixture tasks reached fail → repair → pass → retire in Kane. The public low-vision tasks used a locked 320 CSS pixel viewport, the reflow width equivalent to 400% zoom at a 1280px starting width. The public reading-view tasks exercised named controls in Curb Cut’s own DOM-based view. The results table lists the public keyboard repairs and the tasks still open.

With an already authenticated Kane CLI and Codex CLI, start the fixture server, then run in a second terminal:

```sh
kane-cli balance
node curbcut.mjs fix tasks/keyboard-only.json
node curbcut.mjs fix tasks/low-vision.json
node curbcut.mjs fix tasks/screen-reader-view.json
```

Public Kane task definitions are under `tasks/public/kane/` and use the same entry point. For example, run `CURBCUT_KANE_MAX_STEPS=55 node curbcut.mjs fix tasks/public/kane/online-conversion-length.json`. The earlier essay and letter tasks under `tasks/public/` have local replay evidence. The optional balance threshold is checked before every Kane phase.

Run `node curbcut.mjs preflight <task.json>` to check access in both personas with the same isolated browser and CDP attachment used by Kane. The preflight uses no Kane credits.

1. Launch Chromium with a temporary profile and inject the extension runtime before site scripts. Connect `kane-cli run --headless --agent` to that browser using `--cdp-endpoint`. The keyboard harness blocks pointer input and records trusted keypresses. The low-vision harness locks a 320 CSS pixel reflow viewport and clips horizontal scroll. The reader harness displays a modal list of accessible roles, names and state. The optional color persona applies a deuteranopia simulation.
2. Record an unpatched failure, then run a normal-browser control. Exit without publishing if the control fails, Kane returns an uncertain result, or the task already passes.
3. Give Kane’s observed steps, failure and DOM/accessibility snapshot to `codex exec` in a temporary read-only directory. The CLI proposes a barrier and rules. The app supplies scope and status, validates the JSON schema, restricts proposed selectors to the observed snapshot, and accepts only enumerated CSS properties and values.
4. Replay with the candidate. A successful, recorded task with its Kane session identifier can publish the patch. A failed replay or invalid proposal gives the agent feedback within the same three-proposal limit. Raw NDJSON, observations, sealed Kane evidence packs and viewport recordings live under `proof/kane/<id>/`. Source-level reports live under `evidence/<id>/`. The dashboard and extension feed rebuild on publication.
5. Recheck unpatched first. A pass retires the patch. If both unpatched and patched checks fail, mark the patch broken and invoke the fix loop. An inconclusive recheck stays in history without retiring the patch.

Kane’s sealed evidence pack provides its step screenshots and logs. Curb Cut records video of the same Kane-controlled Chrome tab. The adapter checks the process exit code, terminal NDJSON result, session ID, validated Kane pack, and active persona and patch. `kane-cli evidence validate --json <pack>` checks a saved pack. `kane-cli evidence serve <pack>` opens Kane’s local evidence viewer. The adapter uses Kane’s local mode for evidence retention on this machine. [Kane CLI documentation](https://www.testmuai.com/docs/kane-cli-introduction) · [Kane agent output and evidence contract](https://www.testmuai.com/docs/kane-cli-agent-mode)

To reproduce the fixture retirements, first publish the three fixture patches with the commands above. Stop the normal server and run `CURBCUT_FIXTURE_NATIVE=1 npm run serve`, which enables the site’s native repair for fresh profiles. Then recheck the fixture tasks in the other terminal.

```sh
node curbcut.mjs recheck keyboard-add-headphones
node curbcut.mjs recheck low-vision-shop-speaker
node curbcut.mjs recheck reader-search-products
```

The local demo exercises the same retirement decision through the deterministic `?fixed=1` variant. An [example cron entry](../../examples/curbcut.cron) is supplied for local installation at your discretion.

The previous nightly recheck reconfirmed 38 tasks, recorded four inconclusive results and retired one patch. [Nightly recheck](../reliability/nightly.json)

## Local demo

Use Node 22 or later, npm, and ffmpeg on your PATH. Playwright installs its own Chromium and recording binary.

```sh
npm ci
npx playwright install chromium
npm run build
npm test
npm run demo
node scripts/toggle-proof.mjs
npm run build
npm run serve
```

With the server stopped, run `node scripts/verify-evidence.mjs` to check dashboard links, 320px layout bounds and video metadata.

Open **http://127.0.0.1:4317/site/** while the server is running. The fixture is at **http://127.0.0.1:4317/fixtures/shop/**. The local demo starts the server when needed, uses the recorded CLI-agent proposals, and writes fresh videos and observations under `proof/local/`. To generate fresh proposals from new local failures, run `node scripts/local-proof.mjs --agent` with an authenticated Codex CLI. The default model is `gpt-6.2-sol`. Set `CURBCUT_MODEL` to select another available Codex model.

For the extension, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`. Open the fixture and turn on **Fixture preview** in the popup. Try the global switch while tabbing to Add to cart. Preview is opt-in and restricted to the exact local fixture origin. The popup indicates which repairs apply and links to their evidence.

**Ctrl+Shift+U** opens “I’m stuck”. Enter the task, select the persona, and confirm the page is public. Download the task JSON or send it to the local loop. Jobs live in `.curbcut/jobs/`; each job records its result or the specific blocker. The extension refreshes the verified feed periodically and on demand. The reader toggle presents a navigable, linearized DOM view of roles, accessible names and state. Its buttons and text proxies act on the underlying page. It covers the supported controls in this demo and has not been tested for parity with a screen reader.

## Local Playwright results

| Fixture task | Unpatched persona | Normal control | CLI-generated patch | Native repair, unpatched |
| --- | --- | --- | --- | --- |
| Search for headphones and add them by keyboard | Fail | Pass | Pass | Pass → retire |
| Add Porch Speaker without horizontal scrolling at 320px | Fail | Pass | Pass | Pass → retire |
| Find the named searchbox in reading view and search for speaker | Fail | Pass | Pass | Pass → retire |

Each [fixture proof folder](../../proof/local/) contains the measured state, recordings, the actual `codex exec` response and the retirement decision. The [extension recording](../../proof/local/toggle.mp4) shows the installed popup alongside the fixture.

| Public page and local reading task | Rightmost text edge before → after at 320px | Evidence |
| --- | --- | --- |
| Paul Graham, opening of *Beating the Averages* | 528px → 309px | [Before](../../proof/public/graham-essay/before.mp4) · [After](../../proof/public/graham-essay/after.mp4) |
| Peter Norvig, cross-product definitions in *Solving Every Sudoku Puzzle* | 698px → 308px | [Before](../../proof/public/norvig-sudoku/before.mp4) · [After](../../proof/public/norvig-sudoku/after.mp4) |
| Berkshire Hathaway, opening financial-results paragraph of the 1999 letter | 513px → 300px | [Before](../../proof/public/berkshire-letter/before.mp4) · [After](../../proof/public/berkshire-letter/after.mp4) |

The public replays used hand-authored candidate rules and separate fresh Chrome sessions. Each includes a passing 1280px control, text bounds, zero horizontal scroll at measurement and a matching passage digest in all three runs. These results apply to the selected passage. Run `node scripts/public-replays.mjs` to revisit the three public pages, or append one task ID from the evidence table’s folder names. Public content can change.

## Scope

Work on publicly readable pages in fresh browser profiles. Stop before login, payment or signup. Curb Cut records task-level outcomes and does not certify a site’s overall accessibility. The hosted Kane and Codex services receive the inputs needed for an explicitly started live run. Local replays with saved candidates need neither service. The reports and posts in this repository are local drafts.

The extension ships no remote JavaScript. Patch data uses a fixed action set. Site-specific repairs such as extending a timeout require a matching page mechanism, and the Escape repair supports native dialogs or an identifiable close control. Public name and interaction repairs enter the shared feed after the required Kane task replay. V6 contrast and document language repairs can enter with local browser measurements and are marked Local proof.


## V6 coverage

The v6 scout checks rendered accessible names, text contrast and document language. It commits the sample before scouting and the preflight-passing task list before repair. The contrast and language checks measure the page before applying the JSON rule, immediately after applying it and after removing it. The installed extension audit checks the same observable condition in fresh pages with the extension off and on. [V6 protocol and calibration](../heldout-v6/README.md)

The report button in the popup and `curbcut report <patch-id>` produce the same Markdown. The report identifies the rule and criterion, includes the source attribute or CSS change where applicable, and links to the evidence on GitHub. Copy and download keep the report on the user's device.
