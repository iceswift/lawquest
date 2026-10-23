import {
  LawQuestNoteRecord,
  readNotes,
} from "@/services/notes";

export async function readRecentNotes(limit = 10): Promise<LawQuestNoteRecord[]> {
  return (await readNotes()).slice(0, limit);
}
