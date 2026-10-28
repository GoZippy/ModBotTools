# Local classifier bridge smoke test

Checked 2026-10-28 with six synthetic examples from [`fixtures/eval.sample.jsonl`](../fixtures/eval.sample.jsonl). The bot's `zippy_decisions` adapter called a separate, loopback-only Zippy Decisions development sidecar using a locally installed Laya `typed-decisions` checkpoint on CPU. No Discord server or member data was used, and no private sidecar source or model weights are included here.

| Measure | Result |
| --- | ---: |
| Successful calls | 6/6 |
| Failed calls | 0 |
| Returned model identity | `laya-rl-agent` |
| Call latency p50 / p95 | 1,365.56 / 1,676.93 ms |
| Expected flags or holds detected | 0/4 |
| False holds on two expected-allow examples | 0/2 |

This verifies the HTTP bridge, redacted request path, parser, and evaluator against one local process. Six examples do not measure real-world precision, recall, or calibration. The policy did not flag the fixture's suspicious messages, so this checkpoint and matrix must stay in observation or human-review mode until a consented evaluation demonstrates useful detection. CPU latency was close to the bot's 1.8-second deadline; performance under concurrent Discord traffic remains untested. Hosted Jev and Laya Studio were not called in this test.

To reproduce with your own local backend, start a System One compatible service on loopback, then run `npm run evaluate -- --provider zippy_decisions` or `--provider systemone_local`. The private Zippy Decisions prototype's default uniform backend only proves plumbing and must not be interpreted as a moderation model.
