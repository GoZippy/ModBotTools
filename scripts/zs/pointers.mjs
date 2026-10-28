#!/usr/bin/env node
/**
 * zippy-standards — ZS-001 / ZS-002: governance lives in AGENTS.md, and no
 * harness runs ungoverned.
 *
 * Governance must not hide inside a vendor-specific file that only one tool
 * reads. This fails the build when that starts happening:
 *   1. the canonical file exists;
 *   2. every required pointer exists and references it;
 *   3. pointers stay pointers — under the byte cap, no requirement/task IDs;
 *   4. no harness directory is present without a pointer or a "generated" mark;
 *   5. no unregistered agent-looking directory sits at the repo root.
 *
 *   node scripts/zs/pointers.mjs [--root DIR] [--self-test]
 * Exit codes: 0 ok, 1 governance failure, 2 cannot run (missing inputs).
 */
import { readFileSync, existsSync, readdirSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { findRoot, loadManifest, report, selfTest, isMain } from './lib.mjs';

/** A pointer is REQUIRED when the harness has no marker (always applies, e.g.
 *  Aider, Copilot), its marker is present, or the pointer is a root-level file
 *  (CLAUDE.md, CONVENTIONS.md, .windsurfrules) — a tool's marker directory often
 *  appears only AFTER it first runs, and governance must exist before that.
 *  The installer imports this same predicate. */
export function pointerRequired(h, markerPresent) {
  return !h.marker || markerPresent || !h.pointer.includes('/');
}

export function markerPresent(root, h) {
  return [h.marker, ...(h.altMarkers || [])].filter(Boolean).some(m => existsSync(join(root, m)));
}

export function checkPointers(root, M) {
  const CANON = M.canonical || 'AGENTS.md';
  const MAX = M.pointerMaxBytes || 4096;
  const idPatterns = (M.idPatterns || ['\\b[A-Z]{2,4}-\\d{3}[a-z]?\\b', '\\bT-\\d{3}\\b']).map(p => new RegExp(p));
  const problems = [];

  if (!existsSync(join(root, CANON))) return [`${CANON} is missing — this repo has no canonical constitution.`];

  for (const h of M.harnesses || []) {
    const present = markerPresent(root, h);
    if (present && !h.pointer && !h.generated && h.id !== 'codex') {
      problems.push(`${h.name}: detected (${h.marker} exists) but no pointer is registered — this tool would run with no governance.`);
      continue;
    }
    if (!h.pointer) continue;
    const abs = join(root, h.pointer);
    if (!existsSync(abs)) {
      if (pointerRequired(h, present)) problems.push(`${h.name}: pointer ${h.pointer} is MISSING — this tool would run with no governance.`);
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (!text.includes(CANON))
      problems.push(`${h.pointer}: does not reference ${CANON} — an agent reading only this file never finds the rules.`);
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > MAX)
      problems.push(`${h.pointer}: ${bytes} bytes (cap ${MAX}) — too big for a pointer; rules are accumulating here.`);
    const hit = idPatterns.find(re => re.test(text));
    if (hit) problems.push(`${h.pointer}: contains an ID matching ${hit} — requirements and tasks belong in the spec files, visible to every tool.`);
  }

  // Unregistered agent directories. A name regex alone is not enough (".kilo"
  // matched nothing in a real repo), so: an explicit registry of known agent
  // dirs, an allowlist of benign furniture, and the regex as a last-resort net.
  const registered = new Set((M.harnesses || [])
    .flatMap(h => [h.marker, ...(h.altMarkers || []), h.pointer]).filter(Boolean).map(p => p.split('/')[0]));
  const known = new Set(M.knownAgentDirs || []);
  const benign = new Set(M.benignDirs || []);
  const SUSPECT = /^\.(?:[a-z0-9-]*(?:rules|agent|ai|llm|copilot|cody|codeium|windsurf|roo|cline|aide|bot)[a-z0-9-]*)$/i;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const n = entry.name;
    if (!n.startsWith('.') || registered.has(n) || benign.has(n)) continue;
    if (known.has(n)) problems.push(`${n}: a known agent tool directory the manifest does not register. Add it to zippy-standards.json (with a pointer, or "generated": true).`);
    else if (SUSPECT.test(n)) problems.push(`${n}: looks like an agent instruction location the manifest does not know about. Register it, or add it to benignDirs if it is not one.`);
  }
  return problems;
}

function runSelfTest() {
  const M = {
    canonical: 'AGENTS.md', pointerMaxBytes: 200,
    harnesses: [
      { id: 'claude-code', name: 'Claude Code', marker: '.claude', pointer: 'CLAUDE.md' },
      { id: 'cursor', name: 'Cursor', marker: '.cursor', pointer: '.cursor/rules/00.mdc' },
      { id: 'mystery', name: 'Mystery', marker: '.mystery', pointer: null },
    ],
    knownAgentDirs: ['.roo'], benignDirs: ['.git'],
  };
  const good = 'See AGENTS.md.';
  const mk = files => {
    const d = mkdtempSync(join(tmpdir(), 'zs-pointers-'));
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(d, rel)), { recursive: true });
      if (body !== null) writeFileSync(join(d, rel), body);
    }
    return d;
  };
  const cases = [
    ['compliant repo', { 'AGENTS.md': '#', 'CLAUDE.md': good }, false],
    ['missing AGENTS.md', { 'CLAUDE.md': good }, true],
    ['root pointer missing', { 'AGENTS.md': '#' }, true],
    ['pointer stops referencing AGENTS.md', { 'AGENTS.md': '#', 'CLAUDE.md': 'rules here' }, true],
    ['requirement ID smuggled into pointer', { 'AGENTS.md': '#', 'CLAUDE.md': `${good} REQ-012` }, true],
    ['pointer over the byte cap', { 'AGENTS.md': '#', 'CLAUDE.md': good + 'x'.repeat(300) }, true],
    ['harness present, no pointer registered', { 'AGENTS.md': '#', 'CLAUDE.md': good, '.mystery/x': '' }, true],
    ['cursor marker present, pointer missing', { 'AGENTS.md': '#', 'CLAUDE.md': good, '.cursor/x': '' }, true],
    ['known agent dir unregistered', { 'AGENTS.md': '#', 'CLAUDE.md': good, '.roo/x': '' }, true],
    ['suspect agent dir', { 'AGENTS.md': '#', 'CLAUDE.md': good, '.foorules/x': '' }, true],
  ];
  const dirs = [];
  const code = selfTest('pointers', cases.map(([l, files, f]) => {
    const d = mk(files); dirs.push(d); return [l, d, f];
  }), d => checkPointers(d, M));
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  return code;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(runSelfTest());
  const root = findRoot(argv);
  const m = loadManifest(root);
  if (!m) { console.error('FAIL pointers: zippy-standards.json not found at the repo root. Install with zippy-standards.'); process.exit(2); }
  const problems = checkPointers(root, m.data);
  if (problems.length && problems[0].includes('is missing — this repo has no canonical')) { console.error(`FAIL pointers: ${problems[0]}`); process.exit(2); }
  process.exit(report('pointers', problems, `pointers verified against ${m.data.canonical || 'AGENTS.md'}; no ungoverned harness`));
}
