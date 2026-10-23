# Books Remote Catalog Plan

## Goal

The Books page should show legal codes from the remote Cloudflare manifest, not from a hardcoded local catalog. This lets LawQuest add new legal codes or new language packages through Cloudflare R2/Worker without requiring an app release.

## Source Of Truth

- Remote catalog source: Cloudflare Worker `/manifest`.
- Local installed source: AsyncStorage installed package registry.
- Bundled manifest: fallback only, used when there is no network and no cached remote manifest yet.

## Data Flow

1. App starts Books page.
2. Load cached package manifest immediately for a fast first render.
3. Attempt remote manifest sync from Cloudflare.
4. Cache the remote manifest if it validates.
5. Build the visible Books catalog from the active manifest.
6. Merge each catalog item with local installed package state.

## Runtime Behavior

- Online: Books displays every legal code available in the remote manifest.
- Offline with cached manifest: Books displays the last known remote catalog.
- Offline with no cached manifest: Books falls back to the bundled manifest so the page is not empty.
- Installed language badges come only from local installed registry.
- Download choices come only from the active manifest.
- Reader opens only installed packages.

## Required Separation

Catalog item means "available to download":

```ts
type RemoteCatalogBook = {
  codeId: string;
  title: string;
  sectionCount: number;
  availableLanguages: string[];
};
```

Installed package means "available on this device":

```ts
type InstalledLegalPackage = {
  codeId: string;
  language: string;
  versionId: string;
  installedAt: string;
  localUri: string;
};
```

The Books page must merge these two concepts at render time instead of treating local data as the catalog source.

## Implementation Notes

- Prefer deriving `LawBook[]` from `getPackageManifest().codes`.
- Keep existing manual metadata only as UI fallback, such as category, accent color, icon, or localized title overrides.
- If a code is unknown to the UI metadata map, it should still render with a generic legal book card.
- Search and category filters should run after the remote catalog is derived.
- Do not change the package JSON format or installed registry format unless needed.

## Verification

- Books page renders from the manifest after `refreshPackageManifest()`.
- A legal code that exists only in the manifest can still appear in Books.
- Installed TH/EN badges still reflect local installed state.
- Download modal still lists languages from the manifest.
- Offline fallback still shows cached or bundled manifest data.
