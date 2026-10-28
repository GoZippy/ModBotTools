# Discord moderation research

Verified 2026-10-28 against Discord's primary documentation. This note records platform facts separately from this project's choices.

## Message surfaces and permissions

- Discord Gateway events deliver guild messages; `MESSAGE_CONTENT` controls access to content, embeds, attachments, and components. It is a privileged intent and must be enabled for this application. [Gateway intents](https://docs.discord.com/developers/events/gateway), [privileged intent guidance](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents).
- Discord's June 2026 guidance says apps accessible to fewer than 10,000 users are unaffected by the new user-count review threshold; larger apps must request review and reapply annually. This is a current rule to recheck before broad distribution. [Discord announcement](https://support-dev.discord.com/hc/en-us/articles/40281523410967-Changes-to-Privileged-Intent-Access-for-Discord-Apps).
- Text chat inside voice channels is covered by Discord AutoMod. This project's `voice_text` surface means those text messages, **not audio**. [AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ).
- The bot needs View Channels, Send Messages, Read Message History, and Manage Messages where it reviews or deletes content; Use Application Commands for `/submit`. Do not grant Administrator. Discord permissions and channel overwrites still control the effective result. [Permissions](https://docs.discord.com/developers/topics/permissions), [application commands](https://docs.discord.com/developers/interactions/application-commands).

## Pre-publication versus post-publication

- Discord AutoMod keyword, spam, and mention rules can **block a message before sending** and send a staff alert. Its rule API has `BLOCK_MESSAGE`, `SEND_ALERT_MESSAGE`, and limited `TIMEOUT` actions. [Auto Moderation API](https://docs.discord.com/developers/resources/auto-moderation), [AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ).
- A bot receiving `MESSAGE_CREATE` sees a message after Discord accepted it. Deleting it is a post-publication action; a notification or short exposure may already have occurred. This is an inference from the Gateway message event and AutoMod's explicitly pre-send block semantics. [Gateway events](https://docs.discord.com/developers/events/gateway-events), [Auto Moderation API](https://docs.discord.com/developers/resources/auto-moderation).
- Discord has no general bot hook in these APIs that can hold every ordinary message for a custom remote classifier before posting. `/submit` is therefore an opt-in pre-publication route: the bot receives the text privately through an interaction, then posts it after staff approval. It is a bot-authored post with attribution, not the member's original message. [Application commands](https://docs.discord.com/developers/interactions/application-commands), [message resource](https://docs.discord.com/developers/resources/message).

## Voice audio

- Discord's voice protocol and `@discordjs/voice` are separate from text chat. The library supports receiving audio, but explicitly warns that receive is not documented by Discord and stable support is not guaranteed. It currently documents Node.js 24.17+ for its main branch. [discord.js voice package](https://discord.js.org/docs/packages/voice/main), [VoiceReceiver](https://discord.js.org/docs/packages/voice/main/VoiceReceiver%3AClass).
- Real-time audio moderation would need an opt-in join, clear participant notice/consent, speaker separation, a speech-to-text pipeline, a bounded transcript buffer, explicit retention, and separate evaluation for transcription error. None of this exists in the current scaffold. No voice deafen, move, disconnect, or punishment should be driven by an unvalidated transcript.

## Recommended server baseline

Use Discord's native AutoMod spam and mention controls first. Configure a private alert channel. Test custom keyword rules with moderators and exempt roles/channels sparingly. Use this bot for additional context, triage, and human review; avoid duplicate actions on AutoMod alerts. [Discord AutoMod guidance](https://discord.com/safety/auto-moderation-in-discord), [raid prevention guide](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101).
