import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const fixture = 'fixtures/eval.sample.jsonl';

test('offline evaluation names the selected provider and never silently substitutes local rules', () => {
  const local = spawnSync(process.execPath, ['dist/evaluate.js', fixture, '--provider', 'local'], { encoding: 'utf8' });
  assert.equal(local.status, 0, local.stderr);
  const report = JSON.parse(local.stdout);
  assert.equal(report.provider, 'local');
  assert.equal(report.classified, 6);
  assert.equal(report.errors, 0);
  assert.equal(report.falseHolds, 0);
  assert.equal(typeof report.latencyMs.p95, 'number');

  const laya = spawnSync(process.execPath, ['dist/evaluate.js', fixture, '--provider', 'laya_studio'], { encoding: 'utf8' });
  assert.notEqual(laya.status, 0);
  assert.match(laya.stderr, /--allow-remote/);

  const missingKey = spawnSync(process.execPath, ['dist/evaluate.js', fixture, '--provider', 'laya_studio', '--allow-remote'],
    { encoding: 'utf8', env: { ...process.env, LAYA_API_KEY: '' } });
  assert.notEqual(missingKey.status, 0);
  assert.match(missingKey.stderr, /LAYA_API_KEY/);

  const unknown = spawnSync(process.execPath, ['dist/evaluate.js', fixture, '--provider', 'unknown'], { encoding: 'utf8' });
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /Unknown classifier provider/);
});

test('malformed fixture is rejected before provider calls without echoing its text', async () => {
  let calls = 0;
  const server = createServer((_req, res) => { calls++; res.end('{}'); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const dir = mkdtempSync(join(tmpdir(), 'modbot-eval-'));
  const file = join(dir, 'fixture.jsonl');
  const marker = 'SYNTHETIC_PRIVATE_MARKER';
  writeFileSync(file, `{"text":"ordinary discussion","expected":"allow"}\n\n{"text":"${marker}","expected":"flag"\n`);
  try {
    const child = spawn(process.execPath, ['dist/evaluate.js', file, '--provider', 'zippy_decisions'], {
      env: { ...process.env, ZIPPY_DECISIONS_URL: `http://127.0.0.1:${address.port}/v1/systemone` },
      stdio: ['ignore', 'ignore', 'pipe']
    });
    const closed = once(child, 'close');
    let stderr = '';
    child.stderr.setEncoding('utf8');
    for await (const chunk of child.stderr) stderr += chunk;
    const [code] = await closed;
    assert.notEqual(code, 0);
    assert.match(stderr, /Invalid JSON at line 3/);
    assert.equal(stderr.includes(marker), false);
    assert.equal(calls, 0);
  } finally {
    unlinkSync(file);
    rmdirSync(dir);
    server.close();
    await once(server, 'close');
  }
});
