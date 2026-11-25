# www.onlineconversion.com

In Common Length and Distance Conversions, assert that the To unit list fits entirely within the 320-pixel viewport. Without horizontal scrolling, enter 1, choose feet in From and inch in To, and activate Convert. Verify the result reads 1 feet = 12 inch.

**Persona** low-vision

**Observed barrier** At 320 pixels, the 503-pixel conversion table places the To listbox at x=329, entirely beyond the viewport.

**Patch status** verified

## Recorded runs

- [before recording](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/before/recording.mp4) · [Run result](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/before/result.json) · [Kane evidence pack](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/before/51c35a40-5daa-4ce8-a935-f8aa32db06a5.evidence) · Kane session 41a9761d-5ff9-4739-ba6b-f3b817f0f49c · Curb Cut verdict fail

- [control recording](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/control/recording.mp4) · [Run result](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/control/result.json) · [Kane evidence pack](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/control/1e2ac7e9-8903-44b5-855f-3a709b4fe1cb.evidence) · Kane session 771d8a02-576c-4f1e-849b-bb710f3f76de · Curb Cut verdict pass

- [after recording](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/attempt-1/after/recording.mp4) · [Run result](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/attempt-1/after/result.json) · [Kane evidence pack](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/attempt-1/after/5cfe9a53-f064-4eac-bfc8-93a5366e17c4.evidence) · Kane session d5820bf6-598a-4e58-b1dc-59a4564c66de · Curb Cut verdict pass

[Runtime repair proposal](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/attempt-1/candidate.json) · [Repair provenance](../../proof/kane/online-conversion-length/2026-11-21T19-47-43.889Z/attempt-1/provenance.json) · Failure session 41a9761d-5ff9-4739-ba6b-f3b817f0f49c

## Source repair and relevant WCAG criteria

A passing task captures one interaction under the recorded conditions.

- 1.4.10 Reflow — Review the source stylesheet at `div.content_left` with `width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `div.container` with `width: 100%; min-width: 0; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `div.main_content` with `width: auto; min-width: 0; max-width: 100%`.

- 1.4.10 Reflow — Review the source stylesheet at `form[name="MainForm"] table` with `display: block; width: 100%; max-width: 100%; box-sizing: border-box`.

- 1.4.10 Reflow — Review the source stylesheet at `td` with `display: block; width: auto; min-width: 0; white-space: normal`.

- 1.4.10 Reflow — Review the source stylesheet at `input` with `max-width: 100%; box-sizing: border-box`.

Verified 2026-11-21T19:50:32.928Z
