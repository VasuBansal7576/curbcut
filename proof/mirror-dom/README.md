# DOM parity trial

The registered draw requested 30 distinct unpatched sites. It found zero eligible sites in the hard-v4 and heldout-v5 scouting ledgers. The ledgers had 39 and 44 class-1 cases respectively with a passing pointer control and a failing keyboard run. Every one was on a registrable domain in the merged extension bundle. A supplemental check of the aborted v5 ledger found five more confirmed cases, all on bundled domains.

The draw was committed as `4977467` before browser checks. The seed ranks sites by SHA-256. The filters require a public HTTPS URL, a recorded trigger selector and a safe task. Bundled domains include both bare and www hosts. [Draw](draw.json)

| Measure | Result |
| --- | --- |
| Public trial cases run | 0 of 30 requested |
| Matching rule, no match, wrong match | Unmeasured |
| Pointer regressions and time to fix | Unmeasured |
| Independent local-oracle replays | 0 |
| Kane verified | 0 of 0 |
| Kane credits spent | 0 |

In an isolated headless smoke check, the installed extension matched a synthetic CSS hover menu with one revealed link. The link became visible with the temporary rule, and Escape concealed it again. The three bundled patch checks also passed on their canonical URLs. [Results](results.json)

## Try it

Enable Match mouse in extension options. Focus a menu trigger and press Alt+Shift+M. Chrome shows its debugger bar during the probe. Escape stops the probe or removes a temporary match. The extension queues matching rules for local Kane verification.

The probe starts keyboard traversal from the selected trigger and sends trusted ArrowDown and Tab. It skips Enter and click lanes. It verifies that the visible control set resets between attempts and restores the original focus and scroll position when it finishes. The pointer ends away from the menu. Arbitrary page-script effects can outlast these resets.
