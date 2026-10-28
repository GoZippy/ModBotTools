# Contributing

Thank you for helping make community moderation more reviewable and useful.

1. Open an issue describing the proposed behavior and the Discord surface it affects.
2. Keep classifiers separate from policy and Discord API actions. Return typed signals; let policy decide what can happen.
3. Add synthetic or explicitly consented, redacted examples for new rules. Never commit real server exports, bot tokens, or private member data.
4. Run `npm ci`, `npm test`, and `npm run evaluate` before a pull request.
5. Explain false-positive risks, privacy effects, permissions, and rollback in the pull request.

For security concerns, avoid public disclosure of working exploit details; use the private channel in [SECURITY.md](SECURITY.md).

The bot's current license permits noncommercial use and contributions. The [`schemas/`](schemas/README.md) contracts use Apache 2.0. Before a bot-code contribution is merged, maintainers must confirm they have the rights needed to include it in separately licensed commercial distributions. A commit sign-off confirms provenance; it does not transfer copyright or grant commercial relicensing rights. Maintainers may ask for a separate contributor agreement. Issue reports and design discussions remain welcome without one.
