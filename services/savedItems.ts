import AsyncStorage from "@react-native-async-storage/async-storage";

import { getManifestCode } from "@/services/legalContent";
import {
  getLegalSectionLocationKey,
  LegalCitationTarget,
  LegalSectionLocation,
  normalizeLegalCitationTarget,
} from "@/services/legalLocations";

export type SavedItemType = "section";

export type SavedSectionTarget = LegalSectionLocation & {
  sectionNo: string;
};

export type SavedItem = {
  id: string;
  type: SavedItemType;
  target: SavedSectionTarget;
  source?: {
    authoritative?: boolean;
    reviewStatus?: string | null;
    sourceType?: string | null;
    translationStatus?: string | null;
  };
  display: {
    title: string;
    excerpt?: string;
    codeTitle: string;
    structurePath?: string;
  };
  organization: {
    folderId?: string;
    tags: string[];
    isPinned: boolean;
    archivedAt?: string;
  };
  sync: {
    dirty: boolean;
    deletedAt?: string;
    remoteId?: string;
    lastSyncedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type SavedSectionItem = SavedItem & {
  type: "section";
  target: SavedSectionTarget;
};

export type SaveSectionInput = LegalCitationTarget & {
  sectionNo: string;
  title: string;
  excerpt?: string;
  codeTitle?: string;
  structurePath?: string;
  authoritative?: boolean;
  reviewStatus?: string | null;
  sourceType?: string | null;
  translationStatus?: string | null;
};

export type SavedItemOrganizationPatch = {
  folderId?: string;
  tags?: string[];
  isPinned?: boolean;
};

type SavedItemsStorage = {
  schemaVersion: 2;
  items: SavedItem[];
  updatedAt: string;
};

type LegacySavedSectionRecord = {
  codeId?: unknown;
  language?: unknown;
  sectionId?: unknown;
  sectionNo?: unknown;
  title?: unknown;
  excerpt?: unknown;
  codeTitle?: unknown;
  structurePath?: unknown;
  savedAt?: unknown;
};

const SAVED_ITEMS_KEY = "lawquest.savedItems.v2";
const LEGACY_SAVED_SECTIONS_KEY = "lawquest.savedSections.v1";
const SAVED_ITEMS_SCHEMA_VERSION = 2;
const MAX_EXCERPT_LENGTH = 360;

export function getSavedSectionKey(section: {
  codeId: string;
  language?: string;
  versionId?: string;
  sectionId: string;
}) {
  return getLegalSectionLocationKey(section);
}

export async function readSavedItems(): Promise<SavedItem[]> {
  const storage = await readSavedItemsStorage();
  return storage.items.sort(sortSavedItems);
}

export async function readSavedSectionItems(): Promise<SavedSectionItem[]> {
  const items = await readSavedItems();

  return items.filter(
    (item): item is SavedSectionItem =>
      item.type === "section" &&
      !item.sync.deletedAt &&
      !item.organization.archivedAt,
  );
}

export async function readSavedSectionKeys() {
  const savedSections = await readSavedSectionItems();
  return new Set(
    savedSections.map((item) => getSavedSectionKey(item.target)),
  );
}

export async function isSectionSaved(section: {
  codeId: string;
  language: string;
  versionId?: string;
  sectionId: string;
}) {
  const savedKeys = await readSavedSectionKeys();
  return savedKeys.has(getSavedSectionKey(section));
}

export async function saveSectionItem(
  section: SaveSectionInput,
): Promise<SavedSectionItem[]> {
  const storage = await readSavedItemsStorage();
  const now = new Date().toISOString();
  const sectionKey = getSavedSectionKey(section);
  const existingItem = storage.items.find(
    (item) => item.type === "section" && getSavedSectionKey(item.target) === sectionKey,
  );
  const nextItem: SavedSectionItem = {
    id: existingItem?.id ?? `section:${sectionKey}`,
    type: "section",
    target: {
      codeId: section.codeId,
      language: section.language,
      ...(section.versionId ? { versionId: section.versionId } : {}),
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
    },
    source: {
      ...(section.authoritative !== undefined
        ? { authoritative: section.authoritative }
        : existingItem?.source?.authoritative !== undefined
          ? { authoritative: existingItem.source.authoritative }
          : {}),
      reviewStatus:
        section.reviewStatus ?? existingItem?.source?.reviewStatus ?? null,
      sourceType: section.sourceType ?? existingItem?.source?.sourceType ?? null,
      translationStatus:
        section.translationStatus ??
        existingItem?.source?.translationStatus ??
        null,
    },
    display: {
      title: section.title,
      ...(section.excerpt ? { excerpt: normalizeExcerpt(section.excerpt) } : {}),
      codeTitle:
        section.codeTitle ??
        getManifestCode(section.codeId)?.title ??
        section.codeId,
      ...(section.structurePath ? { structurePath: section.structurePath } : {}),
    },
    organization: {
      folderId: existingItem?.organization.folderId,
      tags: existingItem?.organization.tags ?? [],
      isPinned: existingItem?.organization.isPinned ?? false,
    },
    sync: {
      remoteId: existingItem?.sync.remoteId,
      lastSyncedAt: existingItem?.sync.lastSyncedAt,
      dirty: true,
    },
    createdAt: existingItem?.createdAt ?? now,
    updatedAt: now,
  };
  const nextItems = [
    nextItem,
    ...storage.items.filter((item) => item.id !== nextItem.id),
  ];

  await writeSavedItems(nextItems);
  return readSavedSectionItemsFromItems(nextItems);
}

export async function removeSavedSection(section: {
  codeId: string;
  language: string;
  versionId?: string;
  sectionId: string;
}): Promise<SavedSectionItem[]> {
  const storage = await readSavedItemsStorage();
  const now = new Date().toISOString();
  const removeKey = getSavedSectionKey(section);
  const nextItems = storage.items.map((item) => {
    if (item.type !== "section" || getSavedSectionKey(item.target) !== removeKey) {
      return item;
    }

    return {
      ...item,
      sync: {
        ...item.sync,
        dirty: true,
        deletedAt: now,
      },
      updatedAt: now,
    };
  });

  await writeSavedItems(nextItems);
  return readSavedSectionItemsFromItems(nextItems);
}

export async function toggleSavedSection(section: SaveSectionInput) {
  if (await isSectionSaved(section)) {
    return {
      saved: false,
      items: await removeSavedSection(section),
    };
  }

  return {
    saved: true,
    items: await saveSectionItem(section),
  };
}

export async function updateSavedItemOrganization(
  itemId: string,
  patch: SavedItemOrganizationPatch,
): Promise<SavedSectionItem[]> {
  const storage = await readSavedItemsStorage();
  const now = new Date().toISOString();
  const nextItems = storage.items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return cleanSavedItem({
      ...item,
      organization: {
        ...item.organization,
        ...(patch.folderId !== undefined
          ? { folderId: patch.folderId.trim() || undefined }
          : {}),
        ...(patch.tags !== undefined
          ? { tags: normalizeTags(patch.tags) }
          : {}),
        ...(patch.isPinned !== undefined ? { isPinned: patch.isPinned } : {}),
      },
      sync: {
        ...item.sync,
        dirty: true,
      },
      updatedAt: now,
    });
  });

  await writeSavedItems(nextItems);
  return readSavedSectionItemsFromItems(nextItems);
}

async function readSavedItemsStorage(): Promise<SavedItemsStorage> {
  const rawValue = await AsyncStorage.getItem(SAVED_ITEMS_KEY);

  if (rawValue) {
    const parsed = JSON.parse(rawValue) as unknown;
    const storage = normalizeSavedItemsStorage(parsed);

    if (storage) {
      return storage;
    }
  }

  const migratedStorage = await migrateLegacySavedSections();
  await writeSavedItems(migratedStorage.items);
  return migratedStorage;
}

async function migrateLegacySavedSections(): Promise<SavedItemsStorage> {
  const rawValue = await AsyncStorage.getItem(LEGACY_SAVED_SECTIONS_KEY);

  if (!rawValue) {
    return createStorage([]);
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsed)) {
    return createStorage([]);
  }

  return createStorage(
    parsed
      .map(normalizeLegacySavedSection)
      .filter((item): item is SavedSectionItem => item !== null),
  );
}

async function writeSavedItems(items: SavedItem[]) {
  const storage = createStorage(items.map(cleanSavedItem).sort(sortSavedItems));

  await AsyncStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(storage));
}

function createStorage(items: SavedItem[]): SavedItemsStorage {
  return {
    schemaVersion: SAVED_ITEMS_SCHEMA_VERSION,
    items,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSavedItemsStorage(value: unknown): SavedItemsStorage | null {
  if (!isRecord(value) || value.schemaVersion !== SAVED_ITEMS_SCHEMA_VERSION) {
    return null;
  }

  if (!Array.isArray(value.items)) {
    return createStorage([]);
  }

  return createStorage(
    value.items
      .map(normalizeSavedItem)
      .filter((item): item is SavedItem => item !== null),
  );
}

function normalizeSavedItem(value: unknown): SavedItem | null {
  if (!isRecord(value) || value.type !== "section") {
    return null;
  }

  const target = normalizeSectionTarget(value.target);
  const display = normalizeDisplay(value.display, target?.codeId);
  const source = normalizeSource(value.source);

  if (!target || !display) {
    return null;
  }

  const organization = isRecord(value.organization)
    ? value.organization
    : {};
  const sync = isRecord(value.sync) ? value.sync : {};
  const fallbackId = `section:${getSavedSectionKey(target)}`;

  return cleanSavedItem({
    id: toStringValue(value.id) || fallbackId,
    type: "section",
    target,
    ...(source ? { source } : {}),
    display,
    organization: {
      folderId: toStringValue(organization.folderId) || undefined,
      tags: Array.isArray(organization.tags)
        ? organization.tags.map(toStringValue).filter(Boolean)
        : [],
      isPinned: organization.isPinned === true,
      archivedAt: toStringValue(organization.archivedAt) || undefined,
    },
    sync: {
      dirty: sync.dirty === true,
      deletedAt: toStringValue(sync.deletedAt) || undefined,
      remoteId: toStringValue(sync.remoteId) || undefined,
      lastSyncedAt: toStringValue(sync.lastSyncedAt) || undefined,
    },
    createdAt: toStringValue(value.createdAt) || new Date(0).toISOString(),
    updatedAt: toStringValue(value.updatedAt) || new Date(0).toISOString(),
  });
}

function normalizeLegacySavedSection(
  value: LegacySavedSectionRecord,
): SavedSectionItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const codeId = toStringValue(value.codeId);
  const language = toStringValue(value.language);
  const sectionId = toStringValue(value.sectionId);
  const sectionNo = toStringValue(value.sectionNo);
  const title = toStringValue(value.title);

  if (!codeId || !language || !sectionId || !sectionNo || !title) {
    return null;
  }

  const savedAt = toStringValue(value.savedAt) || new Date(0).toISOString();
  const target = {
    codeId,
    language,
    sectionId,
    sectionNo,
  };

  return cleanSavedItem({
    id: `section:${getSavedSectionKey(target)}`,
    type: "section",
    target,
    source:
      language === "en"
        ? {
            authoritative: false,
            reviewStatus: "needs_legal_review",
          }
        : undefined,
    display: {
      title,
      excerpt: normalizeExcerpt(toStringValue(value.excerpt)) || undefined,
      codeTitle: toStringValue(value.codeTitle) || getManifestCode(codeId)?.title || codeId,
      structurePath: toStringValue(value.structurePath) || undefined,
    },
    organization: {
      tags: [],
      isPinned: false,
    },
    sync: {
      dirty: false,
    },
    createdAt: savedAt,
    updatedAt: savedAt,
  });
}

function normalizeSource(value: unknown): SavedItem["source"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const source = {
    authoritative:
      typeof value.authoritative === "boolean"
        ? value.authoritative
        : undefined,
    reviewStatus: toNullableString(value.reviewStatus),
    sourceType: toNullableString(value.sourceType),
    translationStatus: toNullableString(value.translationStatus),
  };

  if (
    source.authoritative === undefined &&
    source.reviewStatus === null &&
    source.sourceType === null &&
    source.translationStatus === null
  ) {
    return undefined;
  }

  return source;
}

function normalizeSectionTarget(value: unknown): SavedSectionTarget | null {
  const target = normalizeLegalCitationTarget(value);
  const sectionNo = isRecord(value) ? toStringValue(value.sectionNo) : "";

  if (!target || !sectionNo) {
    return null;
  }

  return {
    codeId: target.codeId,
    language: target.language,
    versionId: target.versionId,
    sectionId: target.sectionId,
    sectionNo,
  };
}

function normalizeDisplay(
  value: unknown,
  codeId: string | undefined,
): SavedItem["display"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toStringValue(value.title);

  if (!title) {
    return null;
  }

  return {
    title,
    excerpt: normalizeExcerpt(toStringValue(value.excerpt)) || undefined,
    codeTitle:
      toStringValue(value.codeTitle) ||
      (codeId ? getManifestCode(codeId)?.title : "") ||
      codeId ||
      "Legal Code",
    structurePath: toStringValue(value.structurePath) || undefined,
  };
}

function cleanSavedItem<T extends SavedItem>(item: T): T {
  return {
    ...item,
    ...(item.source
      ? {
          source: {
            ...(item.source.authoritative !== undefined
              ? { authoritative: item.source.authoritative }
              : {}),
            ...(item.source.reviewStatus
              ? { reviewStatus: item.source.reviewStatus }
              : {}),
            ...(item.source.sourceType ? { sourceType: item.source.sourceType } : {}),
            ...(item.source.translationStatus
              ? { translationStatus: item.source.translationStatus }
              : {}),
          },
        }
      : {}),
    display: {
      title: item.display.title,
      ...(item.display.excerpt
        ? { excerpt: normalizeExcerpt(item.display.excerpt) }
        : {}),
      codeTitle: item.display.codeTitle,
      ...(item.display.structurePath
        ? { structurePath: item.display.structurePath }
        : {}),
    },
    organization: {
      ...(item.organization.folderId
        ? { folderId: item.organization.folderId }
        : {}),
      tags: item.organization.tags,
      isPinned: item.organization.isPinned,
      ...(item.organization.archivedAt
        ? { archivedAt: item.organization.archivedAt }
        : {}),
    },
    sync: {
      dirty: item.sync.dirty,
      ...(item.sync.deletedAt ? { deletedAt: item.sync.deletedAt } : {}),
      ...(item.sync.remoteId ? { remoteId: item.sync.remoteId } : {}),
      ...(item.sync.lastSyncedAt
        ? { lastSyncedAt: item.sync.lastSyncedAt }
        : {}),
    },
  };
}

function readSavedSectionItemsFromItems(items: SavedItem[]) {
  return items
    .filter(
      (item): item is SavedSectionItem =>
        item.type === "section" &&
        !item.sync.deletedAt &&
        !item.organization.archivedAt,
    )
    .sort(sortSavedItems);
}

function sortSavedItems(left: SavedItem, right: SavedItem) {
  if (left.organization.isPinned !== right.organization.isPinned) {
    return left.organization.isPinned ? -1 : 1;
  }

  const leftTime = Date.parse(left.updatedAt) || 0;
  const rightTime = Date.parse(right.updatedAt) || 0;

  return rightTime - leftTime;
}

function normalizeExcerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_EXCERPT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_EXCERPT_LENGTH).trim()}...`;
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown) {
  const text = toStringValue(value);
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
