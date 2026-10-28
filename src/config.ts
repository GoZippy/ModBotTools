import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Mode } from './core/policy.js';
import { parseRoutes, type ClassifierRoute, type Provider } from './core/routing.js';
import type { AccessRoles } from './core/access.js';

export interface Config {
  token: string;
  clientId: string;
  guildId: string;
  reviewChannelId?: string;
  submissionChannelId?: string;
  monitoredChannelIds: string[];
  mode: Mode;
  provider: Provider;
  typesafeKey?: string;
  typesafeModel: string;
  layaKey?: string;
  layaModel: string;
  zippyDecisionsUrl: string;
  systemOneLocalUrl: string;
  caseDir: string;
  routes: ClassifierRoute[];
  accessRoles: AccessRoles;
}

function roleIds(value: string | undefined, name: string): string[] {
  const ids = (value ?? '').split(',').map(id => id.trim()).filter(Boolean);
  if (ids.some(id => !/^\d{1,20}$/.test(id))) throw new Error(`${name} must contain comma-separated Discord role IDs`);
  return ids;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.MODERATION_MODE ?? 'observe';
  const provider = env.CLASSIFIER_PROVIDER ?? 'local';
  if (!['observe', 'review', 'hold'].includes(mode)) throw new Error('MODERATION_MODE must be observe, review, or hold');
  if (!['local', 'jev', 'laya_studio', 'zippy_decisions', 'systemone_local'].includes(provider)) throw new Error('CLASSIFIER_PROVIDER must be local, jev, laya_studio, zippy_decisions, or systemone_local');
  const routes = env.CLASSIFIER_ROUTES_PATH ? parseRoutes(JSON.parse(readFileSync(resolve(env.CLASSIFIER_ROUTES_PATH), 'utf8'))) : [];
  const used = new Set([provider, ...routes.map(route => route.provider)]);
  if (used.has('jev') && !env.TYPESAFE_API_KEY) throw new Error('TYPESAFE_API_KEY is required for Jev');
  if (used.has('laya_studio') && !env.LAYA_API_KEY) throw new Error('LAYA_API_KEY is required for Laya Studio');
  if (['zippy_decisions', 'systemone_local'].includes(provider) && mode === 'hold') throw new Error('Uncalibrated local bridges are review-only; use observe or review');
  if ((mode !== 'observe' || routes.some(route => route.mode !== 'observe')) && !env.MOD_REVIEW_CHANNEL_ID) throw new Error('MOD_REVIEW_CHANNEL_ID is required for review or hold mode');
  for (const key of ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'] as const) {
    if (!env[key]) throw new Error(`${key} is required`);
  }
  return {
    token: env.DISCORD_TOKEN!, clientId: env.DISCORD_CLIENT_ID!, guildId: env.DISCORD_GUILD_ID!,
    reviewChannelId: env.MOD_REVIEW_CHANNEL_ID, submissionChannelId: env.SUBMISSION_CHANNEL_ID,
    monitoredChannelIds: (env.MONITORED_CHANNEL_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean),
    mode: mode as Mode, provider: provider as Provider,
    typesafeKey: env.TYPESAFE_API_KEY, typesafeModel: env.TYPESAFE_MODEL ?? 'jev-latest',
    layaKey: env.LAYA_API_KEY, layaModel: env.LAYA_MODEL ?? 'typed-decisions',
    zippyDecisionsUrl: env.ZIPPY_DECISIONS_URL ?? 'http://127.0.0.1:8766/v1/systemone',
    systemOneLocalUrl: env.SYSTEMONE_LOCAL_URL ?? 'http://127.0.0.1:8767/v1/systemone',
    caseDir: resolve(env.CASE_DIR ?? './data/cases'), routes,
    accessRoles: {
      view: roleIds(env.MOD_VIEW_ROLE_IDS, 'MOD_VIEW_ROLE_IDS'),
      review: roleIds(env.MOD_REVIEW_ROLE_IDS, 'MOD_REVIEW_ROLE_IDS'),
      configure: roleIds(env.MOD_CONFIG_ROLE_IDS, 'MOD_CONFIG_ROLE_IDS')
    }
  };
}
