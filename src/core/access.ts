export type Permission = 'manage_messages' | 'manage_guild';
export interface Actor { userId: string; ownerId: string; permissions: ReadonlySet<Permission>; roleIds: ReadonlySet<string> }
export interface AccessRoles { view: readonly string[]; review: readonly string[]; configure: readonly string[] }

function hasRole(actor: Actor, allowed: readonly string[]): boolean { return allowed.some(id => actor.roleIds.has(id)); }

export function canReview(actor: Actor, roles: AccessRoles): boolean {
  if (actor.userId === actor.ownerId) return true;
  return actor.permissions.has('manage_messages') && (roles.review.length === 0 || hasRole(actor, roles.review));
}

export function canViewConfig(actor: Actor, roles: AccessRoles): boolean {
  return actor.userId === actor.ownerId || actor.permissions.has('manage_guild') || hasRole(actor, roles.view) || canReview(actor, roles);
}

export function canConfigure(actor: Actor, roles: AccessRoles): boolean {
  if (actor.userId === actor.ownerId) return true;
  return actor.permissions.has('manage_guild') && roles.configure.length > 0 && hasRole(actor, roles.configure);
}
