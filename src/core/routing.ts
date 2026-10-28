import type { Mode } from './policy.js';
import type { Surface } from './types.js';

export type Provider = 'local' | 'jev' | 'laya_studio' | 'zippy_decisions' | 'systemone_local';
export type Trigger = 'message_create' | 'message_update' | 'submission';

export interface ClassifierRoute {
  id: string;
  trigger: Trigger;
  channelIds: string[];
  surfaces: Surface[];
  provider: Provider;
  mode: Mode;
  model?: string;
}

export interface RouteContext { trigger: Trigger; channelId: string; parentId?: string | null; surface: Surface }
export interface RouteSelection { id: string; provider: Provider; mode: Mode; model?: string }

const triggers: Trigger[] = ['message_create', 'message_update', 'submission'];
const surfaces: Surface[] = ['text', 'thread', 'voice_text', 'submission', 'voice_transcript'];
const providers: Provider[] = ['local', 'jev', 'laya_studio', 'zippy_decisions', 'systemone_local'];
const modes: Mode[] = ['observe', 'review', 'hold'];

export function parseRoutes(input: unknown): ClassifierRoute[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Route config must be an object');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['schema_version', 'routes'].includes(key)) || value.schema_version !== 'modbot.routes.v1' || !Array.isArray(value.routes) || value.routes.length > 32) {
    throw new Error('Route config needs schema_version modbot.routes.v1 and at most 32 routes');
  }
  const seen = new Set<string>();
  return value.routes.map((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Route ${index} must be an object`);
    const route = raw as Record<string, unknown>;
    if (Object.keys(route).some(key => !['id', 'trigger', 'channelIds', 'surfaces', 'provider', 'mode', 'model'].includes(key))) throw new Error(`Route ${index} has unknown fields`);
    if (typeof route.id !== 'string' || !/^[a-z][a-z0-9_-]{1,39}$/.test(route.id) || seen.has(route.id)) throw new Error(`Route ${index} has an invalid or duplicate id`);
    seen.add(route.id);
    if (!triggers.includes(route.trigger as Trigger) || !providers.includes(route.provider as Provider) || !modes.includes(route.mode as Mode)) throw new Error(`Route ${route.id} has an invalid trigger, provider, or mode`);
    if (!Array.isArray(route.channelIds) || route.channelIds.some(id => typeof id !== 'string' || !/^\d{1,20}$/.test(id)) || new Set(route.channelIds).size !== route.channelIds.length) throw new Error(`Route ${route.id} has invalid channelIds`);
    if (!Array.isArray(route.surfaces) || route.surfaces.length === 0 || route.surfaces.some(surface => !surfaces.includes(surface)) || new Set(route.surfaces).size !== route.surfaces.length) throw new Error(`Route ${route.id} has invalid surfaces`);
    if (route.trigger === 'submission' && (route.mode !== 'review' || route.surfaces.some(surface => surface !== 'submission'))) throw new Error(`Submission route ${route.id} must use review mode and submission surface`);
    if (route.trigger !== 'submission' && route.surfaces.includes('submission')) throw new Error(`Message route ${route.id} cannot use submission surface`);
    if (['zippy_decisions', 'systemone_local'].includes(route.provider as string) && route.mode === 'hold') throw new Error(`Route ${route.id}: uncalibrated local bridges are review-only`);
    if (route.model !== undefined && (typeof route.model !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(route.model) || !['jev', 'laya_studio', 'systemone_local'].includes(route.provider as string))) throw new Error(`Route ${route.id} has an invalid model override`);
    return { id: route.id, trigger: route.trigger, channelIds: [...route.channelIds], surfaces: [...route.surfaces], provider: route.provider, mode: route.mode, ...(route.model ? { model: route.model } : {}) } as ClassifierRoute;
  });
}

export function selectRoute(routes: ClassifierRoute[], context: RouteContext, fallback: RouteSelection): RouteSelection {
  const route = routes.find(candidate => candidate.trigger === context.trigger && candidate.surfaces.includes(context.surface) &&
    (candidate.channelIds.length === 0 || candidate.channelIds.includes(context.channelId) || !!context.parentId && candidate.channelIds.includes(context.parentId)));
  return route ? { id: route.id, provider: route.provider, mode: route.mode, ...(route.model ? { model: route.model } : {}) } : fallback;
}
