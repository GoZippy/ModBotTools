import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from './config.js';

const base = { DISCORD_TOKEN: 'test', DISCORD_CLIENT_ID: '1', DISCORD_GUILD_ID: '2' };

test('ordinary monitoring is opt-in and observation is the default', () => {
  const config = readConfig(base);
  assert.equal(config.mode, 'observe');
  assert.deepEqual(config.monitoredChannelIds, []);
  assert.deepEqual(readConfig({ ...base, MONITORED_CHANNEL_IDS: '3, 4' }).monitoredChannelIds, ['3', '4']);
});

test('prototype sidecar cannot enable automatic holds', () => {
  assert.throws(() => readConfig({ ...base, CLASSIFIER_PROVIDER: 'zippy_decisions', MODERATION_MODE: 'hold', MOD_REVIEW_CHANNEL_ID: '5' }), /review-only/);
});
