# Problem-first launch preview

[Watch the 480p cut](launch-preview.mp4) · [Edited soundtrack](launch-audio.m4a) · [English captions](launch.vtt)

The cut runs **1:58.633**. It opens on a real keyboard failure in the Stillroom shop. Kane’s keyboard, mouse and repaired keyboard runs later show the same purchase three ways. The proposed new-site “Report a barrier” sequence awaits its recording, terminal log and Kane session IDs.

## Audio edit

The voice, effects and 88 BPM music come from the original mix in `94189fb:launch/audio/master.m4a`. The score was synthesized locally. The master’s first 1:39.100 is followed by 0.133 seconds of its music bed. At preview time 1:39.233 the mix resumes from source 2:05.733. Both joins use 36 ms equal-power fades into a music-only extract from source 0:02.600. The pause between the end of the quiet line and the aligned onset of “Today” lasts about 0.36 seconds. All spoken lines come from the original take. [Edit and caption timing](../../../film/v8/problem-first/edit.py)

## Shot plan

Each time marks the first frame of a shot. The voice column gives the word or phrase at that cut.

| Start | Voice | Picture |
|---:|---|---|
| 0:00.000 | Opening | A shopper focuses the search field in Stillroom. The recorded keyboard entry starts here. |
| 0:03.333 | They press Tab | The focus ring leaves Search and jumps over the headphones’ Add to cart button. A dashed outline identifies the skipped control. |
| 0:09.633 | In 2026 | The physical orange Tab key sits alone after the failed purchase. |
| 0:11.633 | 95.9 percent | 95.9% fills the Damson field, with its top-million-home-pages denominator and WebAIM credit. |
| 0:16.800 | And almost all | The recorded menu, unnamed button and faint Details glyph appear together as examples of recurring barriers. |
| 0:20.100 | So we built | The physical Tab key and the Curb Cut wordmark share the frame. |
| 0:21.433 | It fixes | The captured Chrome extension switches on. |
| 0:26.833 | Step one | Kane repeats the shopping task. The orange ring skips the headphones and a Failed badge appears. |
| 0:33.600 | Kane tries again | Kane’s actual mouse run adds the same item; the shop displays its confirmation. |
| 0:36.667 | So the website | The mouse run opens its cart. Field Headphones is inside. |
| 0:39.100 | Step two | The agent’s recorded candidate supplies the element selector and repair. Two keycaps show what Tab and Enter will do. |
| 0:43.533 | Step three | On the repaired shop the keyboard reaches Add to cart. The native confirmation and Passed badge follow. |
| 0:49.067 | Step four | The extension’s captured Mass.edu listing identifies a verified fix and provides the before and after recordings. |
| 0:53.800 | Some barriers | The actual Mass.edu homepage establishes the new site beside the physical Tab key. |
| 0:55.933 | On mass.edu | In the original Kane recording About keeps focus. Arrow Down leaves the menu closed. |
| 1:01.100 | With Curb Cut | In the repaired recording the menu opens, then the orange ring lands on The DHE. |
| 1:04.000 | Enter | Enter navigates to the recorded About the Department of Higher Education page. |
| 1:05.633 | For blind users | A Munich Airport carousel arrow lifts into isolation. The screen reader can only announce Button. |
| 1:11.633 | On Munich Airport | The same arrow acquires the name Previous slide, in time with the spoken label. |
| 1:15.267 | Kane found it | The captured reading view shows the native German name, Vorherige Folie, beside its English translation. |
| 1:17.667 | The most common failure | The original Details glyph goes from 4.39:1 to 4.50:1 when Curb Cut nudges its colour. |
| 1:24.600 | And on pages | Two captured Meridiano controls appear without names. |
| 1:28.067 | Jev | TypeSafe Jev appears above the real controls. Menú and Buscar attach as Jev names them. |
| 1:34.967 | 13 | The two named controls hold while the result of the 15-name review appears. No new name is supplied on the quiet line. |
| 1:39.367 | Today | 105 live fixes fills the field on the number; 61 proven by Kane appears on the second sentence. |
| 1:45.200 | And every fix | The actual Mass.edu owner report slides out with its source-change recommendation and recording links. |
| 1:51.100 | When the website | The shop’s own Add to cart button works with the extension fix switched off. |
| 1:52.867 | our patch | The retirement command records the patch’s withdrawal. |
| 1:54.200 | Curb Cut | The physical Tab key returns beside Curb Cut. Verified by Kane appears on the final line. |

## Recording sources

- Stillroom’s original check includes keyboard failure, mouse success and keyboard success after the proposed fix. The ring and verdicts identify the recorded outcomes. The rule card translates the candidate’s focus and Enter actions. [Kane recording manifest](../../../footage/manifest.json) · [Rule candidate](../../../../proof/demo/check/2026-11-24T18-15-53.859Z/attempt-1/candidate.json)
- The extension sharing shot shows a bundled fix for Mass.edu. Its original failed run holds on About. The repaired run opens the menu, focuses The DHE and navigates to the department page. [Extension popup](../../../film/plates/popup-proof-and-report.png) · [Failed run](../../../../proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/before/result.json) · [Passed run](../../../../proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/attempt-1/after/result.json)
- Munich’s reading view gives the native German label. The isolated contrast glyph reproduces the two measured ratios. The Meridiano control names come from the recorded Jev example. [Reading view](../../../film/plates/reader-on.png) · [Site measurements](../../../film/plates/index.json) · [Jev capture](../../../../proof/jev/live-naming-demo/capture.json)
- The owner sheet combines the captured Mass.edu source-change recommendation with the recording links from the same extension listing. The retirement uses the shop’s own working control and the recorded recheck command. [Owner report](../../../film/plates/owner-report.png) · [Retirement evidence](../../../../proof/demo/retire/retired-patch.json)

## Rebuild the review cut

Run from the repository root with FFmpeg, Playwright Chromium, NumPy and Pillow available. Chromium uses a temporary headless profile. The review encoder writes an 854 × 480 MP4.

```sh
export FILM_CACHE="$(mktemp -d)"
python3 launch/film/v8/prepare.py
python3 launch/film/v8/problem-first/edit.py
node launch/film/v8/problem-first/preview.cjs
```
