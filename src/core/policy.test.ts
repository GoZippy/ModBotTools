import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide } from './policy.js';
import type { Classification, ModerationEvent } from './types.js';

const event: ModerationEvent = { spec: 'modbot.event.v1', id: '1', guildId: 'g', channelId: 'c', authorId: 'u', surface: 'text', content: 'sample', mentionCount: 0, attachmentCount: 0, createdAt: new Date().toISOString() };
const base: Classification = { provider: 'test', model: 'test', spam: { probability: 0 }, scam: { probability: 0 }, abuse: { probability: 0 }, privacy: { probability: 0 }, severity: { score: 0, confidence: 0 }, topic: { label: 'other', confidence: 0 } };

test('observation never holds and ordinary text passes', () => {
  assert.equal(decide(event, base, 'hold').decision, 'allow');
  assert.equal(decide(event, { ...base, spam: { probability: 1 } }, 'observe').decision, 'flag');
});

test('only combined high spam and scam signals without attachments can be held', () => {
  const scamSpam = { ...base, spam: { probability: 0.99 }, scam: { probability: 0.99 } };
  assert.equal(decide(event, scamSpam, 'hold').decision, 'hold');
  assert.equal(decide(event, { ...base, spam: { probability: 0.99 } }, 'hold').decision, 'flag');
  assert.equal(decide(event, { ...scamSpam, spam: { probability: 0.9 } }, 'hold').decision, 'flag');
  assert.equal(decide({ ...event, attachmentCount: 1 }, scamSpam, 'hold').decision, 'flag');
  assert.equal(decide({ ...event, content: 'x'.repeat(1801) }, scamSpam, 'hold').decision, 'flag');
});

test('privacy and abuse require moderator review', () => {
  assert.equal(decide(event, { ...base, spam: { probability: 1 }, privacy: { probability: 1 } }, 'hold').decision, 'flag');
  assert.equal(decide(event, { ...base, abuse: { probability: 1 } }, 'hold').decision, 'flag');
});
