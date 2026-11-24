# marinespecies.org

Open “Tools” using the keyboard and read “Match taxa”.

**Persona** keyboard-only

**Observed barrier** The Tools trigger is an anchor without an href or explicit tabindex, so Tab skips it and keyboard users cannot open the dropdown containing Match taxa.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/recording.mp4) · [Run result](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/before/5fc7e627-5f68-42e0-a2f5-81b7fc99499f.evidence) · Kane session 997b7c62-125d-4613-8769-90ffafd35782 · Kane verdict fail

- [control recording](../../proof/heldout-v5/kane/v5-c22b9bdca86b-71a63d77/control/recording.mp4) · [Run result](../../proof/heldout-v5/kane/v5-c22b9bdca86b-71a63d77/control/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane/v5-c22b9bdca86b-71a63d77/control/bd95dae7-198d-4f5b-a982-2da69d4ae49d.evidence) · Kane session 1ee0357f-4309-495b-b4c5-431c7a8aee5c · Kane verdict pass

- [after recording](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/recording.mp4) · [Run result](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/result.json) · [Kane evidence pack](../../proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/after/eb14dcd6-443a-4fc5-9edc-e47e9028c267.evidence) · Kane session bc62f31e-4ff9-4ba8-880c-4dccdafe284d · Kane verdict pass

[Runtime repair proposal](../../proof/heldout-v5/local/v5-c22b9bdca86b-71a63d77/attempt-1/candidate.json) · [Repair provenance](../../proof/heldout-v5/kane/v5-c22b9bdca86b-71a63d77/attempt-1/provenance.json) · [Local Playwright failure](../../proof/heldout-v5/local/v5-c22b9bdca86b-71a63d77/before.json)

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 2.1.1 Keyboard — Use a native interactive element in the normal tab order. Target `#navigation-shared > div > div:nth-of-type(2) > ul > li:nth-of-type(7) > a`.

- 4.1.2 Name, Role, Value — Use a button to toggle the panel and announce its expanded state. Target `#navigation-shared > div > div:nth-of-type(2) > ul > li:nth-of-type(7) > a`.

Verified 2026-11-24T03:51:32.782Z
