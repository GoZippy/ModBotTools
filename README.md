# ModBotTools

A source-available Discord moderation bot scaffold for community servers. The first target is the Kiro Discord; the contracts and policy layer are server-neutral. It starts in **observation mode** and has no automatic bans, kicks, timeouts, or voice audio capture.

## What works today

- Watches explicitly allowed guild text channels, threads, and text chat in voice channels, including message edits.
- Runs a local rules classifier, an opt-in TypeSafe Jev adapter, or an optional loopback-only Zippy Decisions adapter behind the same interface.
- Produces `allow`, `flag`, or `hold` policy decisions. Review and hold modes are explicit configuration choices.
- Creates 24-hour review cases with moderator **Approve** and **Dismiss** buttons.
- Offers `/submit text:...` for genuine pre-publication review in a configured destination channel.
- Includes a synthetic evaluation fixture and tests for the policy, case store, and Jev request shape.

`hold` on a regular message means the bot deletes an **already posted** text-only message and a moderator can approve a bot-authored repost. Discord AutoMod is the native route for blocking matching content before it appears. See [Discord research](docs/discord-research.md).

## Run locally

1. Install Node.js 24.17 or newer and run `npm ci`.
2. Follow the [test-server checklist](docs/test-server-checklist.md) in a server you manage. Copy `.env.example` to `.env` and fill in the Discord application, guild, and channel IDs. Set `MONITORED_CHANNEL_IDS` to the specific channels you intend to inspect. Keep the token private.
3. In the Discord Developer Portal, enable the **Message Content** privileged intent for this app. Invite the bot with `bot` and `applications.commands` scopes and only the permissions listed in [setup](docs/setup.md).
4. Run `npm test`, `npm run evaluate`, then `npm start`.
5. Observe the server before setting `MODERATION_MODE=review`. Enable `hold` only after labeled local testing and moderator agreement.

The public source is at [GoZippy/ModBotTools](https://github.com/GoZippy/ModBotTools). This checkout does not connect to the Kiro server. Live operation requires server-specific credentials and permissions; start in a server you control.

## Project map

| Path | Purpose |
| --- | --- |
| `src/core/types.ts` | Normalized event, classifier, decision, and case contracts |
| `src/core/local-classifier.ts` | Narrow offline baseline |
| `src/core/jev-classifier.ts` | Optional Jev and Zippy Decisions typed-decision adapters |
| `schemas/` | Versioned matrix and normalized event schemas for reuse |
| `src/core/policy.ts` | Thresholds and safe action selection |
| `src/core/case-store.ts` | Local 24-hour review cases |
| `src/discord-bot.ts` | Discord adapter and moderator controls |
| `src/evaluate.ts` | Labeled fixture evaluation |
| `docs/` | Research, architecture, matrix, setup, privacy, and roadmap |

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md), [architecture](docs/architecture.md), [moderation matrix](docs/moderation-matrix.md), and [public boundary](docs/source-available-boundary.md). Please add synthetic or consented fixtures only. There is no production accuracy claim; probability thresholds are provisional.

## License

This source tree is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE). Personal, educational, and other noncommercial use, modification, and sharing are permitted under its terms. Commercial use requires a separate written license from Zippy Technologies LLC. Self-hosting does not include hosted classifier credits, support, or a managed bot service.

Earlier public commits were released under MIT. Their recipients retain the rights granted for those versions; this license applies to this source tree and future releases that say so. See the [license transition record](docs/license-transition.md). No source code was imported from private predecessor projects.
