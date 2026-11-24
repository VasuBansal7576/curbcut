# Held-out generalization v2

**Held-out v2: 13 of 39 fixed automatically.**

13 fixed · 0 unpatchable · 1 no barrier · 25 Kane error · 1 blocked · 0 budget stop · 0 pending · 0 running.

The [original held-out cohort](../heldout/README.md) fixed 0 of 26 tasks. The registered objectives and local Playwright scouting evidence were committed before the first v2 Kane run.
Registration required a passing pointer control and a failing persona replay. Tasks blocked by the local gate before their first Kane session are reported outside the denominator. Later access, agent and evidence failures count. Locally accessible scouting candidates were rejected before registration.

Frozen source and prompt at `c85c935fe8d274c59daf2619b89ab41d6385ae14` (`heldout-v2-freeze`). Registration commit `dc9c7e189c9efdff87965f30f2d427080558bad7`. Objective digest `e7036828165a3b560214e40d6788a02e235ead47a38fa3b0880e5e500fabae2e`.
Kane balance moved from 5304.57 to 3505.94 credits. The difference was 1798.63 credits.
The freeze audit records the Git path history and working tree check through the cohort end.

| Site | Persona | Registered objective | Outcome | Evidence and Kane sessions |
| --- | --- | --- | --- | --- |
| www.caltech.edu | keyboard-only | Use Tab and Enter to reach and activate “READ FULL ARTICLE”. Verify the public destination at /about/news/caltech-names-the-bridget-and-william-coughran-department-of-computing-mathematical-sciences. | Kane error · Maximum steps exceeded (24/16) | [before inconclusive · 8ecf7992-ac17-4ed4-b132-90f1d3c40861](../../proof/kane/caltech-home-keyboard/heldout-v2/before/result.json) |
| www.vanderbilt.edu | keyboard-only | Use Tab and Enter to reach and activate “Prospective Grad & Professional”. Verify its controlled content becomes visible. | Kane error · Maximum steps exceeded (21/16) | [before inconclusive · 42be871c-2644-4967-9bcb-cc58a1a196b3](../../proof/kane/vanderbilt-home-keyboard/heldout-v2/before/result.json) |
| multcolib.org | screen-reader-view | In Reading view, locate the textbox named “Search books, movies and more.”. Enter the text test and confirm the field contains it. Do not submit. | Kane error · The required accessible control was absent from the recorded Reading view interaction. | [before inconclusive · b70c06ee-5116-443f-b4e8-a5e21d03d875](../../proof/kane/multcolib-reader/heldout-v2/before/result.json) |
| www.newscientist.com | screen-reader-view | In Reading view, locate the textbox named “Enter search keywords”. Enter the text test and confirm the field contains it. Do not submit. | Kane error · The required accessible control was absent from the recorded Reading view interaction. | [before inconclusive · 22d52ddd-536f-4696-b742-a4166d0f3b13](../../proof/kane/newscientist-reader/heldout-v2/before/result.json) |
| www.pgcmls.info | screen-reader-view | In Reading view, locate the textbox named “Search PGCMLS.info...”. Enter the text test and confirm the field contains it. Do not submit. | Kane error · The required accessible control was absent from the recorded Reading view interaction. | [before inconclusive · 714ea761-09da-462d-98dd-60ec4e1de864](../../proof/kane/pgcmls-reader/heldout-v2/before/result.json) |
| www.tcpl.org | screen-reader-view | In Reading view, locate the textbox named “Search books, videos, etc.”. Enter the text test and confirm the field contains it. Do not submit. | blocked · HTTP 403 | before · local blocked |
| www.indypl.org | screen-reader-view | In Reading view, locate the textbox named “Search”. Enter the text test and confirm the field contains it. Do not submit. | Kane error · The required accessible control was absent from the recorded Reading view interaction. | [before inconclusive · 12f84d32-188c-47b8-aa08-63076de2fa92](../../proof/kane/indypl-reader/heldout-v2/before/result.json) |
| www.mysapl.org | screen-reader-view | In Reading view, locate the textbox named “Search Catalog”. Enter the text test and confirm the field contains it. Do not submit. | fixed | [before fail · d7b5a631-abdd-41c0-b714-94d511df5b15](../../proof/kane/sanantonio-library-reader/heldout-v2/before/result.json)<br>[control pass · b58e7824-0ce9-4f71-a23e-6db155779cd0](../../proof/kane/sanantonio-library-reader/heldout-v2/control/result.json)<br>[attempt-1/after pass · 36fb53a9-1e55-4230-a9da-8cdd3de7a8ce](../../proof/kane/sanantonio-library-reader/heldout-v2/attempt-1/after/result.json) |
| www.ovhcloud.com | screen-reader-view | In Reading view, locate the textbox named “Search for a domain name”. Enter the text test and confirm the field contains it. Do not submit. | Kane error · The run did not produce a validated Kane evidence pack. | [before inconclusive · 79f3f597-3011-4bc0-9db0-201ab0af5854](../../proof/kane/ovh-reader/heldout-v2/before/result.json) |
| www.openbsd.org | low-vision | At 320 CSS pixels, read the passage beginning “From: user@example.com To: bugs@openbsd.org Subject: 3.3-beta panics on a SPARCStation2 OpenBSD”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 6a2d7209-1ee5-4bd1-b65e-7b4cf9c371fd](../../proof/kane/openbsd-faq-reflow/heldout-v2/before/result.json)<br>[control pass · 8f980a9e-99aa-4842-b3a0-057bde42f302](../../proof/kane/openbsd-faq-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 96a83db9-497a-4b81-aade-25ca01e8f12f](../../proof/kane/openbsd-faq-reflow/heldout-v2/attempt-1/after/result.json) |
| www.gao.gov | low-vision | At 320 CSS pixels, read the passage beginning “Learn about our role in the government, plus our history, performance,”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · e5d68f72-1bf5-4190-bd36-68a0daf94235](../../proof/kane/gao-about-reflow/heldout-v2/before/result.json)<br>[control pass · 097e438b-77d5-4b9b-b9c6-4ba130ad25c5](../../proof/kane/gao-about-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 4084e3f0-cb28-4c46-a536-62fb61d9cc85](../../proof/kane/gao-about-reflow/heldout-v2/attempt-1/after/result.json) |
| www.getty.edu | low-vision | At 320 CSS pixels, read the passage beginning “Getty Foundation Grants that advance the arts around the world”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The declared outcome held despite the failed checkpoint. | [before fail · 9d031bf6-ad53-4b02-8478-8b047973c904](../../proof/kane/getty-about-reflow/heldout-v2/before/result.json)<br>[control pass · 3a433988-4c2f-4bf7-b5f5-ec05686444f2](../../proof/kane/getty-about-reflow/heldout-v2/control/result.json)<br>[attempt-1/after inconclusive · 122d0955-4cfc-4571-9e88-b708633b8765](../../proof/kane/getty-about-reflow/heldout-v2/attempt-1/after/result.json) |
| daringfireball.net | low-vision | At 320 CSS pixels, read the passage beginning “The best way to get a feel for Markdown’s formatting syntax”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · Could not confirm the persona and repair state on the recorded outcome page. | [before inconclusive · 1f4e41e2-4636-4372-8b28-65fd031111a8](../../proof/kane/daringfireball-reflow/heldout-v2/before/result.json) |
| htdp.org | low-vision | At 320 CSS pixels, read the passage beginning “function call:expected a function after the open parenthesis, found a number”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 51f6f29f-8f4e-43ca-8518-036c9c3069c5](../../proof/kane/htdp-reflow/heldout-v2/before/result.json)<br>[control pass · ddc1f68e-d0de-47ec-ad42-6cbbe562f7b7](../../proof/kane/htdp-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · dae2063b-f9b1-4e68-b8eb-a17f7cf646bc](../../proof/kane/htdp-reflow/heldout-v2/attempt-1/after/result.json) |
| mathworld.wolfram.com | low-vision | At 320 CSS pixels, read the passage beginning “Chudnovsky and Chudnovsky (1984)”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The declared outcome held despite the failed checkpoint. | [before inconclusive · a3ec803e-184b-48af-98e4-d5895e040e7e](../../proof/kane/mathworld-pi-reflow/heldout-v2/before/result.json) |
| www.sqlite.org | low-vision | At 320 CSS pixels, read the passage beginning “INSERT INTO t1 VALUES((SELECT max(a) FROM t1)+1,123);”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The run did not produce a validated Kane evidence pack. | [before fail · 7b8423da-96d5-4644-a07c-4361a0b2eaab](../../proof/kane/sqlite-faq-reflow/heldout-v2/before/result.json)<br>[control pass · f1357e3f-b0b7-4176-ba83-17805d7b7602](../../proof/kane/sqlite-faq-reflow/heldout-v2/control/result.json)<br>[attempt-1/after inconclusive · 350d2d42-a46e-484e-aeb3-d2119820b41e](../../proof/kane/sqlite-faq-reflow/heldout-v2/attempt-1/after/result.json) |
| gwern.net | low-vision | At 320 CSS pixels, read the passage beginning “feedback <- read.csv("https://gwern.net/doc/traffic/2013-gwern-gwernnet-anonymousfeedback.csv", colClasses=c("”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The declared outcome held despite the failed checkpoint. | [before fail · 94e8c14d-67d8-4d76-8cb4-04ac5eece3dd](../../proof/kane/gwern-about-reflow/heldout-v2/before/result.json)<br>[control inconclusive · f29b2a5d-891d-44ec-a068-a4c5334a213b](../../proof/kane/gwern-about-reflow/heldout-v2/control/result.json) |
| algs4.cs.princeton.edu | low-vision | At 320 CSS pixels, read the passage beginning “% java Scale mandrill.jpg 200 400”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 035de390-b0b6-417d-a112-45ca76f46841](../../proof/kane/sedgewick-reflow/heldout-v2/before/result.json)<br>[control pass · 7b66edf0-0f93-4681-a93b-57ec96d56626](../../proof/kane/sedgewick-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 2a86e20d-930b-47c0-a192-0c7836f51718](../../proof/kane/sedgewick-reflow/heldout-v2/attempt-1/after/result.json) |
| www.lua.org | low-vision | At 320 CSS pixels, read the passage beginning “chunk ::= block block ::= {stat} [retstat] stat ::= ‘;’ \|”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · b83f00cf-c90e-49d4-8ae2-4a6a4f310fc0](../../proof/kane/lua-manual-reflow/heldout-v2/before/result.json)<br>[control pass · 3472d244-23e5-41fa-8a90-587c7aa5d2cb](../../proof/kane/lua-manual-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 06702ffd-7a8c-4145-b63e-a070b5bc9912](../../proof/kane/lua-manual-reflow/heldout-v2/attempt-1/after/result.json) |
| slatestarcodex.com | low-vision | At 320 CSS pixels, read the passage beginning “Scott Elliot says: July 30, 2014 at 1:16 am ~new~ This”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The task outcome checks did not pass in the recorded browser. | [before inconclusive · 493e0dec-1a83-471a-94ce-9a6e0da8c5ac](../../proof/kane/slatestarcodex-moloch-reflow/heldout-v2/before/result.json) |
| perldoc.perl.org | low-vision | At 320 CSS pixels, read the passage beginning “. a single character \s a whitespace character (space, tab, newline,”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The run did not produce a validated Kane evidence pack. | [before fail · 87f4df81-cabe-49f2-8d33-c09213b955be](../../proof/kane/perl-intro-reflow/heldout-v2/before/result.json)<br>[control pass · 3d477beb-cc46-4ab2-a3bb-2a717a30c8e0](../../proof/kane/perl-intro-reflow/heldout-v2/control/result.json)<br>[attempt-1/after inconclusive · 21848d31-adab-46b6-b9f1-c11997a3b64a](../../proof/kane/perl-intro-reflow/heldout-v2/attempt-1/after/result.json) |
| fs.blog | low-vision | At 320 CSS pixels, read the passage beginning “Mastering the best of what other people have already figured out”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · Recorded browser access failed: Visible CAPTCHA or verification frame | [before inconclusive · 3498fb15-1923-47f4-b654-4416f7fb6503](../../proof/kane/fsblog-models-reflow/heldout-v2/before/result.json) |
| nginx.org | low-vision | At 320 CSS pixels, read the passage beginning “listen 127.0.0.1 default_server accept_filter=dataready backlog=1024;”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The task outcome checks did not pass in the recorded browser. | [before inconclusive · 5e1c4aee-116f-4865-a7a0-b4fde5a5ffce](../../proof/kane/nginx-core-reflow/heldout-v2/before/result.json) |
| martinfowler.com | low-vision | At 320 CSS pixels, read the passage beginning “Usually the best way to fix the build is to revert”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · f031352b-1b1b-4bb9-939a-7a3759d03f2f](../../proof/kane/martinfowler-reflow/heldout-v2/before/result.json)<br>[control pass · 505fae71-bccf-4078-a602-00017edef53b](../../proof/kane/martinfowler-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · a0edaaf1-3574-41b5-9d46-96f41f93a543](../../proof/kane/martinfowler-reflow/heldout-v2/attempt-1/after/result.json) |
| httpd.apache.org | low-vision | At 320 CSS pixels, read the passage beginning “#Example (default format for threaded MPMs) ErrorLogFormat "[%{u}t] [%-m:%l] [pid %P:tid”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · Maximum steps exceeded (17/16) | [before fail · ceb47001-a759-4915-82cd-d5a3e1609545](../../proof/kane/apache-core-reflow/heldout-v2/before/result.json)<br>[control pass · 1e6667cc-997c-4ab1-a891-576806f401e1](../../proof/kane/apache-core-reflow/heldout-v2/control/result.json)<br>[attempt-1/after inconclusive · fe0b3da9-784d-4ff3-ae01-a6a6591e4e9d](../../proof/kane/apache-core-reflow/heldout-v2/attempt-1/after/result.json) |
| nullprogram.com | low-vision | At 320 CSS pixels, read the passage beginning “echo -ne '\x31\xFF\xB8\x3C\x00\x00\x00\x0F\x05' >> true”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 369f3837-a6c7-4b5e-bb0a-d975ac08b4e3](../../proof/kane/nullprogram-reflow/heldout-v2/before/result.json)<br>[control pass · c4dd0c0e-bd90-4d6a-917f-12de14adde81](../../proof/kane/nullprogram-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 067d24f5-232c-4616-956e-fcd3f47259dc](../../proof/kane/nullprogram-reflow/heldout-v2/attempt-1/after/result.json) |
| www.iana.org | low-vision | At 320 CSS pixels, read the passage beginning “ANCP Port Management Functions”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The task outcome checks did not pass in the recorded browser. | [before inconclusive · adb1f0e6-ac76-44e5-bfbf-e8d39f49156a](../../proof/kane/iana-protocols-reflow/heldout-v2/before/result.json) |
| beepb00p.xyz | low-vision | At 320 CSS pixels, read the passage beginning “org-emms: org-mode link handler to start playback at certain timestamp, could”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · Maximum steps exceeded (17/16) | [before inconclusive · 568d5806-d9e1-4e04-95de-a3f19bcdf5a0](../../proof/kane/beepb00p-reflow/heldout-v2/before/result.json) |
| www.unicode.org | low-vision | At 320 CSS pixels, read the passage beginning “Tech Site \| Site Map \| Search”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · c2ffd38a-25c1-4c2e-a1ba-038995c281fd](../../proof/kane/unicode-standard-reflow/heldout-v2/before/result.json)<br>[control pass · 40d95c87-85fa-46e5-a225-98c1de0d5c4c](../../proof/kane/unicode-standard-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · c7f3783a-11cb-483c-a120-5b385f7b671e](../../proof/kane/unicode-standard-reflow/heldout-v2/attempt-1/after/result.json) |
| docs.python.org | low-vision | At 320 CSS pixels, read the passage beginning “>>> s = 'First line.\nSecond line.' # \n means newline >>>”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The run did not produce a validated Kane evidence pack. | [before inconclusive · 007ca52b-9c44-44e7-9ad6-6666cbe9253e](../../proof/kane/python-tutorial-reflow/heldout-v2/before/result.json) |
| www.json.org | low-vision | At 320 CSS pixels, read the passage beginning “character '0020' . '10FFFF' - '"' - '\' '\' escape”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 958472fb-1e46-4b72-9362-607e7279835e](../../proof/kane/json-org-reflow/heldout-v2/before/result.json)<br>[control pass · 09eb1f7d-1193-42dc-836a-37d12b02df0b](../../proof/kane/json-org-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 78b04afa-fc98-4b0d-a235-492f5e6024d4](../../proof/kane/json-org-reflow/heldout-v2/attempt-1/after/result.json) |
| yaml.org | low-vision | At 320 CSS pixels, read the passage beginning “{ "A null": null, "Also a null": null, "Not a null":”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The task outcome checks did not pass in the recorded browser. | [before fail · 79aee301-3eec-48e0-a7de-3ecc0b82a078](../../proof/kane/yaml-org-reflow/heldout-v2/before/result.json)<br>[control pass · 983760e3-11b6-4c7f-945e-0a11abf5014f](../../proof/kane/yaml-org-reflow/heldout-v2/control/result.json)<br>[attempt-1/after inconclusive · 562ce53d-5a10-4438-a7a6-efff6bd22068](../../proof/kane/yaml-org-reflow/heldout-v2/attempt-1/after/result.json) |
| toml.io | low-vision | At 320 CSS pixels, read the passage beginning “# On a Unix system, the above multi-line string will most”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The declared outcome held despite the failed checkpoint. | [before fail · b376b3cc-53bc-4b22-abae-97d2fb120d85](../../proof/kane/toml-io-reflow/heldout-v2/before/result.json)<br>[control inconclusive · 402448c5-51d5-406d-b635-754bc489f6ec](../../proof/kane/toml-io-reflow/heldout-v2/control/result.json) |
| commonmark.org | low-vision | At 320 CSS pixels, read the passage beginning “# code block print '3 backticks or' print 'indent 4 spaces'”. Verify the complete passage fits within the visible width using vertical scrolling only. | no barrier · Objective completed | [before pass · 65deb014-40c4-4593-a4b0-b0e39f6b378a](../../proof/kane/commonmark-reflow/heldout-v2/before/result.json) |
| dom.spec.whatwg.org | low-vision | At 320 CSS pixels, read the passage beginning “If interface is an ASCII case-insensitive match for any of the”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The run did not produce a validated Kane evidence pack. | [before inconclusive · d33d6f83-912f-47a6-8217-a9c08372d667](../../proof/kane/whatwg-dom-reflow/heldout-v2/before/result.json) |
| go.dev | low-vision | At 320 CSS pixels, read the passage beginning “// Allocate the top-level slice, the same as before. picture :=”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 4019a447-a62c-4231-9e75-dc0de126a000](../../proof/kane/go-doc-reflow/heldout-v2/before/result.json)<br>[control pass · 8f57b6d1-c998-4265-a932-fb1707ef5cd7](../../proof/kane/go-doc-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 3d9e0e3a-5caf-4ca2-9268-f58699eb8e7c](../../proof/kane/go-doc-reflow/heldout-v2/attempt-1/after/result.json) |
| doc.rust-lang.org | low-vision | At 320 CSS pixels, read the passage beginning “> dir /B %= the /B option says to only show”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · e4ff09da-ae37-4e6b-b609-a5a30ed3e76e](../../proof/kane/rust-book-reflow/heldout-v2/before/result.json)<br>[control pass · fa72607f-1dab-4294-b288-def12605c76c](../../proof/kane/rust-book-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · b04ddb19-6c75-405e-b78b-2f18d11b124e](../../proof/kane/rust-book-reflow/heldout-v2/attempt-1/after/result.json) |
| dwm.suckless.org | low-vision | At 320 CSS pixels, read the passage beginning “https://cannibalcandy.wordpress.com/2012/04/26/installing-and-configuring-dwm-under-ubuntu/”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · Recorded browser access failed: Browser navigation error | [before inconclusive · f6feeae5-e9c7-4efd-ab71-8fc2c285cbd9](../../proof/kane/dwm-suckless-reflow/heldout-v2/before/result.json) |
| docs.racket-lang.org | low-vision | At 320 CSS pixels, read the passage beginning “If you’ve used DrRacket before with something other than a program”. Verify the complete passage fits within the visible width using vertical scrolling only. | Kane error · The task outcome checks did not pass in the recorded browser. | [before inconclusive · 1dcc1b89-19a6-4b46-a341-73ea8fb2c308](../../proof/kane/racket-guide-reflow/heldout-v2/before/result.json) |
| guide.elm-lang.org | low-vision | At 320 CSS pixels, read the passage beginning “> madlib animal adjective = \| "The ostentatious " ++ animal”. Verify the complete passage fits within the visible width using vertical scrolling only. | fixed | [before fail · 2a8eb0a4-fbb3-42c1-af11-b39a952069a4](../../proof/kane/elm-reflow/heldout-v2/before/result.json)<br>[control pass · 6a2c9caa-d27f-4bc0-a18a-d651b3593374](../../proof/kane/elm-reflow/heldout-v2/control/result.json)<br>[attempt-1/after pass · 075dfc0d-46dc-47f2-966e-0f3a6cd38830](../../proof/kane/elm-reflow/heldout-v2/attempt-1/after/result.json) |

## What the run measured

The 13 repairs comprise 12 reflow tasks and one Reading view task. Both keyboard runs exceeded the 16-step limit. Of the 25 Kane errors, 13 came from disagreement between Kane and the recorded task checks, five lacked a validated evidence pack, four exceeded the step limit, two encountered access failures and one lacked confirmed persona or repair state. The registered selection procedure describes the mix. The results apply to these prescreened tasks.

The 40 registered tasks produced 77 distinct Kane sessions. The local preflight blocked one registered task before Kane, so the scored denominator is 39. The CommonMark baseline passed in Kane and remains in the denominator because its task qualified at scouting.

## Scouting exclusions

276 inconclusive · 102 blocked · 1 superseded · 1 no barrier · 7 eligible alternate.

| Candidate | Persona | Disposition | Observation |
| --- | --- | --- | --- |
| https://www.yale.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.princeton.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.columbia.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.cornell.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.uchicago.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.brown.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://home.dartmouth.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.duke.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.northwestern.edu/ | keyboard-only | inconclusive | The unique target was not visible. |
| https://www.jhu.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.georgetown.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.emory.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://umich.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.ucla.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.utexas.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.gatech.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.cmu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.caltech.edu/ | keyboard-only | superseded | Rechecked with a selector that keeps matching when the repair changes tabindex. |
| https://www.rice.edu/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.moma.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.tate.org.uk/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.britishmuseum.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.rijksmuseum.nl/en | keyboard-only | inconclusive | No measurable target was found. |
| https://www.guggenheim.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.vam.ac.uk/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.septa.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://trimet.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.caltrain.com/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.rtd-denver.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://new.mta.info/ | keyboard-only | blocked | HTTP 403 |
| https://www.gotransit.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.viarail.ca/en | keyboard-only | inconclusive | No measurable target was found. |
| https://www.bahn.de/en | keyboard-only | inconclusive | No measurable target was found. |
| https://www.seattle.gov/ | keyboard-only | blocked | HTTP 403 |
| https://www.boston.gov/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.chicago.gov/ | keyboard-only | inconclusive | Checked the declared outcome after the click action. |
| https://www.phila.gov/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.austintexas.gov/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.portland.gov/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.london.gov.uk/ | keyboard-only | blocked | HTTP 403 |
| https://www.latimes.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.seattletimes.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.bostonglobe.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.chicagotribune.com/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.washingtonpost.com/ | keyboard-only | blocked | page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://www.washingtonpost.com/ |
| https://www.poetryfoundation.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.britannica.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.merriam-webster.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.nypl.org/ | keyboard-only | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.bklynlibrary.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.lapl.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.chipublib.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://sfpl.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://kcls.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.denverlibrary.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://houstonlibrary.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://cpl.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.ocls.info/ | keyboard-only | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.hcpl.net/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.aclib.us/ | keyboard-only | blocked | HTTP 403 |
| https://www.bpl.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://libwww.freelibrary.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.torontopubliclibrary.ca/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.vpl.ca/ | keyboard-only | blocked | HTTP 403 |
| https://biblioottawalibrary.ca/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.nls.uk/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.bl.uk/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.bnf.fr/en | keyboard-only | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.europeana.eu/en | keyboard-only | blocked | HTTP 403 |
| https://dp.la/ | keyboard-only | blocked | HTTP 405 |
| https://search.worldcat.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://openlibrary.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.librarything.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.smithsonianmag.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.nationalgeographic.com/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('a[href="https\\:\\/\\/www\\.nationalgeographic\\.com\\/tv\\/show\\/64d846eb-837a-4585-aa0a-6b902a587290"][tabindex="-1"]') resolved to 5 elements: |
| https://www.scientificamerican.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.newscientist.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.quantamagazine.org/ | keyboard-only | inconclusive | No measurable target was found. |
| https://aeon.co/ | keyboard-only | inconclusive | No measurable target was found. |
| https://nautil.us/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.theatlantic.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.newyorker.com/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('a[href="\\/magazine\\/2026\\/11\\/30\\/out-of-time-fiction-mary-gaitskill"][tabindex="-1"]') resolved to 2 elements: |
| https://harpers.org/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('a[href="\\/harpers-index\\/"][tabindex="-1"]') resolved to 80 elements: |
| https://www.lrb.co.uk/ | keyboard-only | inconclusive | Checked the declared outcome after the click action. |
| https://www.nybooks.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.theparisreview.org/ | keyboard-only | blocked | HTTP 403 |
| https://www.poetryfoundation.org/poetrymagazine | keyboard-only | blocked | HTTP 403 |
| https://lithub.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://electricliterature.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.tor.com/ | keyboard-only | blocked | HTTP 403 |
| https://www.polygon.com/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.rockpapershotgun.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.eurogamer.net/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.ign.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.gamespot.com/ | keyboard-only | blocked | HTTP 403 |
| https://kotaku.com/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.tufts.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.northeastern.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.bu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.bc.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.syracuse.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.pitt.edu/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('a[href="https\\:\\/\\/www\\.pittwire\\.pitt\\.edu\\/features-articles\\/2026\\/09\\/22\\/us-news-world-report-best-colleges-ranking"][tabindex="-1"]') resolved to 2 elements: |
| https://www.temple.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://drexel.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.rutgers.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://uconn.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.umd.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.vt.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.ncsu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.clemson.edu/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('a[href="\\/\\/www\\.clemson\\.edu\\/studentaffairs\\/get-involved\\/csle\\/family-programs\\/"][tabindex="-1"]') resolved to 2 elements: |
| https://www.uga.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.fsu.edu/ | keyboard-only | inconclusive | Checked the declared outcome after the click action. |
| https://www.ufl.edu/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://welcome.miami.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://tulane.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.smu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.tamu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.uh.edu/ | keyboard-only | no barrier | The same named link and destination were available in the same News section with a sequentially focusable duplicate. |
| https://www.asu.edu/ | keyboard-only | inconclusive | Checked the declared outcome after the click action. |
| https://www.arizona.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.colorado.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.utah.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.uoregon.edu/ | keyboard-only | inconclusive | locator.isVisible: Error: strict mode violation: locator('button[aria-controls="uo-mega-research"]') resolved to 2 elements: |
| https://www.osu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.psu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://illinois.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.indiana.edu/ | keyboard-only | blocked | Public navigation left the task site. |
| https://www.wisc.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://twin-cities.umn.edu/ | keyboard-only | blocked | HTTP 403 |
| https://uiowa.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://missouri.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://ku.edu/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.unl.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.ou.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://go.okstate.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.lsu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.msstate.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://olemiss.edu/ | keyboard-only | inconclusive | locator.click: Timeout 2000ms exceeded. |
| https://www.ua.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.auburn.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.uky.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.utk.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://sc.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.unc.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.wfu.edu/ | keyboard-only | inconclusive | No measurable target was found. |
| https://www.williams.edu/ | keyboard-only | blocked | HTTP 403 |
| https://www.nypl.org/ | screen-reader-view | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.bklynlibrary.org/ | screen-reader-view | blocked | HTTP 403 |
| https://www.lapl.org/ | screen-reader-view | inconclusive | locator.isVisible: Error: strict mode violation: locator('#edit-keywords') resolved to 2 elements: |
| https://www.chipublib.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://sfpl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://kcls.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.denverlibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://houstonlibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://cpl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.bpl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.torontopubliclibrary.ca/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.vpl.ca/ | screen-reader-view | blocked | HTTP 403 |
| https://openlibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://search.worldcat.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.europeana.eu/en | screen-reader-view | blocked | HTTP 403 |
| https://dp.la/ | screen-reader-view | blocked | HTTP 405 |
| https://www.bl.uk/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.nls.uk/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.librarything.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.quantamagazine.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://aeon.co/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://nautil.us/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.scientificamerican.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.theatlantic.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.newyorker.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://harpers.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.lrb.co.uk/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.nybooks.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.theparisreview.org/ | screen-reader-view | blocked | HTTP 403 |
| https://lithub.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://electricliterature.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.tor.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.polygon.com/ | screen-reader-view | inconclusive | locator.click: Timeout 1500ms exceeded. |
| https://www.rockpapershotgun.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.eurogamer.net/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.ign.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.gamespot.com/ | screen-reader-view | blocked | HTTP 403 |
| https://kotaku.com/ | screen-reader-view | inconclusive | locator.click: Timeout 1500ms exceeded. |
| https://www.smithsonianmag.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.nationalgeographic.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.duke.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.rice.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://home.dartmouth.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.georgetown.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.emory.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.tufts.edu/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://ppld.org/ | screen-reader-view | inconclusive | locator.click: Timeout 1500ms exceeded. |
| https://library.loudoun.gov/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.fairfaxcounty.gov/library/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://library.arlingtonva.us/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.hcplc.org/ | screen-reader-view | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.ocls.info/ | screen-reader-view | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.mymcpl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://jeffcolibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.auroralibrary.org/ | screen-reader-view | blocked | Public navigation left the task site. |
| https://boulderlibrary.org/ | screen-reader-view | blocked | HTTP 403 |
| https://www.pvld.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://smpl.org/ | screen-reader-view | blocked | Public navigation left the task site. |
| https://www.pasadenapubliclibrary.net/ | screen-reader-view | blocked | Public navigation left the task site. |
| https://www.lapl.org/branches/central-library | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.saclibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.sjpl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://oaklandlibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.berkeleypubliclibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.spl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://kcls.bibliocommons.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.piercecountylibrary.org/ | screen-reader-view | blocked | Public navigation left the task site. |
| https://cincinnatilibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.columbuslibrary.org/ | screen-reader-view | blocked | HTTP 403 |
| https://cuyahogalibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.daytonmetrolibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.akronlibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.toledolibrary.org/ | screen-reader-view | blocked | HTTP 403 |
| https://detroitpubliclibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://aadl.org/ | screen-reader-view | blocked | page.goto: net::ERR_EMPTY_RESPONSE at https://aadl.org/ |
| https://www.tadl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.mpl.org/ | screen-reader-view | inconclusive | locator.isVisible: Error: strict mode violation: locator('#q') resolved to 2 elements: |
| https://www.madisonpubliclibrary.org/ | screen-reader-view | blocked | HTTP 403 |
| https://www.hclib.org/ | screen-reader-view | blocked | HTTP 403 |
| https://www.rclreads.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.dcls.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.friscolibrary.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://library.austintexas.gov/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://dallaslibrary2.org/ | screen-reader-view | blocked | Public navigation left the task site. |
| https://www.phoenixpubliclibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.library.pima.gov/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://thelibrarydistrict.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.slcl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.kclibrary.org/ | screen-reader-view | blocked | page.goto: net::ERR_HTTP_RESPONSE_CODE_FAILURE at https://www.kclibrary.org/ |
| https://www.jocolibrary.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.dcl.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.anythinklibraries.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.rapidtables.com/convert/length/index.html | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.convertunits.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.metric-conversions.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.calculatorsoup.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.omnicalculator.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.calculatorsoup.com/calculators/math/percentage.php | screen-reader-view | inconclusive | No measurable target was found. |
| https://percentagecalculator.net/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://keisan.casio.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.numberempire.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.mathwarehouse.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.purplemath.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://brilliant.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://artofproblemsolving.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.pagetutor.com/tranquilizer.html | screen-reader-view | inconclusive | getaddrinfo ENOTFOUND www.pagetutor.com |
| https://www.echoecho.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://html.com/ | screen-reader-view | blocked | HTTP 403 |
| https://css-tricks.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.smashingmagazine.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://alistapart.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://csswizardry.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://nicolasgallagher.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://meyerweb.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.quirksmode.org/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.browserstack.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://saucelabs.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.netlify.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://vercel.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.heroku.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.digitalocean.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.linode.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.vultr.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.hetzner.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.namecheap.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.godaddy.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.hover.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.gandi.net/en | screen-reader-view | inconclusive | No measurable target was found. |
| https://porkbun.com/ | screen-reader-view | blocked | HTTP 403 |
| https://www.cloudflare.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.akamai.com/ | screen-reader-view | blocked | HTTP 403 |
| https://stripe.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://squareup.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.paypal.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://wise.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.revolut.com/ | screen-reader-view | blocked | HTTP 403 |
| https://venmo.com/ | screen-reader-view | inconclusive | No measurable target was found. |
| https://www.gnu.org/philosophy/free-sw.html | low-vision | blocked | HTTP 429 |
| https://www.gnu.org/gnu/manifesto.html | low-vision | blocked | HTTP 429 |
| https://www.gnu.org/philosophy/why-free.html | low-vision | blocked | page.goto: Timeout 15000ms exceeded. |
| https://www.openbsd.org/goals.html | low-vision | inconclusive | No measurable target was found. |
| https://www.sqlite.org/lang.html | low-vision | inconclusive | No measurable target was found. |
| https://www.sqlite.org/quirks.html | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://www.lua.org/pil/1.html | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://www.tcl.tk/man/tcl8.6/TclCmd/contents.htm | low-vision | inconclusive | No measurable target was found. |
| https://www.rfc-editor.org/rfc/rfc791 | low-vision | inconclusive | No measurable target was found. |
| https://www.rfc-editor.org/rfc/rfc1035 | low-vision | inconclusive | No measurable target was found. |
| https://www.rfc-editor.org/rfc/rfc2616 | low-vision | inconclusive | No measurable target was found. |
| https://www.rfc-editor.org/rfc/rfc793 | low-vision | inconclusive | No measurable target was found. |
| https://www.debian.org/intro/about | low-vision | inconclusive | No measurable target was found. |
| https://www.debian.org/social_contract | low-vision | inconclusive | No measurable target was found. |
| https://busybox.net/about.html | low-vision | inconclusive | No measurable target was found. |
| https://www.gutenberg.org/files/1342/1342-h/1342-h.htm | low-vision | blocked | HTTP 503 |
| https://www.gutenberg.org/files/11/11-h/11-h.htm | low-vision | blocked | HTTP 503 |
| https://clojure.org/about/rationale | low-vision | inconclusive | No measurable target was found. |
| https://www.haskell.org/about/ | low-vision | blocked | HTTP 404 |
| https://www.senate.gov/history/overview.htm | low-vision | blocked | HTTP 403 |
| https://history.house.gov/Institution/ | low-vision | inconclusive | The unique target was not visible. |
| https://www.ssa.gov/history/ | low-vision | inconclusive | No measurable target was found. |
| https://www.bls.gov/ooh/ | low-vision | blocked | HTTP 403 |
| https://www.bea.gov/about/mission-vision-values | low-vision | blocked | HTTP 404 |
| https://www.cbo.gov/about | low-vision | blocked | HTTP 403 |
| https://www.copyright.gov/about/ | low-vision | inconclusive | No measurable target was found. |
| https://www.uspto.gov/about-us | low-vision | inconclusive | No measurable target was found. |
| https://www.postgresql.org/docs/current/intro-whatis.html | low-vision | inconclusive | No measurable target was found. |
| https://www.php.net/manual/en/introduction.php | low-vision | inconclusive | No measurable target was found. |
| https://en.cppreference.com/w/cpp/language/functions | low-vision | blocked | HTTP 403 |
| https://www.erlang.org/doc/system/intro.html | low-vision | blocked | HTTP 404 |
| https://elixir-lang.org/getting-started/introduction.html | low-vision | inconclusive | Harness or patch did not attach on chrome-error://chromewebdata/ |
| https://www.poetryfoundation.org/poems/46565/ozymandias | low-vision | blocked | HTTP 403 |
| https://www.poetryfoundation.org/poems/44272/the-road-not-taken | low-vision | blocked | HTTP 403 |
| https://www.folger.edu/about | low-vision | inconclusive | No measurable target was found. |
| https://www.britishmuseum.org/about-us | low-vision | blocked | HTTP 403 |
| https://www.netbsd.org/docs/guide/en/chap-intro.html | low-vision | inconclusive | No measurable target was found. |
| https://docs.freebsd.org/en/books/handbook/introduction/ | low-vision | blocked | page.goto: Timeout 15000ms exceeded. |
| https://docs.kernel.org/process/howto.html | low-vision | inconclusive | No measurable target was found. |
| https://www.catb.org/~esr/jargon/html/introduction.html | low-vision | blocked | page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.catb.org/~esr/jargon/html/introduction.html |
| https://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/ | low-vision | blocked | page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/ |
| https://www.joelonsoftware.com/2000/04/06/the-joel-test-12-steps-to-better-code/ | low-vision | blocked | HTTP 404 |
| https://blog.codinghorror.com/the-best-code-is-no-code-at-all/ | low-vision | inconclusive | No measurable target was found. |
| https://www.tbray.org/ongoing/When/200x/2003/07/17/AtomOfThoughts | low-vision | blocked | HTTP 404 |
| https://waitbutwhy.com/2014/05/fermi-paradox.html | low-vision | inconclusive | No measurable target was found. |
| https://www.infoq.com/articles/API-Design-Eric-Evans-Interview/ | low-vision | blocked | HTTP 404 |
| https://agilemanifesto.org/principles.html | low-vision | inconclusive | No measurable target was found. |
| https://tc39.es/ecma262/ | low-vision | inconclusive | The target does not fit the visible width. |
| https://kotlinlang.org/docs/getting-started.html | low-vision | inconclusive | No measurable target was found. |
| https://docs.scala-lang.org/tour/basics.html | low-vision | inconclusive | locator.isVisible: Error: strict mode violation: locator('#scala-2-and-3_content > div > div > div > pre') resolved to 18 elements: |
| https://www.ruby-lang.org/en/documentation/ | low-vision | inconclusive | No measurable target was found. |
| https://mariadb.com/kb/en/sql-statements/ | low-vision | inconclusive | No measurable target was found. |
| https://alpinelinux.org/about/ | low-vision | inconclusive | No measurable target was found. |
| https://wiki.gentoo.org/wiki/Handbook:AMD64/Installation/About | low-vision | blocked | HTTP 500 |
| https://wiki.archlinux.org/title/Installation_guide | low-vision | inconclusive | No measurable target was found. |
| https://fedoraproject.org/wiki/Overview | low-vision | inconclusive | No measurable target was found. |
| https://docs.freebsd.org/en/books/handbook/introduction/ | low-vision | blocked | page.goto: Timeout 15000ms exceeded. |
| https://wiki.c2.com/?WelcomeVisitors | low-vision | inconclusive | No measurable target was found. |
| https://suckless.org/philosophy/ | low-vision | inconclusive | No measurable target was found. |
| https://st.suckless.org/ | low-vision | inconclusive | No measurable target was found. |
| https://qntm.org/responsibility | low-vision | inconclusive | No measurable target was found. |
| https://what-if.xkcd.com/1/ | low-vision | inconclusive | No measurable target was found. |
| https://danluu.com/everything-is-broken/ | low-vision | inconclusive | No measurable target was found. |
| https://www.johndcook.com/blog/2010/01/19/formula-for-pi/ | low-vision | blocked | HTTP 404 |
| https://lemire.me/blog/2019/01/17/moving-away-from-the-java-script-ecosystem/ | low-vision | blocked | HTTP 404 |
| https://www.flownet.com/ron/papers/lisp-java/ | low-vision | inconclusive | No measurable target was found. |
| https://schemers.org/Documents/Standards/R5RS/HTML/ | low-vision | blocked | Public navigation left the task site. |
| https://www.lispworks.com/documentation/HyperSpec/Front/index.htm | low-vision | inconclusive | No measurable target was found. |
| https://www.sbcl.org/manual/index.html | low-vision | blocked | HTTP 503 |
| https://ocaml.org/manual/5.2/index.html | low-vision | inconclusive | No measurable target was found. |
| https://nim-lang.org/docs/manual.html | low-vision | inconclusive | The target does not fit the visible width. |
| https://ziglang.org/learn/getting-started/ | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://crystal-lang.org/reference/1.14/syntax_and_semantics/index.html | low-vision | inconclusive | No measurable target was found. |
| https://canonical.org/~kragen/memory-models/ | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://agilemanifesto.org/principles.html | low-vision | inconclusive | No measurable target was found. |
| https://projecteuler.net/about | low-vision | inconclusive | No measurable target was found. |
| https://oeis.org/wiki/Welcome | low-vision | inconclusive | No measurable target was found. |
| https://mathworld.wolfram.com/Pi.html | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://planetmath.org/ | low-vision | inconclusive | No measurable target was found. |
| https://schemers.org/Documents/Standards/R5RS/HTML/ | low-vision | blocked | Public navigation left the task site. |
| https://www.lispworks.com/documentation/HyperSpec/Front/Contents.htm | low-vision | inconclusive | No measurable target was found. |
| https://www.sbcl.org/manual/index.html | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://ocaml.org/manual/5.2/index.html | low-vision | inconclusive | No measurable target was found. |
| https://nim-lang.org/docs/manual.html | low-vision | inconclusive | The target does not fit the visible width. |
| https://crystal-lang.org/reference/1.14/syntax_and_semantics/index.html | low-vision | inconclusive | No measurable target was found. |
| https://agilemanifesto.org/principles.html | low-vision | inconclusive | No measurable target was found. |
| https://projecteuler.net/about | low-vision | inconclusive | No measurable target was found. |
| https://oeis.org/wiki/Welcome | low-vision | inconclusive | No measurable target was found. |
| https://planetmath.org/ | low-vision | inconclusive | No measurable target was found. |
| https://www.boost.org/doc/libs/1_86_0/doc/html/boost_asio.html | low-vision | inconclusive | No measurable target was found. |
| https://en.cppreference.com/w/cpp/algorithm | low-vision | blocked | HTTP 403 |
| https://cplusplus.com/reference/iostream/ | low-vision | inconclusive | No measurable target was found. |
| https://www.learncpp.com/cpp-tutorial/introduction-to-these-tutorials/ | low-vision | inconclusive | No measurable target was found. |
| https://cplusplus.com/doc/tutorial/ | low-vision | inconclusive | No measurable target was found. |
| https://www.javatpoint.com/java-tutorial | low-vision | inconclusive | getaddrinfo ENOTFOUND www.javatpoint.com |
| https://www.tutorialspoint.com/java/index.htm | low-vision | inconclusive | No measurable target was found. |
| https://www.programiz.com/python-programming | low-vision | inconclusive | No measurable target was found. |
| https://realpython.com/python-first-steps/ | low-vision | blocked | HTTP 403 |
| https://www.fluentpython.com/ | low-vision | inconclusive | No measurable target was found. |
| https://diveinto.org/python3/table-of-contents.html | low-vision | inconclusive | getaddrinfo ENOTFOUND diveinto.org |
| https://git-scm.com/book/en/v2 | low-vision | inconclusive | No measurable target was found. |
| https://git-scm.com/docs | low-vision | inconclusive | No measurable target was found. |
| https://www.mercurial-scm.org/guide | low-vision | eligible alternate | Outside the 40-task budgeted registration selected before any Kane replay. |
| https://svnbook.red-bean.com/en/1.7/index.html | low-vision | inconclusive | No measurable target was found. |
