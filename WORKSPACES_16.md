# PULSE Workspaces — experience revision 16

Pipeline and Activity now have different working compositions, extending Editorial 15 without rebuilding the CRM data layer. Database and backup remain v6; no dependencies, migrations, integration activation or external assets are added.

## Pipeline

An ink value strip presents open opportunity count and saved open value grouped by currency, with unvalued opportunities disclosed separately. Closed/open totals remain available in Outcomes by currency; no conversion, weighted forecast or inferred historical performance is introduced.

Stage selectors show actual record counts with decorative volume bars. The board initially shows populated stages; Empty stages reveals the rest, and selecting any stage always opens it. Desktop retains a keyboard-focusable horizontal board; mobile stacks columns. Custom names, category semantics, archived-pipeline behavior, selected-pipeline persistence and existing stage moves/reopening remain connected to their existing repository operations.

Compact opportunity cards show title, saved company/avatar, value, expected close and representatives. The earliest open follow-up for the saved company or linked representatives is labeled as related context, with its source and a note that it may support other work. It is never presented as an exclusive opportunity commitment. Titles and follow-ups open existing editors. Focus, custom fields, review reasons, optional assistance and the full opportunity editor remain under Details & tools. Shared full opportunity cards on profiles remain intact.

## Activity

Default due-date order groups the agenda into Overdue, Today, Upcoming and Completed, using the shared task-state service and workspace timezone. Priority/recent-update sorts retain a global ordered list. Existing filters are URL-backed and survive reload; timeline and progress keep their distinct views. Rendering remains bounded to 40 tasks/events per reveal.

The shared TaskRow has an optional compact agenda presentation. Completion/reopening, busy feedback, editor handoff, restriction notices, rewards, Focus and calendar tools still use existing transaction and communication rules. Profile and progress presentations retain their original full controls. Recent past conversations provide context in a secondary column, moving below the agenda on narrow screens. Notes and future-dated conversations are excluded from this preview.

## Verification

Browser acceptance covers currency separation, stage close/reopen persistence, direct opportunity editing, task rescheduling/completion/reopening, reload-stable Activity filters, empty workspaces and 320/375/390/430/768/1024/1280/1440px in both themes with axe. Existing CRM, progress, automation, backup and PWA checks remain in the regression suite. Exact executed results and live deployment evidence are recorded in the release PR. Physical-device/native-screen-reader verification remains separate.
