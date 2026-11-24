# Curb Cut launch posts

## Hacker News

**Show HN: Curb Cut opens hover-only menus to keyboard users**

Try reaching “The DHE” from the About menu on Mass.edu with just a keyboard. Tab finds About. Arrow Down leaves the menu closed. With Curb Cut enabled, the same keys expose the menu, Tab reaches The DHE, and Enter opens the department page. CSC.gov.in had the same problem with About MeitY. The film includes the key presses and Kane’s independent before and after runs. [Watch the film](curbcut-launch.mp4)

We froze the repair code and tried it on 2,050 previously unseen Tranco sites. Local Playwright tests confirmed automatic fixes for 99 of 142 registered barriers. On the 89 hard journeys, 51 passed. That includes 31 of 43 hover menus, 11 of 20 disclosures, 5 of 14 tabs or carousels, 3 of 11 modal dialogs, and the one custom listbox. [Local results](../proof/heldout-v5/local-summary.json)

Kane verified 0 of 4 selected cases in the original v5 sample. With its step limit raised to 50, Kane recorded the keyboard skipping Tools on the World Register of Marine Species and opening it to “Match taxa” with the repair. Shipping requires a failed baseline, a passing pointer control and a passing repaired journey. Across releases, 43 Kane-verified fixes are live in the extension. A nightly replay with the patch switched off tells us when the site has fixed itself and the repair can retire. [Kane evidence and rerun protocol](../proof/heldout-v5/README.md#post-amendment-kane-rerun)

## X thread

1. On Mass.edu, Tab reaches About. Arrow Down leaves it closed. With Curb Cut, Tab reaches “The DHE” inside the open menu and Enter lands on the page. See the same keys with repairs off and on. [15-second film](curbcut-launch-15s.mp4)
2. CSC.gov.in’s ABOUT menu blocked keyboard users too. Kane recorded a failing baseline and a passing keyboard replay that reached About MeitY. [Before and after evidence](../proof/hard-v4/README.md)
3. Frozen code, 2,050 previously unseen sites. Local Playwright tests confirmed 99 fixes for 142 registered barriers, including 51 of 89 hard journeys. [Local results](../proof/heldout-v5/local-summary.json)
4. Kane verified 0 of 4 in the original v5 draw. On a rerun with a 50-step limit, the WoRMS keyboard test failed without the fix and passed with it. “Match taxa” appeared under Tools. Across releases, 43 fixes are live in the extension. [Full film](curbcut-launch.mp4)

## LinkedIn

Imagine tabbing to a government website’s About menu. A mouse user can open it. Your keyboard reaches the label, then skips straight to the next menu. Every link inside is out of reach.

We recorded that journey on Mass.edu and CSC.gov.in. On Mass.edu, enabling Curb Cut made the submenu visible as focus moved into it. Pressing Enter on “The DHE” opened the Department of Higher Education page. Kane independently recorded the failure and the repaired journey on both sites. [Watch the before and after](curbcut-launch.mp4)

We froze the code before testing 2,050 previously unseen sites. Local Playwright tests confirmed 99 automatic repairs among 142 registered barriers. That includes 51 of 89 hard journeys across hover menus, expanding panels, tabs and carousels, modal dialogs and custom listboxes. [Read the local results](../proof/heldout-v5/local-summary.json)

Kane verified 0 of 4 selected cases in the original v5 sample. In a rerun with a 50-step limit, Kane recorded a keyboard skipping the Tools menu on the World Register of Marine Species. With the fix applied, the keyboard opened Tools and revealed “Match taxa.” Across releases, 43 Kane-verified fixes are live in the extension. A nightly replay with the patch disabled checks whether the site can now complete the task on its own. When it can, the patch retires. [Inspect the rerun](../proof/heldout-v5/README.md#post-amendment-kane-rerun)
