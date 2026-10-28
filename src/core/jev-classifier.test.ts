import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { JevClassifier, ZippyDecisionsClassifier } from './jev-classifier.js';
import type { ModerationEvent } from './types.js';

test('Jev adapter sends redacted state and reads typed answers', async () => {
  let request: any;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    request = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ model: 'jev-test', answers: {
      spam: { type: 'noul', noul: 0.9 }, scam: { type: 'noul', noul: 0.1 },
      abuse: { type: 'noul', noul: 0.01 }, privacy: { type: 'noul', noul: 0.2 },
      severity: { type: 'score', score: 1.4, confidence: 0.8, probabilities: { '0': 0, '1': 0.6, '2': 0.4, '3': 0 } },
      topic: { type: 'choice', choice: 'technical', confidence: 0.9, probabilities: { technical: 0.9, community: 0.1, other: 0 } }
    } }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No port');
    const event: ModerationEvent = { spec: 'modbot.event.v1', id: 'x', guildId: 'g', channelId: 'c', authorId: 'secret-id', content: 'Email me at person@example.com', surface: 'text', mentionCount: 0, attachmentCount: 0, createdAt: new Date().toISOString() };
    const result = await new JevClassifier('test-key', 'jev-test', `http://127.0.0.1:${address.port}`).classify(event);
    assert.equal(result.spam.probability, 0.9);
    assert.equal(result.topic.label, 'technical');
    assert.equal(request.state.text, 'Email me at [email]');
    assert.equal(JSON.stringify(request).includes('secret-id'), false);
    const local = await new ZippyDecisionsClassifier(`http://127.0.0.1:${address.port}/v1/systemone`).classify(event);
    assert.equal(local.provider, 'zippy_decisions');
    assert.equal(request.model, 'local');
    assert.throws(() => new ZippyDecisionsClassifier('https://example.com/v1/systemone'), /loopback/);
  } finally { server.close(); await once(server, 'close'); }
});
