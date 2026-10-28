# Contributing

Thank you for helping make community moderation more reviewable and useful.

1. Open an issue describing the proposed behavior and the Discord surface it affects.
2. Keep classifiers separate from policy and Discord API actions. Return typed signals; let policy decide what can happen.
3. Add synthetic or explicitly consented, redacted examples for new rules. Never commit real server exports, bot tokens, or private member data.
4. Run `npm ci`, `npm test`, and `npm run evaluate` before a pull request.
5. Explain false-positive risks, privacy effects, permissions, and rollback in the pull request.

For security concerns, avoid public disclosure of working exploit details; contact the maintainers privately. A dedicated security contact will be published before broad deployment.
