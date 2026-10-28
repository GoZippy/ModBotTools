import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('./evaluate.js', import.meta.url));
const baseline = fileURLToPath(new URL('../fixtures/eval.sample.jsonl', import.meta.url));
const run = (path: string, provider = 'local') => spawnSync(process.execPath, [cli, path, '--gate'], {
  encoding: 'utf8',
  env: { ...process.env, CLASSIFIER_PROVIDER: provider },
});

test('the synthetic baseline passes the local evaluation gate', () => {
  const result = run(baseline);
  assert.equal(result.status, 0, result.stderr);
});

test('a mislabeled example and a reduced fixture fail the evaluation gate', () => {
  const directory = mkdtempSync(join(tmpdir(), 'modbot-eval-'));
  const path = join(directory, 'cases.jsonl');
  try {
    const lines = readFileSync(baseline, 'utf8').trim().split(/\r?\n/);
    const first = JSON.parse(lines[0]!) as { text: string; expected: string };
    lines[0] = JSON.stringify({ ...first, expected: 'hold' });
    writeFileSync(path, `${lines.join('\n')}\n`);
    assert.equal(run(path).status, 1);
    writeFileSync(path, `${lines[0]}\n`);
    assert.equal(run(path).status, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the evaluation gate refuses a remote provider', () => {
  const result = run(baseline, 'jev');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only the local classifier/);
});
