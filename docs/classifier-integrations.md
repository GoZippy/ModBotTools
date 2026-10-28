# Classifier integrations and workflow routing

Status: implemented scaffold, checked 2026-10-28. No provider has been calibrated on Kiro Discord messages. The default remains local rules in observation mode.

## One instance, ordered routes

An instance watches one configured guild. `MONITORED_CHANNEL_IDS` is the first boundary: ordinary messages outside that allowlist never reach a classifier. Copy [the route example](../config/classifier-routes.example.json) to `config/classifier-routes.local.json`, edit it locally, run `npm run validate:routes -- config/classifier-routes.local.json`, and set `CLASSIFIER_ROUTES_PATH=./config/classifier-routes.local.json` in `.env`. The `.local.json` file is gitignored. Its shape is [versioned here](../schemas/classifier-routes.v1.schema.json).

Routes are evaluated from top to bottom; the first matching trigger, surface, and channel wins. An empty `channelIds` list means any **already monitored** channel. A thread matches its own ID or an allowed parent ID. Unmatched events use `CLASSIFIER_PROVIDER` and `MODERATION_MODE`. Route changes need a bot restart. This is a single-guild file configuration, not a multi-tenant remote policy store.

| Trigger | Surface | Current behavior |
| --- | --- | --- |
| `message_create` | `text`, `thread`, `voice_text` | Classify a newly accepted Discord message, then observe, flag, or post-publication hold |
| `message_update` | Same | Classify edited content; an unchanged or duplicated case may still need deduplication work |
| `submission` | `submission` | Classify text supplied through `/submit` and add signals to a private case; a moderator still decides whether to publish |

`voice_text` means text chat inside a voice channel. `voice_transcript` is reserved in the schema and is not emitted by the bot. No audio is captured.

Example: keep ordinary technical help on local rules while testing Laya in observation mode on a specific channel. Replace the example IDs only in the ignored local file:

```json
{
  "schema_version": "modbot.routes.v1",
  "routes": [
    { "id": "tech_local", "trigger": "message_create", "channelIds": ["123456789012345678"], "surfaces": ["text", "thread"], "provider": "local", "mode": "observe" },
    { "id": "chat_laya", "trigger": "message_create", "channelIds": ["234567890123456789"], "surfaces": ["text"], "provider": "laya_studio", "mode": "observe", "model": "typed-decisions" },
    { "id": "submit_jev", "trigger": "submission", "channelIds": [], "surfaces": ["submission"], "provider": "jev", "mode": "review", "model": "jev-latest" }
  ]
}
```

Hosted routes require their corresponding API key in the local `.env`. A route file with a missing key fails startup. Route IDs and provider names appear in the restricted `/modbot routes` summary; tokens and raw channel IDs do not.

## Provider bridges

| Provider | Boundary and setup | Current implementation status |
| --- | --- | --- |
| `local` | Offline rules, no API key or network transfer | Built in; narrow baseline, not an accuracy claim |
| `jev` | TypeSafe `POST https://api.typesafe.ai/v1/systemone`; `TYPESAFE_API_KEY`; optional `TYPESAFE_MODEL` or route `model` | Typed response parser implemented; no live Kiro calibration. [TypeSafe API](https://docs.typesafe.ai/api/system-one) |
| `laya_studio` | Independent hosted Laya Studio `POST https://api.laya.studio/v1/systemone`; `LAYA_API_KEY`; `LAYA_MODEL` or route `model` | Same wire parser with a separate provider identity; no live account test. Laya's own [migration guide](https://laya.studio/docs/jev-migration) says the request format is compatible, but checkpoint limits and confidence semantics differ. |
| `zippy_decisions` | A separate local Zippy Decisions process at `ZIPPY_DECISIONS_URL`; loopback HTTP only | Adapter implemented; sidecar can run Laya locally, but its default uniform backend is plumbing only. This prototype is barred from `hold`. |
| `systemone_local` | Any self-hosted System One compatible service at `SYSTEMONE_LOCAL_URL`; loopback HTTP only | Generic adapter implemented and validated against a fake endpoint. It is restricted to observe/review. Check each engine's output shape, model license, privacy behavior, and calibration before use. |

All HTTP bridges send redacted message text, surface, mention count, attachment count, and the six questions in the [moderation matrix](../schemas/moderation-matrix.v1.json). They do not send Discord user or guild IDs. The simple redactor cannot guarantee removal of every personal detail. Calls time out after 1.8 seconds, reject redirects, cap responses at 64 KB, and validate probability ranges and distributions. There is no automatic remote fallback, retry, or cross-provider threshold equivalence. A provider error on a normal message skips bot action; `/submit` still creates a review case marked `classification_unavailable`.

## Compare providers without Discord

`npm run evaluate` uses the local rules and the synthetic fixture by default. It reports the selected provider, successful classifications, errors, returned model IDs, p50/p95 latency across all attempts (including failures), a decision matrix, and false holds. The `hold` policy is simulated: this command never connects to Discord or deletes a message. Synthetic fixture agreement is a plumbing check, not a moderation accuracy estimate.

```powershell
npm run evaluate
npm run evaluate -- --provider systemone_local
npm run evaluate -- --provider zippy_decisions
```

For a hosted comparison, put only the classifier key in a gitignored `.env.eval` file, build once, and opt into each remote call explicitly:

```powershell
npm run build
node --env-file=.env.eval dist/evaluate.js fixtures/eval.sample.jsonl --provider jev --allow-remote
node --env-file=.env.eval dist/evaluate.js fixtures/eval.sample.jsonl --provider laya_studio --allow-remote
```

The command accepts `--model NAME` for Jev, Laya Studio, or `systemone_local`. It processes at most 1,000 examples sequentially, so remote runs may bill for each request. It exits unsuccessfully if any classification fails; errors are counted without printing message text. Use only synthetic or consented, locally stored fixtures. The evaluator does not load the bot's `.env` automatically, and an unknown provider fails instead of falling back to local rules. Compare p50/p95 and errors within the same environment; the local six-row fixture is too small for a useful speed or quality claim.

`systemone_local` is the bridge for self-hosted Laya, Kev, Decis, and similar servers **if** they implement the required wire shape. Compatibility with any particular third-party server remains unverified here. Only `127.0.0.1` and `localhost` with the `/v1/systemone` path are accepted. A production network bridge needs authenticated service identity, tenant isolation, rate limits, and transport security before wider deployment.

Other moderation APIs, such as [OpenAI's Moderation endpoint](https://platform.openai.com/docs/guides/moderation), have their own category taxonomy and scores. They need a separate adapter that maps categories to this project's signals, records the model version, abstains on unsupported categories, and calibrates on consented examples. Treating arbitrary scores as Jev `noul` probabilities would make the policy thresholds misleading. Discord's native [AutoMod](https://docs.discord.com/developers/resources/auto-moderation) is a separate pre-send layer and should not be wrapped as a classifier response.

Community developers can follow the [provider authoring guide](provider-authoring.md). Discord roles can view settings or review cases; they cannot load arbitrary code. New adapters enter through a reviewed source change and CI.

The [local bridge smoke test](provider-smoke.md) confirms wire compatibility with one CPU Laya-backed Zippy Decisions process, but its six synthetic examples produced no expected flags or holds. Do not treat that result as a calibrated moderation classifier.

## Choosing a route safely

1. Start with `local` and `observe` on synthetic test-server messages.
2. Collect consented labels and distinguish technical discussion, quoted reports, scams, multilingual text, evasion, and false positives. Never put raw member messages in GitHub.
3. Compare providers in a separate offline evaluation first. Record model version, latency, cost, transfer destination, errors, review load, and false-hold rate. A self-reported confidence number is not observed accuracy.
4. Enable `review` by channel and surface. Keep `hold` a separate, explicit decision after moderator signoff. The bot cannot block an ordinary message before Discord accepts it.
