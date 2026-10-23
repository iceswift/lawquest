import AsyncStorage from "@react-native-async-storage/async-storage";

import { getManifestCode } from "@/services/legalContent";
import {
  getLegalSectionLocationKey,
  LegalCitationTarget,
} from "@/services/legalLocations";

export type RecentlyViewedSectionRecord = LegalCitationTarget & {
  sectionNo: string;
  title: string;
  excerpt: string;
  codeTitle: string;
  viewedAt: string;
  structurePath?: string;
};

const RECENTLY_VIEWED_SECTIONS_KEY = "lawquest.recentlyViewedSections.v1";
const MAX_RECENTLY_VIEWED_SECTIONS = 20;

export async function readRecentlyViewedSections(
  limit = MAX_RECENTLY_VIEWED_SECTIONS,
): Promise<RecentlyViewedSectionRecord[]> {
  const rawValue = await AsyncStorage.getItem(RECENTLY_VIEWED_SECTIONS_KEY);

  if (!rawValue) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(isRecentlyViewedSectionRecord)
    .sort((left, right) => {
      const leftTime = Date.parse(left.viewedAt) || 0;
      const rightTime = Date.parse(right.viewedAt) || 0;

      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export async function recordRecentlyViewedSection(
  section: Omit<RecentlyViewedSectionRecord, "codeTitle" | "viewedAt"> &
    Partial<Pick<RecentlyViewedSectionRecord, "codeTitle" | "viewedAt">>,
) {
  const currentSections = await readRecentlyViewedSections();
  const viewedAt = section.viewedAt ?? new Date().toISOString();
  const codeTitle =
    section.codeTitle ?? getManifestCode(section.codeId)?.title ?? section.codeId;
  const nextSection: RecentlyViewedSectionRecord = {
    ...section,
    codeTitle,
    viewedAt,
  };
  const nextSections = [
    nextSection,
    ...currentSections.filter(
      (item) =>
        getLegalSectionLocationKey(item) !==
        getLegalSectionLocationKey(section),
    ),
  ].slice(0, MAX_RECENTLY_VIEWED_SECTIONS);

  await AsyncStorage.setItem(
    RECENTLY_VIEWED_SECTIONS_KEY,
    JSON.stringify(nextSections),
  );
}

function isRecentlyViewedSectionRecord(
  value: unknown,
): value is RecentlyViewedSectionRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.codeId === "string" &&
    (value.language === undefined || typeof value.language === "string") &&
    (value.versionId === undefined || typeof value.versionId === "string") &&
    typeof value.sectionId === "string" &&
    typeof value.sectionNo === "string" &&
    typeof value.title === "string" &&
    typeof value.excerpt === "string" &&
    typeof value.codeTitle === "string" &&
    typeof value.viewedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
