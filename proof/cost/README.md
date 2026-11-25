# Repair cost replay

## Archived replay

Run `node proof/cost/replay.mjs` from the repository root. It reads the v5 and v6 local archives and feeds their observations and verdicts into the current local repair loop. There are no provider calls, Kane runs, or Kane credits. [The replay output](results.json) contains the counts.

| Cohort | Tasks | Recipe | Inheritance | Agent diff | Full agent | Total fixed | Archived fixed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v5 | 142 | 0 | 0 | 0 | 99 | 99 | 99 |
| v6 | 118 | 47 | 0 | 0 | 29 | 76 | 76 |

For v5, the estimated cost dropped from 31,949 to 19,905 tokens per fixed task, about 38%. The estimate includes unsuccessful proposals and divides total estimated tokens by the number of fixed tasks. It counts each reconstructed prompt and each saved response as its UTF-8 byte length divided by four, rounded up. It uses only attempts with a saved response. The replay reuses those responses, so the estimate measures prompt size and does not show how a model would respond to the shorter prompt.

The v6 recipe reproduced all 47 archived contrast fixes. The 29 full-agent fixes reused archived image and naming proposals. The archived naming batches do not provide comparable multimodal token usage, so v6 has no tokens-per-fix estimate. The v6 coverage checks used a before measurement, an after measurement, and a failure after removing the rules. Those checks did not include an interactive pointer replay.

The v5 run used v4 templates. The v6 run used v4 and v5 templates. A replay candidate passes only when its rules match an archived candidate with a passing local verdict for that task. The archive lacks the new CDP listener and label observations and does not contain template-diff replies. A candidate with no matching archive verdict stays inconclusive. The zero inheritance and diff counts reflect this test. This replay does not measure live model quality, cache hits, family sampling, or Kane credits avoided.

## Live browser runs

Run `node proof/cost/live.mjs` from the repository root. The script visits public pages in isolated headless Chromium profiles, with at most three sites in flight, one replay lane per site, and at least two seconds between lane starts. It uses the repository's read-only browser guard and writes [per-task verdicts](live-results.json). It does not contact the repair agent or Kane. The first 17 recipe trials ran sequentially, with a 1.25-second pause before each lane. The run resumed from those saved verdicts.

### V5 recipes

The recipe cohort uses all 89 journeys in the v5 registration. Their registered personas are 78 keyboard-only and 11 low-vision. A recipe fix requires an unpatched persona failure, an unpatched pointer pass, and passes in both patched lanes. The drift or blocked category includes inaccessible URLs, changed or ambiguous controls, already accessible tasks, and any baseline that could not establish the original barrier.

| Persona | Registered | Fixed by recipe | No recipe matched | Matched, oracle failed | Drifted or blocked |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keyboard only | 78 | 18 | 41 | 4 | 15 |
| Low vision | 11 | 0 | 7 | 4 | 0 |
| Total | 89 | 18 | 48 | 8 | 15 |

Seventeen fixes used the CSS hover recipe. One added keyboard activation to a click handler. A Chromium startup failure was retried once, and the retry did not confirm the registered barrier.

### Leave-one-site-out inheritance

The inheritance cohort groups the Kane-verified bundle by keyboard activation, `addLabel`, and CSS hover. A held-out site's templates come from live observations of the same family on other registrable domains. Donors must reproduce a persona failure with a passing control. A hit passes both patched lanes. A near miss instantiates a candidate on a confirmed barrier but does not pass both lanes. A false match is a proposed candidate on an already accessible task with a passing control, or a candidate that makes the patched control fail. False-match counts can overlap near misses. V6 coverage tasks use the direct coverage measurement in place of pointer activation.

| Family | Tasks | Sites | Hits | Near misses | False-match tasks | No template matched | No eligible donor | Drifted or blocked | No safe objective |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Keyboard activation | 15 | 12 | 0 | 0 | 0 | 8 | 0 | 4 | 3 |
| `addLabel` | 18 | 18 | 0 | 11 | 0 | 1 | 0 | 5 | 1 |
| CSS hover | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| Total | 34 | 31 | 0 | 11 | 0 | 9 | 1 | 9 | 4 |

The 11 labeling near misses accounted for 27 candidate trials. All 27 passed the patched pointer lane and failed the patched Reading view role-and-name check. The CSS hover family had one site in the verified bundle, so holding it out left no donor. The color picker was tested on the registered ColorHexa objective. Three additional ColorHexa reports lacked a bundled or registered declarative objective. The calculator objective requires form submission and was skipped.

The live study used zero Kane credits and made zero agent calls, including diff calls. Two attempts to run the fixture suite lost a shared loopback server. All 71 tests passed when a fixture server was held open for the full suite. The build and v4, v5, and v6 integrity checks also passed.

## Live Grok template diffs

### First attempt with Grok 4.5

The study gave Grok 4.5 one request for each of the 11 labeling near misses. It used the highest-ranked attempted template from the live inheritance run, the recorded oracle failure reason, and the fixed diff reply instructions. It supplied no DOM snapshot, expected label, or full task description. Valid diffs had to pass the schema, repeat, and live selector checks before running the four browser lanes. The script made no fallback proposals. [Per-task diff evidence](diff-results.json)

Both token columns estimate visible text by rounding up UTF-8 bytes divided by four for each prompt and response. The full-agent column reconstructs the untrimmed prompt using archived observations and counts each saved response for the same task, including retries. The archived full agent was Codex. These figures compare request and response size. They do not measure billed tokens or model reasoning.

| Task | Diff outcome | Grok diff tokens (est.) | Archived full-agent tokens (est.) | Archived attempts |
| --- | --- | ---: | ---: | ---: |
| `asme-org-tr2` | Not fixed, invalid patch | 158 | 10,982 | 1 |
| `cato-org-tr2` | Not fixed, invalid patch | 151 | 11,074 | 1 |
| `poets-org-tr2` | Not fixed, invalid patch | 139 | 10,801 | 1 |
| `sanantonio-library-reader` | Not fixed, name check failed | 168 | 10,369 | 1 |
| `unglobalcompact-org-tr2` | Not fixed, invalid patch | 139 | 10,454 | 1 |
| `v5-c46d9e085415a2e891b3` | Not fixed, invalid patch | 147 | 14,331 | 2 |
| `v5-cf5e31bb10aecd3af383` | Not fixed, invalid patch | 142 | 13,777 | 2 |
| `v5-da5c14f912fb3f74fbbb` | Not fixed, invalid patch | 173 | 8,613 | 1 |
| `v5-e35e95e464a0b456fb7a` | Not fixed, invalid patch | 158 | 12,722 | 2 |
| `v5-fcd52c5a5920e388762d` | Not fixed, repeated rules | 161 | 18,416 | 3 |
| `v5-fcff2ddd132fff0edeae` | Not fixed, invalid patch | 166 | 6,919 | 1 |
| Total | 0 fixed, 11 not fixed | 1,702 | 128,458 | 16 |

Grok averaged **155 estimated tokens per diff**. The archived full-agent path averaged **11,678 estimated tokens per task**, or 8,029 per saved attempt. Nine replies produced invalid patches, and one repeated the inherited rule. The one valid patch passed the patched pointer lane and failed the patched Reading view role-and-name check. The experiment spent zero Kane credits.

The first run used the scripts at commit `52f4fb1`. Its results and offline baseline are preserved in the diff evidence. The installed Grok CLI rejected two invocations that combined `--single` with `--prompt-file`. The live trials used `--prompt-file` alone after that correction.

### Bounded retry with Grok 4.6

The second run gave Grok the complete patch schema, the inherited rules verbatim, the recorded oracle failure text, and the live target text and nearby label candidates. Grok returned a complete corrected rule set in the proposal envelope. A schema error allowed one re-ask with the validator message. Each accepted candidate ran through the persona and pointer lanes with and without the patch. Both the model and the request changed between runs. [Per-task results and token counts](diff-v2-results.json)

| Task | Outcome | Invalid responses | Grok tokens per task (est.) |
| --- | --- | ---: | ---: |
| `asme-org-tr2` | Fixed | 0 | 3,563 |
| `cato-org-tr2` | Not fixed, patched pointer timed out | 0 | 3,532 |
| `poets-org-tr2` | Fixed | 0 | 3,538 |
| `sanantonio-library-reader` | Fixed | 0 | 3,545 |
| `unglobalcompact-org-tr2` | Fixed | 0 | 3,548 |
| `v5-c46d9e085415a2e891b3` | Fixed | 0 | 3,557 |
| `v5-cf5e31bb10aecd3af383` | Fixed | 0 | 3,541 |
| `v5-da5c14f912fb3f74fbbb` | Fixed | 0 | 3,616 |
| `v5-e35e95e464a0b456fb7a` | Fixed | 0 | 3,539 |
| `v5-fcd52c5a5920e388762d` | Fixed | 0 | 3,539 |
| `v5-fcff2ddd132fff0edeae` | Not fixed, persona baseline timed out and validation did not finish | 0 | 3,580 |
| Total | 9 fixed, 2 not fixed | 0 | 39,098 |

Grok averaged **3,554 estimated tokens per task**, using the same visible-text method as the first run. All 11 replies passed schema validation, so no schema re-asks were needed. The Cato persona passed with the patch, and the patched pointer lane timed out. Forumotion timed out in the persona baseline and its valid reply did not complete live selector validation. The study stopped after 11 calls and spent zero Kane credits.

Run `CURBCUT_AGENT=grok CURBCUT_MODEL=grok-4.6 node proof/cost/diff-v2.mjs` to reproduce the second run.

## Running the cost controls

- Run `curbcut cost` to summarize the JSON records written to `.curbcut/cost/` by `check`, `fix`, and `gate`. The per-run record includes the before and after Kane balance, the balance difference, and the token counting method. A missing balance yields an unknown total. Estimated prompt savings, skipped calls, and step budget changes are recorded separately from the observed balance.
- Pass a JSON array of task objects to `curbcut fix` to group proposals by site and model. The agent ladder proposes with a small or fast model first (`grok-4.5`, or Codex at low effort) and retries once with the larger model (`grok-4.6`, or Codex at medium effort) when selector validation or the local before/after check fails. `CURBCUT_LADDER=off` disables it. `curbcut cost` sums `ladder.smallModelFixes` for repairs the small model handled alone.
- [The family policy](../../core/cost-policy.json) requires three distinct Kane-verified instances. A hash of the seed, template, and instance selects approximately one in five subsequent instances for Kane verification. A selected instance that fails verification returns the family to full verification. Other instances can publish with local proof and the sampling decision. Kane-verified repairs carry sealed Kane evidence.
- Repairs with a passing local pointer control can reuse the same URL’s sealed Kane mouse-control recording for the UTC day. The patch records the source task when a control is reused. A high-confidence bot challenge from the configured Jev preflight stops Kane verification.
- [Archive step limits](../../core/step-limits.json) use the 95th percentile of decisive steps plus three, capped by the existing persona limit. Types with fewer than five observations use the existing default. Regenerate the table with `node proof/cost/step-limits.mjs`.

## Live Grok model ladder

Seed `curbcut-ladder-measure-2026-11-25` ranked 88 v5 archives that had a failing persona snapshot, a passing pointer snapshot, and a registered probe or journey. The first 20 are in [ladder-cohort.json](ladder-cohort.json): 13 keyboard, 7 naming. The list was written before any Grok call. Command: `CURBCUT_AGENT=grok node proof/cost/ladder.mjs`. Kane credits: 0.

Each selected task got one live Playwright before/control pair. A live fail/pass pair was judged twice: ladder on (`grok-4.5`, then `grok-4.6` if selector validation or the local check failed) and large-only (`CURBCUT_LADDER=off` with `grok-4.6`). A fix is a patched persona pass and a patched pointer pass. Drifted tasks kept their archived barrier but the live pointer lane no longer passed, so they were not judged.

| Mode | Judged | Fixed | Small-model-only fixes | Provider total tokens | Input+output tokens | Wall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ladder | 17 | 0 | 0 | 960,975 | 744,716 | 2,486 s (146 s/task) |
| Large-only | 17 | 0 | 0 | 838,180 | 647,303 | 3,246 s (191 s/task) |

Three of 20 live pages drifted (pointer fail or inconclusive). All 17 judged tasks failed both modes. Ten grok CLI retries ended with SIGKILL (two ladder grok-4.6 retries, eight large-only retries); those tasks still counted as not fixed after their completed first attempt. Per-fix cost is undefined (zero fixes). Ladder spent more tokens because every judged task used grok-4.5 then grok-4.6; large-only used only grok-4.6. Ladder wall time was lower because grok-4.5 replies were faster. [Per-task calls and rules](ladder-results.json)

| Task | Kind | Live check | Ladder | Large | Ladder total tokens | Large total tokens | Small-model fix |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| `v5-5a314b63f68c-905985ea` | keyboard | fail/pass | not fixed | not fixed | 61,100 | 66,808 | no |
| `v5-fcd52c5a5920e388762d` | naming | fail/pass | not fixed | not fixed | 52,353 | 49,533 | no |
| `v5-e35e95e464a0b456fb7a` | naming | fail/pass | not fixed | not fixed | 53,437 | 52,056 | no |
| `v5-f1fd2ab8e876-1c2c2a91` | keyboard | fail/pass | not fixed | not fixed | 59,867 | 67,899 | no |
| `v5-4cb45708801b-3b36ea65` | keyboard | drifted (fail/fail) | n/a | n/a | n/a | n/a | n/a |
| `v5-dac78760abc4-21826452` | keyboard | drifted (fail/inconclusive) | n/a | n/a | n/a | n/a | n/a |
| `v5-70142cc88d1f-158476bf` | keyboard | fail/pass | not fixed | not fixed | 67,922 | 70,989 | no |
| `v5-da5c14f912fb3f74fbbb` | naming | fail/pass | not fixed | not fixed | 50,005 | 50,381 | no |
| `v5-fcff2ddd132fff0edeae` | naming | fail/pass | not fixed | not fixed | 51,245 | 56,304 | no |
| `v5-a4b9c9c41e01-05222b52` | keyboard | drifted (fail/fail) | n/a | n/a | n/a | n/a | n/a |
| `v5-cc610c63de73-3721130a` | keyboard | fail/pass | not fixed | not fixed | 67,695 | 40,091 | no |
| `v5-fec042caa4d8-b98a8035` | keyboard | fail/pass | not fixed | not fixed | 62,283 | 39,519 | no |
| `v5-e2a9611c7721-9325e614` | keyboard | fail/pass | not fixed | not fixed | 69,206 | 47,008 | no |
| `v5-4d9b7cd1a38df17dc02d` | naming | fail/pass | not fixed | not fixed | 51,555 | 52,974 | no |
| `v5-6d4dfc1c610d4c45a657` | naming | fail/pass | not fixed | not fixed | 27,545 | 27,948 | no |
| `v5-7b267457c921bdee8928` | naming | fail/pass | not fixed | not fixed | 51,262 | 49,691 | no |
| `v5-c4d452c17cd0-b3a03f5d` | keyboard | fail/pass | not fixed | not fixed | 66,199 | 45,037 | no |
| `v5-d286cd4e5d75-a722d795` | keyboard | fail/pass | not fixed | not fixed | 37,623 | 41,654 | no |
| `v5-79bdf2d05394-bcd1c577` | keyboard | fail/pass | not fixed | not fixed | 61,440 | 36,600 | no |
| `v5-0954cd49ad0a-b2f105fc` | keyboard | fail/pass | not fixed | not fixed | 70,238 | 43,688 | no |

## Prompt prefix caching

The repair prompt puts the instructions, DSL reference, and example in a fixed prefix (7,655 characters, about 1,914 tokens by the UTF-8/4 estimate). Task, failure, and DOM neighbourhood JSON follow that prefix. `recordCost` stores `cached_input_tokens` when the provider reports `cached_input_tokens` or `cache_read_input_tokens`.

The earlier write-up treated two grok-4.5 calls that each read 7,808 cached tokens as proof that this prefix was cached. That reading was wrong. A 49-character trivial prompt still read 7,936 cached input tokens, so those cached tokens are the grok CLI system prompt, not our 7,655-character prefix. Prefix-first and task-first order on the same two archived tasks, two calls each, settled at 7,936 cached tokens. Ordering does not change the cached count. Cache creation was 0 on every call. Kane credits: 0. Command: `CURBCUT_AGENT=grok node proof/cost/cache.mjs`. [Call log](cache-results.json)

| Call | Order | Prompt chars | input_tokens | cache_read_input_tokens | cache_creation_input_tokens | output_tokens | total_tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | prefix then task `v5-5a314b63f68c-905985ea` | 27,802 | 19,166 | 7,808 | 0 | 2,961 | 29,935 |
| 2 | prefix then task `v5-fcd52c5a5920e388762d` | 14,635 | 14,595 | 7,808 | 0 | 314 | 22,717 |
| 3 | prefix then task `v5-5a314b63f68c-905985ea` | 27,802 | 19,039 | 7,936 | 0 | 1,141 | 28,116 |
| 4 | prefix then task `v5-fcd52c5a5920e388762d` | 14,635 | 14,465 | 7,936 | 0 | 286 | 22,687 |
| 5 | task then prefix `v5-5a314b63f68c-905985ea` | 27,802 | 19,038 | 7,936 | 0 | 3,732 | 30,706 |
| 6 | task then prefix `v5-fcd52c5a5920e388762d` | 14,635 | 14,461 | 7,936 | 0 | 532 | 22,929 |
| 7 | task then prefix `v5-5a314b63f68c-905985ea` | 27,802 | 19,036 | 7,936 | 0 | 3,668 | 30,640 |
| 8 | task then prefix `v5-fcd52c5a5920e388762d` | 14,635 | 14,464 | 7,936 | 0 | 336 | 22,736 |
| 9 | trivial `{"ok":true}` | 49 | 10,172 | 7,936 | 0 | 23 | 18,131 |
| 10 | trivial `{"ok":true}` | 49 | 10,170 | 7,936 | 0 | 23 | 18,129 |

The product parser now reads pretty-printed JSON usage as well as JSON lines.
