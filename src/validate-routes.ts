import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRoutes } from './core/routing.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: npm run validate:routes -- <route-config.json>');
const routes = parseRoutes(JSON.parse(readFileSync(resolve(file), 'utf8')));
console.log(JSON.stringify({ valid: true, count: routes.length, routes: routes.map(({ id, trigger, provider, mode }) => ({ id, trigger, provider, mode })) }, null, 2));
