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
  assert.throws(() => readConfig({ ...base, CLASSIFIER_PROVIDER: 'systemone_local', MODERATION_MODE: 'hold', MOD_REVIEW_CHANNEL_ID: '5' }), /review-only/);
  assert.throws(() => readConfig({ ...base, CLASSIFIER_PROVIDER: 'laya_studio' }), /LAYA_API_KEY/);
});

test('instance routes and role grants load from a local file', () => {
  const config = readConfig({ ...base, CLASSIFIER_ROUTES_PATH: './config/classifier-routes.example.json', MOD_REVIEW_CHANNEL_ID: '5', MOD_VIEW_ROLE_IDS: '10, 11', MOD_REVIEW_ROLE_IDS: '20' });
  assert.equal(config.routes.length, 4);
  assert.equal(config.routes[3]?.trigger, 'submission');
  assert.deepEqual(config.accessRoles.view, ['10', '11']);
  assert.throws(() => readConfig({ ...base, MOD_CONFIG_ROLE_IDS: 'not-a-role' }), /role IDs/);
});
