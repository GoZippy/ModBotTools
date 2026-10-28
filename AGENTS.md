# AGENTS.md — ModBotTools build constitution

<!-- zippy-standards v2.0.3 — installed 2026-10-28 -->
<!-- Core rules (§0-§2) come from the standard. Edit §3 onwards for this project. -->
<!-- Full rulebook with rule IDs: https://github.com/GoZippy/zippy-standards/blob/main/STANDARD.md -->
<!-- Upgrading re-writes §0-§2 only; §3 onwards is never touched. -->

**This is the canonical, tool-neutral governance file for this repository.**

It applies to every agent that touches this repo, regardless of model provider,
router, harness, or IDE. Vendor-specific instruction files are **pointers to this
file**, not separate rulebooks.

---

## 0. Where things live — and what must never live in a vendor file

| Content | Canonical location | May a vendor-specific file hold it? |
|---|---|---|
| Build rules and non-negotiables | `AGENTS.md` (this file) | No — pointer only |
| Requirements | `specs/requirements.md` | **Never** |
| Tasks and definitions of done | `specs/tasks.md` | **Never** |
| Scope and non-goals | `specs/PRD.md` | **Never** |
| Architecture decisions | `specs/design.md` | **Never** |
| Human gates | `specs/gates/` | **Never** |
| Coordination between agents | tool-generated files (§2) | Yes — that is their job |

**Rule 0 — no requirement, task, definition of done, or scope decision may live
only inside a provider-specific file.** A rule that only one vendor's tool can
see is not a rule; it is a coincidence of which harness opened the folder.

Enforced by `scripts/zs/pointers.mjs` in the pre-commit gate and CI: it fails on
a missing pointer, a pointer that stops referencing this file, a pointer over
4096 bytes, a pointer containing an ID, or **a harness detected
in this repo with no pointer registered for it**.

**Rule 0b — prose binds nothing, CI binds everything.** These rules are written
to be read, but the ones that matter are also machine-checked. Whenever a rule
here can become a failing test, make it one. That is the only governance that
survives a router changing which model is behind an agent mid-task.

## 1. Universal engineering rules

These apply to every Zippy project. Project-specific rules go in §3.

1. **Never blind-commit.** No `git add -A` / `git add .` in a script or by an
   agent without first showing what is staged. Directories contain files nobody
   put there on purpose.
2. **Test on the platform that runs it.** A script that runs on Windows is not
   verified by running it on Linux. Path handling, line endings, and shell
   quoting all differ.
3. **Tool-generated files are not source.** Anything a tool regenerates is
   gitignored, never hand-edited, and never the home of a rule. A committed copy
   of a generated file drifts from the generator.
4. **Every claim gets a source or a caveat.** Figures pulled from research carry
   where they came from and when they were checked. Corrections go in an errata
   file rather than silently editing an archive.
5. **Secrets never enter the repo.** `.env` is gitignored; `.env.example`
   documents every variable; secret scanning runs in CI.
6. **Verification is separate from implementation.** Whoever wrote it does not
   certify it. A reviewer re-runs the checks rather than reading the report.
7. **Say what is not done.** Deferred work is listed explicitly as deferred, with
   the trigger that makes it urgent. Silent absence is how scope creep enters.
8. **One gate, everywhere.** `node scripts/zs/gate.mjs fast|test|ci|full` is what
   the hooks, CI and the nightly run all call. Run it before you say work is
   done. Its commands live in `zippy-standards.json` → `project.gates`.
9. **Commits and PRs follow the contract.** Conventional subjects; the human
   who commits is the author (no AI co-author or generated-by trailers); every
   PR fills the template, including the frozen **Goal** line, a disposition for
   every review finding, and the AI-assistance disclosure.
10. **Humans merge, tag and publish.** Agents never push to `main`, cut a
    release, or change repository settings, CI secrets or branch rules.
11. **New gates land as ratchets.** Existing violations go in a baseline that
    may only shrink (`scripts/zs/ratchet.mjs`). Never grow a baseline, loosen an
    assertion, or skip a test to get green — fix the cause.

## 2. Precedence — when two governance systems disagree

Repos here often carry generated coordination rules from other tooling
(`.claude/rules/`, `.clinerules/`, `.kiro/steering/`, `.kilocodemodes`, and
similar). They are useful and they stay. But resolve conflicts in this order:

1. `AGENTS.md` (this file)
2. `/specs` — or wherever this project's requirements live
3. Tool-generated rules and steering files
4. Everything else

**Coordination may be delegated. Judgement may not.** Mailboxes, claim files, and
task assignment: follow the coordination tooling — it stops two agents editing
the same file. But:

- **A consensus vote never substitutes for verification.** Agreement is not
  evidence. A task is done when someone re-ran the checks, not when a vote passed.
- **No vote clears a human gate.** Only the named human does.
- **No vote authorises changing anything on a DO-NOT-CHANGE list.**

If the coordination tooling's directories do not exist in this repo, that layer
is not running here. Proceed solo under this file, say so once, and do not
scaffold it.

---

## 3. Project rules — ModBotTools

<!-- Everything above is the standard. Everything below is yours. -->
<!-- Add the non-negotiables specific to this project: data invariants,       -->
<!-- security boundaries, things that must never change without a human.      -->

- Keep the shipped bot useful without a Zippy account or paid classifier. External inference is opt-in.
- Default to observation. Provider errors or overload never authorize deletion, timeout, kick, or ban.
- Keep message data, case files, credentials, guild IDs, and staff rules out of public fixtures and logs.
- Distinguish Discord AutoMod pre-send blocking from bot post-publication deletion and opted-in `/submit` review.
- Voice audio capture and account sanctions remain unimplemented until consent, quality, and appeal gates are documented and tested.

## 4. DO NOT CHANGE without explicit human approval

<!-- List the things where an agent must stop and ask. Be specific.           -->
<!-- Good entries name a file, a policy, or an invariant. Bad entries are      -->
<!-- vague ("the architecture").                                              -->

- `AGENTS.md` §0-§2 — the standard's core; changing it locally forks the standard
- Live Kiro Discord deployment and use of real member data require the server owner's explicit authorization. Public repository publication requires the repository owner's authorization and a tracked-file privacy review.
