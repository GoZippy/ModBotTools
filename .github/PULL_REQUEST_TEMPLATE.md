<!--
  zippy-standards PR template. Keep every heading — scripts/zs/pr-body.mjs
  checks them (ZS-014). `gh pr create --body-file` bypasses this template, so
  run `node scripts/zs/pr-body.mjs <file>` on your body first.

  Goal, Why it matters and Not a goal are written ONCE, when the PR opens.
  Don't edit them to match the diff later; a finding outside the goal is
  rebutted or deferred, never absorbed by widening it.
-->

## Goal

**Goal:** <!-- one sentence: what this PR delivers -->

## Why it matters

**Issue or rationale:** <!-- Link #123, or write "No issue:" and explain why. -->

<!-- State the problem and who is affected. Do not include real member messages or IDs. -->

## Not a goal

<!-- What a reviewer might expect here that this PR deliberately leaves out. -->

## What changed

<!-- The behaviour change, not a file list. -->

## Tests

**OS and Node:** <!-- Example: Windows 11, Node 24.17.0; include a second OS if tested. -->

**Commands and results:** <!-- Exact commands, pass/fail counts, and what was skipped. A UI change includes safe screenshots. -->

**Synthetic evaluation:** <!-- Count, false holds, other mismatches; or why this PR cannot change classification. -->

**Independent review:** <!-- Who re-ran the checks, or "Pending: @reviewer". Author-run checks alone are not verification. -->

## Risk and safety

**Discord surface and mode:** <!-- Ordinary post-publication messages, /submit, AutoMod, voice, or no runtime change; name observe/review/hold. -->

**False-positive impact:** <!-- Which messages or members could be affected and how staff can recover. -->

**Permissions and data:** <!-- New Discord permissions, secrets, logs, stored data, retention, or "No change because ...". -->

**External inference:** <!-- Local only, optional provider and data sent, or no change. -->

**Rollback:** <!-- Exact config/commit rollback; do not suggest deleting case data. -->

## Human gates

**Live Discord and member data:** <!-- Not requested, or link the server owner's authorization. -->

**Public release:** <!-- Not requested, or link the owner's tracked-file privacy review. -->

**Security-sensitive change:** <!-- Name affected auth, moderation actions, secrets, workflows, or explain no change. -->

**Licensing rights:** <!-- Confirm rights for code/assets and whether commercial relicensing needs a separate agreement. -->

## Compatibility

<!-- "Compatible: <why>" — or "Breaking: <what breaks, who is affected, the migration>". -->

## Review dispositions

<!--
  Every finding, human or AI, gets exactly one (ZS-015):
    - F1 fixed in <sha>
    - F2 rebutted: <why it is not a defect, or not proportional>
    - F3 deferred to #123 (owner: @name, due YYYY-MM-DD)
    - F4 needs-decision: @human — <the question>
  Write "None yet" until the first review lands.
-->
None yet

## AI assistance

<!-- Tick one (ZS-013). The person opening the PR owns every line either way. -->
- [ ] None
- [ ] AI suggested or reviewed; I wrote the code
- [ ] AI drafted code that I reviewed line by line and can explain
- [ ] An agent did most of the work; maintainer verification status is stated under Tests

Tools / models used:
