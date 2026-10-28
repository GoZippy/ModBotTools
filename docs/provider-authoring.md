# Add a classifier bridge

The public extension point is `Classifier.classify(ModerationEvent) → Classification` in [`src/core/types.ts`](../src/core/types.ts). A classifier returns `spam`, `scam`, `abuse`, and `privacy` probabilities in `[0,1]`, a `severity` score and confidence, and a small `topic` label. The policy layer alone chooses `allow`, `flag`, or `hold`. A provider must never call Discord delete, timeout, kick, or ban APIs directly.

## Integration steps

1. Document the provider's primary API, authentication, model identity, license or service terms, data destination, retention, limits, and error responses. Do not copy SDK or model code into this repository without license and provenance review.
2. Add a provider identifier in [`src/core/routing.ts`](../src/core/routing.ts), the route JSON schema, and `readConfig`. Keep credentials in `.env`; the route JSON stores no keys.
3. Implement the adapter with a bounded timeout and response size, no redirects, narrow endpoint allowlist, explicit request fields, strict answer validation, and a stable model ID. Do not log raw messages or API keys. Local HTTP bridges must remain on loopback until an authenticated network design is implemented.
4. Register it in [`src/index.ts`](../src/index.ts). Keep the adapter lazy so unused provider credentials and processes are not required.
5. Add a fake-endpoint test for the exact request body, redaction, model/version field, malformed output, timeout, and non-2xx response. A fake endpoint proves plumbing only.
6. Add a synthetic evaluation fixture and a privacy note. The offline evaluator must select the provider explicitly and report errors rather than substitute local rules. A live provider comparison requires consented, separated train/calibration/holdout examples and human review. Avoid treating vendor confidence as portable across engines.

## Other input types

A URL reputation service, Discord AutoMod alert, attachment scanner, or speech-to-text system should have its **own** input and evidence contract. It should not pretend to be a System One response. Record provenance, event time, source model/rule version, and whether evidence is missing. Voice audio remains out of scope until consent and capture quality are proven in a test guild.

## Suggested next bridge contract

An optional `ClassifierResultV2` could express `signal`, `value`, `calibration_id`, `evidence_ref`, `abstained`, `latency_ms`, and `usage` per category. It would allow a bounded multi-provider workflow to ask one service for scam and another for abuse, while preserving missing-signal behavior and per-provider cost receipts. Version the schema and keep the v1 adapter intact rather than overloading a probability with several meanings.
