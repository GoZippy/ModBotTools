import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canConfigure, canReview, canViewConfig, type AccessRoles, type Actor } from './access.js';

const roles: AccessRoles = { view: ['10'], review: ['20'], configure: ['30'] };
const actor = (permissions: Actor['permissions'], roleIds: Actor['roleIds'], userId = 'member'): Actor => ({ userId, ownerId: 'owner', permissions, roleIds });

test('review requires Discord permission and configured role; owner can override', () => {
  assert.equal(canReview(actor(new Set(['manage_messages']), new Set(['20'])), roles), true);
  assert.equal(canReview(actor(new Set(['manage_messages']), new Set()), roles), false);
  assert.equal(canReview(actor(new Set(), new Set(['20'])), roles), false);
  assert.equal(canReview(actor(new Set(), new Set(), 'owner'), roles), true);
});

test('configuration visibility and management are separate capabilities', () => {
  assert.equal(canViewConfig(actor(new Set(), new Set(['10'])), roles), true);
  assert.equal(canConfigure(actor(new Set(), new Set(['10'])), roles), false);
  assert.equal(canConfigure(actor(new Set(['manage_guild']), new Set(['30'])), roles), true);
  assert.equal(canConfigure(actor(new Set(['manage_guild']), new Set()), roles), false);
});
