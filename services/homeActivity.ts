import { LawQuestNoteRecord } from "@/services/notes";
import { readRecentNotes } from "@/services/recentNotes";
import {
  readRecentlyViewedSections,
  RecentlyViewedSectionRecord,
} from "@/services/recentlyViewed";

export interface HomeActivitySnapshot {
  recentNotes: LawQuestNoteRecord[];
  recentlyViewedSections: RecentlyViewedSectionRecord[];
}

export async function readHomeActivity(limit = 3): Promise<HomeActivitySnapshot> {
  const [recentlyViewedSections, recentNotes] = await Promise.all([
    readRecentlyViewedSections(limit),
    readRecentNotes(limit),
  ]);

  return {
    recentNotes,
    recentlyViewedSections,
  };
}
