import { Link } from "react-router-dom";
import { GettingStarted } from "../components/GettingStarted";
const topics = [
  [
    "People, companies and conversations",
    "Companies connect representatives. Open a profile to record a conversation, note or follow-up. Stages describe relationship progress; priority helps you sort. Moving a person preserves the historical company on earlier conversations.",
  ],
  [
    "Availability and permission",
    "Do Not Contact stops routine outreach recommendations and message handoffs. A timeout pauses review until its end; an independent restriction still applies afterwards. Availability is separate from permission. Unknown marketing consent is never permission.",
  ],
  [
    "Tasks and opportunities",
    "Activity contains follow-ups you can edit, reschedule, complete or reopen. Pipeline tracks deals: Won and Lost set the outcome; an active stage reopens a deal. No message is automatically sent.",
  ],
  [
    "Relationship Review and Smart Lists",
    "Reviews explain saved history, deadlines and thresholds; they do not predict customer sentiment. Snooze defers a review, dismiss hides unchanged evidence, and neither completes a task. Smart Lists are saved filters that update automatically as records change.",
  ],
  [
    "CSV import",
    "Use UTF-8 CSV, up to 2 MB and 2,000 rows. Excel .xlsx is unsupported. Preview, map fields, validate and review duplicates before confirming. Duplicates default to Skip. Blank imported fields preserve useful existing values; updates do not change restrictions or consent. Export a backup first. Import is not workspace replacement.",
  ],
  [
    "Optional momentum",
    "Enable earning in Settings → Your momentum. Qualifying saved follow-ups earn 5 XP, substantive recent calls/meetings 10 XP and explicit opportunity outcomes 5 XP. Eligibility and restrictions apply. Reopening reverses the original reward; recompleting restores it. Imports, backups and onboarding earn nothing. Hiding widgets and disabling earning are separate preferences.",
  ],
  [
    "Optional PULSE Intelligence",
    "Live generation is disabled in this release. A separately configured, protected backend is required. When available, only selected records you approve are sent to the external provider. Answers may contain mistakes; review evidence and approve any saved changes. No provider key belongs in the browser.",
  ],
  [
    "Backup and recovery",
    "Settings → Privacy & data exports all records and preferences for this workspace. Check your Downloads and keep the JSON file safely. Restore previews compatibility and counts, then replaces this workspace only after confirmation. Invalid files leave existing data untouched. Move to another browser/device by exporting and restoring; this is a transfer, not synchronization. Browser clearing, eviction or device loss can erase records. IndexedDB is not application-level encryption.",
  ],
  [
    "Install and work offline",
    "Open PULSE online first and wait for OfflineStatus to report the app is available offline. In iPhone Safari, use Share → Add to Home Screen when offered; Android/desktop Chromium may offer Install app. Availability varies. After caching, local CRM work works offline; AI and external apps require their own connection. Physical installation on iOS/Android has not been verified by this release process.",
  ],
  [
    "Updates and unfinished work",
    "Save edits before adopting an update. Update & reload asks before discarding tracked edits; another editing tab stays open. Internal links and workspace switching warn about tracked unfinished work. Dialog dismissal also warns about tracked edits. Person, company, follow-up, opportunity and conversation editors reject stale saves after another tab changes the record. Keep one editing tab per record; settings and other editors have no universal conflict resolution. Browser Back is not universally guarded. There is no persistent draft recovery.",
  ],
  [
    "Troubleshooting",
    "If records seem missing, check the site address, browser profile and Demo/Personal workspace. Do not clear site data as a first remedy. For missing route files, save work, reconnect and use the explicit reload. If storage is unavailable, allow site storage and use your normal browser; a failed save is not success. A rejected backup must be corrected or replaced with a valid copy. Missing email/WhatsApp handlers need a compatible device app; use Copy as a fallback. Calendar files do not synchronize accounts or send invitations.",
  ],
];
export function Help() {
  return (
    <div className="page">
      <p className="eyebrow">PULSE · 1.1.0-rc.1</p>
      <h1>A little guidance.</h1>
      <p className="subtitle">
        People, conversations, opportunities and follow-ups in one local
        workspace.
      </p>
      <GettingStarted always />
      <section className="surface help-content">
        <h2>Work at your own rhythm</h2>
        {topics.map(([title, body]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{body}</p>
          </details>
        ))}
        <Link className="button secondary" to="/settings?section=data">
          Open Privacy & data
        </Link>
      </section>
      <p className="muted">
        Release candidate: automated Chromium checks are not physical-device or
        accessibility certification. Closed-app push, cloud sync and OAuth
        account synchronization are not available.
      </p>
    </div>
  );
}
