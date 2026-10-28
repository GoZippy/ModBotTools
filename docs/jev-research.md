# Jev and Jev-like classifier research

Verified 2026-10-28 against TypeSafe's primary API documentation. The Gemini matrix in the project brief is a **proposal**, not a tested production policy.

## Actual API contract

TypeSafe's `POST https://api.typesafe.ai/v1/systemone` accepts a `model`, `state`, and named `questions`. `state` can be text or structured JSON. Choice returns a selected option, probabilities, and confidence. Score returns a rubric score, probabilities, and confidence. Noul returns a 0–1 value and **no separate confidence field**. Questions are evaluated independently against the same state. [API reference](https://docs.typesafe.ai/api/system-one), [introduction](https://docs.typesafe.ai/introduction), [Noul](https://docs.typesafe.ai/primitives/noul).

The adapter asks separate Noul questions for spam, scam, targeted abuse, and privacy exposure; one Score for severity; and one Choice for topic. The deterministic policy code combines results. It never interprets `noul` as a second confidence score. A high Noul value is a model estimate, not proof of a violation. [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [confidence](https://docs.typesafe.ai/confidence).

TypeSafe describes Jev as fast, but the quoted 70–500 ms range and threshold values in the Gemini draft were not validated on Kiro Discord data. The provider also documents adversarial-content, literal-interpretation, and option-order failure modes for `jev-1.13`; test those in this use case. [Known limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13). The provider can return 429 or 529; this scaffold times out after 1.8 seconds and skips actions on failure. [Errors](https://docs.typesafe.ai/api/errors).

## Calibration plan

1. Collect only consented, de-identified examples under a retention policy; label each by two moderators and adjudicate disagreements.
2. Separate tech help, community chatter, unsolicited promotion, scam, targeted abuse, quoted reports, and ambiguous cases. Include code blocks, false-positive links, multilingual posts, and adversarial spelling.
3. Compare local rules, Jev, and a future local decision provider with the **same** hold/flag policy; record precision, recall, false holds, false negatives, latency, outages, and moderator override rate by category.
4. Split by time and channel so near-duplicate posts do not leak into the holdout set. Set action thresholds from measured costs and moderator review capacity, then freeze the model and matrix version for a pilot.
5. Begin with observation, move to review, then consider hold only when false holds and operational recovery are acceptable to the server staff.

The included `fixtures/eval.sample.jsonl` is synthetic and tiny. It checks wiring, not quality. `npm run evaluate` reports an expected-by-actual matrix and false holds. Do not publish real community messages as a benchmark without authorization.

## Open/local path

`Classifier` is a small interface so a local service, ZippyMesh-routed model, or another decision API can replace Jev. The optional Zippy Decisions 0.2 adapter calls its local `/v1/systemone` endpoint; its own documentation marks decisions as shadow/review-only and its synthetic measurements do not validate Discord moderation. A Jev-like provider must produce **measured** probabilities or a transparent uncalibrated score plus abstention; a generative model's self-reported confidence is not a drop-in substitute. ZippyMesh may route provider/model/capacity/cost, while this bot owns Discord events, review cases, and policy. No private ZippyMesh source or secrets are needed for the public scaffold.
