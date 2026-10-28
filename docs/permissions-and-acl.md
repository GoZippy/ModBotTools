# Discord permissions and instance ACL

Status: implemented for case buttons and read-only settings commands. Configuration edits remain local-file changes by the instance operator. No command grants Discord roles, changes AutoMod rules, or edits classifier routes at runtime.

## Capabilities

| Capability | Default rule | Optional instance role grant |
| --- | --- | --- |
| View `/modbot status` | Guild owner, Manage Guild, or an eligible case reviewer | `MOD_VIEW_ROLE_IDS` adds read-only viewers |
| View `/modbot routes` | Guild owner | `MOD_CONFIG_ROLE_IDS` plus Discord Manage Guild |
| Approve or dismiss a private case | Guild owner or Discord Manage Messages | If `MOD_REVIEW_ROLE_IDS` is nonempty, a non-owner must also have one listed role |
| Edit route file and secrets | Local instance operator with filesystem access | No Discord role grants this today |

The `MOD_*_ROLE_IDS` values are comma-separated role IDs in the ignored `.env`. They are scoped to the configured guild. An empty review-role list means any member with effective Manage Messages can review. A non-owner with a listed review role but no Manage Messages cannot approve or dismiss. The guild owner can always review and see the summaries. A missing guild/role context fails closed.

`MOD_CONFIG_ROLE_IDS` currently authorizes **viewing** the route list, not writing settings. It is reserved for a future managed configuration workflow. That workflow should require owner-created grants, revision numbers, a diff preview, two-person approval for remote providers or `hold`, an audit receipt, and rollback. The bot currently reloads route files only on restart.

Discord can separately restrict who sees application commands in **Server Settings → Integrations**, and `default_member_permissions` can set command defaults. Those are useful presentation and platform controls; the bot still checks its own ACL for every interaction. Discord documents that editing application-command role/channel permissions requires a user OAuth Bearer token with relevant guild permissions, not the bot token. This scaffold does not request that OAuth scope or alter those settings. [Discord application command permissions](https://docs.discord.com/developers/interactions/application-commands#permissions).

The private review channel must be visible only to staff and the bot. The bot checks that `@everyone` cannot view it before posting a case, but server managers must inspect role and member overwrites too. Case content can contain sensitive text; channel privacy and reviewer membership are part of the deployment checklist. Give the bot only channel-scoped View Channel, Send Messages, Read Message History, Manage Messages where needed, and Embed Links in the staff channel. Do not grant Administrator.
