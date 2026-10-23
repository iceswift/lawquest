import { Ionicons } from "@expo/vector-icons";
import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Themed";
import { NotesCopy } from "@/constants/notesCopy";
import { useAppTheme } from "@/context/ThemeContext";
import {
  formatLinkedSection,
  LawQuestNoteRecord,
  LinkedSectionRef,
  normalizeCodeFolder,
} from "@/services/notes";

interface NoteEditorModalProps {
  copy: NotesCopy;
  draft: LawQuestNoteRecord;
  formatDate: (isoDate: string) => string;
  onClose: () => void;
  onDraftChange: React.Dispatch<React.SetStateAction<LawQuestNoteRecord>>;
  onOpenFolderPicker: () => void;
  onOpenLinkedSection: (section: LinkedSectionRef) => void;
  onRemoveLinkedSection: (sectionId: string) => void;
  onSave: () => void;
  visible: boolean;
}

function NoteEditorModalComponent({
  copy,
  draft,
  formatDate,
  onClose,
  onDraftChange,
  onOpenFolderPicker,
  onOpenLinkedSection,
  onRemoveLinkedSection,
  onSave,
  visible,
}: NoteEditorModalProps) {
  const { tintColor, colors, typography } = useAppTheme();

  // Undo/Redo State Management
  const [history, setHistory] = useState<{title: string, body: string}[]>([{ title: draft.title, body: draft.body }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const currentRecord = prev[currentIndex];
        if (currentRecord.title === draft.title && currentRecord.body === draft.body) {
          return prev;
        }
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push({ title: draft.title, body: draft.body });
        if (newHistory.length > 50) newHistory.shift();
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [draft.title, draft.body, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const pastState = history[newIndex];
      onDraftChange((current) => ({ ...current, title: pastState.title, body: pastState.body }));
    }
  }, [currentIndex, history, onDraftChange]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      const futureState = history[newIndex];
      onDraftChange((current) => ({ ...current, title: futureState.title, body: futureState.body }));
    }
  }, [currentIndex, history, onDraftChange]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onSave}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.editorScreen, { backgroundColor: colors.background }]}
      >
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={onSave} style={styles.headerLeftAction}>
            <Ionicons name="chevron-back" size={24} color={tintColor} />
            <Text
              style={[
                styles.headerFolderText,
                { color: tintColor, fontFamily: typography.fonts.primary },
              ]}
              numberOfLines={1}
            >
              {draft.folder || copy.folderPlaceholder}
            </Text>
          </TouchableOpacity>
          <View style={styles.editorHeaderSpacer} />
          <View style={styles.headerRightActions}>
            <TouchableOpacity 
              onPress={undo} 
              disabled={!canUndo}
              style={[styles.undoRedoBtn, { opacity: canUndo ? 1 : 0.3 }]}
            >
              <Ionicons name="arrow-undo-outline" size={22} color={tintColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={redo} 
              disabled={!canRedo}
              style={[styles.undoRedoBtn, { opacity: canRedo ? 1 : 0.3 }]}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={tintColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.editorContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              styles.editorDate,
              { color: colors.subtext, fontFamily: typography.fonts.primary },
            ]}
          >
            {formatDate(draft.updatedAt)}
          </Text>

          <TextInput
            value={draft.title}
            onChangeText={(title) =>
              onDraftChange((current) => ({ ...current, title }))
            }
            placeholder={copy.titlePlaceholder}
            placeholderTextColor={colors.subtext + "50"}
            style={[
              styles.titleInput,
              { color: colors.text, fontFamily: typography.fonts.regal },
            ]}
          />

          <TextInput
            value={draft.body}
            onChangeText={(body) =>
              onDraftChange((current) => ({ ...current, body }))
            }
            placeholder={copy.bodyPlaceholder}
            placeholderTextColor={colors.subtext + "50"}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyInput,
              { color: colors.text, fontFamily: typography.fonts.primary },
            ]}
          />

          {draft.linkedSections.length > 0 && (
            <View style={styles.linkedSectionsContainer}>
              <View style={styles.linkedSectionsTitleRow}>
                <Ionicons name="link-outline" size={14} color={colors.subtext} />
                <Text
                  style={[
                    styles.linkedSectionsTitleText,
                    { color: colors.subtext, fontFamily: typography.fonts.bold },
                  ]}
                >
                  {copy.linkedSections.toUpperCase()}
                </Text>
              </View>
              <View style={styles.linkedChipsRow}>
                {draft.linkedSections.map((section) => (
                  <View
                    key={section.sectionId}
                    style={[
                      styles.linkedChip,
                      {
                        backgroundColor: isDark(colors.background)
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                        borderColor: isDark(colors.background)
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => onOpenLinkedSection(section)}
                      style={styles.linkedChipContent}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={12}
                        color={tintColor}
                      />
                      <Text
                        style={[
                          styles.linkedChipText,
                          {
                            color: colors.text,
                            fontFamily: typography.fonts.bold,
                          },
                        ]}
                      >
                        {formatLinkedSection(section)}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.linkedChipDivider} />
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => onRemoveLinkedSection(section.sectionId)}
                      style={styles.linkedChipRemove}
                    >
                      <Ionicons name="close" size={14} color={colors.subtext} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Toolbar */}
        <View
          style={[
            styles.bottomToolbar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.toolbarLeft}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={onOpenFolderPicker}
            >
              <Ionicons name="folder-outline" size={22} color={tintColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() =>
                onDraftChange((current) => ({
                  ...current,
                  isPinned: !current.isPinned,
                }))
              }
            >
              <Ionicons
                name={draft.isPinned ? "bookmark" : "bookmark-outline"}
                size={22}
                color={draft.isPinned ? tintColor : colors.subtext}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              style={[styles.toolbarButton, styles.toolbarLinkIndicator]}
              activeOpacity={1}
            >
              <Ionicons name="link-outline" size={20} color={colors.subtext} />
              {draft.linkedSections.length > 0 && (
                <Text
                  style={[
                    styles.toolbarBadge,
                    {
                      color: tintColor,
                      fontFamily: typography.fonts.bold,
                    },
                  ]}
                >
                  {draft.linkedSections.length}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Helper to determine if background is dark for chip styling
function isDark(bgColor: string) {
  return bgColor === "#12151D" || bgColor.includes("18, 21, 29");
}

export const NoteEditorModal = memo(NoteEditorModalComponent);

const styles = StyleSheet.create({
  editorScreen: {
    flex: 1,
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 54,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: Platform.OS === "ios" ? 44 : 0,
  },
  headerLeftAction: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "70%",
    paddingRight: 10,
    marginLeft: -8, // Offset the padding of chevron
  },
  headerFolderText: {
    fontSize: 16,
    marginLeft: 2,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingRight: 8,
  },
  undoRedoBtn: {
    padding: 4,
  },
  editorHeaderSpacer: {
    flex: 1,
  },
  editorContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 80,
  },
  editorDate: {
    alignSelf: "center",
    fontSize: 12,
    marginBottom: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  titleInput: {
    fontSize: 34,
    marginBottom: 12,
    minHeight: 48,
    padding: 0,
    lineHeight: 40,
  },
  bodyInput: {
    fontSize: 17,
    lineHeight: 26,
    marginTop: 8,
    minHeight: 300,
    padding: 0,
    textAlignVertical: "top",
  },
  linkedSectionsContainer: {
    marginTop: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.2)",
    paddingTop: 24,
  },
  linkedSectionsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  linkedSectionsTitleText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  linkedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  linkedChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  linkedChipContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  linkedChipText: {
    fontSize: 13,
  },
  linkedChipDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(150,150,150,0.2)",
  },
  linkedChipRemove: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bottomToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarLinkIndicator: {
    flexDirection: "row",
    gap: 4,
    opacity: 0.8,
  },
  toolbarBadge: {
    fontSize: 13,
    marginTop: 1,
  },
});
