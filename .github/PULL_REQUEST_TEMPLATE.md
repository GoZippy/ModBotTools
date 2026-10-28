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

<!-- The problem, and who hits it. Link the issue. -->

## Not a goal

<!-- What a reviewer might expect here that this PR deliberately leaves out. -->

## What changed

<!-- The behaviour change, not a file list. -->

## Tests

<!-- What you ran, on which OS, and what proves the change. A UI change carries a screenshot. -->

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
- [ ] An agent did most of the work under my supervision; I verified the tests myself

Tools / models used:
