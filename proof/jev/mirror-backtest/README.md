# Mirror-test Jev backtest

Can Jev tell whether a keyboard end frame matches a mouse end frame for the same accessibility task?

## Kill criterion

The idea fails if test-split precision of `same` is below 95% at a recall of 50% or more.

## Result

**Kill criterion met. Do not build the in-tab mirror test.**

No test threshold reaches precision ≥ 95% together with recall ≥ 50%. At recall ≥ 50%, the best precision of `same` is **66.7%** (threshold 0.25, recall 59.5%).

| Split | Usable pairs | Scored | Precision of same | Recall of same | AUROC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 58 | 58 | 100.0% | 29.4% | 0.722 |
| Test | 95 | 95 | 75.0% | 40.5% | 0.753 |

Frozen phrasing: `taskCompleteMatch` (“Did both sessions complete the stated task to visually equivalent end states?”)  
Frozen threshold: **0.35** (chosen on development only; no phrasing passed the development gate of precision ≥ 95% at recall ≥ 50%)  
At that threshold on test: precision **75.0%**, recall **40.5%**, AUROC **0.753**.

Jev usage across 269 scored requests: **898143** input tokens, **5380** output tokens, **903523** total.

## Why it fails

Final frames from mouse-control passes and keyboard before/after runs often look alike: same URL chrome, cookie banners, and page shell, with the task outcome only a small region. Jev’s calibrated `same` scores overlap heavily (test AUROC ≈ 0.75). High precision is only available at very low recall.

## Method

Protocol and split were committed in `c685101` before any Jev call. Labels: control `pass` is the mouse reference; after `pass` is `same`; before `fail` is `different`. Inconclusive runs were excluded. All 153 inventoried pairs had usable (non-black) recordings. Up to three question phrasings were tried on development; `taskCompleteMatch` was frozen for test. Temp frames lived under `/tmp/curbcut-mirror-frames` and were deleted after scoring. Zero Kane credits.

## Files

- [protocol.md](protocol.md)
- [split.json](split.json)
- [results.json](results.json)
- [journal.json](journal.json)
