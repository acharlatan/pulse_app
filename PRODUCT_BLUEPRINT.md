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
