import { redactForProvider } from './redact.js';
import { matrix } from './matrix.js';
import type { Classification, Classifier, ModerationEvent } from './types.js';

type Noul = { type: 'noul'; noul: number };
type Score = { type: 'score'; score: number; confidence: number; probabilities: Record<string, number> };
type Choice = { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> };
const maxResponseBytes = 64 * 1024;

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxResponseBytes) throw new Error('Classifier response exceeds size limit');
  if (!response.body) throw new Error('Classifier response has no body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxResponseBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error('Classifier response exceeds size limit');
    }
    chunks.push(value);
  }
  try { return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))))); }
  catch { throw new Error('Classifier returned invalid JSON'); }
}

function distribution(actual: unknown, keys: string[]): Record<string, number> {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error('Invalid answer distribution');
  const values = actual as Record<string, number>;
  if (Object.keys(values).sort().join('|') !== [...keys].sort().join('|')) throw new Error('Invalid answer options');
  if (keys.some(key => !Number.isFinite(values[key]) || values[key]! < 0 || values[key]! > 1)) throw new Error('Invalid answer probability');
  if (Math.abs(keys.reduce((sum, key) => sum + values[key]!, 0) - 1) > 0.005) throw new Error('Answer probabilities do not sum to one');
  return values;
}

function probability(answer: unknown): number {
  if (!answer || typeof answer !== 'object' || (answer as Noul).type !== 'noul') throw new Error('Invalid Jev Noul answer');
  const value = (answer as Noul).noul;
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid Jev probability');
  return value;
}

class TypedDecisionClassifier implements Classifier {
  constructor(private readonly provider: string, private readonly key: string | undefined, private readonly model: string, private readonly endpoint: string) {}

  async classify(event: ModerationEvent): Promise<Classification> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { ...(this.key ? { Authorization: `Bearer ${this.key}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, state: { surface: event.surface, text: redactForProvider(event.content), mention_count: event.mentionCount, attachment_count: event.attachmentCount }, questions: matrix.questions }),
      redirect: 'error',
      signal: AbortSignal.timeout(1800)
    });
    if (!response.ok) throw new Error(`Jev HTTP ${response.status}`);
    const body = await readBoundedJson(response) as { model?: string; answers?: Record<string, unknown>; zippy?: { backend?: string } };
    const answers = body.answers;
    if (!answers) throw new Error('Jev response has no answers');
    const severity = answers.severity as Score | undefined;
    const topic = answers.topic as Choice | undefined;
    if (severity?.type !== 'score' || !Number.isFinite(severity.score) || severity.score < 0 || severity.score > 3 || !Number.isFinite(severity.confidence) || severity.confidence < 0 || severity.confidence > 1) throw new Error('Invalid Jev Score answer');
    if (topic?.type !== 'choice' || !['technical', 'community', 'other'].includes(topic.choice) || !Number.isFinite(topic.confidence) || topic.confidence < 0 || topic.confidence > 1) throw new Error('Invalid Jev Choice answer');
    const severityProbabilities = distribution(severity.probabilities, ['0', '1', '2', '3']);
    const topicProbabilities = distribution(topic.probabilities, ['technical', 'community', 'other']);
    const expectedScore = ['0', '1', '2', '3'].reduce((sum, key) => sum + Number(key) * severityProbabilities[key]!, 0);
    if (Math.abs(severity.score - expectedScore) > 0.02) throw new Error('Score contradicts probabilities');
    if (topicProbabilities[topic.choice]! + 0.0001 < Math.max(...Object.values(topicProbabilities))) throw new Error('Choice contradicts probabilities');
    const model = body.model ?? body.zippy?.backend ?? this.model;
    if (typeof model !== 'string' || !/^[A-Za-z0-9._:/-]{1,128}$/.test(model)) throw new Error('Invalid provider model identity');
    return {
      provider: this.provider, model,
      spam: { probability: probability(answers.spam) }, scam: { probability: probability(answers.scam) },
      abuse: { probability: probability(answers.abuse) }, privacy: { probability: probability(answers.privacy) },
      severity: { score: severity.score, confidence: severity.confidence },
      topic: { label: topic.choice as Classification['topic']['label'], confidence: topic.confidence }
    };
  }
}

export class JevClassifier extends TypedDecisionClassifier {
  constructor(key: string, model = 'jev-latest', endpoint = 'https://api.typesafe.ai/v1/systemone') {
    if (!key) throw new Error('TYPESAFE_API_KEY is required for Jev');
    super('jev', key, model, endpoint);
  }
}

export class LayaStudioClassifier extends TypedDecisionClassifier {
  constructor(key: string, model = 'typed-decisions', endpoint = 'https://api.laya.studio/v1/systemone') {
    if (!key) throw new Error('LAYA_API_KEY is required for Laya Studio');
    super('laya_studio', key, model, endpoint);
  }
}

function requireLoopback(endpoint: string): void {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password || url.pathname !== '/v1/systemone' || url.search || url.hash) {
    throw new Error('System One endpoint must be loopback /v1/systemone');
  }
}

export class ZippyDecisionsClassifier extends TypedDecisionClassifier {
  constructor(endpoint = 'http://127.0.0.1:8766/v1/systemone') {
    requireLoopback(endpoint);
    super('zippy_decisions', undefined, 'local', endpoint);
  }
}

export class LocalSystemOneClassifier extends TypedDecisionClassifier {
  constructor(endpoint = 'http://127.0.0.1:8767/v1/systemone', model = 'local') {
    requireLoopback(endpoint);
    super('systemone_local', undefined, model, endpoint);
  }
}
