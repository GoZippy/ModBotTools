# Free CI and release path

The public repository uses standard GitHub-hosted runners, which GitHub documents as free for public repositories. [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage). Workflows use read-only `GITHUB_TOKEN` permissions and pin third-party actions to full commits.

| Workflow | Current gate |
| --- | --- |
| `zs-ci.yml` | Windows Node 24.17 install, canonical project gate, TypeScript build, tests, synthetic evaluation |
| `zs-supply-chain.yml` | Git history secret scan and production dependency audit |
| `zs-ai-review.yml` | PR structure and AI-assistance disclosure check; no paid AI reviewer or API key |
| Dependabot | Weekly action and npm update proposals; maintainers review each PR |

There is no automatic deployment, release, model download, provider key, or Discord server token in CI. A passing build or synthetic fixture does not qualify a model for real moderation.

Before adding CD, build a reproducible release artifact with source SHA, dependency lock digest, license notice, checksum, and software bill of materials. Test a fresh install in a disposable Discord guild and document rollback. Future deployments should consume the same versioned event, route, and case contracts. Deployments should require a named environment approval, per-instance secrets, backup and restore, and post-deploy health checks that do not expose message text.
