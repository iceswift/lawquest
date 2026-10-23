export type LegalCodeLocation = {
  codeId: string;
  language?: string;
};

export type LegalContentQuery = LegalCodeLocation & {
  versionId?: string;
};

export type LegalVersionLocation = LegalCodeLocation & {
  versionId?: string;
};

export type LegalSectionLocation = Omit<LegalVersionLocation, "language"> & {
  language: string;
  sectionId: string;
};

export type LegalParagraphLocation = LegalSectionLocation & {
  paragraphId: string;
};

export type LegalTextRangeLocation = LegalParagraphLocation & {
  startOffset: number;
  endOffset: number;
};

export type LegalChunkLocation = LegalVersionLocation & {
  chunkId: string;
};

export type LegalLocation =
  | LegalCodeLocation
  | LegalVersionLocation
  | LegalSectionLocation
  | LegalParagraphLocation
  | LegalTextRangeLocation
  | LegalChunkLocation;

export type LegalCitationTarget = LegalSectionLocation & {
  sectionNo?: string;
  title?: string;
  codeTitle?: string;
  structurePath?: string;
};

const DEFAULT_LANGUAGE = "th";
const KEY_PART_SEPARATOR = ":";

export function getLegalSectionLocationKey(
  location: {
    codeId: string;
    language?: string;
    versionId?: string;
    sectionId: string;
  },
) {
  if (location.versionId) {
    return getLegalVersionedSectionLocationKey({
      codeId: location.codeId,
      language: normalizeLanguage(location.language),
      versionId: location.versionId,
      sectionId: location.sectionId,
    });
  }

  return [
    normalizeLocationPart(location.codeId),
    normalizeLanguage(location.language),
    normalizeLocationPart(location.sectionId),
  ].join(KEY_PART_SEPARATOR);
}

export function getLegalVersionedSectionLocationKey(
  location: LegalSectionLocation,
) {
  return [
    normalizeLocationPart(location.codeId),
    normalizeLanguage(location.language),
    normalizeLocationPart(location.versionId),
    normalizeLocationPart(location.sectionId),
  ].join(KEY_PART_SEPARATOR);
}

export function getLegalTextRangeLocationKey(
  location: LegalTextRangeLocation,
) {
  const baseParts = [
    normalizeLocationPart(location.codeId),
    normalizeLanguage(location.language),
  ];
  const versionPart = normalizeLocationPart(location.versionId);

  return [
    ...baseParts,
    ...(versionPart ? [versionPart] : []),
    normalizeLocationPart(location.sectionId),
    normalizeLocationPart(location.paragraphId),
    String(location.startOffset),
    String(location.endOffset),
  ].join(KEY_PART_SEPARATOR);
}

export function normalizeLegalSectionLocation(
  value: unknown,
): LegalSectionLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const codeId = toStringValue(value.codeId);
  const sectionId = toStringValue(value.sectionId);

  if (!codeId || !sectionId) {
    return null;
  }

  return {
    codeId,
    language: normalizeLanguage(toStringValue(value.language)),
    versionId: toStringValue(value.versionId) || undefined,
    sectionId,
  };
}

export function normalizeLegalTextRangeLocation(
  value: unknown,
): LegalTextRangeLocation | null {
  const sectionLocation = normalizeLegalSectionLocation(value);

  if (!sectionLocation || !isRecord(value)) {
    return null;
  }

  const paragraphId = toStringValue(value.paragraphId);
  const startOffset = toNumberValue(value.startOffset);
  const endOffset = toNumberValue(value.endOffset);

  if (!paragraphId || startOffset < 0 || endOffset <= startOffset) {
    return null;
  }

  return {
    ...sectionLocation,
    paragraphId,
    startOffset,
    endOffset,
  };
}

export function normalizeLegalCitationTarget(
  value: unknown,
): LegalCitationTarget | null {
  const location = normalizeLegalSectionLocation(value);

  if (!location || !isRecord(value)) {
    return null;
  }

  return {
    ...location,
    sectionNo: toStringValue(value.sectionNo) || undefined,
    title: toStringValue(value.title) || undefined,
    codeTitle: toStringValue(value.codeTitle) || undefined,
    structurePath: toStringValue(value.structurePath) || undefined,
  };
}

export function normalizeLanguage(language: string | undefined) {
  return language?.trim() || DEFAULT_LANGUAGE;
}

function normalizeLocationPart(value: string | undefined) {
  return (value ?? "").trim();
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? Math.floor(parsedValue) : -1;
  }

  return -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
