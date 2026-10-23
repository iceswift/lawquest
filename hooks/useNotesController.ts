import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NoteFilter } from "@/components/notes/types";
import {
  createBlocksFromBody,
  createEmptyNote,
  DEFAULT_FOLDER,
  getLinkedSectionSearchText,
  LawQuestNoteRecord,
  LinkedSectionRef,
  normalizeCodeFolder,
  normalizeLinkedSections,
  readNotes,
  saveNotes as persistNotes,
} from "@/services/notes";
import { beginGuardedNavigation } from "@/services/navigationGuards";
import { useDebouncedValue } from "./useDebouncedValue";

export type NotesRouteParams = {
  codeId?: string;
  language?: string;
  versionId?: string;
  sectionId?: string;
  sectionNo?: string;
  sectionTitle?: string;
  noteId?: string;
};

type NotesLanguage = "en" | "th";

type DeletedNoteSnapshot = {
  index: number;
  note: LawQuestNoteRecord;
};

export function useNotesController({
  lang,
  newNoteLabel,
  sectionParams,
}: {
  lang: NotesLanguage;
  newNoteLabel: string;
  sectionParams: NotesRouteParams;
}) {
  const [notes, setNotes] = useState<LawQuestNoteRecord[]>([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 180);
  const [activeFilter, setActiveFilter] = useState<NoteFilter>("all");
  const [editorVisible, setEditorVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LawQuestNoteRecord>(() =>
    createEmptyNote(),
  );
  const [deletedNoteSnapshot, setDeletedNoteSnapshot] =
    useState<DeletedNoteSnapshot | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [handledSectionId, setHandledSectionId] = useState<string | null>(null);
  const [handledNoteId, setHandledNoteId] = useState<string | null>(null);

  const saveNotes = useCallback(async (nextNotes: LawQuestNoteRecord[]) => {
    const normalizedNotes = await persistNotes(nextNotes);
    setNotes(normalizedNotes);
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await readNotes());
    } catch (error) {
      console.warn("Failed to load notes", error);
      setNotes([]);
    } finally {
      setNotesLoaded(true);
    }
  }, []);

  const openNewNote = useCallback(() => {
    setEditingNoteId(null);
    setDraft(createEmptyNote());
    setEditorVisible(true);
  }, []);

  const openNote = useCallback((note: LawQuestNoteRecord) => {
    setEditingNoteId(note.id);
    setDraft({ ...note });
    setEditorVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorVisible(false);
    setFolderPickerVisible(false);
    setNewFolderName("");
    setEditingNoteId(null);
  }, []);

  const saveDraft = useCallback(async () => {
    const title = draft.title.trim();
    const body = draft.body.trim();

    if (!title && !body) {
      closeEditor();
      return;
    }

    const linkedSections = normalizeLinkedSections(
      draft.linkedSections,
      draft.linkedSectionIds,
    );
    const nextDraft: LawQuestNoteRecord = {
      ...draft,
      title: title || "Untitled Note",
      body,
      linkedSections,
      linkedSectionIds: linkedSections.map((section) => section.sectionId),
      blocks: createBlocksFromBody(body, linkedSections),
      folder: draft.folder.trim() || DEFAULT_FOLDER,
      updatedAt: new Date().toISOString(),
    };

    const nextNotes = editingNoteId
      ? notes.map((note) => (note.id === editingNoteId ? nextDraft : note))
      : [nextDraft, ...notes];

    await saveNotes(nextNotes);
    closeEditor();
  }, [closeEditor, draft, editingNoteId, notes, saveNotes]);

  const togglePin = useCallback(async (noteId: string) => {
    await saveNotes(
      notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              isPinned: !note.isPinned,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    );
  }, [notes, saveNotes]);

  const deleteNote = useCallback((noteId: string) => {
    const noteIndex = notes.findIndex((note) => note.id === noteId);
    const note = notes[noteIndex];

    if (!note) {
      return;
    }

    setDeletedNoteSnapshot({ index: noteIndex, note });
    void saveNotes(notes.filter((item) => item.id !== noteId));
  }, [notes, saveNotes]);

  const undoDeleteNote = useCallback(() => {
    if (!deletedNoteSnapshot) {
      return;
    }

    const nextNotes = [...notes];
    nextNotes.splice(
      Math.min(deletedNoteSnapshot.index, nextNotes.length),
      0,
      deletedNoteSnapshot.note,
    );
    setDeletedNoteSnapshot(null);
    void saveNotes(nextNotes);
  }, [deletedNoteSnapshot, notes, saveNotes]);

  const openLinkedSection = useCallback((section: LinkedSectionRef) => {
    if (!section.codeId) {
      return;
    }

    if (
      !beginGuardedNavigation(
        `legal-reader:${section.codeId}:${section.language ?? "th"}:${section.sectionId}`,
      )
    ) {
      return;
    }

    setEditorVisible(false);
    router.navigate(
      {
        pathname: "/legal-reader",
        params: {
          codeId: section.codeId,
          language: section.language ?? "th",
          ...(section.versionId ? { versionId: section.versionId } : {}),
          sectionId: section.sectionId,
        },
      },
      {
        dangerouslySingular: true,
      },
    );
  }, []);

  const removeLinkedSection = useCallback((sectionId: string) => {
    setDraft((current) => {
      const linkedSections = current.linkedSections.filter(
        (section) => section.sectionId !== sectionId,
      );

      return {
        ...current,
        linkedSections,
        linkedSectionIds: linkedSections.map((section) => section.sectionId),
      };
    });
  }, []);

  const selectFolder = useCallback((folder: string) => {
    const normalizedFolder = folder.trim() || DEFAULT_FOLDER;

    setDraft((current) => ({ ...current, folder: normalizedFolder }));
    setNewFolderName("");
    setFolderPickerVisible(false);
  }, []);

  const createFolderFromInput = useCallback(() => {
    selectFolder(newFolderName);
  }, [newFolderName, selectFolder]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!deletedNoteSnapshot) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDeletedNoteSnapshot(null);
    }, 4200);

    return () => clearTimeout(timeoutId);
  }, [deletedNoteSnapshot]);

  useEffect(() => {
    const sectionId = sectionParams.sectionId
      ? String(sectionParams.sectionId)
      : null;

    if (!notesLoaded || !sectionId || handledSectionId === sectionId) {
      return;
    }

    const sectionTitle = sectionParams.sectionTitle
      ? String(sectionParams.sectionTitle)
      : sectionParams.sectionNo
        ? `Section ${sectionParams.sectionNo}`
        : newNoteLabel;
      const linkedSection: LinkedSectionRef = {
      sectionId,
      codeId: sectionParams.codeId ? String(sectionParams.codeId) : undefined,
      language: sectionParams.language
        ? String(sectionParams.language)
        : undefined,
      versionId: sectionParams.versionId
        ? String(sectionParams.versionId)
        : undefined,
      sectionNo: sectionParams.sectionNo
        ? String(sectionParams.sectionNo)
        : undefined,
      title: sectionParams.sectionTitle
        ? String(sectionParams.sectionTitle)
        : undefined,
    };

    const existingNote = notes.find((note) =>
      note.linkedSectionIds.includes(sectionId),
    );

    if (existingNote) {
      const linkedSections = normalizeLinkedSections(
        [...existingNote.linkedSections, linkedSection],
        existingNote.linkedSectionIds,
      );
      const enrichedNote = {
        ...existingNote,
        linkedSections,
        linkedSectionIds: linkedSections.map((section) => section.sectionId),
      };

      if (
        JSON.stringify(enrichedNote.linkedSections) !==
        JSON.stringify(existingNote.linkedSections)
      ) {
        void saveNotes(
          notes.map((note) =>
            note.id === existingNote.id ? enrichedNote : note,
          ),
        );
      }

      openNote(enrichedNote);
      setHandledSectionId(sectionId);
      return;
    }

    setEditingNoteId(null);
    setDraft({
      ...createEmptyNote(),
      title: sectionTitle,
      folder: sectionParams.codeId
        ? normalizeCodeFolder(String(sectionParams.codeId))
        : DEFAULT_FOLDER,
      linkedSectionIds: [sectionId],
      linkedSections: [linkedSection],
    });
    setEditorVisible(true);
    setHandledSectionId(sectionId);
  }, [
    handledSectionId,
    newNoteLabel,
    notes,
    notesLoaded,
    sectionParams.codeId,
    sectionParams.language,
    sectionParams.versionId,
    sectionParams.sectionId,
    sectionParams.sectionNo,
    sectionParams.sectionTitle,
  ]);

  useEffect(() => {
    const noteId = sectionParams.noteId ? String(sectionParams.noteId) : null;

    if (!notesLoaded || !noteId || handledNoteId === noteId) {
      return;
    }

    const targetNote = notes.find((note) => note.id === noteId);
    setHandledNoteId(noteId);

    if (!targetNote) {
      return;
    }

    openNote(targetNote);
  }, [handledNoteId, notes, notesLoaded, openNote, sectionParams.noteId]);

  const folders = useMemo(() => {
    const values = notes.map((note) => note.folder.trim()).filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const folderCounts = useMemo(() => {
    return notes.reduce<Record<string, number>>((counts, note) => {
      const folder = note.folder.trim() || DEFAULT_FOLDER;
      counts[folder] = (counts[folder] ?? 0) + 1;
      return counts;
    }, {});
  }, [notes]);

  const pinnedCount = useMemo(
    () => notes.filter((note) => note.isPinned).length,
    [notes],
  );

  const linkedCount = useMemo(
    () => notes.filter((note) => note.linkedSections.length > 0).length,
    [notes],
  );

  const folderOptions = useMemo(() => {
    return Array.from(
      new Set(
        [DEFAULT_FOLDER, draft.folder.trim(), ...folders].filter(Boolean),
      ),
    );
  }, [draft.folder, folders]);

  const filters = useMemo<NoteFilter[]>(
    () => [
      "all",
      "pinned",
      "linked",
      ...folders.map((folder) => `folder:${folder}` as const),
    ],
    [folders],
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return notes
      .filter((note) => {
        const linkedSearchText = note.linkedSections
          .map(getLinkedSectionSearchText)
          .join(" ");
        const searchable =
          `${note.title} ${note.body} ${note.folder} ${linkedSearchText}`.toLowerCase();
        const matchesQuery =
          !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "pinned" && note.isPinned) ||
          (activeFilter === "linked" && note.linkedSections.length > 0) ||
          (activeFilter.startsWith("folder:") &&
            note.folder === activeFilter.replace("folder:", ""));

        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [activeFilter, debouncedQuery, notes]);

  const formatDate = useCallback((isoDate: string) =>
    new Date(isoDate).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
    }), [lang]);

  const getFilterCount = useCallback((filter: NoteFilter) => {
    if (filter === "all") {
      return notes.length;
    }

    if (filter === "pinned") {
      return pinnedCount;
    }

    if (filter === "linked") {
      return linkedCount;
    }

    return folderCounts[filter.replace("folder:", "")] ?? 0;
  }, [folderCounts, linkedCount, notes.length, pinnedCount]);

  return {
    activeFilter,
    createFolderFromInput,
    deleteNote,
    deletedNoteSnapshot,
    draft,
    filteredNotes,
    filters,
    folderOptions,
    folderPickerVisible,
    formatDate,
    getFilterCount,
    newFolderName,
    notes,
    openLinkedSection,
    openNewNote,
    openNote,
    query,
    removeLinkedSection,
    saveDraft,
    selectFolder,
    setActiveFilter,
    setDraft,
    setFolderPickerVisible,
    setNewFolderName,
    setQuery,
    togglePin,
    undoDeleteNote,
    editorVisible,
    closeEditor,
  };
}
