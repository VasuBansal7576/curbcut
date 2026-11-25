# Accessibility repair for Reflow overflow

**Platform or theme** Reflow overflow

**Template** 8af0bf46843848432f7e

**Sites scanned** 5

## Barrier

At 320 CSS pixels, white-space: pre keeps the CMD passage on an unwrapped line, giving the code block a scroll width of 532 px within 280 px of visible width.

## Relevant WCAG criteria

- 1.4.10 Reflow

## Who it blocks

- People who use zoom or a narrow viewport

## Affected sites

- https://doc.rust-lang.org/book/ch01-02-hello-world.html — repaired locally; Kane before inconclusive (Maximum steps exceeded 11/9)
- https://doc.rust-lang.org/book/ch01-03-hello-cargo.html — repaired locally; Kane before inconclusive (Objective completed)

Sites the template did not repair:

- https://doc.rust-lang.org/book/ch02-00-guessing-game-tutorial.html — drifted or blocked (locator.isVisible: Error: strict mode violation: locator('code.language-rust.ignore') resolved to 19 elements:)
- https://doc.rust-lang.org/rust-by-example/hello.html — drifted or blocked (The unique target was not visible.)
- https://doc.rust-lang.org/cargo/getting-started/installation.html — drifted or blocked (The unique target was not visible.)

## Source change

One change in the shared platform or theme repairs every affected site.

```diff
+ code.language-cmd.hljs {
+   white-space: pre-wrap;
+ }
```

## Verification

Local Playwright repaired two of five scanned mdBook pages. Kane before-runs on those two sites were inconclusive (48.30 credits; balance 1464.64 to 1416.34).

- [Local measurement https://doc.rust-lang.org/book/ch01-02-hello-world.html](https://github.com/VasuBansal7576/curbcut/blob/main/proof/family/sites/rust-book-reflow/local-repair.json)
- [Kane before https://doc.rust-lang.org/book/ch01-02-hello-world.html](https://github.com/VasuBansal7576/curbcut/blob/main/proof/family/sites/rust-book-reflow/before/result.json)
- [Local measurement https://doc.rust-lang.org/book/ch01-03-hello-cargo.html](https://github.com/VasuBansal7576/curbcut/blob/main/proof/family/sites/family-642da9dc87705f33/local-repair.json)
- [Kane before https://doc.rust-lang.org/book/ch01-03-hello-cargo.html](https://github.com/VasuBansal7576/curbcut/blob/main/proof/family/sites/family-642da9dc87705f33/before/result.json)
