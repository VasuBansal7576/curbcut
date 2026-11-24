# DOM parity trial

The initial draw at `4977467` passed hostnames to a helper that expects URLs. The resulting zero count was invalid. Correcting the call produced 81 eligible historical domains and a separate 200-site fresh draw at `d764df9`. The historical draw was never run. [Corrected historical draw](draw.json) · [Fresh draw](fresh-draw.json)

| Measure | Result |
| --- | --- |
| Public trial cases run | 0 historical cases |
| Matching rule, no match, wrong match | Unmeasured |
| Pointer regressions and time to fix | Unmeasured |
| Independent local-oracle replays | 0 |
| Kane verified | 0 of 0 |
| Kane credits spent | 0 |

In an isolated headless smoke check, the installed extension matched a synthetic CSS hover menu with one revealed link. The link became visible with the temporary rule, and Escape concealed it again. The three bundled patch checks also passed on their canonical URLs. [Results](results.json)

## Try it

Enable Match mouse in extension options. Focus a menu trigger and press Alt+Shift+M. Chrome shows its debugger bar during the probe. Escape stops the probe or removes a temporary match. The extension queues matching rules for local Kane verification.

The probe starts keyboard traversal from the selected trigger and sends trusted ArrowDown and Tab. It skips Enter and click lanes. It verifies that the visible control set resets between attempts and restores the original focus and scroll position when it finishes. The pointer ends away from the menu. Arbitrary page-script effects can outlast these resets.
