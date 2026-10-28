#!/usr/bin/env node
/**
 * zippy-standards — ZS-020: the one gate entry point.
 *
 * People, agents, git hooks, the nightly runner and CI all call this, so a
 * gate means the same thing everywhere and CI YAML never re-implements it.
 *
 *   node scripts/zs/gate.mjs fast   # pre-commit: standard checks + project fast commands
 *   node scripts/zs/gate.mjs test   # pre-push:  project test commands
 *   node scripts/zs/gate.mjs ci     # fast + test
 *   node scripts/zs/gate.mjs full   # nightly / release: fast + test + full
 *   node scripts/zs/gate.mjs fast --keep-going
 *
 * Commands per stage live in zippy-standards.json → project.gates.
 * Exit codes: 0 all green, 1 a gate failed, 2 cannot run.
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRoot, isMain, loadManifest, runShell } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const STAGES = { fast: ['fast'], test: ['test'], ci: ['fast', 'test'], full: ['fast', 'test', 'full'] };

export function plan(M, stage) {
  const steps = [];
  const node = JSON.stringify(process.execPath);
  const self = f => `${node} ${JSON.stringify(join(here, f))}`;
  for (const s of STAGES[stage]) {
    if (s === 'fast') {
      steps.push({ label: 'standard: pointers', cmd: self('pointers.mjs') });
      steps.push({ label: 'standard: hygiene', cmd: self('hygiene.mjs') });
      if ((M.project?.ratchets || []).length) steps.push({ label: 'standard: ratchets', cmd: self('ratchet.mjs') });
      if (existsSync(join(here, 'traceability.mjs'))) steps.push({ label: 'standard: traceability', cmd: self('traceability.mjs') });
    }
    for (const cmd of M.project?.gates?.[s] || []) steps.push({ label: `${s}: ${cmd}`, cmd });
  }
  return steps;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const stage = argv.find(a => !a.startsWith('--')) || 'fast';
  if (!STAGES[stage]) { console.error(`usage: gate.mjs <${Object.keys(STAGES).join('|')}> [--keep-going]`); process.exit(2); }
  const root = findRoot(argv);
  const m = loadManifest(root);
  if (!m) { console.error('FAIL gate: zippy-standards.json not found at the repo root.'); process.exit(2); }
  const keepGoing = argv.includes('--keep-going');
  const steps = plan(m.data, stage);
  const failed = [];
  const t0 = Date.now();
  for (const step of steps) {
    const s0 = Date.now();
    console.log(`\n── zs gate ${stage} ▸ ${step.label}`);
    const r = runShell(step.cmd, root);
    const secs = ((Date.now() - s0) / 1000).toFixed(1);
    if (r.error || r.status !== 0) {
      failed.push(step.label);
      console.error(`   ✗ ${step.label} (${secs}s, exit ${r.error ? r.error.message : r.status})`);
      if (!keepGoing) break;
    } else console.log(`   ✓ ${secs}s`);
  }
  const total = ((Date.now() - t0) / 1000).toFixed(1);
  if (failed.length) {
    console.error(`\nzs gate ${stage}: FAILED in ${total}s — ${failed.join(', ')}`);
    process.exit(1);
  }
  const projectSteps = steps.filter(s => !s.label.startsWith('standard:')).length;
  console.log(`\nzs gate ${stage}: green in ${total}s (${steps.length} step(s)${projectSteps ? '' : '; no project commands declared for this stage'})`);
}
