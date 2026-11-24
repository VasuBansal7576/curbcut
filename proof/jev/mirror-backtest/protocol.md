# Mirror-test backtest protocol

Question: can TypeSafe Jev reliably judge whether a keyboard user's end state matches a mouse user's end state for the same accessibility task?

This decides whether Curb Cut should build an in-tab mirror test that tries candidate fixes and keeps the one whose keyboard result matches the mouse result.

## Kill criterion

The idea fails if, on the frozen test split, the precision of predicting `same` is below 95% at a recall of 50% or more. Thresholds are chosen on the development split only.

## Labels

Archived Kane run directories under `proof/` that contain `before/`, `control/`, and `after/` or `attempt-N/after/`, each with `result.json` and `recording.mp4`.

- Reference: `control` with status `pass` (ordinary mouse user, no fix).
- Positive pair (`truth = same`): control final frame vs after final frame where after status is `pass` (persona with fix).
- Negative pair (`truth = different`): control final frame vs before final frame where before status is `fail` (disabled persona, no fix).
- Exclude `inconclusive` and other non-decisive statuses.
- Record recording usability: non-black final frame and not a bot/captcha challenge. Unusable pairs stay in the inventory and are excluded from scoring.

One positive and one negative pair are taken per run root when both exist. When several matching phase directories exist, the lexicographically first path is used.

## Splits

Frozen in `split.json` before any Jev call.

- Development: `hard-v4`, `heldout-v5`, and older cohorts.
- Test: `heldout-v6`, `heldout-v7`, `proof/kane`, and anything newer.

## Frames

For each recording, extract the final frame with ffmpeg into a temp directory outside the repository. Optionally also extract a frame about one second earlier. Downscale to 960×540 (aspect preserved, padded) JPEG to keep tokens modest. Delete temp frames after the run.

## Jev request

Model: `jev-latest`. Header `TypeSafe-Danger-Zone-Images: true`. State includes the task objective text (from the compare-phase `result.json`, URLs stripped to origin+path) and two image asset placeholders: image A = control final frame, image B = compare final frame.

One `noul` question per request. At most three question phrasings may be tried on the development split. One phrasing is then frozen for the test split.

Candidate phrasings (development only; freeze one before test):

1. `sameOutcome`: "Does image B show the same outcome the task asks for as image A (same panel, menu, dialog or destination open and reachable)?"
   - true: The same task outcome is visibly achieved in both frames (same panel, menu, dialog, destination, or equivalent completed state).
   - false: The frames show different outcomes, or B has not reached the outcome visible in A.

2. `sameReachableState`: "Ignoring input method chrome, does image B show the keyboard user in the same reachable end state as the mouse user in image A for this task?"
   - true: Both frames show the required destination or control state open and reachable.
   - false: B is stuck, missing the destination, or shows a different page state than A.

3. `taskCompleteMatch`: "Did both sessions complete the stated task to visually equivalent end states?"
   - true: Both end frames display the completed task outcome in an equivalent way.
   - false: Only one frame shows completion, or the completed states differ.

Rate limit: at least ~650 ms between successful image requests. Stop a failure class after two identical errors.

## Scoring

`p` = returned `noul` probability for `same`. Predict `same` when `p >= threshold`.

On development, sweep thresholds in `[0.05, 0.10, …, 0.95]` plus observed scores. Choose the operating threshold that maximizes recall among those with precision of `same` ≥ 0.95. If none qualify, choose the threshold with highest precision of `same` and record that the development gate failed.

Report on the test split: pair counts, precision and recall of `same` at the frozen threshold, AUROC of `p` for `truth = same`, optional abstention band, failure examples, and Jev token usage.

## Zero Kane credits

This study uses archived recordings and Jev only. No Kane runs.
