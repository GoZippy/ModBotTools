import { readFileSync } from 'node:fs';

interface Matrix {
  schema_version: string;
  questions: Record<string, { type: 'noul' | 'choice' | 'score'; instructions: string; criteria?: unknown }>;
  thresholds: { flag_signal: number; flag_severity_score: number; flag_severity_confidence: number; hold_spam: number; hold_scam: number; hold_max_characters: number };
}

export const matrix = JSON.parse(readFileSync(new URL('../../schemas/moderation-matrix.v1.json', import.meta.url), 'utf8')) as Matrix;
if (matrix.schema_version !== 'modbot.matrix.v1' || Object.keys(matrix.questions).length !== 6) throw new Error('Invalid moderation matrix');
for (const key of ['flag_signal', 'flag_severity_confidence', 'hold_spam', 'hold_scam'] as const) {
  const value = matrix.thresholds[key];
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Invalid matrix threshold: ${key}`);
}
