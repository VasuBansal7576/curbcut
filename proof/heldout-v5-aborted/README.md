# Interrupted v5 scouting attempt

The first v5 workflow was tagged before the sample of 2,050 sites was committed. Scouting recorded 104 completed site outcomes and then the Node process exited when Playwright reported `route.continue: Target page, context or browser has been closed` from `core/chrome.mjs`. The request callback returned a pending promise from its `try` block, so rejection during tab teardown bypassed its error handler.

The tag `curbcut-freeze-v5-aborted` preserves the first freeze at `2455f8df1843c35bd8618089aa70f8e8c9998916`. The final `curbcut-freeze-v5` freeze includes the teardown fix and a different sample seed. All 2,050 domains from this attempt are excluded from the replacement draw, including the sites beyond the completed journal. This attempt generated no registered repair tasks or Kane runs.

[First committed sample](sample.json) · [Original freeze receipt](freeze-integrity.json) · [Partial scouting journal](scouting-partial.ndjson)
