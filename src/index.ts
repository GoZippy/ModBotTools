import { readConfig } from './config.js';
import { CaseStore } from './core/case-store.js';
import { createClassifier } from './core/provider-factory.js';
import type { RouteSelection } from './core/routing.js';
import type { Classifier } from './core/types.js';
import { createBot } from './discord-bot.js';

const config = readConfig();
const cache = new Map<string, Classifier>();
function classifierFor(route: RouteSelection): Classifier {
  const key = `${route.provider}:${route.model ?? ''}`;
  let classifier = cache.get(key);
  if (!classifier) {
    classifier = createClassifier(route, config);
    cache.set(key, classifier);
  }
  return classifier;
}
const client = createBot(config, classifierFor, new CaseStore(config.caseDir));
await client.login(config.token);
