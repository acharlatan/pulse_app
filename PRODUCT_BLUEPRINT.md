# PULSE product blueprint

## Promise

Every relationship has a story. Help independent B2B professionals connect, remember and grow through rich profiles rather than administration-heavy tables. Mobile comes first; social warmth must coexist with explicit state and dependable data.

## Iteration 01 architecture

React 19 + strict TypeScript + Vite + React Router HashRouter. CSS semantic tokens with Tailwind v4 tooling, Lucide, restrained Motion, Dexie/IndexedDB and live queries. No backend, mandatory account or paid integration. Zod validates imports and writes. DB version 1 is the migration boundary; subsequent changes add Dexie versions and explicit upgrade functions.

Entities: organizations, people, opportunities, interactions, tasks, availability restrictions, channel/purpose permissions, activity events, settings, gamification state and integration configuration. Stable random IDs; UTC timestamps. Last conversation is derived from non-note interaction records; follow-up display derives from open tasks. Organization contact associations and opportunity references are explicit IDs.

Separate demo/personal databases isolate data. No automatic reset. A typed repository owns transactional writes and activity generation. React components never own database schema. Future remote adapters should reuse domain rules, not replace them with AI.

## Complete journeys

1. Choose demo → browse network → open company → select representative → log a conversation → plan a follow-up → complete it from activity/profile/home.
2. Create personal workspace → add company/person → link them → edit stage/priority → refresh → retain state.
3. Edit contact availability → set timeout or do-not-contact → exclude from inappropriate reconnections. Expiry permits review, never automatic outreach.
4. Tune relationship thresholds → inspect transparent reasons on Daily Pulse → dismiss recommendation until its source changes.
5. Choose dark/device theme → persist → export JSON → validate and transactionally restore into the current workspace.
6. Delete company with confirmation → preserve and detach records; delete person with confirmation → delete explicitly described dependent records.

## Rule semantics

Normal inactive threshold 21 days; High/VIP 7; default follow-up 7; default pause 30. All editable. Overdue tasks rank first, then high/VIP inactivity, then ordinary inactivity. Won/lost relationships excluded. Relationship permission denial/withdrawal conservatively suppresses reconnect suggestions across channels; unknown permissions do not imply marketing consent. Notes do not update last meaningful contact. Temporary availability without an end remains paused. No messaging, AI scores or silent changes.

## Expansion boundaries

Commerce will use a separate workspace/domain adapter, never overload B2B lifecycle with loyalty status. Optional Gemini uses the disabled-by-default protected Worker described below and reads only explicitly approved selected context. OAuth/token handling belongs outside ordinary settings; no secret fields exist. Integration metadata types reserve provider, scopes, features and last sync without simulating a connection. Future sync needs conflict/version handling, workspace identity and encryption design before introduction.

## Honest scope

Pipeline supports full opportunity CRUD and deterministic won/lost/reopen transitions. Channel/purpose permission editing and availability reason/source/history are implemented. Organization category/priority/stage are not independent first-release fields; opportunities and representatives supply relationship context. Progress is optional and derives from real, validated action entitlements; iteration 04 defines the earning/correction rules. Recommendations are rule based and conservative, not predictive advice. Full profile cover images, custom field editors, reminders beyond in-app evaluation, and purchase/loyalty systems are future modules.

## Iteration 02 extensions

Shared record editors and relationship views extend the existing providers/repositories without new persistent stores. Interactions preserve createdAt and IDs on correction, while occurredAt drives chronological ordering. Company IDs are historical snapshots; reassignment of a person changes directory membership without moving old conversations. Company stories select stored company IDs, so direct and representative interactions appear once each.

Task edits preserve completion state; reopen is explicit. Deleting tasks clears interaction followUpId; deleting deals clears opportunityId. Conversations are retained. New representatives on a deal must match its company; existing historical representative links survive a move. Outcome derives from stage on save and backup restore. Unknown permission is never converted to Granted. Relationship denials suppress generic reconnect suggestions; marketing decisions stay separately recorded. Detailed restriction edits archive ended snapshots and explicit ending preserves the instruction. No new DB fields/indexes: schema and backup format remain version 1.

## Iteration 03 — shared intelligence and portability

DB version 2 adds smartLists (validated definitions), recommendationActions (evidence keys, kind, optional until) and importBatches (source filename, timestamp and result counts). The upgrade retains every v1 table and adds default intelligence preferences to existing settings. Optional contact import provenance and interaction source labels require no rewrites of old records. Backup v2 includes the new tables and metadata; v1 remains accepted with empty defaults. Export/restore remains atomic and workspace-local.

The single recommendations service derives health and review outputs; the workspace provider memoizes them and recalculates after data updates, each active minute and focus/visibility changes. No redundant health field is persisted. Review thresholds default to normal 21 / High/VIP 7 days, cooling 30, dormant 90, stalled deal 21, closing soon 7. Cooling is at least the applicable review threshold; dormant is at least both. Overdue commitments take precedence over inactivity. No history is Not enough history, irrespective of record age. Explicit imported last-contact dates have source provenance. Future-dated conversations do not count as past activity. Active/Cooling/Dormant describe recorded management activity, never interest or satisfaction.

Permission/availability eligibility runs before ordinary reviews. Paused/restricted rows remain in an administrative view. Ended temporary pauses permit review only, never marketing. Opportunity flags use saved close dates, meaningful conversations explicitly linked to that deal and follow-ups associated through linked interactions, company or representatives. Labels disclose that broad association; they do not claim a task is an exclusive deal commitment. Closed deals are excluded. Probability remains manual.

Contact review keys include record/rule identity, stage/priority, last-contact evidence, overdue task revisions and pause end. Deal keys use structural evidence and threshold-state transitions, not display strings or daily elapsed counts. Snoozes expire at their stored timestamp; dismissals suppress unchanged evidence. Material changes generate a new key. Legacy dismissal keys remain respected. These actions never edit tasks, availability or consent.

CSV uses Papa Parse locally with 2 MB/2,000-row/40-column limits. Explicit mapping and validation precede duplicate decisions and a complete plan preview. Email/phone/name-company matching is deterministic; uncertain matches never merge automatically. User-selected updates preserve blanks and all communication safeguards. The commit checks the exact contact/company snapshot again and validates identities/counts/references before one transaction writes contacts, companies, sourced notes, history and an aggregate activity event. Storage failures roll back the transaction. Imported metadata is not a conversation.

Smart Lists evaluate live filter definitions using the same health/availability semantics. Lists do not grant communication permissions. Built-in contact segments stay concise in a selector; custom definitions support up to 10 ALL/ANY conditions. Directory rendering is incremental. Standalone organization-only list building/importing is deferred; companies are matched/created through contact imports.

## Iteration 04 — daily productivity and optional progress

Activity is the unified task workspace and hosts a separate progress view; mobile primary navigation is unchanged. Structured CRM events optionally include entity type/ID, action, workspace and occurrence ID. Old event text is never parsed to award XP. Pure source/level/goal/streak rules live in services/progress.ts; data/progress-repository.ts maintains ledger corrections and task-specific daily definitions from existing transactional CRM operations. Context memoizes derived progress through existing live queries; no competing state store was introduced.

DB v3 is additive. Rewards have a stable source key and unique [day+fingerprint] index; a sequenced correction history preserves grants/reversals/restorations. CRM writes, rewards and correction history share one transaction. New rewards check current relationship eligibility; subsequent contact instructions do not replay or rewrite earlier awards. Explicit source edits/reopen/delete re-evaluate the entitlement, with deletion tombstones retained. Imported/legacy placeholder XP is never authoritative. Backup v3 validates new references/calendars/audit sequences and restores atomically; v1/v2 remain accepted with empty progress defaults. No restore listener awards XP.

Tracking is opt-in, separate from widget visibility. The calendar timezone is captured at opt-in and fixed for this workspace; this deliberately prevents timezone-switch farming and history rewriting. Monday is the week boundary. New grants use actual mutation time; recent conversations must have occurred within the preceding 24 hours. Backdated records never create past progress. XP amounts, eligibility, correction semantics, daily cap and preferences are documented in README.md and explained inside Activity → Your progress. Quests reference up to three specific eligible due tasks rather than random activities. Milestones/goals/streaks derive from active evidence and add no bonus XP.

The consolidated roadmap ends at iteration 07 for the B2B release. AI/integrations are iteration 05, comprehensive visual/mobile/PWA review is 06, and release hardening/distribution is 07. Commerce, team access and cloud synchronization remain separate later expansions.

## Iteration 05 — selected-context assistance

Shared `src/ai/contracts.ts` defines strict request/result validation; `src/ai/context.ts` builds local contact/company/deal context and applies authoritative communication rules. Historical company snapshots remain unchanged. Lazy Assistant UI requires an exact payload approval for every request; summaries cite approved records, Ask exposes missing evidence, drafts are editable, and action proposals require individual acceptance and an explicit due date. Sources and reviewed proposals are labeled. AI output never owns stage, dates, values, permissions, rewards or task completion.

`src/data/ai-repository.ts` wraps existing task/note repositories transactionally. Stable canonical task-content IDs and duplicate checks guard acceptance retries. AI provenance is a separate optional task field; generated text does not count as conversation or earn XP merely by being saved. Preferences default disabled. Optional fields preserve DB/backup v3 and v1/v2 compatibility without indexed schema changes. Temporary chats are not exported; accepted records are ordinary backed-up CRM records.

The Worker uses fixed Gemini model/endpoint, Cloudflare Access JWT validation and an atomic SQLite quota coordinator. No CRM context is persisted server-side or logged. Explicit request limits, timeouts and lifetime admission ceilings fail closed; details and activation prerequisites are in CLOUDFLARE.md. Production generation remains disabled pending fresh secret/access setup. Synthetic responses verify application behavior, not real model quality or prompt-injection immunity.

Manual email/WhatsApp handoffs and reviewed .ics downloads are local conveniences, independent of AI, with no delivery/synchronization claims. Restrictions remain authoritative; unknown marketing consent stays unknown. The external provider is only involved after explicit per-request sharing approval.

## Iteration 06 — visual, accessibility and PWA quality

App.tsx now contains the lightweight workspace choice and lazy Workspace.tsx; the latter preserves existing providers, Shell and lazy CRM routes. Recovery.tsx places a missing-file-aware boundary around route content so shell navigation remains available. No CRM repository or reward semantics changed. DB/backup stay v3, with app metadata 0.6.0.

update-safety.ts owns ephemeral edit markers and explicit refresh approval; successful settings writes clear their own form marker. use-app-update.ts performs native service-worker registration, checks on focus/visibility and each 15 foreground minutes, and only requests SKIP_WAITING after approval. A controller change from another tab raises an update notice rather than reloading that tab. The plugin still generates the static precache, but injectRegister is disabled and there is no competing registration helper. API responses are never precached. All previous Worker secrets, Access rules, quotas and Durable Object migrations remain unchanged.

Directory state is URL-backed with safe internal return links. Shared visual tokens and native-dialog controls improve all feature modules without duplicating domain state. Home's sole Motion usage was replaced by a preference-aware transform entrance, removing that unused dependency. Automated accessibility and real production-build offline/update tests supplement existing record/backup/reward regressions. Physical installation, real mobile keyboards, native screen readers and broad production performance remain release verification limits.

## Iteration 07 candidate

Personal onboarding derives steps from current saved records, with workspace settings for hiding/reopening and download-request time. These additive settings use DB/backup v3; older settings default safely. Help covers real workflows, recovery, installation and disabled AI. Internal links, workspace switches and dialog dismissal warn on tracked edits. Editors read fresh snapshots and compare versions transactionally for people, companies, tasks, opportunities and conversations; stale saves fail without overwriting newer data. Browser Back is not universally guarded, and settings/other editors have no universal conflict resolution. No persistent draft recovery is claimed. Stable release is gated by RELEASE_CHECKLIST.md. Teams, commerce, sync, OAuth and encrypted backup are post-release expansions.


## Iteration 08 — current expansion

Iteration 08 implements customizable pipeline/stage records, separate outcome categories, typed relationship fields, deliberate My Focus selections and company segmentation. These remain local, workspace-isolated records. Existing social profiles, conversations, permissions, optional progress and disabled-by-default AI are preserved. Full JSON export is the transfer format for customization; no synchronization is implied.


## Iteration 09 — identity and relationship context

DB/backup v5 adds validated optimized media Blobs, stable local references, optional person/company coverMediaId, and identity defaults for workspace name/avatar/accent. Media operations and orphan cleanup are transactional, workspace-isolated and unrewarded. A separate live media component revokes ephemeral object URLs; media is excluded from AI context. Backup v1–v5 validation rejects corrupted/duplicate/dangling media before atomic restore, including browser decoding before any replacement.

Orbit derives namespaced person/company/opportunity nodes and only saved membership/representative/company-opportunity edges. Deterministic bounded layout has Map/List, filters, scopes, details, record navigation and keyboard pan/zoom controls. Desktop map24/mobile18/list60/hard80; larger networks use scoped/search views. Shared editorial tokens govern the redesigned Home/navigation/directories/profiles and secondary surfaces. Analytics, rule automation, external integrations and explicit person-person links remain future work.


## Iteration 10 intelligence

Analytics describes actual local CRM records and distinguishes current snapshots from observed period activity. Stage duration starts only at a witnessed stage entry; currencies are grouped rather than converted. Automation Studio provides typed conditions and local actions with explicit activation, transactional duplicate prevention and current restriction checks. It is not a background service or a messaging integration.
