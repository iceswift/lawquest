import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Text } from "@/components/Themed";
import { NotesCopy } from "@/constants/notesCopy";
import { useAppTheme } from "@/context/ThemeContext";

interface FolderPickerModalProps {
  copy: NotesCopy;
  currentFolder: string;
  folderOptions: string[];
  newFolderName: string;
  onClose: () => void;
  onCreateFolder: () => void;
  onNewFolderNameChange: (name: string) => void;
  onSelectFolder: (folder: string) => void;
  visible: boolean;
}

function FolderPickerModalComponent({
  copy,
  currentFolder,
  folderOptions,
  newFolderName,
  onClose,
  onCreateFolder,
  onNewFolderNameChange,
  onSelectFolder,
  visible,
}: FolderPickerModalProps) {
  const { tintColor, colors, typography } = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.folderPickerBackdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.folderPickerPanel,
            { backgroundColor: colors.card, borderColor: colors.goldSubtle },
          ]}
        >
          <View style={styles.folderPickerHeader}>
            <Text
              style={[
                styles.folderPickerTitle,
                { color: colors.text, fontFamily: typography.fonts.bold },
              ]}
            >
              {copy.chooseFolder}
            </Text>
            <TouchableOpacity hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.folderPickerList}
            showsVerticalScrollIndicator={false}
          >
            {folderOptions.map((folder) => {
              const selected = currentFolder === folder;

              return (
                <TouchableOpacity
                  key={folder}
                  activeOpacity={0.82}
                  onPress={() => onSelectFolder(folder)}
                  style={styles.folderPickerRow}
                >
                  <View
                    style={[
                      styles.folderPickerIcon,
                      { backgroundColor: tintColor + "12" },
                    ]}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={16}
                      color={tintColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.folderPickerName,
                      {
                        color: selected ? tintColor : colors.text,
                        fontFamily: selected
                          ? typography.fonts.bold
                          : typography.fonts.primary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {folder}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={tintColor}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View
            style={[
              styles.newFolderBox,
              { borderTopColor: colors.goldSubtle },
            ]}
          >
            <TextInput
              value={newFolderName}
              onChangeText={onNewFolderNameChange}
              placeholder={copy.newFolder}
              placeholderTextColor={colors.subtext + "60"}
              style={[
                styles.newFolderInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSoft,
                  fontFamily: typography.fonts.primary,
                },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={!newFolderName.trim()}
              onPress={onCreateFolder}
              style={[
                styles.newFolderButton,
                {
                  backgroundColor: newFolderName.trim()
                    ? tintColor
                    : colors.goldSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.newFolderButtonText,
                  {
                    color: colors.onAccent,
                    fontFamily: typography.fonts.bold,
                  },
                ]}
              >
                {copy.createFolder}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export const FolderPickerModal = memo(FolderPickerModalComponent);

const styles = StyleSheet.create({
  folderPickerBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  folderPickerPanel: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    maxHeight: "80%",
    width: "100%",
    paddingTop: 20,
    overflow: "hidden",
  },
  folderPickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  folderPickerTitle: {
    fontSize: 20,
  },
  folderPickerList: {
    maxHeight: 300,
  },
  folderPickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 56,
    paddingHorizontal: 24,
  },
  folderPickerIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  folderPickerName: {
    flex: 1,
    fontSize: 16,
  },
  newFolderBox: {
    borderTopWidth: 1,
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  newFolderInput: {
    borderRadius: 14,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 16,
  },
  newFolderButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
  },
  newFolderButtonText: {
    fontSize: 15,
  },
});
