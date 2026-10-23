import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getLegalTextRangeLocationKey,
  LegalParagraphLocation,
  LegalSectionLocation,
  LegalTextRangeLocation,
  normalizeLegalSectionLocation,
  normalizeLegalTextRangeLocation,
} from "@/services/legalLocations";

export type HighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple";

export type HighlightTarget = LegalTextRangeLocation & {
  sectionNo?: string;
  title?: string;
  codeTitle?: string;
  structurePath?: string;
};

export type LegalHighlightRecord = {
  id: string;
  target: HighlightTarget;
  selectedText: string;
  color: HighlightColor;
  noteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveHighlightInput = LegalTextRangeLocation & {
  selectedText: string;
  color?: HighlightColor;
  noteId?: string;
  sectionNo?: string;
  title?: string;
  codeTitle?: string;
  structurePath?: string;
};

type HighlightsStorage = {
  schemaVersion: 1;
  highlights: LegalHighlightRecord[];
  updatedAt: string;
};

const HIGHLIGHTS_KEY = "lawquest.highlights.v1";
const HIGHLIGHTS_SCHEMA_VERSION = 1;
const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";
const SECTION_TEXT_PARAGRAPH_SUFFIX = "__section_text";
const HIGHLIGHT_COLORS = new Set<HighlightColor>([
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
]);

export function getHighlightKey(location: LegalTextRangeLocation) {
  return getLegalTextRangeLocationKey(location);
}

export function getSectionTextHighlightParagraphId(sectionId: string) {
  return `${sectionId}:${SECTION_TEXT_PARAGRAPH_SUFFIX}`;
}

export async function readHighlights(): Promise<LegalHighlightRecord[]> {
  const storage = await readHighlightsStorage();

  return storage.highlights.sort(sortHighlights);
}

export async function readHighlightsForSection(
  section: LegalSectionLocation,
): Promise<LegalHighlightRecord[]> {
  const normalizedSection = normalizeLegalSectionLocation(section);

  if (!normalizedSection) {
    return [];
  }

  return (await readHighlights()).filter((highlight) =>
    isHighlightInSection(highlight, normalizedSection),
  );
}

export async function readHighlightsForParagraph(
  paragraph: LegalParagraphLocation,
): Promise<LegalHighlightRecord[]> {
  const normalizedSection = normalizeLegalSectionLocation(paragraph);

  if (!normalizedSection || !paragraph.paragraphId) {
    return [];
  }

  return (await readHighlights()).filter(
    (highlight) =>
      isHighlightInSection(highlight, normalizedSection) &&
      highlight.target.paragraphId === paragraph.paragraphId,
  );
}

export async function saveHighlight(
  input: SaveHighlightInput,
): Promise<LegalHighlightRecord[]> {
  const storage = await readHighlightsStorage();
  const now = new Date().toISOString();
  const target = normalizeHighlightTarget(input);

  if (!target) {
    return storage.highlights;
  }

  const selectedText = normalizeSelectedText(input.selectedText);

  if (!selectedText) {
    return storage.highlights;
  }

  const highlightKey = getHighlightKey(target);
  const existingHighlight = storage.highlights.find(
    (highlight) => getHighlightKey(highlight.target) === highlightKey,
  );
  const nextHighlight: LegalHighlightRecord = {
    id: existingHighlight?.id ?? `highlight:${highlightKey}`,
    target,
    selectedText,
    color:
      normalizeColor(input.color) ??
      existingHighlight?.color ??
      DEFAULT_HIGHLIGHT_COLOR,
    ...(input.noteId
      ? { noteId: input.noteId.trim() }
      : existingHighlight?.noteId
        ? { noteId: existingHighlight.noteId }
        : {}),
    createdAt: existingHighlight?.createdAt ?? now,
    updatedAt: now,
  };
  const nextHighlights = [
    nextHighlight,
    ...storage.highlights.filter((highlight) => highlight.id !== nextHighlight.id),
  ];

  await writeHighlights(nextHighlights);
  return nextHighlights.sort(sortHighlights);
}

export async function removeHighlight(
  highlightId: string,
): Promise<LegalHighlightRecord[]> {
  const nextHighlights = (await readHighlights()).filter(
    (highlight) => highlight.id !== highlightId,
  );

  await writeHighlights(nextHighlights);
  return nextHighlights;
}

export async function removeHighlightsForSection(
  section: LegalSectionLocation,
): Promise<LegalHighlightRecord[]> {
  const normalizedSection = normalizeLegalSectionLocation(section);

  if (!normalizedSection) {
    return readHighlights();
  }

  const nextHighlights = (await readHighlights()).filter(
    (highlight) => !isHighlightInSection(highlight, normalizedSection),
  );

  await writeHighlights(nextHighlights);
  return nextHighlights;
}

export async function clearHighlights() {
  await AsyncStorage.removeItem(HIGHLIGHTS_KEY);
}

async function readHighlightsStorage(): Promise<HighlightsStorage> {
  const rawValue = await AsyncStorage.getItem(HIGHLIGHTS_KEY);

  if (!rawValue) {
    return createStorage([]);
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const storage = normalizeHighlightsStorage(parsed);

    if (storage) {
      await writeHighlights(storage.highlights);
      return storage;
    }
  } catch {
    await AsyncStorage.removeItem(HIGHLIGHTS_KEY);
  }

  return createStorage([]);
}

async function writeHighlights(highlights: LegalHighlightRecord[]) {
  const storage = createStorage(
    highlights
      .map(normalizeHighlight)
      .filter((highlight): highlight is LegalHighlightRecord => highlight !== null)
      .sort(sortHighlights),
  );

  await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(storage));
}

function createStorage(highlights: LegalHighlightRecord[]): HighlightsStorage {
  return {
    schemaVersion: HIGHLIGHTS_SCHEMA_VERSION,
    highlights,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeHighlightsStorage(value: unknown): HighlightsStorage | null {
  if (!isRecord(value) || value.schemaVersion !== HIGHLIGHTS_SCHEMA_VERSION) {
    return null;
  }

  if (!Array.isArray(value.highlights)) {
    return createStorage([]);
  }

  return createStorage(
    value.highlights
      .map(normalizeHighlight)
      .filter((highlight): highlight is LegalHighlightRecord => highlight !== null),
  );
}

function normalizeHighlight(value: unknown): LegalHighlightRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const target = normalizeHighlightTarget(value.target ?? value);
  const selectedText = normalizeSelectedText(value.selectedText);

  if (!target || !selectedText) {
    return null;
  }

  const fallbackId = `highlight:${getHighlightKey(target)}`;

  return {
    id: toStringValue(value.id) || fallbackId,
    target,
    selectedText,
    color: normalizeColor(value.color) ?? DEFAULT_HIGHLIGHT_COLOR,
    ...(toStringValue(value.noteId) ? { noteId: toStringValue(value.noteId) } : {}),
    createdAt: toStringValue(value.createdAt) || new Date(0).toISOString(),
    updatedAt: toStringValue(value.updatedAt) || new Date(0).toISOString(),
  };
}

function normalizeHighlightTarget(value: unknown): HighlightTarget | null {
  const location = normalizeLegalTextRangeLocation(value);

  if (!location || !isRecord(value)) {
    return null;
  }

  return {
    ...location,
    ...(toStringValue(value.sectionNo) ? { sectionNo: toStringValue(value.sectionNo) } : {}),
    ...(toStringValue(value.title) ? { title: toStringValue(value.title) } : {}),
    ...(toStringValue(value.codeTitle) ? { codeTitle: toStringValue(value.codeTitle) } : {}),
    ...(toStringValue(value.structurePath)
      ? { structurePath: toStringValue(value.structurePath) }
      : {}),
  };
}

function normalizeSelectedText(value: unknown) {
  return toStringValue(value).replace(/\s+/g, " ").trim();
}

function normalizeColor(value: unknown): HighlightColor | null {
  const color = toStringValue(value) as HighlightColor;

  return HIGHLIGHT_COLORS.has(color) ? color : null;
}

function isHighlightInSection(
  highlight: LegalHighlightRecord,
  section: LegalSectionLocation,
) {
  if (
    highlight.target.codeId !== section.codeId ||
    highlight.target.language !== section.language ||
    highlight.target.sectionId !== section.sectionId
  ) {
    return false;
  }

  if (section.versionId) {
    return highlight.target.versionId === section.versionId;
  }

  return true;
}

function sortHighlights(
  left: LegalHighlightRecord,
  right: LegalHighlightRecord,
) {
  const leftTime = Date.parse(left.updatedAt) || 0;
  const rightTime = Date.parse(right.updatedAt) || 0;

  return rightTime - leftTime;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
