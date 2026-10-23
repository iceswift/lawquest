import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";

import { Text } from "@/components/Themed";
import { FolderPickerModal } from "@/components/notes/FolderPickerModal";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { getNotesCopy } from "@/constants/notesCopy";
import { useAppTheme } from "@/context/ThemeContext";
import { useNotesController } from "@/hooks/useNotesController";
import { NoteFilter } from "@/components/notes/types";

export default function FoldersScreen() {
  const sectionParams = useLocalSearchParams<{
    codeId?: string;
    language?: string;
    sectionId?: string;
    sectionNo?: string;
    sectionTitle?: string;
    noteId?: string;
  }>();
  const { i18n } = useTranslation();
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const lang = i18n.language === "th" ? "th" : "en";
  const c = React.useMemo(() => getNotesCopy(lang), [lang]);
  const router = useRouter();

  const {
    closeEditor,
    createFolderFromInput,
    draft,
    editorVisible,
    filters,
    folderOptions,
    folderPickerVisible,
    formatDate,
    getFilterCount,
    newFolderName,
    notes,
    openLinkedSection,
    openNewNote,
    removeLinkedSection,
    saveDraft,
    selectFolder,
    setDraft,
    setFolderPickerVisible,
    setNewFolderName,
  } = useNotesController({
    lang,
    newNoteLabel: c.newNote,
    sectionParams,
  });

  const getFilterLabel = (filter: NoteFilter) => {
    if (filter === "all") return c.allNotes;
    if (filter === "pinned") return c.pinned;
    if (filter === "linked") return c.linked;
    return filter.replace("folder:", "");
  };

  const getFilterIcon = (filter: NoteFilter) => {
    if (filter === "all") return "documents-outline";
    if (filter === "pinned") return "bookmark-outline";
    if (filter === "linked") return "link-outline";
    return "folder-outline";
  };

  const handleFolderPress = (filter: NoteFilter) => {
    router.push(`/notes/${encodeURIComponent(filter)}`);
  };

  const openFolderPicker = React.useCallback(() => {
    setFolderPickerVisible(true);
  }, [setFolderPickerVisible]);

  const closeFolderPicker = React.useCallback(() => {
    setFolderPickerVisible(false);
  }, [setFolderPickerVisible]);

  const saveDraftFromModal = React.useCallback(() => {
    void saveDraft();
  }, [saveDraft]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
              WORKSPACE
            </Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>
              {c.notes}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              {notes.length} {c.notesCount}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.folderBrowser,
            {
              backgroundColor: isDark ? "rgba(30, 34, 45, 0.4)" : colors.surface,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          <View style={styles.folderBrowserHeader}>
            <Text
              style={[
                styles.folderBrowserTitle,
                { color: colors.subtext, fontFamily: typography.fonts.bold },
              ]}
            >
              {c.folders}
            </Text>
          </View>
          {filters.map((filter, index) => {
            const label = getFilterLabel(filter);
            return (
              <React.Fragment key={filter}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => handleFolderPress(filter)}
                  style={styles.folderRow}
                >
                  <View
                    style={[
                      styles.folderRowIcon,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={getFilterIcon(filter)}
                      size={15}
                      color={tintColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.folderRowName,
                      {
                        color: colors.text,
                        fontFamily: typography.fonts.primary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.folderRowCount,
                      {
                        color: colors.subtext,
                        fontFamily: typography.fonts.primary,
                      },
                    ]}
                  >
                    {getFilterCount(filter)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.subtext}
                    style={{ opacity: 0.3 }}
                  />
                </TouchableOpacity>
                {index < filters.length - 1 && (
                  <View
                    style={[
                      styles.folderDivider,
                      { backgroundColor: colors.glassBorder },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openNewNote}
        style={[
          styles.fab,
          { backgroundColor: tintColor },
        ]}
      >
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </TouchableOpacity>

      {editorVisible && (
        <NoteEditorModal
          copy={c}
          draft={draft}
          formatDate={formatDate}
          onClose={closeEditor}
          onDraftChange={setDraft}
          onOpenFolderPicker={openFolderPicker}
          onOpenLinkedSection={openLinkedSection}
          onRemoveLinkedSection={removeLinkedSection}
          onSave={saveDraftFromModal}
          visible={editorVisible}
        />
      )}

      {folderPickerVisible && (
        <FolderPickerModal
          copy={c}
          currentFolder={draft.folder}
          folderOptions={folderOptions}
          newFolderName={newFolderName}
          onClose={closeFolderPicker}
          onCreateFolder={createFolderFromInput}
          onNewFolderNameChange={setNewFolderName}
          onSelectFolder={selectFolder}
          visible
        />
      )}

      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 32,
    marginHorizontal: 24,
  },
  headerText: {
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    opacity: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  title: {
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.6,
    textAlign: "center",
  },
  folderBrowser: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginHorizontal: 24,
  },
  folderBrowserHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  folderBrowserTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  folderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  folderRowIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  folderRowName: {
    flex: 1,
    fontSize: 15,
  },
  folderRowCount: {
    fontSize: 13,
    minWidth: 22,
    textAlign: "right",
    opacity: 0.7,
  },
  folderDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  fab: {
    alignItems: "center",
    borderRadius: 28,
    bottom: Platform.OS === "ios" ? 40 : 24,
    elevation: 8,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 56,
  },
});
