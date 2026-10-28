# Release readiness and contribution queue

Checked 2026-10-28. Public `main` contains the source-available text moderation scaffold. The classifier routing, role ACL, and offline provider comparison changes are on `feature/classifier-routing-source-available` pending review and merge. [Feature status](features.json) records what is implemented versus tested.

## What can be shared now

The source, [Apache-licensed schemas](../schemas/README.md), synthetic fixture, setup guide, and provider contracts can be reviewed and adapted. The bot defaults to observation, monitors no ordinary channel until explicitly configured, and sends no text to an external classifier by default. Its policy and review flow can be tried in an owner-controlled test guild. This is an experimental scaffold, not a measured spam detector or a managed moderation service.

## Verification boundary

- Local gate: TypeScript build and automated tests pass on the classifier branch.
- Offline fixture: six local-rule examples return the expected decisions. This is not a field accuracy estimate.
- A CPU Laya-backed Zippy Decisions sidecar returned six valid responses but missed all four fixture examples expected to flag or hold. [Measurement and limits](provider-smoke.md).
- Hosted Jev and Laya Studio have adapter/fake-endpoint tests; neither has a live account test here.
- No Discord test guild exercise, Kiro installation, voice capture, or commercial entitlement flow has been completed.

## Good first contributions

| Priority | Task | Acceptance evidence |
| --- | --- | --- |
| High | Prevent duplicate cases and close the last stale-edit race | Tests for repeated create/update events and an edit arriving after the final fetch but before deletion; the current forced-refresh guard is a partial safeguard |
| High | Clean up staff cards when cases expire | Store staff message IDs and remove full-text embeds under the configured retention policy; verify restart and API-failure behavior |
| High | Make case creation and staff alerts recoverable | Restart/failure drill with a durable case and one clear moderator outcome |
| High | Build a consented, redacted evaluation protocol | Split calibration and holdout sets; report false holds, recall, review volume, latency, and error rate without publishing member text |
| Medium | Document a reproducible local Laya deployment | Pinned model/runtime, CPU and GPU measurements, memory use, fail-safe behavior |
| Medium | Add provider usage and cost receipts | No message body or key in logs; each route records model, latency, billable units when available, and an error class |
| Medium | Add read-only Discord AutoMod inventory | Test guild only; no mutation of owner-managed rules |

Before anyone uses the bot in Kiro, its server managers must approve installation, permissions, data handling, and a scoped pilot. A public PR or successful CI run is not that authorization.
