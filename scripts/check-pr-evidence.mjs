#!/usr/bin/env node
// Project-specific PR evidence. The standard headings and disclosure remain in
// scripts/zs/pr-body.mjs; this checks the moderation and release details.
import { readFileSync } from 'node:fs';
import { sections } from './zs/pr-body.mjs';
import { isMain } from './zs/lib.mjs';

const required = {
  '## Why it matters': ['Issue or rationale'],
  '## Tests': ['OS and Node', 'Commands and results', 'Synthetic evaluation', 'Independent review'],
  '## Risk and safety': ['Discord surface and mode', 'False-positive impact', 'Permissions and data', 'External inference', 'Rollback'],
  '## Human gates': ['Live Discord and member data', 'Public release', 'Security-sensitive change', 'Licensing rights'],
};

export function checkEvidence(body) {
  const problems = [];
  const parsed = sections(body);
  for (const [heading, labels] of Object.entries(required)) {
    const section = parsed[heading];
    if (section === undefined) {
      problems.push(`missing ${heading}`);
      continue;
    }
    for (const label of labels) {
      const prefix = `**${label}:**`;
      const line = section.split('\n').find(value => value.trimStart().startsWith(prefix));
      const value = line?.trimStart().slice(prefix.length).trim() ?? '';
      if (value.length < 10 || /^(?:tbd|todo|n\/?a|none|\.\.\.|fill this in)$/i.test(value)) {
        problems.push(`${heading}: fill ${label} with a concrete answer or a reason it does not apply`);
      }
    }
  }
  const issue = parsed['## Why it matters']?.split('\n').find(value => value.trimStart().startsWith('**Issue or rationale:**')) ?? '';
  if (issue && !/(#\d+|https:\/\/github\.com\/[^\s]+\/issues\/\d+|No issue:)/i.test(issue)) {
    problems.push('Issue or rationale needs an issue link or "No issue:" with a reason');
  }
  const ai = parsed['## AI assistance'] ?? '';
  const selected = [...ai.matchAll(/^\s*[-*] \[[xX]\]/gm)].length;
  if (selected !== 1) problems.push('select exactly one AI assistance option');
  const tools = ai.split('\n').find(value => value.startsWith('Tools / models used:')) ?? '';
  if (tools.slice('Tools / models used:'.length).trim().length < 4) {
    problems.push('list tools/models used, or write None');
  }
  return problems;
}

if (isMain(import.meta.url)) {
  const envName = process.argv[2] === '--env' ? process.argv[3] : null;
  const body = envName ? process.env[envName] : process.argv[2] ? readFileSync(process.argv[2], 'utf8') : undefined;
  if (body === undefined) {
    console.error('usage: node scripts/check-pr-evidence.mjs <body-file> | --env VAR');
    process.exit(2);
  }
  const problems = checkEvidence(body);
  if (problems.length) {
    for (const problem of problems) console.error(`PR evidence: ${problem}`);
    process.exit(1);
  }
  console.log('PR evidence: required answers supplied');
}
