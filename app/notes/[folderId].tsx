import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Text } from "@/components/Themed";
import { FolderPickerModal } from "@/components/notes/FolderPickerModal";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { getNotesCopy } from "@/constants/notesCopy";
import { useAppTheme } from "@/context/ThemeContext";
import { useNotesController } from "@/hooks/useNotesController";
import { LawQuestNoteRecord } from "@/services/notes";
import { NoteFilter } from "@/components/notes/types";

export default function FolderNotesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    folderId: string;
  }>();
  
  const folderId = decodeURIComponent(params.folderId || "all") as NoteFilter;
  
  const { i18n } = useTranslation();
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const lang = i18n.language === "th" ? "th" : "en";
  const c = React.useMemo(() => getNotesCopy(lang), [lang]);

  const {
    activeFilter,
    closeEditor,
    createFolderFromInput,
    deleteNote,
    draft,
    editorVisible,
    filteredNotes,
    folderOptions,
    folderPickerVisible,
    formatDate,
    newFolderName,
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
  } = useNotesController({
    lang,
    newNoteLabel: c.newNote,
    sectionParams: {}, // No deep links handled directly here
  });

  // Set the active filter based on the route param
  useEffect(() => {
    setActiveFilter(folderId);
  }, [folderId, setActiveFilter]);

  const activeFilterLabel = useMemo(() => {
    if (folderId === "all") return c.allNotes;
    if (folderId === "pinned") return c.pinned;
    if (folderId === "linked") return c.linked;
    return folderId.replace("folder:", "");
  }, [folderId, c]);

  const handleOpenNewNoteInFolder = React.useCallback(() => {
    openNewNote();
    // Pre-fill the folder if it's a specific user folder, otherwise leave as default (General)
    if (folderId.startsWith("folder:")) {
      const targetFolder = folderId.replace("folder:", "");
      setDraft((current) => ({ ...current, folder: targetFolder }));
    }
  }, [folderId, openNewNote, setDraft]);

  const saveDraftFromModal = React.useCallback(() => {
    void saveDraft();
  }, [saveDraft]);

  const openFolderPicker = React.useCallback(() => {
    setFolderPickerVisible(true);
  }, [setFolderPickerVisible]);

  const closeFolderPicker = React.useCallback(() => {
    setFolderPickerVisible(false);
  }, [setFolderPickerVisible]);

  const hasNoNotes = filteredNotes.length === 0 && query === "";
  const emptyTitle = hasNoNotes ? c.emptyTitle : c.noResultsTitle;
  const emptySubtitle = hasNoNotes ? c.emptySubtitle : c.noResultsSubtitle;

  const renderNoteItem = React.useCallback(
    ({ item }: { item: LawQuestNoteRecord }) => (
      <View style={{ paddingHorizontal: 24 }}>
        <NoteCard
          copy={c}
          formatDate={formatDate}
          note={item}
          onDelete={deleteNote}
          onOpen={openNote}
          onOpenLinkedSection={openLinkedSection}
          onTogglePin={togglePin}
        />
      </View>
    ),
    [c, deleteNote, formatDate, openLinkedSection, openNote, togglePin]
  );

  const listHeader = React.useCallback(
    () => (
      <View>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            WORKSPACE
          </Text>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>
                {activeFilterLabel}
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                {filteredNotes.length} {c.notesCount}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? "rgba(18, 21, 29, 0.65)" : "rgba(255, 255, 255, 0.72)",
              borderColor: colors.glassBorder,
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.subtext} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={c.search}
            placeholderTextColor={colors.subtext + "80"}
            style={[
              styles.searchInput,
              { color: colors.text, fontFamily: typography.fonts.primary },
            ]}
          />
          {query !== "" && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [
      activeFilterLabel,
      c.notesCount,
      c.search,
      colors.glassBorder,
      colors.subtext,
      colors.text,
      filteredNotes.length,
      isDark,
      query,
      setQuery,
      typography.fonts.bold,
      typography.fonts.primary,
    ]
  );

  const emptyState = React.useCallback(
    () => (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIcon,
            { borderColor: colors.glassBorder, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={32}
            color={colors.subtext}
          />
        </View>
        <Text
          style={[
            styles.emptyTitle,
            { color: colors.text, fontFamily: typography.fonts.bold },
          ]}
        >
          {emptyTitle}
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: colors.subtext, fontFamily: typography.fonts.primary },
          ]}
        >
          {emptySubtitle}
        </Text>
      </View>
    ),
    [
      colors.glassBorder,
      colors.subtext,
      colors.text,
      emptySubtitle,
      emptyTitle,
      isDark,
      typography.fonts.bold,
      typography.fonts.primary,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <FlashList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.content}
        renderItem={renderNoteItem}
        showsVerticalScrollIndicator={true}
      />

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? "rgba(18, 21, 29, 0.85)" : "rgba(255, 255, 255, 0.9)",
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.bottomBarBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.subtext} />
          <Text style={[styles.bottomBarText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            {c.folders}
          </Text>
        </TouchableOpacity>

        <View style={[styles.bottomBarDivider, { backgroundColor: colors.glassBorder }]} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenNewNoteInFolder}
          style={styles.bottomBarBtn}
        >
          <Ionicons name="add" size={22} color={tintColor} />
          <Text style={[styles.bottomBarText, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            {c.newNote}
          </Text>
        </TouchableOpacity>
      </View>

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
    paddingBottom: 24,
    marginHorizontal: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
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
    textTransform: "uppercase",
    textAlign: "center",
  },
  searchBar: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  emptyTitle: {
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    minWidth: 220,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  bottomBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: "100%",
  },
  bottomBarText: {
    fontSize: 15,
  },
  bottomBarDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
});
