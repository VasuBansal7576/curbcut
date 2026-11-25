# Family scan

`curbcut family <listfile-or-urls...> --template <family-id>` applies one inherited template across public sites that share a platform or theme. It uses headless Chromium with a temporary profile, records which sites the one source change repairs, and writes [one owner report](report.md). `--kane` verifies at most two repaired sites under the family sampling policy (`core/cost-policy.json`: three Kane-verified instances, then about one in five), with a hard cap of 80 Kane credits and a floor of 1,380 remaining credits.

## mdBook / Rust docs run

Template `rust-book-reflow` (`8af0bf46843848432f7e`), persona low-vision, CSS `white-space: pre-wrap` on highlighted code. URL list: [urls.txt](urls.txt). Command: `node curbcut.mjs family proof/family/urls.txt --template rust-book-reflow --kane`.

Local Playwright (fail without the template, pass with it, pointer control pass):

| Site | Local | Kane |
| --- | --- | --- |
| https://doc.rust-lang.org/book/ch01-02-hello-world.html | repaired (`code.language-cmd.hljs`) | inconclusive, 23.83 credits, before: Maximum steps exceeded (11/9) |
| https://doc.rust-lang.org/book/ch01-03-hello-cargo.html | repaired (`code.language-console.hljs`) | inconclusive, 24.47 credits, before: Objective completed |
| https://doc.rust-lang.org/book/ch02-00-guessing-game-tutorial.html | drifted: `code.language-rust.ignore` matched 19 elements | skipped |
| https://doc.rust-lang.org/rust-by-example/hello.html | drifted: unique target not visible | skipped |
| https://doc.rust-lang.org/cargo/getting-started/installation.html | drifted: unique target not visible | skipped |

Scanned 5, locally repaired 2, Kane-verified 0 of 2 sampled sites. Kane credits: 48.30 used (1464.64 → 1416.34). Floor 1,380 held. Sampling mode was full (one prior verified donor, below the three-instance threshold), so both repaired sites were selected; the 80-credit budget and two-site cap allowed both before-only runs.

The shared source change is still `white-space: pre-wrap` on mdBook highlighted code. Hello World uses `code.language-cmd.hljs`; Hello Cargo uses `code.language-console.hljs`. [Owner report](report.md) · [Machine results](results.json) · [Hello World local measurement](sites/rust-book-reflow/local-repair.json) · [Hello Cargo local measurement](sites/family-642da9dc87705f33/local-repair.json) · [Hello World Kane before](sites/rust-book-reflow/before/result.json) · [Hello Cargo Kane before](sites/family-642da9dc87705f33/before/result.json)
