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

Commerce will use a separate workspace/domain adapter, never overload B2B lifecycle with loyalty status. Optional Gemini reads only user-selected data through a future secure backend. OAuth/token handling belongs outside ordinary settings; no secret fields exist. Integration metadata types reserve provider, scopes, features and last sync without simulating a connection. Future sync needs conflict/version handling, workspace identity and encryption design before introduction.

## Honest scope

Pipeline supports full opportunity CRUD and deterministic won/lost/reopen transitions. Channel/purpose permission editing and availability reason/source/history are implemented. Organization category/priority/stage are not independent first-release fields; opportunities and representatives supply relationship context. Progress reflects completed tasks, not fabricated XP. Recommendations are rule based and conservative, not predictive advice. Full profile cover images, custom field editors, reminders beyond in-app evaluation, and purchase/loyalty systems are future modules.

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
