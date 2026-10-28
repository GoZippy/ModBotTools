export type Surface = 'text' | 'thread' | 'voice_text' | 'submission' | 'voice_transcript';

export interface ModerationEvent {
  spec: 'modbot.event.v1';
  id: string;
  guildId: string;
  channelId: string;
  authorId: string;
  content: string;
  surface: Surface;
  mentionCount: number;
  attachmentCount: number;
  createdAt: string;
}

export interface Signal {
  probability: number;
}

export interface Classification {
  provider: string;
  model: string;
  spam: Signal;
  scam: Signal;
  abuse: Signal;
  privacy: Signal;
  severity: { score: number; confidence: number };
  topic: { label: 'technical' | 'community' | 'other'; confidence: number };
}

export interface Classifier {
  classify(event: ModerationEvent): Promise<Classification>;
}

export type Decision = 'allow' | 'flag' | 'hold';
export interface PolicyResult {
  decision: Decision;
  reasons: string[];
}

export type CaseStatus = 'pending' | 'approved' | 'dismissed';
export interface ReviewCase {
  id: string;
  eventId: string;
  guildId: string;
  channelId: string;
  authorId: string;
  surface: Surface;
  createdAt: string;
  expiresAt: string;
  status: CaseStatus;
  decision: 'flag' | 'hold' | 'submission';
  reasons: string[];
  routeId?: string;
  provider: string;
  model: string;
  // Content is retained only for a held message or an opted-in submission.
  content?: string;
  publishedMessageId?: string;
  reviewerId?: string;
  reviewedAt?: string;
}
