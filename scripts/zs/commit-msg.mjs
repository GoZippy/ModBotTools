#!/usr/bin/env node
/**
 * zippy-standards — ZS-011 conventional subjects, ZS-012 human authorship,
 * ZS-109 DCO sign-off (public tier).
 *
 *   node scripts/zs/commit-msg.mjs <message-file>          # commit-msg hook
 *   node scripts/zs/commit-msg.mjs --range origin/main..HEAD [--require-signoff]
 *   node scripts/zs/commit-msg.mjs --self-test
 *
 * Exit codes: 0 ok, 1 violation, 2 cannot run.
 */
import { readFileSync } from 'node:fs';
import { argValue, findRoot, git, isMain, loadManifest, report, selfTest } from './lib.mjs';

const DEFAULTS = {
  types: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert'],
  subjectMax: 72,
  bannedTrailers: [],
};

export function checkMessage(raw, { commits = DEFAULTS, aiDisclosure = 'pr-template', requireSignoff = false } = {}) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').filter(l => !l.startsWith('#'));
  const subject = (lines[0] || '').trim();
  const problems = [];

  // Merge commits and git's own autosquash markers are not ours to shape.
  if (/^Merge (branch|pull request|remote-tracking branch) /.test(subject)) return problems;
  if (/^(fixup|squash|amend)! /.test(subject)) return problems;

  const types = commits.types || DEFAULTS.types;
  const max = commits.subjectMax || DEFAULTS.subjectMax;
  const conv = new RegExp(`^(${types.join('|')})(\\([A-Za-z0-9._/-]+\\))?!?: \\S`);
  if (!subject) problems.push('empty subject line.');
  else {
    if (!conv.test(subject)) problems.push(`subject "${subject}" is not conventional — use "<type>(<scope>)?: <summary>" with type one of: ${types.join(', ')}.`);
    if (subject.length > max) problems.push(`subject is ${subject.length} characters (max ${max}).`);
  }

  const assistedOk = aiDisclosure === 'trailer';
  for (const line of lines.slice(1)) {
    const t = line.trim();
    if (assistedOk && /^Assisted-by:/i.test(t)) continue;
    const hit = (commits.bannedTrailers || []).find(p => new RegExp(p, 'i').test(t));
    if (hit) problems.push(`"${t}" — the committing human is the author (ZS-012). Disclose AI help in the PR body${assistedOk ? ' or an Assisted-by: trailer' : ''}, not as authorship.`);
  }

  if (requireSignoff && !lines.some(l => /^Signed-off-by: .+ <.+@.+>$/.test(l.trim())))
    problems.push('missing "Signed-off-by: Name <email>" (ZS-109). Commit with `git commit -s`.');
  return problems;
}

function runSelfTest() {
  const commits = {
    ...DEFAULTS,
    bannedTrailers: ['^Co-authored-by:.*(claude|anthropic|copilot)', '^(Generated|Assisted|Created|Written)-(by|with):', '^🤖 Generated with'],
  };
  const t = (msg, opts = {}) => checkMessage(msg, { commits, ...opts });
  const cases = [
    ['plain conventional', 'feat: add pointer check', false],
    ['scoped + breaking', 'fix(ci)!: pin actions by sha', false],
    ['task-ID scope', 'feat(T-020): ledger reversal entries', false],
    ['merge commit ignored', "Merge branch 'main' into x", false],
    ['fixup ignored', 'fixup! feat: x', false],
    ['non-conventional subject', 'Added a thing', true],
    ['unknown type', 'feature: add x', true],
    ['too long', 'feat: ' + 'x'.repeat(80), true],
    ['AI co-author trailer', 'feat: x\n\nCo-authored-by: Claude <noreply@anthropic.com>', true],
    ['generated-with banner', 'feat: x\n\n🤖 Generated with Claude Code', true],
    ['human co-author allowed', 'feat: x\n\nCo-authored-by: Pat Lee <pat@example.com>', false],
    ['comment lines ignored', 'feat: x\n# Co-authored-by: Claude', false],
  ];
  let code = selfTest('commit-msg', cases, m => t(m));
  code |= selfTest('commit-msg (trailer mode)', [
    ['Assisted-by allowed', 'feat: x\n\nAssisted-by: claude-code:opus', false],
    ['Generated-by still banned', 'feat: x\n\nGenerated-by: gpt', true],
  ], m => t(m, { aiDisclosure: 'trailer' }));
  code |= selfTest('commit-msg (signoff)', [
    ['signed off', 'feat: x\n\nSigned-off-by: Pat Lee <pat@example.com>', false],
    ['not signed off', 'feat: x', true],
  ], m => t(m, { requireSignoff: true }));
  return code;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(runSelfTest());
  const root = findRoot(argv);
  const m = loadManifest(root);
  const M = m ? m.data : {};
  const opts = {
    commits: { ...DEFAULTS, ...(M.commits || {}) },
    aiDisclosure: (M.project && M.project.aiDisclosure) || 'pr-template',
    requireSignoff: argv.includes('--require-signoff'),
  };
  const range = argValue(argv, '--range');
  const problems = [];
  if (range) {
    const shas = git(root, ['rev-list', '--no-merges', range]).split('\n').filter(Boolean);
    for (const sha of shas) {
      const msg = git(root, ['log', '-1', '--format=%B', sha]);
      for (const p of checkMessage(msg, opts)) problems.push(`${sha.slice(0, 10)}: ${p}`);
    }
    process.exit(report('commit-msg', problems, `${shas.length} commit(s) in ${range} conform`));
  }
  const file = argv.find(a => !a.startsWith('--') && a !== argValue(argv, '--root'));
  if (!file) { console.error('usage: commit-msg.mjs <message-file> | --range A..B [--require-signoff] | --self-test'); process.exit(2); }
  process.exit(report('commit-msg', checkMessage(readFileSync(file, 'utf8'), opts), 'message conforms'));
}
