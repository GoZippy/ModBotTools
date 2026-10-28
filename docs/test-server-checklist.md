# Test-server checklist

This is a safe path for a maintainer or contributor to try the public scaffold without a Kiro server role. Use your own Discord test server and synthetic messages. Do not paste bot tokens into issues, PRs, chat, or screenshots.

## Create a sandbox

1. Create a Discord server that you manage. Add a public `#bot-sandbox`, a private `#mod-review` visible only to moderators and the bot, and optionally `#approved-posts` for `/submit` output.
2. In the [Discord Developer Portal](https://discord.com/developers/applications), create a new application and bot for this test server. Copy the application ID and bot token directly into your local `.env`; never put the token in a URL or repository file. Enable **Message Content Intent** on the Bot page.
3. On the application's Installation page, enable `Guild Install`, select the `bot` and `applications.commands` scopes, and grant only the permissions listed in [setup](setup.md). Install it into the test server. Do not grant Administrator.
4. Turn on Developer Mode in Discord settings to copy the server and channel IDs. Set `DISCORD_GUILD_ID` to the test server, `MONITORED_CHANNEL_IDS` to `#bot-sandbox`, `MOD_REVIEW_CHANNEL_ID` to the private channel, and `SUBMISSION_CHANNEL_ID` to `#approved-posts` if used.
5. Keep `MODERATION_MODE=observe` and `CLASSIFIER_PROVIDER=local` in `.env`. Run `npm ci`, `npm test`, `npm run evaluate`, and `npm start`. The console should report that the bot is ready in observe mode. Confirm that the bot can see the sandbox channel. The message content intent must be enabled for this app to classify normal messages.

## Exercise the flow

Use only invented text in these drills. Check the actual results instead of assuming a label from a single phrase.

| Drill | Expected behavior |
| --- | --- |
| Ordinary technical question in `#bot-sandbox` | No deletion or staff case |
| Synthetic spam/scam signal in `#bot-sandbox` while in observe mode | Observation log only; message stays visible |
| Same signal after setting `MODERATION_MODE=review` and restarting | Staff case appears; original message stays visible |
| Approve or dismiss with a user lacking Manage Messages | Button refuses the action |
| Moderator dismisses a flag | Case closes; original stays visible |
| `/submit` with a synthetic post | Private case appears; only moderator approval creates a bot-attributed post |
| Message outside `MONITORED_CHANNEL_IDS` | No classification or case |

Do not try `hold` until the test server has labeled examples, a false-positive review, a rollback plan, and moderator agreement. For ordinary messages, hold deletes a post after publication; it cannot prevent the first exposure. Discord's native AutoMod provides pre-send blocking for supported rules. This scaffold has no audio capture or automatic sanctions.

## Share feedback safely

Contributors can open a [feature request](https://github.com/GoZippy/ModBotTools/issues/new/choose) with synthetic examples, classifier output shape, expected policy result, and observed result. Remove tokens, server/user IDs, real messages, and incident evidence. Security findings belong in [private reporting](https://github.com/GoZippy/ModBotTools/security/advisories/new).
