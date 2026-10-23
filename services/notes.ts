import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getLegalSectionLocationKey,
  LegalCitationTarget,
  normalizeLegalCitationTarget,
} from "@/services/legalLocations";

export type LinkedSectionRef = Partial<LegalCitationTarget> & {
  sectionId: string;
  sectionNo?: string;
};

export type SectionNoteQuery =
  | string
  | (Partial<LegalCitationTarget> & {
      sectionId: string;
    });

export type NoteBlock =
  | {
      id: string;
      type: "paragraph";
      data: {
        text: string;
      };
    }
  | {
      id: string;
      type: "linkedSection";
      data: LinkedSectionRef;
    };

export type LawQuestNoteRecord = {
  id: string;
  title: string;
  body: string;
  blocks: NoteBlock[];
  folder: string;
  linkedSectionIds: string[];
  linkedSections: LinkedSectionRef[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type NotesStorage = {
  schemaVersion: 3;
  notes: LawQuestNoteRecord[];
  updatedAt: string;
};

type CanvasCard = {
  id: string;
  article?: string;
  law?: string;
  quote?: string;
  issue?: string;
  rule?: string;
  analysis?: string;
  conclusion?: string;
  tags?: string[];
  isPinned?: boolean;
  updatedAt?: string;
};

type LegacyNote = {
  id: string;
  title?: string;
  content?: string;
  category?: string;
  isPinned?: boolean;
};

const NOTES_STORAGE_KEY = "@lawquest_notes_v2";
const NOTES_SCHEMA_VERSION = 3;
const CANVAS_STORAGE_KEY = "@lawquest_canvas_cards";
const LEGACY_NOTES_KEY = "@lawquest_notes";
export const DEFAULT_FOLDER = "Notes";

export async function readNotes(): Promise<LawQuestNoteRecord[]> {
  const savedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);

  if (savedNotes) {
    const parsedNotes = parseStoredNotes(savedNotes);
    await writeNotes(parsedNotes);
    return parsedNotes.sort(sortNotes);
  }

  const migratedNotes = await readMigratedNotes();

  if (migratedNotes.length > 0) {
    await writeNotes(migratedNotes);
  }

  return migratedNotes.sort(sortNotes);
}

export async function saveNotes(
  notes: LawQuestNoteRecord[],
): Promise<LawQuestNoteRecord[]> {
  const normalizedNotes = notes.map(normalizeNote);
  await writeNotes(normalizedNotes);
  return normalizedNotes;
}

export async function readNotesForSection(section: SectionNoteQuery) {
  const notes = await readNotes();

  return notes.filter((note) => noteHasSection(note, section));
}

export async function readNoteCountForSection(section: SectionNoteQuery) {
  return (await readNotesForSection(section)).length;
}

export function createEmptyNote(): LawQuestNoteRecord {
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}`,
    title: "",
    body: "",
    blocks: [],
    folder: DEFAULT_FOLDER,
    linkedSectionIds: [],
    linkedSections: [],
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlocksFromBody(
  body: string,
  linkedSections: LinkedSectionRef[],
): NoteBlock[] {
  const now = Date.now();
  const blocks: NoteBlock[] = body.trim()
    ? [
        {
          id: `paragraph-${now}`,
          type: "paragraph",
          data: {
            text: body,
          },
        },
      ]
    : [];

  linkedSections.forEach((section, index) => {
    blocks.push({
      id: `linked-section-${now}-${index}`,
      type: "linkedSection",
      data: section,
    });
  });

  return blocks;
}

export function normalizeNote(value: unknown): LawQuestNoteRecord {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();
  const id = toStringValue(source.id) || `${Date.now()}`;
  const body = toStringValue(source.body);
  const linkedSectionIds = Array.isArray(source.linkedSectionIds)
    ? source.linkedSectionIds.map(toStringValue).filter(Boolean)
    : [];
  const linkedSections = normalizeLinkedSections(
    Array.isArray(source.linkedSections) ? source.linkedSections : [],
    linkedSectionIds,
  );
  const blocks = Array.isArray(source.blocks)
    ? normalizeBlocks(source.blocks, linkedSections)
    : createBlocksFromBody(body, linkedSections);

  return {
    id,
    title: toStringValue(source.title) || "Untitled Note",
    body,
    blocks,
    folder: toStringValue(source.folder) || DEFAULT_FOLDER,
    linkedSectionIds: linkedSections.map((section) => section.sectionId),
    linkedSections,
    isPinned: source.isPinned === true,
    createdAt: toStringValue(source.createdAt) || now,
    updatedAt: toStringValue(source.updatedAt) || now,
  };
}

export function normalizeLinkedSections(
  linkedSections: unknown[] = [],
  linkedSectionIds: string[] = [],
) {
  const sectionsById = new Map<string, LinkedSectionRef>();

  linkedSectionIds.forEach((sectionId) => {
    sectionsById.set(sectionId, {
      codeId: "",
      language: "th",
      sectionId,
    });
  });

  linkedSections.forEach((value) => {
    const section = normalizeLinkedSectionRef(value);

    if (!section) {
      return;
    }

    const sectionKey = getLinkedSectionKey(section);
    const legacySection = sectionsById.get(section.sectionId);
    const previousSection = sectionsById.get(sectionKey) ?? legacySection;

    if (section.codeId && legacySection) {
      sectionsById.delete(section.sectionId);
    }

    sectionsById.set(
      sectionKey,
      mergeLinkedSectionRef(previousSection, section),
    );
  });

  return Array.from(sectionsById.values());
}

export function normalizeCodeFolder(codeId: string) {
  const names: Record<string, string> = {
    "thai-civil-commercial-code": "Civil and Commercial Code",
    "thai-civil-procedure-code": "Civil Procedure Code",
    "thai-criminal-code": "Criminal Code",
    "thai-criminal-procedure-code": "Criminal Procedure Code",
    "thai-land-code": "Land Code",
    "thai-military-criminal-code": "Military Criminal Code",
    "thai-narcotics-code": "Narcotics Code",
    "thai-revenue-code": "Revenue Code",
  };

  return names[codeId] ?? codeId;
}

export function formatLinkedSection(section: LinkedSectionRef) {
  const prefix =
    section.language === "th" ? "\u0E21\u0E32\u0E15\u0E23\u0E32" : "Section";
  const sectionLabel = section.sectionNo
    ? `${prefix} ${section.sectionNo}`
    : section.sectionId;

  return section.title ? `${sectionLabel} - ${section.title}` : sectionLabel;
}

export function getLinkedSectionSearchText(section: LinkedSectionRef) {
  return [
    section.sectionId,
    section.codeId,
    section.language,
    section.versionId,
    section.sectionNo,
    section.title,
    section.codeId ? normalizeCodeFolder(section.codeId) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function getNoteExcerpt(note: LawQuestNoteRecord, maxLength = 160) {
  const normalized = note.body.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function parseStoredNotes(rawValue: string): LawQuestNoteRecord[] {
  const parsed = JSON.parse(rawValue) as unknown[] | Partial<NotesStorage>;
  const rawNotes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.notes)
      ? parsed.notes
      : [];

  return rawNotes.map(normalizeNote);
}

async function readMigratedNotes() {
  const savedCanvas = await AsyncStorage.getItem(CANVAS_STORAGE_KEY);
  if (savedCanvas) {
    return (JSON.parse(savedCanvas) as CanvasCard[]).map(migrateCanvasCard);
  }

  const legacyNotes = await AsyncStorage.getItem(LEGACY_NOTES_KEY);
  if (legacyNotes) {
    return (JSON.parse(legacyNotes) as LegacyNote[]).map(migrateLegacyNote);
  }

  return [];
}

async function writeNotes(notes: LawQuestNoteRecord[]) {
  const payload: NotesStorage = {
    schemaVersion: NOTES_SCHEMA_VERSION,
    notes: notes.map(normalizeNote),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload));
}

function migrateCanvasCard(card: CanvasCard): LawQuestNoteRecord {
  const bodyParts = [
    card.analysis,
    card.quote && `Quote:\n${card.quote}`,
    card.issue && `Issue:\n${card.issue}`,
    card.rule && `Rule:\n${card.rule}`,
    card.conclusion && `Conclusion:\n${card.conclusion}`,
    card.tags?.length ? `Tags: ${card.tags.join(", ")}` : "",
  ].filter(Boolean);
  const body = bodyParts.join("\n\n");
  const updatedAt = card.updatedAt ?? new Date().toISOString();

  return {
    id: card.id || `${Date.now()}`,
    title: card.article?.trim() || "Untitled Note",
    body,
    blocks: createBlocksFromBody(body, []),
    folder: card.law?.trim() || DEFAULT_FOLDER,
    linkedSectionIds: [],
    linkedSections: [],
    isPinned: Boolean(card.isPinned),
    createdAt: updatedAt,
    updatedAt,
  };
}

function migrateLegacyNote(note: LegacyNote): LawQuestNoteRecord {
  const now = new Date().toISOString();
  const body = note.content ?? "";

  return {
    id: note.id || `${Date.now()}`,
    title: note.title?.trim() || "Untitled Note",
    body,
    blocks: createBlocksFromBody(body, []),
    folder: note.category?.trim() || DEFAULT_FOLDER,
    linkedSectionIds: [],
    linkedSections: [],
    isPinned: Boolean(note.isPinned),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeBlocks(
  blocks: unknown[],
  linkedSections: LinkedSectionRef[],
): NoteBlock[] {
  const normalizedBlocks = blocks
    .map((block) => {
      if (!isRecord(block) || !isRecord(block.data)) {
        return null;
      }

      const id = toStringValue(block.id) || `${Date.now()}`;

      if (block.type === "paragraph") {
        return {
          id,
          type: "paragraph" as const,
          data: {
            text: toStringValue(block.data.text),
          },
        };
      }

      if (block.type === "linkedSection") {
        const [section] = normalizeLinkedSections([block.data], []);

        if (!section) {
          return null;
        }

        return {
          id,
          type: "linkedSection" as const,
          data: section,
        };
      }

      return null;
    })
    .filter((block): block is NoteBlock => block !== null);

  if (normalizedBlocks.length > 0) {
    return normalizedBlocks;
  }

  return createBlocksFromBody("", linkedSections);
}

function noteHasSection(note: LawQuestNoteRecord, query: SectionNoteQuery) {
  if (typeof query === "string") {
    return (
      note.linkedSectionIds.includes(query) ||
      note.linkedSections.some((section) => section.sectionId === query)
    );
  }

  if (!query.codeId && !query.versionId) {
    return noteHasSection(note, query.sectionId);
  }

  const queryKey = getLinkedSectionKey(query);

  return note.linkedSections.some(
    (section) => getLinkedSectionKey(section) === queryKey,
  );
}

function getLinkedSectionKey(section: LinkedSectionRef) {
  return section.codeId
    ? getLegalSectionLocationKey({
        codeId: section.codeId,
        language: section.language,
        versionId: section.versionId,
        sectionId: section.sectionId,
      })
    : section.sectionId;
}

function mergeLinkedSectionRef(
  previous: LinkedSectionRef | undefined,
  next: LinkedSectionRef,
): LinkedSectionRef {
  return {
    sectionId: next.sectionId,
    codeId: next.codeId || previous?.codeId,
    language: next.language || previous?.language,
    versionId: next.versionId || previous?.versionId,
    sectionNo: next.sectionNo || previous?.sectionNo,
    title: next.title || previous?.title,
  };
}

function normalizeLinkedSectionRef(value: unknown): LinkedSectionRef | null {
  const citation = normalizeLegalCitationTarget(value);

  if (citation) {
    return citation;
  }

  if (!isRecord(value)) {
    return null;
  }

  const sectionId = toStringValue(value.sectionId);

  if (!sectionId) {
    return null;
  }

  return {
    sectionId,
    codeId: toStringValue(value.codeId) || undefined,
    language: toStringValue(value.language) || undefined,
    versionId: toStringValue(value.versionId) || undefined,
    sectionNo: toStringValue(value.sectionNo) || undefined,
    title: toStringValue(value.title) || undefined,
  };
}

function sortNotes(left: LawQuestNoteRecord, right: LawQuestNoteRecord) {
  if (left.isPinned !== right.isPinned) {
    return left.isPinned ? -1 : 1;
  }

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
