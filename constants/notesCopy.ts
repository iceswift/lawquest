export type NotesLanguage = "en" | "th";

export function getNotesCopy(lang: NotesLanguage) {
  const fixedCopy = {
    en: {
      allNotes: "All Notes",
      bodyPlaceholder: "Write your note...",
      chooseFolder: "Choose Folder",
      createFolder: "Create Folder",
      deleted: "Note deleted",
      deleteMessage: "Do you want to delete this note?",
      deleteTitle: "Delete note",
      done: "Done",
      emptySubtitle:
        "Create a quick note, then link it to legal sections later.",
      emptyTitle: "No notes yet",
      folder: "Folder",
      folderPlaceholder: "Notes, Criminal Code, Exam Prep...",
      folders: "Folders",
      linked: "Linked",
      linkedLater: "Open a section in Reader, then tap Note to link it here.",
      linkedSections: "Linked Sections",
      newFolder: "New folder name",
      newNote: "New Note",
      noResultsSubtitle: "Try another search or choose a different folder.",
      noResultsTitle: "No matching notes",
      notes: "Notes",
      notesCount: "notes",
      pinned: "Pinned",
      recentNotes: "Recent Notes",
      search: "Search notes",
      titlePlaceholder: "Title",
      undo: "Undo",
      updated: "Updated",
    },
    th: {
      allNotes:
        "\u0E42\u0E19\u0E49\u0E15\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",
      bodyPlaceholder:
        "\u0E40\u0E02\u0E35\u0E22\u0E19\u0E42\u0E19\u0E49\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13...",
      chooseFolder:
        "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C",
      createFolder:
        "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C",
      deleted: "\u0E25\u0E1A\u0E42\u0E19\u0E49\u0E15\u0E41\u0E25\u0E49\u0E27",
      deleteMessage:
        "\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E42\u0E19\u0E49\u0E15\u0E19\u0E35\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48",
      deleteTitle: "\u0E25\u0E1A\u0E42\u0E19\u0E49\u0E15",
      done: "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19",
      emptySubtitle:
        "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E14\u0E44\u0E2D\u0E40\u0E14\u0E35\u0E22\u0E2A\u0E31\u0E49\u0E19\u0E46 \u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E2D\u0E22\u0E1C\u0E39\u0E01\u0E01\u0E31\u0E1A\u0E21\u0E32\u0E15\u0E23\u0E32\u0E08\u0E32\u0E01 Reader",
      emptyTitle:
        "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E19\u0E49\u0E15",
      folder: "\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C",
      folderPlaceholder: "Notes, Criminal Code, Exam Prep...",
      folders: "\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C",
      linked: "\u0E1C\u0E39\u0E01\u0E21\u0E32\u0E15\u0E23\u0E32",
      linkedLater:
        "\u0E40\u0E1B\u0E34\u0E14\u0E21\u0E32\u0E15\u0E23\u0E32\u0E43\u0E19 Reader \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 Note \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E01\u0E01\u0E31\u0E1A\u0E42\u0E19\u0E49\u0E15\u0E19\u0E35\u0E49",
      linkedSections:
        "\u0E21\u0E32\u0E15\u0E23\u0E32\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E01\u0E44\u0E27\u0E49",
      newFolder:
        "\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48",
      newNote: "\u0E42\u0E19\u0E49\u0E15\u0E43\u0E2B\u0E21\u0E48",
      noResultsSubtitle:
        "\u0E25\u0E2D\u0E07\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E43\u0E2B\u0E21\u0E48 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2D\u0E37\u0E48\u0E19",
      noResultsTitle:
        "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E19\u0E49\u0E15\u0E17\u0E35\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19",
      notes: "\u0E42\u0E19\u0E49\u0E15",
      notesCount: "\u0E42\u0E19\u0E49\u0E15",
      pinned: "\u0E1B\u0E31\u0E01\u0E2B\u0E21\u0E38\u0E14",
      recentNotes:
        "\u0E42\u0E19\u0E49\u0E15\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14",
      search: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E42\u0E19\u0E49\u0E15",
      titlePlaceholder: "\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D",
      undo: "\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A",
      updated:
        "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14",
    },
  };

  return fixedCopy[lang];
}

export type NotesCopy = ReturnType<typeof getNotesCopy>;
