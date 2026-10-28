import type { Classification, ModerationEvent, PolicyResult } from './types.js';
import { matrix } from './matrix.js';

export type Mode = 'observe' | 'review' | 'hold';

export function decide(event: ModerationEvent, result: Classification, mode: Mode): PolicyResult {
  const reasons: string[] = [];
  for (const key of ['spam', 'scam', 'abuse', 'privacy'] as const) {
    if (result[key].probability >= matrix.thresholds.flag_signal) reasons.push(key);
  }
  if (result.severity.score >= matrix.thresholds.flag_severity_score && result.severity.confidence >= matrix.thresholds.flag_severity_confidence) reasons.push('severity');
  if (reasons.length === 0) return { decision: 'allow', reasons };
  if (mode !== 'hold') return { decision: 'flag', reasons };
  // Narrow hold gate. The message is already public at this point; attachments
  // and sensitive categories require human inspection without a bot repost.
  const eligible = event.attachmentCount === 0 && event.content.length <= matrix.thresholds.hold_max_characters && event.content.length > 0 &&
    !reasons.includes('privacy') && !reasons.includes('abuse') &&
    result.spam.probability >= matrix.thresholds.hold_spam && result.scam.probability >= matrix.thresholds.hold_scam;
  return { decision: eligible ? 'hold' : 'flag', reasons };
}
