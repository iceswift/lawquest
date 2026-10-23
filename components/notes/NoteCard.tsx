import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/Themed";
import { useAppTheme } from "@/context/ThemeContext";
import { NotesCopy } from "@/constants/notesCopy";
import {
  formatLinkedSection,
  LawQuestNoteRecord,
  LinkedSectionRef,
} from "@/services/notes";

interface NoteCardProps {
  copy: NotesCopy;
  formatDate: (isoDate: string) => string;
  note: LawQuestNoteRecord;
  onDelete?: (noteId: string) => void;
  onOpen: (note: LawQuestNoteRecord) => void;
  onOpenLinkedSection: (section: LinkedSectionRef) => void;
  onTogglePin?: (noteId: string) => Promise<void> | void;
}

function NoteCardComponent({
  copy,
  formatDate,
  note,
  onDelete,
  onOpen,
  onOpenLinkedSection,
  onTogglePin,
}: NoteCardProps) {
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const linkedSection = note.linkedSections[0];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onOpen(note)}
      style={[
        styles.noteCard,
        {
          backgroundColor: isDark ? "rgba(30, 34, 45, 0.4)" : colors.card,
          borderColor: colors.glassBorder,
        },
      ]}
    >

      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLeft}>
          <Text
            style={[
              styles.noteFolder,
              { color: tintColor, fontFamily: typography.fonts.bold },
            ]}
            numberOfLines={1}
          >
            {note.folder.toUpperCase()}
          </Text>
          {linkedSection && (
            <View style={styles.chipInline}>
              <Text style={[styles.dotSeparator, { color: colors.subtext }]}>
                •
              </Text>
              <Ionicons name="link-outline" size={10} color={tintColor} />
              <Text
                style={[
                  styles.noteChipText,
                  { color: tintColor, fontFamily: typography.fonts.bold },
                ]}
                numberOfLines={1}
              >
                {formatLinkedSection(linkedSection).toUpperCase()}
                {note.linkedSections.length > 1
                  ? ` +${note.linkedSections.length - 1}`
                  : ""}
              </Text>
            </View>
          )}
        </View>
        {onTogglePin && <TouchableOpacity
          hitSlop={12}
          onPress={() => void onTogglePin(note.id)}
        >
          <Ionicons
            name={note.isPinned ? "bookmark" : "bookmark-outline"}
            size={16}
            color={note.isPinned ? tintColor : colors.subtext}
          />
        </TouchableOpacity>}
      </View>

      <View style={styles.contentBlock}>
        <Text
          style={[
            styles.noteTitle,
            { color: colors.text, fontFamily: typography.fonts.regal },
          ]}
          numberOfLines={2}
        >
          {note.title || copy.titlePlaceholder}
        </Text>
        <Text
          style={[
            styles.noteBody,
            { color: colors.subtext, fontFamily: typography.fonts.primary },
          ]}
          numberOfLines={2}
        >
          {note.body || copy.bodyPlaceholder}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <Text
          style={[
            styles.noteDate,
            { color: colors.subtext, fontFamily: typography.fonts.primary },
          ]}
        >
          {formatDate(note.updatedAt)}
        </Text>
        {onDelete && <TouchableOpacity hitSlop={12} onPress={() => onDelete(note.id)}>
          <Ionicons
            name="trash-outline"
            size={16}
            color={colors.subtext}
            style={{ opacity: 0.5 }}
          />
        </TouchableOpacity>}
      </View>
    </TouchableOpacity>
  );
}

export const NoteCard = memo(NoteCardComponent);

const styles = StyleSheet.create({
  noteCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eyebrowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  chipInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dotSeparator: {
    fontSize: 10,
    marginHorizontal: 4,
    opacity: 0.4,
  },
  noteFolder: {
    fontSize: 10,
    letterSpacing: 1,
  },
  noteChipText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  contentBlock: {
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  noteDate: {
    fontSize: 11,
    opacity: 0.5,
  },
});
