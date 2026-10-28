# CI, review, and release gates

The build rules live in [AGENTS.md](../AGENTS.md); executable project commands
live in `zippy-standards.json → project.gates`. Hooks, contributors, KiroCrew,
and GitHub Actions call `node scripts/zs/gate.mjs fast|test|ci|full`.
A green check applies to the SHA it tested. It is not deployment approval.

| When | Blocking check |
| --- | --- |
| Pre-commit | Standard pointers/hygiene, ESLint, and staged Gitleaks if locally installed |
| Pre-push | TypeScript build, Node tests, and offline synthetic evaluation |
| PR and main push | `ci` on Windows and Linux, Node 24.17.0; Gitleaks; high-severity production `npm audit` |
| PR | GitHub Dependency Review and required PR evidence |
| Weekly/manual | `full` gate with a high-severity audit, including build tools |
| Release candidate | `full`, exact-artifact privacy/license review, fresh install, and rollback rehearsal |

Local hooks can be bypassed, so GitHub repeats the checks. The six-case
fixture is a smoke test, not a measured moderation accuracy claim. The gate
requires at least six invented cases, every expected decision class, and zero
mismatches. Expand it with synthetic error, overload, edit, permission,
privacy, and recovery cases before enabling stronger modes. Keep real cases
in approved private systems.

## GitHub owner setup

The owner should protect `main`: require a PR, current-head checks, block
force pushes, and require human review when another maintainer is available.
After a PR creates the check names, select `Test (windows-latest)`,
`Test (ubuntu-latest)`, `secrets`, `dependency-audit`,
`Dependency review`, and `pr-contract`. Review workflow and gate-script
changes explicitly: the PR author can edit a PR workflow. See
[GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Enable free public-repo
[CodeQL default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning)
and Dependabot security updates. Check live settings and scan results before
claiming they ran. Secret scanning and push protection complement Gitleaks.
These repository settings are owner actions under `AGENTS.md`.

[Standard GitHub-hosted runners are free for public repos](https://docs.github.com/en/actions/concepts/billing-and-usage).
Do not attach a persistent self-hosted runner to public fork PRs: untrusted
code could reach the host. KiroCrew is a local scheduler for trusted
worktrees, not a public PR runner or merge authority.

## Safety and release

Changes to permissions, authentication, classifier routing, moderation
actions, secrets, workflows, or gates need an explicit risk explanation and
independent review of the actual diff. Reviewer agreement is advisory until
the checks are rerun. Fix any weakened assertion, skipped scan, grown
ratchet baseline, or added bypass before merge.

The server owner alone authorizes live Kiro Discord use and real member data.
The repository owner alone authorizes a public release after tracked-file
privacy and license review. Voice capture and account sanctions are not
implemented. Never put credentials, deployment secrets, or real message
text in CI artifacts.

There is no automatic CD. Before adding it, build an artifact from an
approved commit with its source SHA, lockfile digest, license notices,
checksum, and `npm sbom`. Test a fresh install in a disposable guild,
back up and restore case data, verify health without logging content, and
document rollback. A protected GitHub environment can hold future
deployment approval; a passing build never approves itself.
