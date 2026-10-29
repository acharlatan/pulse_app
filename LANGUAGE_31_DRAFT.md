# Language coverage work in progress

This branch connects app-authored JSX text, selected visible attributes, enum displays and interpolated interface labels to the workspace language. Stored record values and canonical enum values are not changed. Language changes are designed to rerender an open editor without discarding its unsaved fields. User-entered names, descriptions and notes are not sent for translation.

The inventory is in `src/i18n/interface-inventory.json`; `interface-messages.json` is deliberately incomplete, and English remains the fallback for missing messages. Much of the added wording is machine-assisted and has not received language-by-language review. Higher-risk unreviewed backup, deletion, consent, restriction and privacy messages were held back rather than published as potentially misleading translations. Some dynamic app-generated text, onboarding/recovery states, exports and accessibility text still need an audit. The existing in-app notice that translations are partial remains accurate.

This branch is **not** the requested complete language release. Finish the catalog, review safety-critical meanings and placeholders in every language, inspect dynamic states, run the checks in AGENTS.md, and deploy only after that work is verified. No app runtime translation service, new credentials, account connection or schema change is introduced.
