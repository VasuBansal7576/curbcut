# Held-out v7 Jev decisions

The seeded draw uses 100 new registrable domains from Tranco 8PW6V. The sampler screened prior cohorts and public-site exclusions before ranking the remainder by SHA-256. The draw was committed before any scout navigation. The workflow was then frozen under `curbcut-freeze-v7`, and its archive records the Git object hashes needed to reconstruct it without the original commit graph. [Sample](sample.json) · [Freeze receipt](freeze-integrity.json) · [Verifier](../../scripts/verify-v7.mjs)

The isolated Chromium scout attempted all 100 public sites and preregistered 15 tasks before requesting model decisions or reference labels. It selected the first visible unnamed target per role on each accessible site and registered qualifying documents that were missing a language declaration. [Scout ledger](scouting.json) · [Registration and reference crops](registration.json)

## Naming and language

The pinned model was `jev-1.14.0`. Naming used a choice confidence of 0.55 and required a separate decorative-image probability of 0.90 before applying an empty alternative. Generic function labels have translations in English, Spanish, French, German, Portuguese, Italian and Japanese. Page-specific candidates also work in other languages. Ambiguous candidates can abstain.

The Codex repair agent proposed names independently. A local replay established that the original target was unnamed, the added name appeared on that exact Reading view row, and undo restored the barrier. A second visual adjudication asked which control matched the proposed purpose when its wording differed from the reference. [Reference labels](references.json) · [Outcome ledger](local-summary.json)

| Target | Accepted / registered | Confirmed / accepted |
| --- | ---: | ---: |
| Empty links | 6 / 8 | 4 / 6 |
| Unnamed images | 4 / 5 | 2 / 4 |
| Empty buttons | 0 / 1 | — |
| Total | 10 / 14 | 6 / 10 |

Across 11 fully timed pages, collecting the viewport, cropping all its candidates, requesting decisions and attaching accepted names took **666 ms median** and **1,085 ms p95**. Latency covers the visible top-level document. The extension also considers newly visible candidates on scroll. Keep naming off by default. [Per-page latency and decisions](local-summary.json)

The single registered language task was independently labeled Chinese. Jev chose `zh` at 1.00 confidence. The local measurement was fail, pass after `setLang`, then fail after undo. Jev also repaired the missing language on all three previously designated English development pages. [Held-out measurement](local-summary.json) · [Development replays](../jev/language-development.json)

## Kane sample

The pool contained six semantically confirmed candidates with exact local Reading view replays. Five were selected by seeded hash rank and committed before execution. The protocol requires failing before, passing sighted pointer control, and passing after, each with validated Kane evidence. The archived eligibility experiments were outside the selection and execution. [Selection](kane-selection.json)

Kane started all five cases and verified **2 of 5**, SamCart and Vedantu. The other three remained inconclusive because the recording did not demonstrate exact target identification in a required phase. The run used **242.9756 credits**, from **2,340.3270** to **2,097.3514**. [Run ledger](kane-summary.json) · [Integrity receipt](study-integrity.json) · [SamCart before](kane/v7-aeb1dba283605e040703/before/recording.mp4) · [Control](kane/v7-aeb1dba283605e040703/control/recording.mp4) · [After](kane/v7-aeb1dba283605e040703/after/recording.mp4)

Keyboard help added a consent step after the v7 study. The v7 measurement used the archived source and the same naming policy.
