# Curb Cut

A mouse opens ColorHexa’s color picker. A keyboard skips right over it. Curb Cut repaired the swatch in the original Chrome tab. At 146 seconds, the person who reported it could open it with Enter.

[Try the Chrome extension](https://vasubansal7576.github.io/curbcut/assets/curbcut-extension.zip) · [Install steps and interactive demo](https://vasubansal7576.github.io/curbcut/)

**YouTube demo — [add the public watch URL here]**

Kane’s keyboard run recorded the failure. “The visible swatch is a non-focusable DIV, so keyboard-only controls cannot open it.” Codex’s proposal cites that session, `3c57743a`, and adds four rules to the swatch. It gives the control keyboard focus, a button role, Enter activation and a visible focus outline. [Agent input](https://github.com/VasuBansal7576/curbcut/blob/main/proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/provenance.json) · [Codex’s four rules](https://github.com/VasuBansal7576/curbcut/blob/main/proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/agent-answer.txt)

| ColorHexa session | Result |
| --- | --- |
| [Keyboard before · 3c57743a](https://github.com/VasuBansal7576/curbcut/blob/main/proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/before/result.json) | Fail. Tab skipped the swatch. |
| [Mouse control · dedca760](https://github.com/VasuBansal7576/curbcut/blob/main/proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/control/result.json) | Pass. The picker opened. |
| [Keyboard after · cbcbc771](https://github.com/VasuBansal7576/curbcut/blob/main/proof/kane/report-d6870c43f8831c2d3b/2026-11-22T11-01-51.855Z/attempt-1/after/result.json) | Pass. Keyboard activation opened the picker. |

The installed extension applied the feed to the original tab at 144.395 seconds. Shift+Tab reached the swatch from the search field. Enter opened the color spectrum at 145.960 seconds. [Original-tab recording](https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/proof/live/chrome.mp4) · [Timeline](https://github.com/VasuBansal7576/curbcut/blob/main/proof/live/live-loop.json)

On OpenSeaMap, a shortcut opened a report draft for the skipped View menu. Grok’s proposal arrived 16.4 seconds after the local Playwright baseline. Curb Cut withheld publication until a recheck of the saved Kane trace confirmed the keyboard result. Eight Tabs skipped View with the old ZIP. The same eight revealed **Sea Marks** with the published ZIP. [Report-to-fix replay](https://github.com/VasuBansal7576/curbcut/blob/main/proof/report-to-fix/README.md)

The bundle ships **106 active fixes**. The popup links Kane recordings for 62 and local measurements for 44. On November 24, 2026, the installed-extension audit recorded 98 primary passes and seven unconfirmed results across the 105 fixes bundled that day. A site owner can export the source-change report. An unpatched Kane recheck can retire a fix once the site passes on its own. [Bundle](https://github.com/VasuBansal7576/curbcut/blob/main/extension/bundled.json) · [Dated audit](https://github.com/VasuBansal7576/curbcut/blob/main/proof/reliability/submission-extension-e2e.json) · [Recorded retirement](https://github.com/VasuBansal7576/curbcut/blob/main/proof/demo/README.md#3-retirement)
