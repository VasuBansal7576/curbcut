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
- Pass a JSON array of task objects to `curbcut fix` to group proposals by site and model. Set `CURBCUT_MODEL_SMALL` to try a smaller model on the first proposal. A failed local replay advances to the regular model.
- [The family policy](../../core/cost-policy.json) requires three distinct Kane-verified instances. A hash of the seed, template, and instance selects approximately one in five subsequent instances for Kane verification. A selected instance that fails verification returns the family to full verification. Other instances can publish with local proof and the sampling decision. Kane-verified repairs carry sealed Kane evidence.
- Repairs with a passing local pointer control can reuse the same URL’s sealed Kane mouse-control recording for the UTC day. The patch records the source task when a control is reused. A high-confidence bot challenge from the configured Jev preflight stops Kane verification.
- [Archive step limits](../../core/step-limits.json) use the 95th percentile of decisive steps plus three, capped by the existing persona limit. Types with fewer than five observations use the existing default. Regenerate the table with `node proof/cost/step-limits.mjs`.
