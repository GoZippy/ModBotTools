import { readConfig } from './config.js';
import { CaseStore } from './core/case-store.js';
import { JevClassifier, LayaStudioClassifier, LocalSystemOneClassifier, ZippyDecisionsClassifier } from './core/jev-classifier.js';
import { LocalClassifier } from './core/local-classifier.js';
import type { RouteSelection } from './core/routing.js';
import type { Classifier } from './core/types.js';
import { createBot } from './discord-bot.js';

const config = readConfig();
const cache = new Map<string, Classifier>();
function classifierFor(route: RouteSelection): Classifier {
  const key = `${route.provider}:${route.model ?? ''}`;
  let classifier = cache.get(key);
  if (!classifier) {
    classifier = route.provider === 'jev' ? new JevClassifier(config.typesafeKey!, route.model ?? config.typesafeModel)
      : route.provider === 'laya_studio' ? new LayaStudioClassifier(config.layaKey!, route.model ?? config.layaModel)
      : route.provider === 'zippy_decisions' ? new ZippyDecisionsClassifier(config.zippyDecisionsUrl)
      : route.provider === 'systemone_local' ? new LocalSystemOneClassifier(config.systemOneLocalUrl, route.model)
      : new LocalClassifier();
    cache.set(key, classifier);
  }
  return classifier;
}
const client = createBot(config, classifierFor, new CaseStore(config.caseDir));
await client.login(config.token);
