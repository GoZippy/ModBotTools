import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canApproveCase } from './review-readiness.js';
import type { ReviewCase } from './types.js';

const hold: ReviewCase = { id: 'case', eventId: 'event', guildId: 'guild', channelId: 'channel', authorId: 'author',
  surface: 'text', createdAt: '2026-10-28T00:00:00.000Z', expiresAt: '2026-10-29T00:00:00.000Z',
  status: 'pending', decision: 'hold', reasons: [], provider: 'local', model: 'rules', content: 'held text' };

test('a held case cannot be approved before the full-text staff card is ready', () => {
  assert.equal(canApproveCase(hold), false);
  assert.equal(canApproveCase({ ...hold, reviewReady: true }), true);
  assert.equal(canApproveCase({ ...hold, decision: 'flag', content: undefined }), true);
  assert.equal(canApproveCase({ ...hold, decision: 'submission' }), true);
});
