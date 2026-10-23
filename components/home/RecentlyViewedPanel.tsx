import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { LawCard } from "@/components/LawCard";
import { RecentlyViewedSectionRecord } from "@/services/recentlyViewed";
import { formatRelativeTime } from "./relativeTime";

interface RecentlyViewedPanelProps {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  items: RecentlyViewedSectionRecord[];
  subtextColor: string;
  textColor: string;
  tintColor: string;
}

export function RecentlyViewedPanel({
  borderColor,
  cardBg,
  isDark,
  items,
  subtextColor,
  textColor,
  tintColor,
}: RecentlyViewedPanelProps) {
  const { t } = useTranslation();
  const subtleBg = isDark ? "#121418" : "#F4F4F2";

  return (
    <View style={styles.recommendSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {t("home.recentlyViewed")}
        </Text>
        <View
          style={[
            styles.titleLine,
            { backgroundColor: borderColor, opacity: 0.3 },
          ]}
        />
      </View>

      {items.length > 0 ? (
        <View style={styles.recentList}>
          {items.map((item) => (
            <LawCard
              key={`${item.codeId}:${item.language}:${item.versionId ?? "current"}:${item.sectionId}`}
              codeTitle={item.codeTitle}
              dateText={formatRelativeTime(item.viewedAt)}
              title={item.title}
              excerpt={item.excerpt}
              language={item.language}
              structurePath={item.structurePath}
              onPress={() =>
                router.push({
                  pathname: "/legal-section",
                  params: {
                    codeId: item.codeId,
                    language: item.language,
                    ...(item.versionId ? { versionId: item.versionId } : {}),
                    sectionId: item.sectionId,
                    sectionNo: item.sectionNo,
                    sectionTitle: item.title,
                  },
                })
              }
            />
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
              borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)",
              borderStyle: "dashed",
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={24}
            color={tintColor}
            style={{ opacity: 0.5 }}
          />
          <Text style={[styles.emptyText, { color: subtextColor }]}>
            {t("home.noRecentActivity", "No recent activity recorded")}
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
    marginBottom: 10,
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
  recentList: {
    width: "100%",
    gap: 16,
  },
  articleCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 0.5,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
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
  articleContent: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: "transparent",
  },
  articleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  articleCategory: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
  },
  articleTime: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
  },
  articleTitle: {
    fontSize: 20,
    fontFamily: "Cormorant-Bold",
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  articleDesc: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.5,
    fontFamily: "Inter-Medium",
  },
  articleChipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "transparent",
  },
  articleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  articleChipText: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  pathText: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    marginLeft: 8,
    opacity: 0.4,
    flex: 1,
  },
  articleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 0.5,
    gap: 12,
    padding: 35,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
  },
});
