# LawQuest Current App Architecture

> Historical notes from June 2026. See [architecture.md](architecture.md) and [development.md](development.md) for the publication snapshot and current setup.

Last updated: 2026-06-05

## Product Shape

LawQuest is an offline-first Thai legal learning app. The main product idea is:

```text
1 Article = 1 Interactive Legal Workspace
```

The app is not only a law text reader. It combines:

- downloadable legal code packages
- bilingual Thai/English legal text
- reader and section workspace
- outline navigation
- saved sections
- notes/canvas
- highlights
- text-to-speech
- future backend sync for user data

## High-Level Architecture

```text
Cloudflare R2 + Worker
        |
        | /manifest + package downloads
        v
Books Page
        |
        | install selected code/languages
        v
Local JSON Package Cache
        |
        v
Reader / Outline / Section Workspace
        |
        v
User Data Stores
Notes, Saved Sections, Highlights, Recent Items, TTS State
```

## Cloudflare Content Backend

LawQuest uses Cloudflare for legal content distribution.

- R2 bucket: `lawquest-legal-packages`
- Worker endpoint: `https://lawquest-content-api.contacticev1.workers.dev`
- Main catalog endpoint: `/manifest`

The Cloudflare side is responsible for public legal content packages only. It is not currently responsible for private user data.

### Legal Package Release

Local legal package source files live under:

```text
D:\Project\LawQuest\data\legal-v2
```

Generated package files live under:

```text
D:\Project\LawQuest\data\legal-v2\packages
```

Release command:

```powershell
cd D:\Project\LawQuest
npm run release:legal-packages
```

This validates, builds, uploads package objects to R2, and verifies Worker endpoints.

## Books Page

The Books page has two separate concepts:

- Remote catalog: what legal codes are available to download.
- Local installed registry: what legal packages are already installed on this device.

The remote catalog should come from the active Cloudflare package manifest, not from a hardcoded local list.

Current design:

- `Remote manifest = source of truth for catalog`
- `Installed registry = source of truth for installed languages/versions`
- bundled manifest = fallback only

Related files:

```text
D:\Project\LawQuest\app\(tabs)\books.tsx
D:\Project\LawQuest\services\legalContent.ts
D:\Project\LawQuest\components\books\BookCard.tsx
D:\Project\LawQuest\components\books\DownloadPackageModal.tsx
D:\Project\LawQuest\components\books\types.ts
D:\Project\LawQuest\docs\books-remote-catalog-plan.md
```

## Legal Content Storage

The app is currently JSON-only for legal content reading.

SQLite was removed because it caused instability, crashes, and stutter during Reader usage. The Reader now reads local JSON package files and sidecar chunk/index files.

Download flow:

```text
manifest package entry
        |
        v
download .json.gz from Cloudflare
        |
        v
verify compressed SHA-256
        |
        v
gunzip into local JSON
        |
        v
verify content SHA-256
        |
        v
write local package cache / sidecars
```

Reader flow:

```text
read index package
        |
        v
render section list
        |
        v
hydrate only visible/needed sections
        |
        v
read paragraphs for Section/TTS/Highlight
```

Main service:

```text
D:\Project\LawQuest\services\legalContent.ts
D:\Project\LawQuest\services\legalStorage.ts
```

## Legal Data Versioning

Thai legal text is authoritative.

English text is treated as a draft/unofficial learning reference unless a verified official translation is available.

Current file pattern:

```text
data/legal-v2/texts/{codeId}/th/{th-version}.json
data/legal-v2/texts/{codeId}/en/{en-version}.json
```

Example:

```text
data/legal-v2/texts/thai-civil-commercial-code/th/th-ocs-2026-04-28.json
data/legal-v2/texts/thai-civil-commercial-code/en/en-ai-draft-2026-04-29.json
```

New translation drafts should create new files instead of overwriting old ones, for example:

```text
en-ai-draft-2026-06-05.json
```

Important rules:

- keep `sectionId` exactly aligned with Thai
- keep `sectionNo` exactly aligned with Thai
- keep section order exactly aligned with Thai
- do not merge/split sections
- Thai remains the authoritative source
- English should use `reviewStatus: needs_legal_review`

## Reader

The Reader is the main screen for browsing sections within a legal code.

Related files:

```text
D:\Project\LawQuest\app\legal-reader.tsx
D:\Project\LawQuest\components\legal-reader\SectionCard.tsx
D:\Project\LawQuest\services\legalReaderSelectors.ts
```

Current Reader behavior:

- opens only installed packages
- supports TH/EN language switching if both are installed
- reads from local JSON package cache
- supports outline filtering
- supports search by section/text/structure
- uses localized structure labels from package `labels`
- card breadcrumb is called `Structure Breadcrumb` or `Outline Breadcrumb`

Crash prevention currently includes:

- guarded navigation cooldown for opening Reader
- request-id checks to prevent stale load state
- limited in-memory reader package cache
- cleanup/release package cache on unmount

## Outline

Outline navigation is based on `structure.nodes` in legal packages.

The same data can represent different legal hierarchy styles:

- `บรรพ`
- `ภาค`
- `ลักษณะ`
- `หมวด`
- `ส่วน`

The app should not assume every code has the same hierarchy. It should render whatever structure nodes the package provides.

Structure labels should be language-aware:

```ts
node.labels?.[language] ?? node.labels?.th ?? node.label
```

Related files:

```text
D:\Project\LawQuest\app\legal-outline.tsx
D:\Project\LawQuest\services\legalReaderSelectors.ts
D:\Project\LawQuest\data\legal-v2\structures
D:\Project\LawQuest\data\legal-v2\structure-translations
```

## Section Workspace

The Section screen is the per-article workspace.

Related file:

```text
D:\Project\LawQuest\app\legal-section.tsx
```

Current features:

- displays one section
- shows localized code title and section title
- shows structure breadcrumb
- supports previous/next navigation
- supports save
- supports note link
- supports highlights
- supports TTS
- shows English unofficial notice for draft English text

Section title should come from canonical `section.sectionNo`, not by parsing only the text prefix. This is important for sections like:

- `3 ทวิ`
- `3 ตรี`
- `3 จัตวา`
- `4/1`

## Section Numbering

Legal section numbers are not plain integers.

Examples:

```text
3
3 ทวิ
3 ตรี
3 จัตวา
4/1
91/20
```

The canonical value is `section.sectionNo`.

UI should render:

- Thai: `มาตรา ๓ ทวิ`
- English: `Section 3 bis`

The app should avoid deriving display title only from text regex because legal text may include footnotes, suffixes, and unusual numbering.

## Notes / Legal Canvas

Notes are intended to become an iOS Notes-like legal workspace system.

Current direction:

- folder-based navigation
- recent notes on Home
- linked notes from Section
- future upgrade toward richer editor behavior

Related areas:

```text
D:\Project\LawQuest\app\notes*
D:\Project\LawQuest\services\notes.ts
D:\Project\LawQuest\components\notes
D:\Project\LawQuest\components\home\RecentNotesPanel.tsx
```

Known recent refactor direction:

- split folder list from notes list
- use nested routing for folder navigation
- use stable `folderId`, not folder name, in routes
- preserve note deep links from Section

## Saved Sections

Saved sections use a separate store and are displayed in the Saved tab.

Saved records should include enough context to reopen the exact legal section:

- codeId
- language
- versionId
- sectionId
- sectionNo
- title
- excerpt
- codeTitle
- structurePath

Related file:

```text
D:\Project\LawQuest\services\savedItems.ts
D:\Project\LawQuest\app\(tabs)\saved.tsx
```

## Highlights

Highlight storage already supports character offsets.

Important fields:

- codeId
- language
- versionId
- sectionId
- paragraphId
- startOffset
- endOffset
- selectedText
- color

Current recommended implementation path:

1. Use a character-level data model.
2. Start with stable paragraph-level/fallback behavior if needed.
3. Add Character-Level Highlight through explicit Highlight Mode.
4. Do not put transparent TextInput overlays permanently on every paragraph.
5. Use TextInput selection only while Highlight Mode is active.
6. Keep normal reading UI as native Text rendering.

Related file:

```text
D:\Project\LawQuest\services\highlights.ts
D:\Project\LawQuest\app\legal-section.tsx
```

## Text-To-Speech

TTS uses Native OS TTS through `expo-speech`.

Related file:

```text
D:\Project\LawQuest\services\ttsService.ts
D:\Project\LawQuest\app\legal-section.tsx
```

Current behavior:

- global lightweight pub/sub service
- reads section title before body
- reads paragraph queue
- supports Auto Next
- uses playback token to prevent old callbacks from controlling new playback
- uses `isWaitingForNextSection` to separate reading from waiting for next section

Important stability rule:

Auto-start TTS must only begin when loaded paragraphs match the active `selectedSectionId`. Otherwise, it can accidentally read the previous section again.

## Current Backend Direction

Recommended split:

```text
Cloudflare = public legal content delivery
Supabase or similar = private user data later
```

Cloudflare is already suitable for:

- manifest
- legal packages
- public downloadable content
- low-cost egress through R2/Worker

Future backend/user data may include:

- user accounts
- synced notes
- saved sections
- highlights
- reading history
- settings

## Current Validation Commands

Useful commands:

```powershell
cd D:\Project\LawQuest
.\node_modules\.bin\tsc.cmd --noEmit
npm run validate:legal-translations
npm run build:legal-packages
npm run release:legal-packages
```

Note: TypeScript may currently show unrelated Notes errors depending on the active branch/refactor state. Check whether errors are from the files being edited before assuming a new regression.

## Important Development Rules

- Do not overwrite old English translation files.
- Do not modify Thai source JSON when translating.
- Do not reintroduce SQLite for legal content reader.
- Do not make local hardcoded catalog the source of truth for Books.
- Do not assume every legal code has the same hierarchy.
- Prefer JSON package/cache stability over clever runtime parsing.
- Keep Reader performance and crash prevention as a priority.

