# Choosing a Discord moderation approach

Checked 2026-10-28 against official product pages. Prices and feature lists can change; each vendor describes its own features, and we have not independently measured their moderation accuracy. This page compares deployment and control choices, not a league table of detection quality.

| Option | What its official page offers | A useful reason to choose it |
| --- | --- | --- |
| [Discord AutoMod](https://docs.discord.com/developers/resources/auto-moderation) | Native rules for supported keywords, spam, and mention patterns, including pre-send blocks and staff alerts. | Start here for immediate protection and no extra bot service. |
| [Sylon](https://sylon.app/premium) | Hosted moderation and AI advertising protection; listed at $1.50/month or $16.56/year per server on the checked page. | A hosted, broad feature set with minimal self-hosting work. |
| [ONIA](https://onia.run/pricing) | A free tier listing 300 AI analyses/day, cases and appeals; Pro is purchased per server through Discord. | A ready-to-use hosted bot with a public free allowance. |
| [Sapphire](https://sapph.xyz/) | A general-purpose Discord bot marketed as completely free. | Broad ready-made bot features. |
| [Supervisor](https://supervisor.gg/pricing) | A hosted AI moderation offer listing text, image, and video features; checked page lists £13.99/month and £83.85/year. | Media moderation needs beyond this project's current text scope. |
| [Red-DiscordBot](https://github.com/Cog-Creators/Red-DiscordBot) | A self-hosted multi-function bot with an extension ecosystem under GPLv3. | Teams wanting a mature general-purpose self-hosted bot and plugin model. |
| [ModBotTools](https://github.com/GoZippy/ModBotTools) | Source-available scaffold with local rules, opt-in classifier bridges, versioned matrix and routes, staff review cases, and explicit role checks. Noncommercial use is free under the current license; commercial use requires a separate agreement. | Noncommercial teams that want to inspect and adapt the policy, choose a local or hosted classifier, and keep control of their own bot instance. |

## Where this project fits

ModBotTools complements Discord AutoMod. Native AutoMod can block supported messages before sending; a bot classifier sees an ordinary message only after Discord accepted it. This bot can observe, flag for human review, or explicitly delete and queue a bot-attributed repost. `/submit` is the separate opt-in path for review before a bot-authored post appears. [Platform details](discord-research.md).

The practical differentiator today is **operator choice and inspectable contracts**: a server can start with offline rules, route selected workflows to Jev or Laya Studio, use a loopback System One service, and review the same normalized signals under one deterministic policy. The [matrix](../schemas/moderation-matrix.v1.json) and [route schema](../schemas/classifier-routes.v1.schema.json) can be reused outside the bot. Providers and thresholds still need calibration on consented server examples; we make no production accuracy, uptime, or support claim.

Choose a ready-made bot if you need a production dashboard, anti-raid suite, multimedia scanning, or managed hosting now. This project currently runs one guild per process, has a pilot case store, and has not been installed on the Kiro server. Community contributions are most useful around evaluation, safer review workflows, privacy, and provider interoperability.
