import { readFile } from 'node:fs/promises';
import { JevClassifier, ZippyDecisionsClassifier } from './core/jev-classifier.js';
import { LocalClassifier } from './core/local-classifier.js';
import { decide } from './core/policy.js';
import type { Decision, ModerationEvent } from './core/types.js';

interface Example { text: string; expected: Decision; surface?: ModerationEvent['surface']; mentionCount?: number; attachmentCount?: number }
const path = process.argv[2];
if (!path) throw new Error('Usage: node dist/evaluate.js path/to/labeled.jsonl');
const provider = process.env.CLASSIFIER_PROVIDER === 'jev'
  ? new JevClassifier(process.env.TYPESAFE_API_KEY ?? '', process.env.TYPESAFE_MODEL ?? 'jev-latest')
  : process.env.CLASSIFIER_PROVIDER === 'zippy_decisions'
    ? new ZippyDecisionsClassifier(process.env.ZIPPY_DECISIONS_URL) : new LocalClassifier();
const lines = (await readFile(path, 'utf8')).split(/\r?\n/).filter(Boolean);
const matrix: Record<Decision, Record<Decision, number>> = {
  allow: { allow: 0, flag: 0, hold: 0 }, flag: { allow: 0, flag: 0, hold: 0 }, hold: { allow: 0, flag: 0, hold: 0 }
};
for (const [index, line] of lines.entries()) {
  const sample = JSON.parse(line) as Example;
  if (!sample.text || !['allow', 'flag', 'hold'].includes(sample.expected)) throw new Error(`Invalid example at line ${index + 1}`);
  const event: ModerationEvent = { spec: 'modbot.event.v1', id: String(index), guildId: 'eval', channelId: 'eval', authorId: 'eval',
    content: sample.text, surface: sample.surface ?? 'text', mentionCount: sample.mentionCount ?? 0,
    attachmentCount: sample.attachmentCount ?? 0, createdAt: new Date().toISOString() };
  const result = await provider.classify(event);
  const actual = decide(event, result, 'hold').decision;
  matrix[sample.expected][actual]++;
}
const falseHolds = matrix.allow.hold + matrix.flag.hold;
console.log(JSON.stringify({ provider: process.env.CLASSIFIER_PROVIDER ?? 'local', count: lines.length, expectedByActual: matrix, falseHolds }, null, 2));
