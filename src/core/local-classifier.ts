import type { Classification, Classifier, ModerationEvent } from './types.js';

// Deliberately narrow baseline. It produces leads, not calibrated probabilities.
export class LocalClassifier implements Classifier {
  async classify(event: ModerationEvent): Promise<Classification> {
    const text = event.content.toLowerCase();
    const links = (text.match(/https?:\/\//g) ?? []).length;
    const spam = event.mentionCount >= 8 || links >= 4 || /(free nitro|airdrop|dm me for (profit|money))/i.test(text);
    const scam = /(free nitro|verify (your )?wallet|seed phrase|guaranteed returns)/i.test(text);
    const privacy = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(event.content) || /\b(?:\+?\d[\d ()-]{7,}\d)\b/.test(event.content);
    const abuse = /\b(?:kill yourself|i will dox you)\b/i.test(text);
    const technical = /\b(?:code|bug|api|build|typescript|python|kiro|error|deploy)\b/i.test(text);
    return {
      provider: 'local', model: 'rules-v1',
      spam: { probability: spam ? 1 : 0 }, scam: { probability: scam ? 1 : 0 },
      abuse: { probability: abuse ? 1 : 0 }, privacy: { probability: privacy ? 1 : 0 },
      severity: { score: abuse || scam ? 2 : 0, confidence: 0 },
      topic: { label: technical ? 'technical' : 'other', confidence: 0 }
    };
  }
}
