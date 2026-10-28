import { LocalClassifier } from './core/local-classifier.js';
import { decide } from './core/policy.js';
import type { ModerationEvent } from './core/types.js';

const examples = ['How do I fix this TypeScript build error?', 'Free Nitro! Verify your wallet now.', 'Here are four links: https://a.test https://b.test https://c.test https://d.test'];
for (const [index, content] of examples.entries()) {
  const event: ModerationEvent = { spec: 'modbot.event.v1', id: String(index), guildId: 'demo', channelId: 'demo', authorId: 'demo', surface: 'text', content, mentionCount: 0, attachmentCount: 0, createdAt: new Date().toISOString() };
  const classification = await new LocalClassifier().classify(event);
  console.log(JSON.stringify({ content, classification, policy: decide(event, classification, 'hold') }, null, 2));
}
