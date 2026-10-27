# PULSE 1.4.0-rc.1 — integration release candidate

## Implementation

Google Calendar supports an explicitly reviewed event on the primary calendar from follow-ups and recorded meetings. The user reviews title, device-local date/time, duration, all-day choice and a separately entered Google description. Existing CRM notes are not copied into that description. Events use deterministic per-record IDs to recognize duplicates and avoid blind retries; an existing event can be opened or the user can deliberately create another. Invitations, background synchronization and automatic task completion are not implemented. Offline .ics exports remain available.

Google Contacts uses the read-only People API to retrieve a bounded, paginated list of names, first email, first phone and primary organization/title. The user selects contacts and proceeds to the existing import wizard to review mappings, duplicate decisions, company matching and the final atomic save. It never downloads photos, writes to Google, grants consent or manufactures conversations or rewards. More than 2,000 contacts requires a smaller CSV import. Multiple email and phone values beyond the first are not imported in this iteration.

Gmail API access is not implemented. The existing reviewed email composer, copy and WhatsApp handoffs remain available with existing outreach checks; none is represented as a connected Gmail account. There is no automatic sending.

## Authorization and privacy

The optional public OAuth web client ID is provided at build time, not as a frontend secret. Google Identity Services requests `calendar.events.owned` or `contacts.readonly` separately when initiated by the user. The short-lived token is kept in memory and scoped to the Personal workspace and one feature. Switching workspace, restoring/resetting a workspace, expiry or disconnect clears it. Google account identity is not persisted, and the app does not display an account identifier. No token enters IndexedDB, localStorage, backups, URL parameters, activity history or logs. Google API calls do not use local automation rules and are not replayed after restore. See GOOGLE_INTEGRATIONS.md for setup and Google verification requirements.

## Data and compatibility

The schema remains database/backup v6; prior data and v1–v6 backup compatibility are retained. Google-imported records pass through the established validated import transaction and its restrictions/permission protections. PULSE remains useful offline; Google actions require internet. Google results are not stored by the service worker.

## Verification and deployment

`npm run typecheck`, `npm run lint`, and the unit suite passed (182 tests). The existing production-browser regression passed 61 of 62 cases; the desktop Settings reload timed out under contention and subsequently passed in an isolated final-build rerun. Six mock-provider browser cases passed on mobile and desktop, covering selection/import, Calendar duplicate recovery, cancellation and accessibility. The root offline/PWA suite passed 12 cases and scoped-subpath checks passed two cases. The Worker dry run and production dependency audit passed, with zero reported production dependency vulnerabilities. Provider tests use deterministic mocks; they do not establish that a real Google account has connected. Setup of a Google Cloud project, consent screen, public web client ID, authorized origin and any required Google verification remains necessary. The final pull request records exact regression results, deployment SHA, Cloudflare build and live smoke checks after they occur.

This is a release candidate, not a claim of certified accessibility or universal production stability. Physical iOS/Android devices, native screen readers, additional browser engines, real OAuth consent and actual Google Calendar/Contacts APIs have not been verified here. Gmail restricted-scope approval has not been obtained.
