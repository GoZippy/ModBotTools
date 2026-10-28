import { readConfig } from './config.js';
import { CaseStore } from './core/case-store.js';
import { JevClassifier, ZippyDecisionsClassifier } from './core/jev-classifier.js';
import { LocalClassifier } from './core/local-classifier.js';
import { createBot } from './discord-bot.js';

const config = readConfig();
const classifier = config.provider === 'jev' ? new JevClassifier(config.typesafeKey!, config.typesafeModel)
  : config.provider === 'zippy_decisions' ? new ZippyDecisionsClassifier(config.zippyDecisionsUrl) : new LocalClassifier();
const client = createBot(config, classifier, new CaseStore(config.caseDir));
await client.login(config.token);
