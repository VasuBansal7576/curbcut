# Visual state, Glance, and Find a service

Opt-in TypeSafe Jev features. Each setting is off by default and uses the same privacy gate as live naming: skip sign-in, payment, and pages with populated fields. Thresholds were frozen in code, then confirmed on the development fixtures, then held for the public run.

Frozen thresholds: selected 0.90, expanded 0.85, checked 0.85, disabled 0.88, invalid 0.85, error 0.80, glance yes/no 0.80, glance box 0.70, finder 0.80.

Seed `curbcut-jev-state-glance-finder-v1`. Decision model `jev-1.14.0`. Isolated headless Chromium, temporary profile, public pages and local fixtures only. No login, payment, or form submit.

## Fixture freeze

City-services fixture (`fixtures/shop/jev-state.html`): Jev applied `aria-selected=true` on Hours (0.95), `aria-invalid=true` on the red permit field (0.98, error choice 0.92), and `aria-current=page` on Permits (0.94). Custom checked, disabled, and collapsed disclosure were left untouched. 3 correct, 0 wrong, 42 abstained on that page.

Glance fixture: dialog yes at 0.90 (IoU 0.91), error yes at 0.99 (IoU 0.80), cookie 0.57 abstained. Jev boxes on that fixture, later dropped: main 0.30 abstained, primary action 0.85 (IoU 0.69).

Finder fixture: all three queries (`parking ticket`, `birth certificate`, `bulk trash`) hit literal matches inside the collapsed menu. Jev was not asked.

## Visual state sync

20 public pages drawn from earlier scouting files. 16 produced a measurement: independent.com skipped by the privacy gate (populated fields); newegg.com, sephora.com, and nytimes.com returned HTTP 403. Labels were taken from the rendered page (computed style, visible classes, native state) before any Jev request.

| Verdict | Count |
| --- | ---: |
| Correct state changes | 3 |
| Wrong state changes | 0 |
| Abstained | 677 |
| Wrong selected (worse than none) | 0 |

The three accepted changes were all `aria-current=page` on meridiano.net nav links. High floors mean almost every other candidate abstains. A wrong selected is treated as worse than none; none occurred against the CSS heuristic. The heuristic can mark several nav links current on one page, so those three are correct only relative to that label, not a screen-reader gold standard.

Kane was not started. The repair engine has no `aria-selected` action, so an after run would not apply visual state sync. Available credits 1,604.64, above the 1,300 floor. Credits used: 0.

## Glance

Ships the three yes/no items. Jump targets use the DOM: a visible `main` or `[role=main]`, otherwise the largest visible article or main-like region. Primary action is not shipped. A first-button-in-main heuristic hits the fixture Renew control and is not reliable on public pages.

Same 16 measured pages.

| Question | n | Correct | Wrong | Abstained | Ships |
| --- | ---: | ---: | ---: | ---: | --- |
| Dialog open | 16 | 14 | 2 | 0 | yes |
| Cookie banner | 16 | 15 | 0 | 1 | yes |
| Error visible | 16 | 15 | 0 | 1 | yes |
| Main content box | 16 | 2 | 0 | 14 | dropped |
| Primary action box | 16 | 0 | 3 | 13 | dropped |

Dialog false positives: woah.org, samcart.com.

Jev box questions were measured on this run, then dropped from the product: main 2/16, primary action 0/16 with 3 wrong (IoU under 0.45). The 0.70 box floor stays frozen as a historical constant. Raw box answers remain in [results.json](results.json).

## Find a service

Ten civic homepages, three questions each, registered before inference. nyc.gov and seattle.gov failed to load (6 questions dropped). 24 questions scored.

| Mode | Count |
| --- | ---: |
| Questions scored | 24 |
| Literal matches | 11 |
| Jev destinations | 6 |
| Jev abstentions | 7 |
| Unrelated destinations | 0 |
| Errors | 0 |

Literal examples: mass.gov unemployment benefits, chicago.gov jobs, austintexas.gov pay a utility bill, phila.gov trash day, cdc.gov vaccines and travelers’ health, irs.gov EIN and payment plan, usa.gov passports and unemployment.

Jev examples: mass.gov health insurance → Mass Health Connector (0.95); chicago.gov building permit → Inspections, Permitting & Licensing (0.88); austintexas.gov library card → Austin Public Library (0.99); phila.gov property tax and birth certificate; boston.gov building permit → services, applications and permits (0.97).

Abstentions (choice `none` or below 0.80): mass.gov RMV appointment (0.39); chicago.gov water bill (0.64); austintexas.gov trash pickup (0.72); boston.gov parking ticket (0.99 none) and library hours (0.92 none); cdc.gov data and statistics (0.38); irs.gov file taxes (0.64).

Literal matching is greedy. usa.gov “social security” matched a scams-and-fraud link because that copy contains the words. Relatedness here is term overlap in the chosen text or href, not a human gold label.

## Latency

Capture through decision, excluding page load.

| Call | n | p50 | p95 |
| --- | ---: | ---: | ---: |
| Visual state | 16 | 1,070 ms | 2,445 ms |
| Glance | 16 | 441 ms | 1,031 ms |
| Finder (Jev only) | 13 | 293 ms | 336 ms |

Two visual-state pages (craigslist about/sites, samcart.com) had no viewport controls and recorded 0 ms. On the 14 pages that sent a Jev request, visual-state p50 was 1,115 ms and p95 2,445 ms.

## Reproduce

```sh
npm run build
node scripts/jev-state-glance-finder.mjs
```

[Results](results.json) · [Thresholds](thresholds.json)
