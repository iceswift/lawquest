import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { useAppTheme } from "@/context/ThemeContext";

type LawCardProps = {
  codeTitle: string;
  title: string;
  excerpt?: string | null;
  language?: string;
  dateText?: string;
  isPinned?: boolean;
  folderId?: string;
  structurePath?: string;
  onPress: () => void;
  rightAction?: React.ReactNode;
  style?: any;
};

export function LawCard({
  codeTitle,
  title,
  excerpt,
  language,
  dateText,
  isPinned,
  folderId,
  structurePath,
  onPress,
  rightAction,
  style,
}: LawCardProps) {
  const { colors, tintColor, typography, isDark } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
    >
      <View style={styles.metaRow}>
        <View style={styles.codeTitleRow}>
          <Text
            style={[
              styles.codeTitle,
              { color: tintColor, fontFamily: typography.fonts.bold },
            ]}
            numberOfLines={1}
          >
            {codeTitle.toUpperCase()}
          </Text>
        </View>

        <View style={styles.topRightAction}>
          {rightAction !== undefined ? (
            rightAction
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} style={{ opacity: 0.3 }} />
          )}
        </View>
      </View>

      <Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: typography.fonts.regal },
        ]}
      >
        {title}
      </Text>

      {excerpt ? (
        <Text
          style={[
            styles.excerpt,
            { color: colors.subtext, fontFamily: typography.fonts.primary },
          ]}
          numberOfLines={2}
        >
          {excerpt}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          {language ? (
            <Text
              style={[
                styles.langText,
                { color: colors.subtext, fontFamily: typography.fonts.primary },
              ]}
            >
              {language.toUpperCase()}
            </Text>
          ) : null}

          {language && folderId ? (
            <Text style={{ color: colors.subtext, opacity: 0.3, fontSize: 10 }}>•</Text>
          ) : null}

          {folderId ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="folder-outline" size={11} color={colors.subtext} />
              <Text
                style={[
                  styles.orgChipText,
                  { color: colors.subtext, fontFamily: typography.fonts.primary },
                ]}
              >
                {folderId}
              </Text>
            </View>
          ) : null}

          {(language || folderId) && structurePath ? (
            <Text style={{ color: colors.subtext, opacity: 0.3, fontSize: 10 }}>•</Text>
          ) : null}

          {structurePath ? (
            <Text style={[styles.pathText, { color: colors.subtext, fontFamily: typography.fonts.primary }]} numberOfLines={1}>
              {structurePath}
            </Text>
          ) : null}
        </View>

        {dateText ? (
          <Text
            style={[
              styles.dateText,
              { color: colors.subtext, fontFamily: typography.fonts.primary },
            ]}
          >
            {dateText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "column",
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  codeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    flex: 1,
    paddingRight: 16,
  },
  codeTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  topRightAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "transparent",
    gap: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    paddingRight: 16,
    backgroundColor: "transparent",
  },
  langText: {
    fontSize: 11,
    opacity: 0.7,
  },
  orgChipText: {
    fontSize: 11,
    opacity: 0.7,
  },
  pathText: {
    fontSize: 11,
    opacity: 0.4,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.5,
    marginBottom: 2,
  },
});
