#!/usr/bin/env node
/**
 * zippy-standards — repository hygiene for the repo's declared tier.
 *
 *   ZS-003  tool-generated agent dirs are ignored and untracked
 *   ZS-020  gate commands are declared
 *   ZS-022  no .env file tracked or unignored
 *   ZS-025  .gitattributes pins line endings
 *   ZS-040  private repos: no GitHub-hosted runner on push / pull_request / schedule
 *   ZS-041  workflows declare permissions and pin actions to a full SHA
 *   ZS-042  no PR-head checkout under pull_request_target / workflow_run
 *   ZS-100+ required files for the tier
 *   ZS-101  public repos: no self-hosted runner
 *   ZS-106  public repos: Dependabot cooldown
 *   ZS-200  public-large: CODEOWNERS is per-path, not one catch-all
 *   with --base REF:
 *   ZS-005  docs/decisions/ is add-only
 *   ZS-033  shipped CHANGELOG sections are unchanged
 *
 * A finding can be waived for a while, never forever: project.waivers =
 *   [{ "rule": "ZS-041", "path": ".github/workflows/old.yml",
 *      "reason": "vendored upstream workflow", "until": "2026-12-31" }]
 * An expired waiver is itself a failure.
 *
 *   node scripts/zs/hygiene.mjs [--root DIR] [--base origin/main] [--self-test]
 * Exit codes: 0 ok, 1 violation, 2 cannot run.
 */
import { readFileSync, existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { argValue, findRoot, git, isMain, loadManifest, report, selfTest, tierList, tierValue } from './lib.mjs';

/** Files that may live at the root, in .github/ or in docs/ under any common
 *  spelling; everything else must exist at exactly the listed path. */
const ALTERNATES = {
  LICENSE: ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'COPYING', 'LICENSE-MIT', 'LICENSE-APACHE'],
  'SECURITY.md': ['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md'],
  'CONTRIBUTING.md': ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md'],
  'CODE_OF_CONDUCT.md': ['CODE_OF_CONDUCT.md', '.github/CODE_OF_CONDUCT.md', 'docs/CODE_OF_CONDUCT.md'],
  '.github/PULL_REQUEST_TEMPLATE.md': ['.github/PULL_REQUEST_TEMPLATE.md', '.github/pull_request_template.md', 'PULL_REQUEST_TEMPLATE.md', 'docs/pull_request_template.md'],
  '.github/CODEOWNERS': ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'],
};

const HOSTED = /^\s*runs-on:\s*\[?\s*['"]?(ubuntu|windows|macos)-[\w.-]+/m;
const SELF_HOSTED = /^\s*runs-on:.*self-hosted/m;

export function workflowProblems(rel, text, { tier, hostedAllowed, selfHostedAllowed }) {
  const out = [];
  const onBlock = text.match(/^on:([\s\S]*?)^(?:permissions|jobs|env|concurrency|defaults|run-name|name):/m);
  const triggers = onBlock ? onBlock[1] : (text.match(/^on:.*$/m) || [''])[0];
  const autoTriggered = /\b(push|pull_request|pull_request_target|schedule|workflow_run)\b/.test(triggers);

  if (!/^permissions:/m.test(text))
    out.push(['ZS-041', `${rel}: no top-level "permissions:" — declare least privilege (e.g. "permissions: { contents: read }").`]);
  for (const m of text.matchAll(/^\s*-?\s*uses:\s*['"]?([^\s'"#]+)/gm)) {
    const ref = m[1];
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue;
    if (!/@[0-9a-f]{40}$/.test(ref))
      out.push(['ZS-041', `${rel}: "${ref}" is not pinned to a full commit SHA — pin it and keep "# vX.Y.Z" as a comment.`]);
  }
  if (/\b(pull_request_target|workflow_run)\b/.test(triggers) &&
      /ref:\s*\$\{\{\s*github\.event\.(pull_request\.head\.(sha|ref)|workflow_run\.head_(sha|branch))/.test(text))
    out.push(['ZS-042', `${rel}: checks out PR-head code under pull_request_target/workflow_run, which carries the base repo's secrets.`]);
  if (!hostedAllowed && autoTriggered && HOSTED.test(text))
    out.push(['ZS-040', `${rel}: a ${tier} repo runs a GitHub-hosted runner on an automatic trigger — that is billed. Use the local gate, the nightly runner, or runs-on: [self-hosted, ...].`]);
  if (selfHostedAllowed === false && SELF_HOSTED.test(text))
    out.push(['ZS-101', `${rel}: self-hosted runner on a ${tier} repo — any fork PR could run code on it. Use GitHub-hosted runners.`]);
  return out;
}

export function checkHygiene(root, M, { base } = {}) {
  const P = M.project || {};
  const tier = P.tier || 'private';
  const found = [];               // [ruleId, message, path?]
  const warnings = [];
  const has = rel => existsSync(join(root, rel));
  const isRepo = git(root, ['rev-parse', '--git-dir'], { allowFail: true }) !== null;
  const tracked = isRepo ? git(root, ['ls-files', '-z']).split('\0').filter(Boolean) : [];
  const ignored = rel => isRepo && git(root, ['check-ignore', '-q', rel], { allowFail: true }) !== null;

  if (!M.tiers || !M.tiers[tier]) return { problems: [`project.tier "${tier}" is not a tier this standard defines (${Object.keys(M.tiers || {}).join(', ')}).`], warnings };

  for (const f of tierList(M, tier, 'requiredFiles')) {
    const alts = ALTERNATES[f] || [f];
    if (!alts.some(has)) found.push(['ZS-100', `missing ${f} (required for the ${tier} tier).`, f]);
  }

  for (const g of M.gitignoreAdditions || []) {
    const rel = g.replace(/\/$/, '');
    if (tracked.some(t => t === rel || t.startsWith(rel + '/')))
      found.push(['ZS-003', `${g} is tracked — it is tool-generated. git rm -r --cached ${rel} and keep it in .gitignore.`, g]);
    else if (has(rel) && isRepo && !ignored(rel))
      found.push(['ZS-003', `${g} exists but is not gitignored.`, g]);
  }

  const envLike = p => /(^|\/)\.env(\.[\w-]+)?$/.test(p) && !/\.(example|sample|template|dist|defaults)$/.test(p);
  for (const t of tracked.filter(envLike)) found.push(['ZS-022', `${t} is tracked — secrets never enter the repo. Remove it, rotate what it held, keep a .env.example.`, t]);
  if (has('.env') && isRepo && !ignored('.env') && !tracked.includes('.env')) found.push(['ZS-022', '.env exists and is not gitignored.', '.env']);

  const gates = P.gates || {};
  if (!['fast', 'test', 'full'].some(s => (gates[s] || []).length))
    warnings.push('ZS-020: project.gates declares no commands — the gate runs only the standard checks. Add your lint and test commands.');

  const wfDir = join(root, '.github/workflows');
  if (existsSync(wfDir)) {
    const opts = { tier, hostedAllowed: tierValue(M, tier, 'hostedRunnersAllowed') !== false, selfHostedAllowed: tierValue(M, tier, 'selfHostedRunnersAllowed') };
    for (const f of readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f))) {
      const rel = `.github/workflows/${f}`;
      for (const [id, msg] of workflowProblems(rel, readFileSync(join(wfDir, f), 'utf8'), opts)) found.push([id, msg, rel]);
    }
  }

  if (tierList(M, tier, 'requiredFiles').includes('.github/dependabot.yml') && has('.github/dependabot.yml') &&
      !/cooldown:/.test(readFileSync(join(root, '.github/dependabot.yml'), 'utf8')))
    found.push(['ZS-106', '.github/dependabot.yml sets no cooldown — wait ~7 days before proposing a new release.', '.github/dependabot.yml']);

  if (tier === 'public-large') {
    const co = ALTERNATES['.github/CODEOWNERS'].find(has);
    if (co) {
      const rules = readFileSync(join(root, co), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      if (rules.length && rules.every(r => r.startsWith('* ')))
        found.push(['ZS-200', `${co} has only a catch-all rule — name owners per path.`, co]);
    }
  }

  if (base && isRepo) {
    const diff = git(root, ['diff', '--name-status', `${base}...HEAD`, '--', 'docs/decisions/'], { allowFail: true });
    if (diff === null) return { problems: [`cannot diff against ${base} — fetch it first.`], warnings, cannotRun: true };
    for (const line of diff.split('\n').filter(Boolean)) {
      const [st, p] = line.split('\t');
      if (!st.startsWith('A')) found.push(['ZS-005', `${p}: decisions are add-only (status ${st}). Record a change of mind as a new entry with "Supersedes:".`, p]);
    }
    const oldLog = git(root, ['show', `${base}:CHANGELOG.md`], { allowFail: true });
    if (oldLog !== null) {
      const now = has('CHANGELOG.md') ? readFileSync(join(root, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n') : '';
      for (const sec of oldLog.replace(/\r\n/g, '\n').split(/^(?=## )/m).filter(s => s.startsWith('## ') && !/unreleased/i.test(s.split('\n')[0]))) {
        if (!now.includes(sec.trimEnd())) found.push(['ZS-033', `CHANGELOG.md: shipped section "${sec.split('\n')[0]}" was edited or removed.`, 'CHANGELOG.md']);
      }
    }
  }

  // Waivers: time-boxed, reasoned, and an expired one is itself a failure.
  const today = new Date().toISOString().slice(0, 10);
  const problems = [];
  for (const w of P.waivers || []) {
    if (!w.reason || !w.until) problems.push(`waiver ${JSON.stringify(w)} needs a "reason" and an "until" date.`);
    else if (w.until < today) problems.push(`waiver for ${w.rule} on ${w.path || '*'} expired ${w.until} — fix it or renew it with a new reason.`);
  }
  for (const [id, msg, path] of found) {
    const w = (P.waivers || []).find(w => w.rule === id && (!w.path || w.path === path) && w.until >= today && w.reason);
    if (w) warnings.push(`${id} waived until ${w.until} (${w.reason}): ${msg}`);
    else problems.push(`${id} ${msg}`);
  }
  return { problems, warnings };
}

function runSelfTest() {
  const M = {
    tiers: {
      private: { requiredFiles: ['AGENTS.md', '.gitattributes'], hostedRunnersAllowed: false, selfHostedRunnersAllowed: true },
      public: { inherits: 'private', requiredFiles: ['LICENSE'], hostedRunnersAllowed: true, selfHostedRunnersAllowed: false },
    },
    gitignoreAdditions: ['.autoclaw/'],
  };
  const SHA = 'a'.repeat(40);
  const wfGood = `name: ci\non:\n  push:\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: [self-hosted, linux]\n    steps:\n      - uses: actions/checkout@${SHA} # v5\n      - uses: ./local\n`;
  const mk = (files, tier = 'private', extra = {}) => {
    const d = mkdtempSync(join(tmpdir(), 'zs-hygiene-'));
    git(d, ['init', '-q']);
    for (const [rel, body] of Object.entries(files)) { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), body); }
    git(d, ['add', '-A']);
    return [d, { ...M, project: { tier, gates: { fast: ['true'] }, ...extra } }];
  };
  const base = { 'AGENTS.md': '#', '.gitattributes': '* text=auto eol=lf\n' };
  const cases = [
    ['compliant private repo', mk({ ...base, '.github/workflows/ci.yml': wfGood }), false],
    ['missing .gitattributes', mk({ 'AGENTS.md': '#' }), true],
    ['public tier needs LICENSE', mk(base, 'public'), true],
    ['LICENSE.md satisfies LICENSE', mk({ ...base, 'LICENSE.md': 'MIT' }, 'public'), false],
    ['.env tracked', mk({ ...base, '.env': 'KEY=1' }), true],
    ['.env.example allowed', mk({ ...base, '.env.example': 'KEY=' }), false],
    ['generated dir tracked', mk({ ...base, '.autoclaw/x.md': 'x' }), true],
    ['unpinned action', mk({ ...base, '.github/workflows/ci.yml': wfGood.replace(`@${SHA}`, '@v5') }), true],
    ['no permissions block', mk({ ...base, '.github/workflows/ci.yml': wfGood.replace('permissions:\n  contents: read\n', '') }), true],
    ['hosted runner on private push', mk({ ...base, '.github/workflows/ci.yml': wfGood.replace('[self-hosted, linux]', 'ubuntu-latest') }), true],
    ['hosted runner on private dispatch-only is fine', mk({ ...base, '.github/workflows/ci.yml': wfGood.replace('  push:', '  workflow_dispatch:').replace('[self-hosted, linux]', 'ubuntu-latest') }), false],
    ['self-hosted on public', mk({ ...base, 'LICENSE': 'MIT', '.github/workflows/ci.yml': wfGood }, 'public'), true],
    ['PR head checkout under pull_request_target', mk({ ...base, '.github/workflows/t.yml': wfGood.replace('  push:', '  pull_request_target:').replace('# v5', '# v5\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}') }), true],
    ['live waiver suppresses', mk({ ...base, '.github/workflows/ci.yml': wfGood.replace(`@${SHA}`, '@v5') }, 'private', { waivers: [{ rule: 'ZS-041', path: '.github/workflows/ci.yml', reason: 'vendored', until: '2999-01-01' }] }), false],
    ['expired waiver fails', mk(base, 'private', { waivers: [{ rule: 'ZS-041', reason: 'old', until: '2000-01-01' }] }), true],
  ];
  const code = selfTest('hygiene', cases, ([d, m]) => checkHygiene(d, m).problems);
  for (const [[d]] of cases.map(c => [c[1]])) rmSync(d, { recursive: true, force: true });
  return code;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(runSelfTest());
  const root = findRoot(argv);
  const m = loadManifest(root);
  if (!m) { console.error('FAIL hygiene: zippy-standards.json not found at the repo root.'); process.exit(2); }
  if (m.legacy) {
    console.warn(`WARN hygiene: ${m.name} is the v1 manifest, which declares no tier — skipped. Re-run the zippy-standards installer to upgrade.`);
    process.exit(0);
  }
  const { problems, warnings, cannotRun } = checkHygiene(root, m.data, { base: argValue(argv, '--base') });
  if (cannotRun) { console.error(`FAIL hygiene: ${problems[0]}`); process.exit(2); }
  process.exit(report('hygiene', problems, `${m.data.project?.tier || 'private'} tier requirements met`, { warnings }));
}
