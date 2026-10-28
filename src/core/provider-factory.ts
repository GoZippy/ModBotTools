import { JevClassifier, LayaStudioClassifier, LocalSystemOneClassifier, ZippyDecisionsClassifier } from './jev-classifier.js';
import { LocalClassifier } from './local-classifier.js';
import type { RouteSelection } from './routing.js';
import type { Classifier } from './types.js';

export interface ProviderSettings {
  typesafeKey?: string;
  typesafeModel?: string;
  layaKey?: string;
  layaModel?: string;
  zippyDecisionsUrl?: string;
  systemOneLocalUrl?: string;
}

export function createClassifier(route: Pick<RouteSelection, 'provider' | 'model'>, settings: ProviderSettings): Classifier {
  switch (route.provider) {
    case 'local': return new LocalClassifier();
    case 'jev': return new JevClassifier(settings.typesafeKey ?? '', route.model ?? settings.typesafeModel);
    case 'laya_studio': return new LayaStudioClassifier(settings.layaKey ?? '', route.model ?? settings.layaModel);
    case 'zippy_decisions': return new ZippyDecisionsClassifier(settings.zippyDecisionsUrl);
    case 'systemone_local': return new LocalSystemOneClassifier(settings.systemOneLocalUrl, route.model);
    default: throw new Error('Unknown classifier provider');
  }
}
