# KiroCrew for local ModBotTools checks

KiroCrew can schedule and report checks on **trusted local worktrees**.
Its task or cron result is a coordination receipt; the canonical verdict is
the exit code of `node scripts/zs/gate.mjs` on the exact SHA. GitHub PR
checks and a human reviewer remain independent. Never give an agent cron
a Discord token, GitHub write token, or authority to merge, deploy, publish,
approve its own work, or change the gates.

## Manual pre-approval cycle

1. Record PR number, base/head SHA, worktree path, staged/dirty state, OS,
   and Node version. Do not run untrusted fork code on the KiroCrew host.
2. On Windows, run `pwsh -NoProfile -File scripts/local-review.ps1
   -BaseRef origin/main` in a clean committed checkout. The runner records
   the base/head SHA, installs from the lockfile, runs the `full` gate, and
   checks the submitted diff. It fails on a dirty tree or a base that is
   not an ancestor of the reviewed commit. Fetch the base first so the
   recorded SHA is current. On
   another OS, run `npm ci`, `node scripts/zs/gate.mjs full`, and
   `git diff --check origin/main...HEAD` in the same clean checkout. Compare
   changed workflows, tests, and gate scripts with the base for new
   permissions, skips, or weaker assertions.
3. Record findings against the head SHA with input, code path, and observable
   impact. Rerun checks after fixes; a new push makes earlier review stale.
4. Give every finding a PR disposition. A second reviewer verifies the result.
   No KiroCrew vote or task completion clears a human gate.

`kirocrew run TASK.md` can coordinate a bounded review, but uses a model
and may consume credits. Keep the spec read-only, SHA-bound, and stopped
on a failing check. Do not use `--no-test` as verification evidence.
The KiroCrew CLI also supports zero-token `cron add --command` and
`--script` jobs. A recurring trusted-checkout audit can call the local
runner, capture its exit code and SHA, and notify only on a new failure
or recovery. `--command` executes through sandboxed `sh -c`; a Python
`--script FILE.py:FUNC` must already live in KiroCrew's cron directory.
Verify that the chosen shell can launch PowerShell before registration.
Register it after choosing the exact checkout and schedule. A cron over
a moving dirty tree is not release evidence.

Git hooks already cover commit and push. A KiroCrew `PreToolUse` hook can
deny a dangerous tool action; running the whole suite on every file write
is slow and confusing. Keep project rules in `AGENTS.md`, not generated
`.kiro/` files. If installed locally, test the hook's matcher, exit code,
and shell behavior on the host platform.

Suggested KiroCrew coordination tags: `modbottools`, `ci-review`,
`security-review`, and `needs-owner`. They are neither GitHub labels
nor approvals. On GitHub, existing `documentation`, `dependencies`,
`github_actions`, `javascript`, `bug`, and `enhancement` labels
route attention. State risk and owner gates in the PR body.
