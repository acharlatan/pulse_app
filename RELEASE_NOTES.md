# PULSE 1.0.0-rc.1

PULSE helps independent professionals and small businesses remember people, conversations, opportunities and follow-ups. Open https://pulse.icareaboutyoufam.workers.dev, explore the fictional Demo, or create an empty Personal workspace without an account.

## Included

- Linked people and company profiles, conversation history, follow-ups and opportunity tracking.
- Explainable Relationship Review, dynamic Smart Lists and reviewed CSV imports.
- Optional progress earned from qualifying work, with reward corrections.
- First-run guidance, in-app Help and recovery/install documentation.
- Offline local CRM, explicit app updates and guarded dialog dismissal.
- Stale-save protection in person, company, task, opportunity and conversation editors.
- Full JSON backup replacement with compatible v1/v2/v3 support.
- Reviewed email/WhatsApp handoffs and calendar file export.

The website is the primary distribution. Compatible browsers may offer PWA installation; see INSTALLATION.md. A static self-hosted build can be produced with `npm ci`, `npm run build` and the packaging script. It does not include the protected Cloudflare AI backend.

## Your data

Records live in the current browser profile and site address. There is no automatic cloud backup or cross-device synchronization. IndexedDB is not application-level encryption. Export a JSON backup, check Downloads and keep it safely before moving devices, clearing storage or making bulk changes. Restore replaces the selected workspace after validation and confirmation; see BACKUP_AND_RECOVERY.md.

## Candidate limits

Live AI generation remains disabled. No Gmail, Google Calendar or Google Contacts account sync, team collaboration, closed-app push or native APK/IPA is included. Handoffs do not prove sending or delivery.

Verified environments are automated desktop Chromium and mobile viewport emulation. Physical iOS/Android installation, native keyboards/screen readers, Firefox/WebKit and literal browser zoom remain unverified. Save before browser Back; warnings are not persistent draft recovery. Keep one editing tab per record. Settings and other editors do not have universal conflict resolution.

This is a public release candidate, not a claim of stable 1.0 certification. See QA_REPORT.md and RELEASE_CHECKLIST.md for executed checks and outstanding verification.
