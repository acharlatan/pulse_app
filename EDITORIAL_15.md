# PULSE Editorial — experience revision 15

An experience redesign of Daily Pulse, Network and shared person/company profiles. Existing CRM repositories, database/backup version 6, integrations, saved media, user accents and service-worker update guards remain intact.

## Compositions

- Daily Pulse replaces the greeting banner, repeated record counters and illustrated feature menu with an editorial Today heading, one saved commitment, its actual past conversation excerpt, an agenda, pinned/familiar people and distinct relationship reviews. Reviews omit people already in the visible agenda. Existing editor, task completion, onboarding, progress, local reminders and Focus entry points remain working.
- Network defaults to open relationship rows. Each person has identity, recorded next step or past conversation, lifecycle and effective availability. A desktop context button selects a separate relationship panel with conversation excerpt, open commitment and explicitly linked opportunities. At 1000px and below, rows open full profiles directly and the context panel is omitted.
- Everyone, overdue follow-ups and pinned segments share the existing URL query and filtering flow. Search, filters, sort and company switching remain available. Smart Lists, bulk administration, alternate Cards view, import and review/Orbit links are grouped under Directory tools.
- Profiles preserve saved photography and media editing. Without saved covers, identity uses an open header. A next-commitment band replaces repeated statistics. Desktop gives the main column to the conversation story and the secondary column to details, permissions and opportunities; narrow screens put the story first. Timeline entries have a connected visual spine.
- The shared shell uses a narrower labeled sidebar and broader working canvas; mobile retains the existing bottom navigation and More destinations. Warm paper/charcoal, stronger display typography, sharper controls, open sections and semantic accents distinguish the compositions.

## Integrity and bounds

Displayed excerpts come from saved records. Notes and future-dated conversations do not become past conversation evidence in Home or Network. No relationship inference, fabricated scores, remote images or automatic communication is introduced. A restricted contact can still be reviewed administratively, with an explicit notice. All writes use existing transactional editors, completion and Focus repositories. Directory reveal remains 60 records per batch; context opportunities show two with profile access for the rest.

The new browser acceptance checks cover commitment editor handoff, context selection, persisted pin filtering, directory search/profile return, alternate presentation, all eight specified widths and both themes with axe. Existing acceptance tests use the new Today title and disclosed directory tools while retaining their workflow assertions. Exact run results and deployment status are recorded in the PR.

Physical iOS/Android, native screen readers and field performance are not certified by automated browser checks.
