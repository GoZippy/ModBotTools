import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CaseStore } from './case-store.js';

test('case survives store reinitialization and resolves once', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'modbot-case-'));
  try {
    const first = new CaseStore(directory);
    const item = await first.create({ eventId: 'event', guildId: 'guild', channelId: 'channel', authorId: 'author', surface: 'submission', decision: 'submission', reasons: ['requested_review'], provider: 'none', model: 'none', content: 'hello' });
    const second = new CaseStore(directory);
    assert.equal((await second.get(item.id))?.content, 'hello');
    await second.withPending(item.id, async (current, save) => { await save({ ...current, status: 'approved', reviewerId: 'mod' }); });
    await assert.rejects(second.withPending(item.id, async () => {}), /unavailable/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
