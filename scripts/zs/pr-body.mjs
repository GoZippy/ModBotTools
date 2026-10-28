#!/usr/bin/env node
/**
 * zippy-standards — ZS-013 AI disclosure, ZS-014 PR contract, ZS-015 review
 * dispositions.
 *
 *   node scripts/zs/pr-body.mjs <body-file>
 *   PR_BODY="$(gh pr view 12 --json body -q .body)" node scripts/zs/pr-body.mjs --env PR_BODY
 *   node scripts/zs/pr-body.mjs --self-test
 *
 * Run it before `gh pr create --body-file`, which bypasses the template.
 * Exit codes: 0 ok, 1 violation, 2 cannot run.
 */
import { readFileSync } from 'node:fs';
import { argValue, findRoot, isMain, loadManifest, report, selfTest } from './lib.mjs';

const DEFAULT_HEADINGS = ['## Goal', '## Why it matters', '## Not a goal', '## What changed', '## Tests',
  '## Compatibility', '## Review dispositions', '## AI assistance'];

/** Split a markdown body into { "## Heading": "section text" } with HTML
 *  comments removed, so template guidance never counts as content. */
export function sections(body) {
  const clean = body.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const out = {};
  let cur = null;
  for (const line of clean.split('\n')) {
    const h = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (h && h[1] === '##') { cur = `## ${h[2]}`; out[cur] = ''; continue; }
    if (cur) out[cur] += line + '\n';
  }
  return out;
}

export function checkBody(body, { headings = DEFAULT_HEADINGS, goalLine = '**Goal:**' } = {}) {
  const problems = [];
  const s = sections(body);
  const norm = k => k.toLowerCase();
  const byNorm = Object.fromEntries(Object.entries(s).map(([k, v]) => [norm(k), v]));

  for (const h of headings) if (!(norm(h) in byNorm)) problems.push(`missing heading "${h}".`);

  const goal = byNorm[norm('## Goal')];
  if (goal !== undefined) {
    const line = goal.split('\n').find(l => l.includes(goalLine));
    const rest = line ? line.slice(line.indexOf(goalLine) + goalLine.length).trim() : '';
    if (!line || rest.length < 10 || /^(tbd|todo|\.\.\.|n\/a)$/i.test(rest))
      problems.push(`the "${goalLine}" line is missing or unfilled — one sentence stating what this PR delivers (ZS-014).`);
  }

  const ai = byNorm[norm('## AI assistance')];
  if (ai !== undefined && !/^\s*[-*] \[[xX]\]/m.test(ai))
    problems.push('"## AI assistance" has no box ticked — say whether AI helped and how (ZS-013).');

  const disp = byNorm[norm('## Review dispositions')];
  if (disp !== undefined) {
    const text = disp.trim();
    const listed = /\b(fixed|rebutted|deferred|needs-decision)\b/i.test(text);
    const none = /^(none( yet)?|no findings( yet)?)\.?$/i.test(text) || /^[-*] none/im.test(text);
    if (!listed && !none)
      problems.push('"## Review dispositions" must list each finding as fixed / rebutted / deferred / needs-decision, or say "None yet" (ZS-015).');
    for (const l of text.split('\n').filter(x => /\bdeferred\b/i.test(x)))
      if (!/(#\d+|https?:\/\/\S+\/issues\/\d+)/.test(l))
        problems.push(`a deferred finding needs a linked issue with an owner and a due date: "${l.trim()}" (ZS-015).`);
  }
  return problems;
}

function runSelfTest() {
  const good = [
    '## Goal', '**Goal:** Add the pointer check to the pre-commit hook.',
    '## Why it matters', 'x', '## Not a goal', 'x', '## What changed', 'x', '## Tests', 'x',
    '## Compatibility', 'Compatible.', '## Review dispositions', '- F1 fixed in abc123',
    '## AI assistance', '- [x] AI drafted code that I reviewed line by line',
  ].join('\n');
  const cases = [
    ['compliant body', good, false],
    ['missing heading', good.replace('## Tests', '## Testing'), true],
    ['goal left as template', good.replace('Add the pointer check to the pre-commit hook.', '<!-- one sentence -->'), true],
    ['goal TBD', good.replace('Add the pointer check to the pre-commit hook.', 'TBD'), true],
    ['no AI box ticked', good.replace('- [x] AI', '- [ ] AI'), true],
    ['dispositions empty', good.replace('- F1 fixed in abc123', ''), true],
    ['dispositions none yet', good.replace('- F1 fixed in abc123', 'None yet'), false],
    ['deferred without issue', good.replace('- F1 fixed in abc123', '- F1 deferred, later'), true],
    ['deferred with issue', good.replace('- F1 fixed in abc123', '- F1 deferred to #42 (owner: pat, due 2026-10-15)'), false],
    ['heading only in a comment', good.replace('## Tests\nx', '<!-- ## Tests -->'), true],
  ];
  return selfTest('pr-body', cases, b => checkBody(b));
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(runSelfTest());
  const m = loadManifest(findRoot(argv));
  const pr = (m && m.data.pr) || {};
  const envName = argValue(argv, '--env');
  let body;
  if (envName) body = process.env[envName];
  else {
    const file = argv.find(a => !a.startsWith('--') && a !== argValue(argv, '--root'));
    if (file) body = readFileSync(file, 'utf8');
  }
  if (body === undefined) { console.error('usage: pr-body.mjs <body-file> | --env VAR | --self-test'); process.exit(2); }
  process.exit(report('pr-body', checkBody(body, { headings: pr.requiredHeadings || DEFAULT_HEADINGS, goalLine: pr.goalLine || '**Goal:**' }), 'PR body has every required section'));
}
