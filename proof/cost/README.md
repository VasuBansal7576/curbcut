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

## Running the cost controls

- Run `curbcut cost` to summarize the JSON records written to `.curbcut/cost/` by `check`, `fix`, and `gate`. The per-run record includes the before and after Kane balance, the balance difference, and the token counting method. A missing balance yields an unknown total. Estimated prompt savings, skipped calls, and step budget changes are recorded separately from the observed balance.
- Pass a JSON array of task objects to `curbcut fix` to group proposals by site and model. Set `CURBCUT_MODEL_SMALL` to try a smaller model on the first proposal. A failed local replay advances to the regular model.
- [The family policy](../../core/cost-policy.json) requires three distinct Kane-verified instances. A hash of the seed, template, and instance selects approximately one in five subsequent instances for Kane verification. A selected instance that fails verification returns the family to full verification. Other instances can publish with local proof and the sampling decision. Kane-verified repairs carry sealed Kane evidence.
- Repairs with a passing local pointer control can reuse the same URL’s sealed Kane mouse-control recording for the UTC day. The patch records the source task when a control is reused. A high-confidence bot challenge from the configured Jev preflight stops Kane verification.
- [Archive step limits](../../core/step-limits.json) use the 95th percentile of decisive steps plus three, capped by the existing persona limit. Types with fewer than five observations use the existing default. Regenerate the table with `node proof/cost/step-limits.mjs`.
