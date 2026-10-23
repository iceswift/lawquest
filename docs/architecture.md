# Architecture

LawQuest is an Expo SDK 54 / React Native / TypeScript application using Expo Router. This document describes the implementation, not a proposed production backend.

## Content Plane

Cloudflare R2 stores versioned legal packages. A Cloudflare Worker serves the manifest and package downloads. Books reads the remote catalog, compares installed version/checksum metadata, and lets the user select languages to install.

`services/legalContent.ts` verifies compressed bytes, decompresses gzip during installation, writes JSON and reader sidecars to device storage, and maintains the installed registry. Legal content uses JSON rather than SQLite. The bundled manifest is a fallback catalog; full legal text is obtained separately.

Reader indexes contain section identities and hierarchy. Chunk sidecars hold text windows. These reduce the need to keep every complete code in memory during normal navigation, although helpers can fall back to reading a complete package when sidecars are unavailable.

## Study Data

Notes, saved sections, highlights, recent activity, and preferences are stored locally using AsyncStorage-backed services. Legal targets include code, language, version, and section identity. Version changes can require reference migration; annotations should not be silently applied to changed text offsets.

Native TTS uses expo-speech and a global service to coordinate playback. UI translations use i18next/react-i18next with Thai and English resources. Legal content language is separate from UI language.

## Accounts

Supabase Auth client and an authentication provider support the account groundwork. Guest use is available. End-to-end multi-device synchronization, server conflict handling, billing, and subscriptions remain future work.

## Search

Home Search combines manifest aliases, installed section indexes, local notes/saved items, tools, and legal text. The initial full-text implementation requests all section IDs for each installed package. Although data comes from chunks, this still gathers a package's text in memory. Debouncing and result caps are not equivalent to bounded streaming or cancellation; these are explicit follow-up tasks.

## Quality Boundaries

Service tests cover storage and reader logic with mocks. CI checks TypeScript and these tests. Native TTS sequencing, text selection, rapid navigation, low-memory behavior, accessibility, and offline device tests still need broader coverage.
