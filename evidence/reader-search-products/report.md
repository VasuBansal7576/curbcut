# 127.0.0.1

In Reading view, first assert the exact row label ‘searchbox · Search products’ is present. Use that named searchbox to type speaker and submit. Confirm one result named Porch Speaker.

**Persona** screen-reader-view

**Observed barrier** The product search input has the searchbox role but no accessible name, so Reading view lacks the required row “searchbox · Search products”.

**Patch status** retired

## Recorded runs

- [before recording](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/before/recording.mp4) · [Run result](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/before/result.json) · [Kane evidence pack](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/before/cd7700b1-ff62-49cd-8aa9-e3330afe06a7.evidence) · Kane session 8bbef480-298c-45df-984e-a689a2d117dc · Kane verdict fail

- [control recording](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/control/recording.mp4) · [Run result](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/control/result.json) · [Kane evidence pack](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/control/3cd0553e-300d-4408-bd16-b885149cb86d.evidence) · Kane session 3383820e-7c36-414a-8a33-36948532bb3b · Kane verdict pass

- [after recording](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/attempt-1/after/6583edcd-d552-443f-aac4-edc0057f339a.evidence) · Kane session 8cea418d-be68-4a63-8147-befade4e56ba · Kane verdict pass

- [retirement recording](../../proof/kane/reader-search-products/2026-11-21T19-53-46.356Z/recheck-without/recording.mp4) · [Run result](../../proof/kane/reader-search-products/2026-11-21T19-53-46.356Z/recheck-without/result.json) · [Kane evidence pack](../../proof/kane/reader-search-products/2026-11-21T19-53-46.356Z/recheck-without/79a6d95b-3359-4e99-aafc-0bee274770ee.evidence) · Kane session 1e24a3cc-7e16-42a2-9112-3a23ff03fbfe · Kane verdict pass

[Runtime repair proposal](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/reader-search-products/2026-11-21T19-42-45.357Z/attempt-1/provenance.json) · Failure session 8bbef480-298c-45df-984e-a689a2d117dc

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 4.1.2 Name, Role, Value — Associate a persistent label with the control in the source. Target `#search` with value `Search products`.

Verified 2026-11-21T19:45:55.046Z
