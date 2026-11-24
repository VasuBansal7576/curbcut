# Repair cost replay

Run `node proof/cost/replay.mjs` from the repository root. It reads the v5 and v6 local archives and feeds their observations and verdicts into the current local repair loop. There are no provider calls, Kane runs, or Kane credits. [The replay output](results.json) contains the counts.

| Cohort | Tasks | Recipe | Inheritance | Agent diff | Full agent | Total fixed | Archived fixed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v5 | 142 | 0 | 0 | 0 | 99 | 99 | 99 |
| v6 | 118 | 47 | 0 | 0 | 29 | 76 | 76 |

For v5, the estimated cost dropped from 31,949 to 19,905 tokens per fixed task, about 38%. The estimate includes unsuccessful proposals and divides total estimated tokens by the number of fixed tasks. It counts each reconstructed prompt and each saved response as its UTF-8 byte length divided by four, rounded up. It uses only attempts with a saved response. The replay reuses those responses, so the estimate measures prompt size and does not show how a model would respond to the shorter prompt.

The v6 recipe reproduced all 47 archived contrast fixes. The 29 full-agent fixes reused archived image and naming proposals. The archived naming batches do not provide comparable multimodal token usage, so v6 has no tokens-per-fix estimate. The v6 coverage checks used a before measurement, an after measurement, and a failure after removing the rules. Those checks did not include an interactive pointer replay.

The v5 run used v4 templates. The v6 run used v4 and v5 templates. A replay candidate passes only when its rules match an archived candidate with a passing local verdict for that task. The archive lacks the new CDP listener and label observations and does not contain template-diff replies. A candidate with no matching archive verdict stays inconclusive. The zero inheritance and diff counts reflect this test. This replay does not measure live model quality, cache hits, family sampling, or Kane credits avoided.

## Running the cost controls

- Run `curbcut cost` to summarize the JSON records written to `.curbcut/cost/` by `check`, `fix`, and `gate`. The per-run record includes the before and after Kane balance, the balance difference, and the token counting method. A missing balance yields an unknown total. Estimated prompt savings, skipped calls, and step budget changes are recorded separately from the observed balance.
- Pass a JSON array of task objects to `curbcut fix` to group proposals by site and model. Set `CURBCUT_MODEL_SMALL` to try a smaller model on the first proposal. A failed local replay advances to the regular model.
- [The family policy](../../core/cost-policy.json) requires three distinct Kane-verified instances. A hash of the seed, template, and instance selects approximately one in five subsequent instances for Kane verification. A selected instance that fails verification returns the family to full verification. Other instances can publish with local proof and the sampling decision. Kane-verified repairs carry sealed Kane evidence.
- Repairs with a passing local pointer control can reuse the same URL’s sealed Kane mouse-control recording for the UTC day. The patch records the source task when a control is reused. A high-confidence bot challenge from the configured Jev preflight stops Kane verification.
- [Archive step limits](../../core/step-limits.json) use the 95th percentile of decisive steps plus three, capped by the existing persona limit. Types with fewer than five observations use the existing default. Regenerate the table with `node proof/cost/step-limits.mjs`.
