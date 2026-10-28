import type { ModerationEvent } from './types.js';

export function sameMessageVersion(original: ModerationEvent, current: ModerationEvent): boolean {
  return original.id === current.id && original.guildId === current.guildId &&
    original.channelId === current.channelId && original.authorId === current.authorId &&
    original.content === current.content && original.surface === current.surface &&
    original.mentionCount === current.mentionCount && original.attachmentCount === current.attachmentCount;
}

export async function stillCurrent(original: ModerationEvent, fetchCurrent: () => Promise<ModerationEvent>): Promise<boolean> {
  try { return sameMessageVersion(original, await fetchCurrent()); }
  catch { return false; }
}

export async function actIfCurrent(original: ModerationEvent, fetchCurrent: () => Promise<ModerationEvent>, action: () => Promise<void>): Promise<boolean> {
  if (!await stillCurrent(original, fetchCurrent)) return false;
  await action();
  return true;
}
