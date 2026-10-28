import type { ReviewCase } from './types.js';

export function canApproveCase(item: ReviewCase): boolean {
  return item.decision !== 'hold' || item.reviewReady === true;
}
