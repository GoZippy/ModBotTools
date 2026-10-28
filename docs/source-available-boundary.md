# Public and licensing boundary

The bot, classifier implementations, local rules, synthetic evaluation tools, and moderator workflow are source available under the [PolyForm Noncommercial License 1.0.0](../LICENSE). Personal, educational, and other noncommercial uses are permitted under its terms. It is not an OSI open-source license because commercial use of the bot requires a separate agreement. A noncommercial self-hosted community can use the repository without a Zippy account or paid classifier.

The [normalized event schema, moderation matrix, and route schema](../schemas/README.md) are separately licensed under Apache 2.0. Other tools may use, modify, and redistribute those contracts, including for commercial purposes, under that license. The schema license does not cover the bot implementation.

Server IDs, tokens, staff policy lists, incident evidence, real member messages, voice recordings, unconsented labels, deployment topology, and billing data must remain outside the public repository. Optional provider adapters are interfaces; no private service implementation or third-party model weights are bundled.

Commercial self-hosted use requires a separate written license administered by Zippy Technologies LLC. Hosted inference, managed operations, support, and integration work are separate services; no such service or usage allowance is included with this source license. No price or checkout is active in this repository. If a paid capability is offered through a Discord app, recheck Discord's [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) and [Premium Apps guidance](https://support-dev.discord.com/hc/en-us/articles/23810643331735-Premium-Apps-Required-Support-for-Monetizing-Apps) for purchase support and price parity.

Before each public release, review tracked files, license and model provenance, dependency tree, workflows, secret scan, and documentation for private context. Public source publication does not authorize a live Kiro Discord deployment or use of member data.
