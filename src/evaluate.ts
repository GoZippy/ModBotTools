import { readFile } from 'node:fs/promises';
import { createClassifier } from './core/provider-factory.js';
import { decide } from './core/policy.js';
import type { Provider } from './core/routing.js';
import type { Decision, ModerationEvent } from './core/types.js';

interface Example { text: string; expected: Decision; surface?: ModerationEvent['surface']; mentionCount?: number; attachmentCount?: number }

const providers: Provider[] = ['local', 'jev', 'laya_studio', 'zippy_decisions', 'systemone_local'];
const [path, ...options] = process.argv.slice(2);
if (!path || path.startsWith('-')) throw new Error('Usage: evaluate fixture.jsonl [--provider NAME] [--model NAME] [--allow-remote]');

let provider: Provider = 'local';
let model: string | undefined;
let allowRemote = false;
for (let i = 0; i < options.length; i++) {
  const option = options[i];
  if (option === '--allow-remote') { allowRemote = true; continue; }
  if (option === '--provider' && options[i + 1]) {
    const name = options[++i]!;
    if (!providers.includes(name as Provider)) throw new Error(`Unknown classifier provider: ${name}`);
    provider = name as Provider;
    continue;
  }
  if (option === '--model' && options[i + 1]) {
    const name = options[++i]!;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) throw new Error('Invalid model name');
    model = name;
    continue;
  }
  throw new Error(`Unknown or incomplete option: ${option}`);
}
if (model && !['jev', 'laya_studio', 'systemone_local'].includes(provider)) throw new Error(`Model override is unsupported for ${provider}`);
if (['jev', 'laya_studio'].includes(provider) && !allowRemote) throw new Error('Hosted provider evaluation requires --allow-remote');

const lines = (await readFile(path, 'utf8')).split(/\r?\n/).map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => line.trim().length > 0);
if (lines.length === 0 || lines.length > 1000) throw new Error('Fixture must contain 1 to 1000 examples');
const surfaces: ModerationEvent['surface'][] = ['text', 'thread', 'voice_text', 'submission', 'voice_transcript'];
const samples = lines.map(({ line, lineNumber }): Example => {
  let raw: unknown;
  try { raw = JSON.parse(line); }
  catch { throw new Error(`Invalid JSON at line ${lineNumber}`); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Invalid example at line ${lineNumber}`);
  const sample = raw as Example;
  if (typeof sample.text !== 'string' || !sample.text.trim() || sample.text.length > 2000 || !['allow', 'flag', 'hold'].includes(sample.expected) ||
      sample.surface !== undefined && !surfaces.includes(sample.surface) ||
      sample.mentionCount !== undefined && (!Number.isInteger(sample.mentionCount) || sample.mentionCount < 0) ||
      sample.attachmentCount !== undefined && (!Number.isInteger(sample.attachmentCount) || sample.attachmentCount < 0)) {
    throw new Error(`Invalid example at line ${lineNumber}`);
  }
  return sample;
});
const classifier = createClassifier({ provider, model }, {
  typesafeKey: process.env.TYPESAFE_API_KEY,
  typesafeModel: process.env.TYPESAFE_MODEL,
  layaKey: process.env.LAYA_API_KEY,
  layaModel: process.env.LAYA_MODEL,
  zippyDecisionsUrl: process.env.ZIPPY_DECISIONS_URL,
  systemOneLocalUrl: process.env.SYSTEMONE_LOCAL_URL
});
const matrix: Record<Decision, Record<Decision, number>> = {
  allow: { allow: 0, flag: 0, hold: 0 }, flag: { allow: 0, flag: 0, hold: 0 }, hold: { allow: 0, flag: 0, hold: 0 }
};
const latencies: number[] = [];
const models = new Set<string>();
let errors = 0;
for (const [index, sample] of samples.entries()) {
  const event: ModerationEvent = { spec: 'modbot.event.v1', id: String(index), guildId: 'eval', channelId: 'eval', authorId: 'eval',
    content: sample.text, surface: sample.surface ?? 'text', mentionCount: sample.mentionCount ?? 0,
    attachmentCount: sample.attachmentCount ?? 0, createdAt: new Date().toISOString() };
  const start = performance.now();
  try {
    const result = await classifier.classify(event);
    models.add(result.model);
    const actual = decide(event, result, 'hold').decision;
    matrix[sample.expected][actual]++;
  } catch {
    errors++;
  } finally {
    latencies.push(performance.now() - start);
  }
}
latencies.sort((a, b) => a - b);
const percentile = (p: number): number | null => latencies.length ? Number(latencies[Math.ceil(p * latencies.length) - 1]!.toFixed(2)) : null;
const falseHolds = matrix.allow.hold + matrix.flag.hold;
console.log(JSON.stringify({ provider, policyMode: 'hold', count: lines.length, classified: lines.length - errors, errors,
  models: [...models].sort(), latencyMs: { p50: percentile(0.5), p95: percentile(0.95) }, expectedByActual: matrix, falseHolds }, null, 2));
if (errors > 0) process.exitCode = 1;
