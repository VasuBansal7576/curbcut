# Pull request bot

If a preview breaks a task for keyboard users, the reviewer should be able to see where it happened. This opt-in GitHub Action waits for the preview, runs `curbcut gate`, and adds Kane’s verdict to one comment it updates on the pull request.

## Setup

1. Put `curbcut.gate.json` in the app repository. Give it the pages and tasks to check. Skip login, payment, and account-creation flows. [Gate config](gate.md)

2. Copy [`examples/curbcut-gate.yml`](../examples/curbcut-gate.yml) to `.github/workflows/curbcut-gate.yml`. Point `uses:` at the Curb Cut revision you want to run.

3. Store Kane login as repository secrets `KANE_USERNAME` and `KANE_ACCESS_KEY` (`kane-cli login --username --access-key`). The workflow passes those secrets into the action. They are never printed.

4. Set `preview-url` to the pull request preview host. The action waits until that URL responds, then runs `curbcut gate` with the repository’s `curbcut.gate.json` against it.

5. Open a pull request. The job uploads Kane recordings as workflow artifacts and posts or updates one comment with pass/fail per task and persona, Kane’s failure reason, the compact DOM snippet, the WCAG criterion, and the source change from the existing report formatter.

## Local dry run

From the repository root with the [Gate prerequisites](gate.md), start the fixture in terminal 1.

```sh
node curbcut.mjs serve
```

In terminal 2, generate the comment and JSON locally. The unfixed fixture returns a failing verdict.

```sh
node .github/actions/curbcut-gate/run.mjs --url http://127.0.0.1:4317/fixtures/shop/ --config examples/curbcut.gate.json --local --json-out /tmp/curbcut-gate.json --comment-out /tmp/curbcut-comment.md
```

`local: true` on the action does the same in GitHub Actions.
