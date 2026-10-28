/**
 * zippy-standards — shared helpers for the checks.
 *
 * The checks are vendored into each repo as scripts/zs/*.mjs and also run from
 * the kit's checks/ directory, so nothing here may assume where it lives. The
 * repository root is found from the working directory (or --root), never from
 * this file's own path.
 *
 * Zero dependencies: Node 18+ only. Cross-platform: fileURLToPath, never
 * url.pathname, which yields /S:/path on Windows.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** True when the module at `metaUrl` is the script node was started with.
 *  Compared case-insensitively on Windows, where drive letters and path
 *  separators differ between process.argv and import.meta.url. */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  const norm = p => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));
  return norm(fileURLToPath(metaUrl)) === norm(process.argv[1]);
}

export function argValue(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

/** The variables git exports into a hook's environment that redirect where a
 *  git command acts. A push or commit from a linked worktree sets them, and a
 *  child `git` that inherits them acts on that repository instead of its cwd
 *  (a temp `git init` then flips core.bare on the shared primary). */
export const GIT_LOCATION_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR'];

/** A copy of `base` without GIT_LOCATION_VARS, for every child that runs git. */
export function cleanGitEnv(base = process.env) {
  const env = { ...base };
  for (const name of GIT_LOCATION_VARS) delete env[name];
  return env;
}

export function git(root, args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: cleanGitEnv() });
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')} failed: ${(r.stderr || '').trim()}`);
  }
  return r.stdout;
}

let shCache;
/** Run a gate command through POSIX sh when one exists (Git for Windows ships
 *  one), so a command line in the manifest means the same thing on every OS.
 *  Falls back to the platform shell. */
export function runShell(cmd, cwd, { capture = false, env = cleanGitEnv() } = {}) {
  if (shCache === undefined) {
    const probe = spawnSync('sh', ['-c', 'exit 0'], { encoding: 'utf8' });
    shCache = probe.status === 0;
  }
  const stdio = capture ? ['ignore', 'pipe', 'pipe'] : 'inherit';
  const r = shCache
    ? spawnSync('sh', ['-c', cmd], { cwd, env, stdio, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    : spawnSync(cmd, { cwd, env, stdio, encoding: 'utf8', shell: true, maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status === null ? 1 : r.status, error: r.error, stdout: r.stdout || '', stderr: r.stderr || '' };
}

export function findRoot(argv = process.argv.slice(2)) {
  const explicit = argValue(argv, '--root');
  if (explicit) return resolve(explicit);
  const top = git(process.cwd(), ['rev-parse', '--show-toplevel'], { allowFail: true });
  return top ? resolve(top.trim()) : process.cwd();
}

/** Load the repo manifest; fall back to a v1 agent-standard.json so an
 *  un-upgraded repo still gets checked rather than silently skipped. */
export function loadManifest(root) {
  for (const name of ['zippy-standards.json', 'agent-standard.json', '.agent-standard.json']) {
    const p = join(root, name);
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf8'));
      return { path: p, name, legacy: name !== 'zippy-standards.json', data };
    }
  }
  return null;
}

export function tierChain(M, tier) {
  const chain = [];
  let t = tier || 'private';
  const seen = new Set();
  while (t && M.tiers && M.tiers[t] && !seen.has(t)) {
    seen.add(t);
    chain.unshift(t);
    t = M.tiers[t].inherits;
  }
  return chain;
}

/** Union of a tier field across the inheritance chain, root tier first. */
export function tierList(M, tier, field) {
  return [...new Set(tierChain(M, tier).flatMap(t => M.tiers[t][field] || []))];
}

/** The most specific tier's value for a scalar field. */
export function tierValue(M, tier, field) {
  let v;
  for (const t of tierChain(M, tier)) if (field in M.tiers[t]) v = M.tiers[t][field];
  return v;
}

export function report(name, problems, okMessage, { warnings = [] } = {}) {
  for (const w of warnings) console.warn(`WARN ${name}: ${w}`);
  if (problems.length) {
    console.error(`FAIL ${name}: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }
  console.log(`OK   ${name}: ${okMessage}`);
  return 0;
}

/** Run fn against planted inputs. Each case is [label, input, expectFail]. */
export function selfTest(name, cases, fn) {
  let bad = 0;
  for (const [label, input, expectFail] of cases) {
    const problems = fn(input);
    const failed = problems.length > 0;
    if (failed !== expectFail) {
      bad++;
      console.error(`SELF-TEST FAIL ${name}: "${label}" expected ${expectFail ? 'a failure' : 'a pass'}, got ${failed ? problems.join('; ') : 'a pass'}`);
    }
  }
  if (bad) return 1;
  console.log(`OK   ${name} self-test: ${cases.length} planted case(s) behave`);
  return 0;
}
