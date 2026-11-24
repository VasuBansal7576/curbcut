# Familiar public sites

Grok 4.5 scouted 26 public tasks in local Playwright. The three strongest candidates were sent to Kane. The cases were attempted at their observed canonical URLs after the initial Spotify and CNN redirects prevented the harness from attaching.

| Site | Task | Kane outcome | Kane sessions |
| --- | --- | --- | --- |
| National Weather Service | Play the radar animation by keyboard | Verified. Ten trusted Tab presses missed the original Play control. The pointer control passed. Codex added the keyboard repair, and Kane used Tab and Enter to switch it to Pause. | [Before](../kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/before/result.json) · [Control](../kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/control/result.json) · [Verified patch and replay](../../evidence/nws-radar-play-pause/report.md) |
| CNN | Read the main and first shelf at 320 CSS pixels | Inconclusive. The recorded page became a Chrome navigation error. | [c3e6131f-35c3-46f2-bf22-55f1ed62341e](cnn-home-reflow-320.json) |
| Spotify | Read the public catalog shelf at 320 CSS pixels | Inconclusive. The catalog displayed “Something went wrong.” | [52ca7214-fecc-4761-9047-44533a81fb64](spotify-marketing-reflow-320.json) |

The first patched NWS run reached Pause, but the verification guard missed the patch match because Play had changed state. The [inconclusive run](../kane/nws-radar-play-pause/2026-11-22T10-39-10.170Z/attempt-1/after/result.json) remains in the ledger. A fresh run using the same Codex proposal confirmed the match during the interaction.

[Playwright scout ledger](scouting.json) · [Canonical URL attempts](canonical-urls.json)
