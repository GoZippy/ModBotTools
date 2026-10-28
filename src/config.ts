import { resolve } from 'node:path';
import type { Mode } from './core/policy.js';

export interface Config {
  token: string;
  clientId: string;
  guildId: string;
  reviewChannelId?: string;
  submissionChannelId?: string;
  monitoredChannelIds: string[];
  mode: Mode;
  provider: 'local' | 'jev' | 'zippy_decisions';
  typesafeKey?: string;
  typesafeModel: string;
  zippyDecisionsUrl: string;
  caseDir: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.MODERATION_MODE ?? 'observe';
  const provider = env.CLASSIFIER_PROVIDER ?? 'local';
  if (!['observe', 'review', 'hold'].includes(mode)) throw new Error('MODERATION_MODE must be observe, review, or hold');
  if (!['local', 'jev', 'zippy_decisions'].includes(provider)) throw new Error('CLASSIFIER_PROVIDER must be local, jev, or zippy_decisions');
  if (provider === 'jev' && !env.TYPESAFE_API_KEY) throw new Error('TYPESAFE_API_KEY is required for Jev');
  if (provider === 'zippy_decisions' && mode === 'hold') throw new Error('Zippy Decisions prototype is review-only; use observe or review');
  if (mode !== 'observe' && !env.MOD_REVIEW_CHANNEL_ID) throw new Error('MOD_REVIEW_CHANNEL_ID is required for review or hold mode');
  for (const key of ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'] as const) {
    if (!env[key]) throw new Error(`${key} is required`);
  }
  return {
    token: env.DISCORD_TOKEN!, clientId: env.DISCORD_CLIENT_ID!, guildId: env.DISCORD_GUILD_ID!,
    reviewChannelId: env.MOD_REVIEW_CHANNEL_ID, submissionChannelId: env.SUBMISSION_CHANNEL_ID,
    monitoredChannelIds: (env.MONITORED_CHANNEL_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean),
    mode: mode as Mode, provider: provider as Config['provider'],
    typesafeKey: env.TYPESAFE_API_KEY, typesafeModel: env.TYPESAFE_MODEL ?? 'jev-latest',
    zippyDecisionsUrl: env.ZIPPY_DECISIONS_URL ?? 'http://127.0.0.1:8766/v1/systemone',
    caseDir: resolve(env.CASE_DIR ?? './data/cases')
  };
}
