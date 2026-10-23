import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { NoteCard } from "@/components/notes/NoteCard";
import { getNotesCopy } from "@/constants/notesCopy";
import { LawQuestNoteRecord } from "@/services/notes";
import { formatRelativeTime } from "./relativeTime";

interface RecentNotesPanelProps {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  items: LawQuestNoteRecord[];
  subtextColor: string;
  textColor: string;
  tintColor: string;
}

export function RecentNotesPanel({
  borderColor,
  cardBg,
  isDark,
  items,
  subtextColor,
  textColor,
  tintColor,
}: RecentNotesPanelProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "th" ? "th" : "en";
  const c = useMemo(() => getNotesCopy(lang), [lang]);

  return (
    <View style={styles.recommendSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {t("home.recentNotes")}
        </Text>
        <View
          style={[
            styles.titleLine,
            { backgroundColor: borderColor, opacity: 0.3 },
          ]}
        />
      </View>

      {items.length > 0 ? (
        <View style={styles.noteList}>
          {items.map((item) => (
            <NoteCard
              key={item.id}
              copy={c}
              formatDate={(iso) => formatRelativeTime(iso)}
              note={item}
              onOpen={(note) =>
                router.push({
                  pathname: "/notes",
                  params: { noteId: note.id },
                })
              }
              onOpenLinkedSection={(section) =>
                router.push({
                  pathname: "/notes",
                  params: { sectionId: section.sectionId },
                })
              }
            />
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.noteEmptyCard,
            {
              backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
              borderColor: isDark
                ? "rgba(212, 175, 55, 0.25)"
                : "rgba(184, 150, 76, 0.3)",
              borderStyle: "dashed",
            },
          ]}
        >
          <Ionicons
            name="document-outline"
            size={24}
            color={tintColor}
            style={{ opacity: 0.5 }}
          />
          <Text style={[styles.noteEmptyText, { color: subtextColor }]}>
            {t("home.noRecentNotes")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recommendSection: {
    width: "100%",
    backgroundColor: "transparent",
    marginTop: 25,
    marginBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginRight: 15,
    opacity: 0.6,
  },
  titleLine: {
    flex: 1,
    height: 1,
  },
  noteList: {
    width: "100%",
  },
  noteEmptyCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 0.5,
    gap: 12,
    padding: 35,
  },
  noteEmptyText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
  },
});
