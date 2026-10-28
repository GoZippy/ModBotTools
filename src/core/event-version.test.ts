import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actIfCurrent, stillCurrent } from './event-version.js';
import type { ModerationEvent } from './types.js';

const original: ModerationEvent = { spec: 'modbot.event.v1', id: 'message:0', guildId: 'guild', channelId: 'channel',
  authorId: 'author', content: 'free nitro', surface: 'text', mentionCount: 0, attachmentCount: 0, createdAt: '2026-10-28T00:00:00.000Z' };

test('an edited or unavailable message cannot pass the current-version guard', async () => {
  let fetches = 0;
  assert.equal(await stillCurrent(original, async () => { fetches++; return { ...original }; }), true);
  assert.equal(await stillCurrent(original, async () => ({ ...original, id: 'message:1', content: 'corrected post' })), false);
  assert.equal(await stillCurrent(original, async () => ({ ...original, attachmentCount: 1 })), false);
  assert.equal(await stillCurrent(original, async () => { throw new Error('message deleted'); }), false);
  assert.equal(fetches, 1);
});

test('a stale classification skips the guarded delete callback', async () => {
  const actions: string[] = [];
  const current = async () => { actions.push('fetch'); return { ...original, id: 'message:1' }; };
  const deleteMessage = async () => { actions.push('delete'); };
  assert.equal(await actIfCurrent(original, current, deleteMessage), false);
  assert.deepEqual(actions, ['fetch']);
  assert.equal(await actIfCurrent(original, async () => ({ ...original }), deleteMessage), true);
  assert.deepEqual(actions, ['fetch', 'delete']);
});
