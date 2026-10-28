import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { JevClassifier, LayaStudioClassifier, LocalSystemOneClassifier, ZippyDecisionsClassifier } from './jev-classifier.js';
import type { ModerationEvent } from './types.js';

test('Jev adapter sends redacted state and reads typed answers', async () => {
  let request: any;
  let responseModel = 'jev-test';
  let responsePadding = 0;
  let invalidJson = false;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    request = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader('Content-Type', 'application/json');
    if (invalidJson) { res.end('{"text":"SYNTHETIC_PRIVATE_MARKER"'); return; }
    const payload = JSON.stringify({ model: responseModel, padding: 'x'.repeat(responsePadding), answers: {
      spam: { type: 'noul', noul: 0.9 }, scam: { type: 'noul', noul: 0.1 },
      abuse: { type: 'noul', noul: 0.01 }, privacy: { type: 'noul', noul: 0.2 },
      severity: { type: 'score', score: 1.4, confidence: 0.8, probabilities: { '0': 0, '1': 0.6, '2': 0.4, '3': 0 } },
      topic: { type: 'choice', choice: 'technical', confidence: 0.9, probabilities: { technical: 0.9, community: 0.1, other: 0 } }
    } });
    if (responsePadding) { res.write(payload.slice(0, 1024)); res.end(payload.slice(1024)); }
    else res.end(payload);
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
    const laya = await new LayaStudioClassifier('test-key', 'typed-decisions', `http://127.0.0.1:${address.port}/v1/systemone`).classify(event);
    assert.equal(laya.provider, 'laya_studio');
    assert.equal(request.model, 'typed-decisions');
    const generic = await new LocalSystemOneClassifier(`http://127.0.0.1:${address.port}/v1/systemone`, 'community-v1').classify(event);
    assert.equal(generic.provider, 'systemone_local');
    assert.equal(request.model, 'community-v1');
    assert.throws(() => new LocalSystemOneClassifier('http://192.0.2.1/v1/systemone'), /loopback/);
    assert.throws(() => new ZippyDecisionsClassifier('https://example.com/v1/systemone'), /loopback/);
    responseModel = 'bad\nmodel';
    await assert.rejects(new JevClassifier('test-key', 'jev-test', `http://127.0.0.1:${address.port}`).classify(event), /Invalid provider model identity/);
    responseModel = 'jev-test';
    responsePadding = 70 * 1024;
    await assert.rejects(new JevClassifier('test-key', 'jev-test', `http://127.0.0.1:${address.port}`).classify(event), /response exceeds size limit/);
    responsePadding = 0;
    invalidJson = true;
    await assert.rejects(new JevClassifier('test-key', 'jev-test', `http://127.0.0.1:${address.port}`).classify(event), error =>
      error instanceof Error && error.message === 'Classifier returned invalid JSON');
  } finally { server.close(); await once(server, 'close'); }
});
