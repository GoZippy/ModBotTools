# Open-source boundary

The bot, normalized event schema, moderation matrix, classifier interface, local rules, synthetic evaluation tools, and moderator workflow are intended to be free and reusable. A self-hosted community should be able to use this repository without a Zippy account. Other tools can adopt [the matrix](../schemas/moderation-matrix.v1.json) and [its schema](../schemas/moderation-matrix.v1.schema.json) independently of Discord.

Server IDs, tokens, staff policy lists, incident evidence, real member messages, voice recordings, unconsented labels, deployment topology, and billing data must remain outside the public repository. Optional provider adapters are interfaces; no private service implementation or third-party model weights are bundled.

The proposed sustainable path is optional managed hosting, support, integration work, and Zippy compute services. These services should add convenience and operations, while the moderation core stays free and functional. If a paid capability is offered through a Discord app, recheck Discord's [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) and [Premium Apps guidance](https://support-dev.discord.com/hc/en-us/articles/23810643331735-Premium-Apps-Required-Support-for-Monetizing-Apps) for purchase support and price parity.

Before each public release, review tracked files, license and model provenance, dependency tree, workflows, secret scan, and documentation for private context. Public source publication does not authorize a live Kiro Discord deployment or use of member data.
