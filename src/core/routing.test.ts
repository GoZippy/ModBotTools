import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoutes, selectRoute } from './routing.js';

test('ordered routes select provider and mode by trigger, surface, and parent channel', () => {
  const routes = parseRoutes({ schema_version: 'modbot.routes.v1', routes: [
    { id: 'tech_help', trigger: 'message_create', channelIds: ['123'], surfaces: ['text', 'thread'], provider: 'jev', mode: 'observe', model: 'jev-latest' },
    { id: 'voice_chat', trigger: 'message_create', channelIds: [], surfaces: ['voice_text'], provider: 'laya_studio', mode: 'review' }
  ] });
  const fallback = { id: 'default', provider: 'local' as const, mode: 'observe' as const };
  assert.equal(selectRoute(routes, { trigger: 'message_create', channelId: '456', parentId: '123', surface: 'thread' }, fallback).provider, 'jev');
  assert.equal(selectRoute(routes, { trigger: 'message_create', channelId: '789', surface: 'voice_text' }, fallback).provider, 'laya_studio');
  assert.equal(selectRoute(routes, { trigger: 'message_update', channelId: '123', surface: 'text' }, fallback).provider, 'local');
});

test('route parser rejects invalid actions and duplicate ids', () => {
  const route = { id: 'submission', trigger: 'submission', channelIds: [], surfaces: ['submission'], provider: 'local', mode: 'review' };
  assert.equal(parseRoutes({ schema_version: 'modbot.routes.v1', routes: [route] }).length, 1);
  assert.throws(() => parseRoutes({ schema_version: 'modbot.routes.v1', routes: [{ ...route, mode: 'hold' }] }), /Submission route/);
  assert.throws(() => parseRoutes({ schema_version: 'modbot.routes.v1', routes: [route, route] }), /duplicate id/);
  assert.throws(() => parseRoutes({ schema_version: 'modbot.routes.v1', routes: [{ ...route, trigger: 'message_create', surfaces: ['text'], provider: 'zippy_decisions', mode: 'hold' }] }), /review-only/);
  assert.throws(() => parseRoutes({ schema_version: 'modbot.routes.v1', routes: [{ ...route, trigger: 'message_create', surfaces: ['text'], provider: 'systemone_local', mode: 'hold' }] }), /review-only/);
});
