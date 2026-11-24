# Recipe census

Seed `curbcut-census-recipe-reach-2026-11-24`. Sample source proof/heldout-v5/sample.json.
Attempted 200 sample pages. Observed 103, blocked 77, failed 20.
Calibration pages with a patch URL label: 100. Labels are positives only, so recall is reported and precision is not.
Jev tokens: 858801 input, 46460 output, across 202 requests. Model jev-1.14.0. A page counts as a Jev hit when noul is at least 0.5.

Estimated share is the Jev hit rate on observed sample pages, with a Wilson 95% interval. Signal share is the deterministic detector on the same pages.

| Recipe | Patches | Signal share | Jev share | Jev 95% CI | Mean noul | Labelled | Signal recall | Jev recall |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| Low contrast text | 41 | 28.2% | 29.1% | 21.2–38.5% | 0.37 | 37 | 37/37 | 29/37 |
| Reflow overflow | 21 | 56.3% | 51.5% | 41.9–60.9% | 0.45 | 21 | 2/21 | 2/21 |
| Unnamed field | 18 | 53.4% | 51.5% | 41.9–60.9% | 0.39 | 18 | 18/18 | 18/18 |
| Clickable div as button | 13 | 45.6% | 45.6% | 36.3–55.2% | 0.44 | 12 | 11/12 | 11/12 |
| Missing image alternative | 3 | 6.8% | 6.8% | 3.3–13.4% | 0.15 | 3 | 3/3 | 3/3 |
| Missing document language | 3 | 5.8% | 5.8% | 2.7–12.1% | 0.11 | 3 | 3/3 | 3/3 |
| Arrow key navigation | 1 | 3.9% | 3.9% | 1.5–9.6% | 0.16 | 1 | 0/1 | 0/1 |
| Clickable control without a role | 1 | 45.6% | 45.6% | 36.3–55.2% | 0.46 | 1 | 1/1 | 1/1 |
| Focusable toggle | 1 | 7.8% | 7.8% | 4.0–14.6% | 0.12 | 1 | 1/1 | 1/1 |
| Hover-only menu | 1 | 68.0% | 67.0% | 57.4–75.3% | 0.59 | 1 | 1/1 | 1/1 |
| Unnamed clickable div | 1 | 27.2% | 38.8% | 30.0–48.5% | 0.34 | 1 | 1/1 | 1/1 |
| Toggle on activate | 1 | 7.8% | 7.8% | 4.0–14.6% | 0.12 | 1 | 0/1 | 0/1 |

Do not read these shares as repair success. They estimate how often a recipe’s barrier pattern appears. Agreement with labels is only as strong as the bundled-fix pages visited.
Branch t3/census-recipe-reach-estimator.
Commit e2acaeeb0554f94ff71abbdf202683878d5a56bf.
