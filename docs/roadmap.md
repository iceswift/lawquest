# Roadmap

This is a development portfolio, not a release commitment. Implemented features still need device validation.

## Implemented

- Remote Books catalog and selected-language package downloads.
- Gzip installation, SHA-256 verification, local JSON, and reader sidecars.
- Reader, outline, and individual section workspace.
- Local notes/folders, saved items, highlights, and recent activity.
- Native TTS controls and auto-next implementation.
- Home Search and interest calculator/history.
- Guest account flow and Supabase sign-in groundwork.

## Next: Reliability and Polish

- Search: stream bounded chunks, cancel obsolete work, improve ranking and filters.
- Stress-test repeated opening/closing and switching languages on native devices.
- Validate TTS auto-next, selection offsets, and lifecycle cleanup on iOS/Android.
- Complete multilingual headings and Chinese display labels; verify legal suffixes.
- Improve accessibility, typography, safe areas, and empty/error states.
- Add v3 content validation to release tooling; retain immutable releases and upload manifest last.
- Migrate saved/annotation references safely across source versions.
- Expand the native navigation preview into a walkthrough of downloads, highlights, and TTS.
- Audit source/font/translation permissions and select an explicit code license.

## Later

- Supabase data schema, row-level security, device sync, and conflict resolution.
- Guest-to-member migration and account recovery.
- Subscription entitlements and billing integration.
- Learning games, flashcards, and structured legal-logic exercises.
- Maintainer-friendly content release workflow and a self-contained demo dataset.
