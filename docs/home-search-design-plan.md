# Home Search Design Plan

## Goal

Home Search should work like a lightweight command center for LawQuest. It should help users jump quickly to laws, sections, notes, saved items, and useful tools without needing to remember where each feature lives.

The search bar on Home should not be limited to book titles. It should answer the user's intent:

- "I want to open a legal code."
- "I want to jump to Section 420."
- "I want to find text inside downloaded law packages."
- "I want to find my notes, saved sections, or highlights."
- "I want to open a tool such as the interest calculator."

## Product Direction

Use an Apple Spotlight-style search experience:

- The Home search bar is a calm entry point.
- Tapping it opens a dedicated full-screen search surface.
- Results are grouped by intent and source.
- Fast local results appear first.
- Remote/network search can be added later, but the MVP should feel useful offline.

## Search Scope

### 1. Legal Codes

Search by legal code title and aliases.

Examples:

- `อาญา`
- `แพ่ง`
- `ที่ดิน`
- `criminal`
- `revenue`
- `tax`

Expected result:

- Open the Books/Reader flow for the matching legal code.
- Show installed language badges, such as TH, EN, zh-CN.
- If not downloaded, show a clear "Download required" state.

### 2. Section Jump

Search by section number directly.

Examples:

- `มาตรา 420`
- `ม. 420`
- `420`
- `section 420`
- `1096 ทวิ`
- `3 bis`
- `3 quater`

Expected result:

- Show matching sections from installed packages.
- Prefer exact section number matches.
- Preserve suffix sections correctly, including `ทวิ`, `ตรี`, `จัตวา`, `bis`, `ter`, `quater`, etc.
- Tapping a result opens the Section screen directly.

### 3. Legal Text

Search inside downloaded legal packages.

Examples:

- `ละเมิด`
- `ดอกเบี้ย`
- `เจตนา`
- `negligence`
- `tax`

Expected result:

- Search only installed local JSON packages in the MVP.
- Group results by code.
- Show section label, code title, language, and a short excerpt.
- Avoid loading every full package into memory at once. Use existing reader index/chunk helpers where possible.

### 4. Notes, Saved, and Highlights

Search user-created or user-curated content.

Examples:

- Notes written by the user
- Saved sections
- Highlighted text

Expected result:

- Notes open the note editor/detail screen.
- Saved sections open the Section screen.
- Highlights open the Section screen and can later scroll to the highlighted paragraph.

### 5. Tools and App Actions

Search app features as commands.

Examples:

- `ดอกเบี้ย`
- `interest calculator`
- `calculator`
- `canvas`
- `notes`
- `saved`

Expected result:

- Show quick action cards.
- Tapping the result routes to the feature immediately.

## UX States

### Empty State

When the user opens Search but has not typed yet:

- Recent searches
- Quick actions
- Downloaded legal codes
- Suggested section jump hint

### Typing State

When query length is short:

- Prioritize code names, section-number detection, and tools.
- Avoid expensive full-text search until query length is meaningful.

Recommended threshold:

- Section detection: immediately
- Code/tool search: 1+ characters
- Legal text search: 2+ Thai characters or 3+ Latin characters

### Result State

Group results in this order:

1. Exact Section
2. Legal Codes
3. Legal Text
4. Notes
5. Saved
6. Highlights
7. Tools

### No Result State

Show helpful next steps:

- "No installed content matched this search."
- "Try downloading a legal code first."
- "Search by section number, such as มาตรา 420."

## MVP Implementation

Phase 1 should focus on a stable local-first search:

- Create a dedicated `/home-search` screen.
- Make the Home search bar route to `/home-search`.
- Implement Legal Code search from the manifest.
- Implement Section Jump using installed package reader indexes.
- Implement local Legal Text search over installed reader chunks with debounce and result limits.
- Implement Tool search with static command definitions.
- Implement Notes and Saved search from existing local stores.

## Phase 2

After the MVP feels stable:

- Add recent search persistence.
- Add highlight search.
- Add search result ranking.
- Add language filters.
- Add code filters.
- Add "download to search this code" suggestions for not-installed packages.

## Phase 3

Longer-term improvements:

- Build a lightweight local search index after package download.
- Store normalized section numbers and text snippets for faster search.
- Support cross-language search suggestions.
- Add semantic search if backend/user account features justify it.

## Technical Notes

### Section Number Normalization

The section search system must support Thai and Latin suffixes:

- `ทวิ` -> `bis`
- `ตรี` -> `ter`
- `จัตวา` -> `quater`
- `เบญจ` -> `quinquies`
- `ฉ` -> `sexies`
- `สัตต` -> `septies`
- `อัฏฐ/อัฎฐ` -> `octies`
- `นว` -> `nonies`
- `ทศ` -> `decies`

Both Thai-style and English-style queries should resolve to the same section identity when possible.

### Performance

Avoid turning Home Search into a heavy reader load:

- Start with manifest and reader indexes.
- Load section windows only when needed.
- Debounce full-text search.
- Cancel stale searches when the query changes.

### Offline First

The search should work without network for installed content. Remote manifest sync can improve available code listings, but search should never depend on the network for local notes or installed packages.

## Open Decisions

- Whether Home Search should include not-downloaded legal codes in results by default.
- Whether Chinese content labels should display as `CN`, `ZH`, or `中文`.
- Whether section text search should initially search only the currently selected app language or all installed languages.
- Whether search results should open Reader list view or Section detail for section matches.

## Recommended Defaults

- Show not-downloaded legal codes, but mark them clearly as "Download required".
- Display Chinese as `中文` in UI, while keeping the package language code as `zh-CN`.
- Search all installed languages, but group or tag results by language.
- Open exact section matches directly in Section detail.
