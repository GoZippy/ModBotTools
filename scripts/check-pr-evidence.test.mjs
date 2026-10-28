import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkEvidence } from './check-pr-evidence.mjs';

const valid = `## Why it matters
**Issue or rationale:** No issue: this change makes the existing gate enforceable.
## Tests
**OS and Node:** Windows 11 with Node 24.17.0.
**Commands and results:** npm test passed on the proposed commit.
**Synthetic evaluation:** Six invented cases passed with zero false holds.
**Independent review:** A second reviewer checked the diff and ran CI.
## Risk and safety
**Discord surface and mode:** No runtime Discord surface or mode changes.
**False-positive impact:** No policy change; existing behavior remains the same.
**Permissions and data:** No permissions or member data added to this PR.
**External inference:** No external provider call is added by this change.
**Rollback:** Revert the commit if the gate rejects valid contributions.
## Human gates
**Live Discord and member data:** Not requested; test fixtures are synthetic.
**Public release:** Not requested; a separate owner review is required.
**Security-sensitive change:** No auth, moderation action, or credential change.
**Licensing rights:** No third-party code or assets are included.
## AI assistance
- [x] An agent did most of the work; maintainer verification status is stated under Tests
Tools / models used: Codex
`;

test('complete PR evidence passes', () => {
  assert.deepEqual(checkEvidence(valid), []);
});

test('empty or bare not-applicable answers cannot make a PR look reviewed', () => {
  const body = valid.replace('**Rollback:** Revert the commit if the gate rejects valid contributions.', '**Rollback:** N/A');
  assert.match(checkEvidence(body).join('\n'), /Rollback/);
});

test('a second AI disclosure checkbox and missing issue rationale fail', () => {
  const body = valid.replace('No issue: this change makes the existing gate enforceable.', 'Routine work.')
    .replace('Tools / models used: Codex', '- [x] None\nTools / models used: Codex');
  const problems = checkEvidence(body).join('\n');
  assert.match(problems, /Issue or rationale/);
  assert.match(problems, /exactly one AI assistance/);
});
