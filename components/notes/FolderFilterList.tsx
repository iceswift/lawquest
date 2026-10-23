import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/Themed";
import { NotesCopy } from "@/constants/notesCopy";
import { useAppTheme } from "@/context/ThemeContext";
import { NoteFilter } from "./types";

interface FolderFilterListProps {
  activeFilter: NoteFilter;
  copy: NotesCopy;
  filters: NoteFilter[];
  getFilterCount: (filter: NoteFilter) => number;
  onFilterChange: (filter: NoteFilter) => void;
}

function FolderFilterListComponent({
  activeFilter,
  copy,
  filters,
  getFilterCount,
  onFilterChange,
}: FolderFilterListProps) {
  const { isDark, tintColor, colors, typography } = useAppTheme();

  const getFilterLabel = (filter: NoteFilter) => {
    if (filter === "all") {
      return copy.allNotes;
    }

    if (filter === "pinned") {
      return copy.pinned;
    }

    if (filter === "linked") {
      return copy.linked;
    }

    return filter.replace("folder:", "");
  };

  const getFilterIcon = (filter: NoteFilter) => {
    if (filter === "all") {
      return "documents-outline" as const;
    }

    if (filter === "pinned") {
      return "bookmark-outline" as const;
    }

    if (filter === "linked") {
      return "link-outline" as const;
    }

    return "folder-outline" as const;
  };

  return (
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
          {copy.folders}
        </Text>
      </View>
      {filters.map((filter, index) => {
        const selected = activeFilter === filter;
        const label = getFilterLabel(filter);

        return (
          <React.Fragment key={filter}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onFilterChange(filter)}
              style={styles.folderRow}
            >
              <View
                style={[
                  styles.folderRowIcon,
                  {
                    backgroundColor: selected
                      ? tintColor
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Ionicons
                  name={getFilterIcon(filter)}
                  size={15}
                  color={selected ? colors.onAccent : tintColor}
                />
              </View>
              <Text
                style={[
                  styles.folderRowName,
                  {
                    color: selected ? tintColor : colors.text,
                    fontFamily: selected
                      ? typography.fonts.bold
                      : typography.fonts.primary,
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
                color={selected ? tintColor : colors.subtext}
                style={{ opacity: selected ? 1 : 0.3 }}
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
  );
}

export const FolderFilterList = memo(FolderFilterListComponent);

const styles = StyleSheet.create({
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
});
