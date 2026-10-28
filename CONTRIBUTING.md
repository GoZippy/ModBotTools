# Contributing

Thank you for helping make community moderation reviewable and useful. Read
[AGENTS.md](AGENTS.md) for the tool-neutral rules and [the CI guide](docs/ci-cd.md)
for the checks that enforce them.

## Before writing code

1. Open an issue describing the behavior, Discord surface, and expected staff
   action. For small maintenance changes, explain “No issue” in the PR.
2. Report exploitable problems through
   [private vulnerability reporting](https://github.com/GoZippy/ModBotTools/security/advisories/new).
   Never put exploit details, credentials, member messages, guild IDs, or
   incident evidence in a public issue or PR.
3. Keep classifiers separate from policy and Discord API actions. Providers
   return typed signals; they cannot authorize deletion or account sanctions.
   External inference is opt-in, and observation remains the default.
4. Use invented examples. Real server exports, staff rules, voice recordings,
   and unconsented labels do not belong in this repository.

## Local checks

Install Node.js 24.17.0 or newer. Activate hooks in each clone with
`git config --local core.hooksPath .githooks`. Before committing, inspect
`git status --short` and `git diff --cached --name-only`; stage only the
paths you intend to submit.

```sh
npm ci
node scripts/zs/gate.mjs ci
node scripts/zs/gate.mjs full
git diff --check
```

`ci` runs governance, ESLint, build, tests, and the **local-only** synthetic
evaluation gate. `full` also audits runtime and development dependencies.
Run `full` before release or security-sensitive approval. `npm run evaluate`
can use a locally configured external provider and only prints a matrix;
`npm run evaluate:gate` is the offline pass/fail command. Record the OS, Node
version, exact commands, results, and skipped checks. A skipped check is not
green. For a clean Windows commit under review, use
`pwsh -NoProfile -File scripts/local-review.ps1 -BaseRef origin/main`.
Use the [test-server checklist](docs/test-server-checklist.md) only
in a Discord server you control. Live Kiro Discord use or real member data
requires the server owner's authorization.

## Pull request requirements

Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md). The PR check
rejects blank safety answers, bare “N/A,” and ambiguous AI disclosure.
Include:

- A frozen **Goal** sentence and issue link, or a reason there is no issue.
- The affected Discord surface and mode: ordinary post-publication message,
  Discord AutoMod, opted-in `/submit`, voice, or no runtime change.
- Behavior, false-positive/privacy effects, permissions, external data flow,
  compatibility, and a concrete rollback.
- Exact local test results with OS/Node, synthetic evaluation counts and
  mismatches, skipped checks, and independent review evidence.
- The status of live Discord/member-data, public-release, security-sensitive,
  and licensing gates. PR text does **not** grant those approvals.
- A disposition for each review finding: fixed, rebutted with evidence,
  deferred to an owned dated issue, or awaiting a named human decision.
- Exactly one AI-assistance option and tools/models used. The contributor
  remains responsible for every line and the test evidence.

Maintainers use existing labels such as `bug`, `enhancement`,
`documentation`, `dependencies`, `github_actions`, and `javascript`.
Labels route attention; they never clear a check or human gate. See the
[KiroCrew local workflow](docs/kirocrew-local-ci.md) for optional trusted
worktree checks and review coordination.

The repository's current license permits noncommercial use and contributions. Before a code contribution is merged, maintainers must confirm they have the rights needed to include it in separately licensed commercial distributions. A commit sign-off confirms provenance; it does not transfer copyright or grant commercial relicensing rights. Maintainers may ask for a separate contributor agreement. Issue reports and design discussions remain welcome without one.
