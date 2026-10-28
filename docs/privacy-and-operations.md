# Privacy and operations

## Data flow

- Local classifier: only messages in the configured channel allowlist are processed in memory. Observation mode stores no cases and does not log message text or IDs.
- Jev: sends redacted text, surface, mention count, and attachment count to TypeSafe. The regular expressions remove obvious email addresses, phone numbers, and Discord mentions; they cannot guarantee removal of all private data. External classification is opt-in and should be announced to the server.
- Review/hold: a local case file contains IDs, reason, provider/model, and timestamps. `hold` and `/submit` retain full text for 24 hours so a moderator can inspect and approve it. The private staff channel receives the full text in an embed; flagged cases receive a short redacted preview.
- Repost: approval makes a new bot-authored message with an author attribution line. Mentions and link embeds are suppressed. The original message is not restored.

## Handling failures

Provider timeout, malformed response, or concurrency saturation leaves the ordinary message in place. A failed delete changes the case to a flag and attempts to update the staff card; check the original message before approving. A failed staff-channel send can leave a pending flag file; operators should inspect logs and the case directory. If publication succeeds but updating the case fails, a repeated approval can duplicate the post. Run one bot instance, back up cases before migrations, and inspect the destination before retrying a failed approval.

No automatic bans, timeouts, kicks, or voice actions occur. Moderator permissions are checked on every button click. Discord's own AutoMod and server moderation tools remain independent. Do not treat a model label as proof of Terms of Service violations or criminal conduct.

## Before a public pilot

Create a server-specific privacy notice, retention and deletion process, moderator access policy, review/appeal path, incident runbook, and a labeled false-positive study. Review Discord's [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) and applicable local recording/consent rules before any voice work. Use a dedicated test guild first. Do not publish real member data, bot tokens, or provider keys with the open-source repository.
