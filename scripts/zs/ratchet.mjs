#!/usr/bin/env node
/**
 * zippy-standards — ZS-023: a new gate lands as a ratchet.
 *
 * Today's violations go in a baseline file; only NEW ones fail; the baseline
 * may only shrink. Declared in zippy-standards.json → project.ratchets:
 *
 *   { "name": "ruff", "command": "uvx ruff check --output-format concise ." }
 *
 * The command's output is read one violation per line. "path:line:col: msg"
 * is normalised to "path: msg", so moving code does not churn the baseline.
 *
 *   node scripts/zs/ratchet.mjs                 # every declared ratchet
 *   node scripts/zs/ratchet.mjs ruff            # one
 *   node scripts/zs/ratchet.mjs ruff --update   # prune fixed entries (shrink only)
 *   node scripts/zs/ratchet.mjs ruff --accept-new  # also add new ones, printing each
 *   node scripts/zs/ratchet.mjs --self-test
 *
 * Fails closed: a command that exits non-zero with no parseable output did
 * not run, and that is exit 2, never a pass.
 * Exit codes: 0 ok, 1 new or stale violations, 2 cannot run.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { findRoot, isMain, loadManifest, runShell, selfTest } from './lib.mjs';

export const BASELINE_DIR = '.github/zs-baselines';

export function normalise(line) {
  const t = line.replace(/\x1b\[[0-9;]*m/g, '').trim().replace(/\\/g, '/');
  if (!t) return null;
  const m = t.match(/^(.+?):\d+(?::\d+)?:?\s*(.*)$/);
  return m ? `${m[1]}: ${m[2]}` : t;
}

const count = keys => keys.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());

/** Compare current violations with a baseline. Returns { added, stale }. */
export function compare(current, baseline) {
  const cur = count(current), base = count(baseline);
  const added = [], stale = [];
  for (const [k, n] of cur) for (let i = base.get(k) || 0; i < n; i++) added.push(k);
  for (const [k, n] of base) for (let i = cur.get(k) || 0; i < n; i++) stale.push(k);
  return { added, stale };
}

function runOne(root, r, flags) {
  const file = join(root, r.baseline || `${BASELINE_DIR}/${r.name}.txt`);
  const out = runShell(r.command, root, { capture: true });
  if (out.error) { console.error(`FAIL ratchet ${r.name}: could not start "${r.command}": ${out.error.message}`); return 2; }
  const current = (out.stdout + (r.stderr ? out.stderr : '')).split('\n')
    .filter(l => !r.ignore || !new RegExp(r.ignore).test(l)).map(normalise).filter(Boolean).sort();
  if (out.status !== 0 && current.length === 0) {
    console.error(`FAIL ratchet ${r.name}: "${r.command}" exited ${out.status} with no violations on stdout — the tool did not run.\n${out.stderr.trim()}`);
    return 2;
  }
  const baseline = existsSync(file) ? readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).sort() : [];
  const { added, stale } = compare(current, baseline);

  if (flags.acceptNew || (flags.update && added.length === 0)) {
    if (flags.acceptNew && added.length) {
      console.warn(`ratchet ${r.name}: ACCEPTING ${added.length} new violation(s) into the baseline — say why in the commit:`);
      for (const a of added) console.warn(`  + ${a}`);
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, current.length ? current.join('\n') + '\n' : '');
    console.log(`OK   ratchet ${r.name}: baseline now ${current.length} (was ${baseline.length})`);
    return 0;
  }
  const problems = [];
  if (added.length) problems.push(`${added.length} NEW violation(s) — fix them (the baseline never grows silently):\n` + added.map(a => `      + ${a}`).join('\n'));
  if (stale.length) problems.push(`${stale.length} baseline entr(ies) are fixed — shrink the baseline: node scripts/zs/ratchet.mjs ${r.name} --update\n` + stale.slice(0, 20).map(a => `      - ${a}`).join('\n'));
  if (problems.length) { console.error(`FAIL ratchet ${r.name}:\n  ${problems.join('\n  ')}`); return 1; }
  console.log(`OK   ratchet ${r.name}: ${current.length} known, 0 new`);
  return 0;
}

function runSelfTest() {
  const cases = [
    ['nothing changed', [['a: x', 'b: y'], ['a: x', 'b: y']], false],
    ['new violation', [['a: x', 'b: y', 'c: z'], ['a: x', 'b: y']], true],
    ['duplicate of a known key is still new', [['a: x', 'a: x'], ['a: x']], true],
    ['fixed but baseline not shrunk', [['a: x'], ['a: x', 'b: y']], true],
  ];
  let code = selfTest('ratchet', cases, ([cur, base]) => {
    const { added, stale } = compare(cur, base);
    return [...added, ...stale];
  });
  code |= selfTest('ratchet normalise', [
    ['line numbers dropped', 'src/a.py:12:4: F401 unused', false],
    ['windows paths unified', 'src\\a.py:3: E1', false],
  ], l => {
    const n = normalise(l);
    return n === 'src/a.py: F401 unused' || n === 'src/a.py: E1' ? [] : [`got ${n}`];
  });
  return code;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(runSelfTest());
  const root = findRoot(argv);
  const m = loadManifest(root);
  const ratchets = (m && m.data.project && m.data.project.ratchets) || [];
  const only = argv.find(a => !a.startsWith('--'));
  const pick = only ? ratchets.filter(r => r.name === only) : ratchets;
  if (only && !pick.length) { console.error(`FAIL ratchet: no ratchet named "${only}" in zippy-standards.json`); process.exit(2); }
  if (!pick.length) { console.log('OK   ratchet: none declared'); process.exit(0); }
  const flags = { update: argv.includes('--update'), acceptNew: argv.includes('--accept-new') };
  let worst = 0;
  for (const r of pick) worst = Math.max(worst, runOne(root, r, flags));
  process.exit(worst);
}
