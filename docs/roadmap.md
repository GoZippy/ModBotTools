# Roadmap and acceptance gates

| Stage | Deliverable | Gate |
| --- | --- | --- |
| 0.1 scaffold | Text event adapter, local/Jev/Laya/System One classifiers, ordered workflow routes, role ACL, staff cases, `/submit`, tests, docs | Builds and offline tests pass; live provider calls unverified |
| 0.2 pilot hardening | Transactional case store, case recovery command, staff audit log, structured metrics, overload queue, edit deduplication, role-revocation drills | Test guild drills for failure, duplicate approvals, and permissions |
| 0.3 policy quality | Consented labeled corpus, per-category calibration, language/quote/adversarial tests, moderator override feedback | Signed-off false-hold and review-load targets |
| 0.4 native integration | Read-only AutoMod inventory, then dry-run rule proposals and explicit managed-rule sync | No changes to pre-existing rules without staff review |
| 0.5 provider ecosystem | Authenticated local/ZippyMesh decision adapter, provider health and cost receipts, capacity-aware routing | Independent comparison with Jev and Laya; no verbal-confidence shortcuts |
| Control plane | Owner-managed per-guild settings, OAuth, approvals, and rollback | Tenant isolation and auditable permission tests before broad use |
| Voice research | Consent-first audio receive/STT prototype in a test guild | Stable capture, speaker attribution, privacy review, STT error study |
| Public scaffold | Contributor docs, security contact, CI, secret scan, provenance/license review | Repository owner authorizes publication; test guild remains separate |
| Kiro pilot | Written server-owner approval, scoped permissions, privacy notice, labeled evaluation | Kiro server managers authorize installation and data handling |

Potential tools from the older Zippy project include URL reputation, ticketing, case evidence, analytics, and policy configuration. Add each as a narrow optional module after its contract, data retention, failure behavior, and test fixture are settled. Avoid requiring a full microservice stack for a small community bot.
