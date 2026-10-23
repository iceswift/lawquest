import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

import { Text } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useAppTheme } from "../../context/ThemeContext";

export default function GamesScreen() {
  const { t } = useTranslation();
  const { isDark, tintColor, colors, typography, layout } = useAppTheme();

  const gameCategories = [
    {
      id: "quiz",
      title: t("games.quiz.title"),
      desc: t("games.quiz.desc"),
      icon: "brain",
      progress: 65,
      color: "#8B0000",
    },
    {
      id: "scenario",
      title: t("games.scenario.title"),
      desc: t("games.scenario.desc"),
      icon: "balance-scale",
      progress: 30,
      color: "#1A2A6C",
    },
    {
      id: "flashcards",
      title: t("games.flashcards.title"),
      desc: t("games.flashcards.desc"),
      icon: "layer-group",
      progress: 85,
      color: "#2D5A27",
    },
  ];

  const renderGameCard = (item: (typeof gameCategories)[0]) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.7}
      style={[
        styles.gameCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.glassBorder,
        },
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
            {t("games.gameModule")}
          </Text>
        </View>

        <View style={styles.topRightAction}>
          <FontAwesome5 name={item.icon} size={16} color={tintColor} style={{ opacity: 0.8 }} />
        </View>
      </View>

      <Text
        style={[
          styles.cardTitle,
          { color: colors.text, fontFamily: typography.fonts.regal },
        ]}
      >
        {item.title}
      </Text>

      <Text
        style={[
          styles.excerpt,
          { color: colors.subtext, fontFamily: typography.fonts.primary },
        ]}
        numberOfLines={2}
      >
        {item.desc}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Text
            style={[
              styles.langText,
              { color: colors.subtext, fontFamily: typography.fonts.bold },
            ]}
          >
            {t("games.mastery")}: {item.progress}%
          </Text>
        </View>

        <View style={styles.inlineProgressContainer}>
          <View
            style={[
              styles.inlineProgressBg,
              { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
            ]}
          >
            <View
              style={[
                styles.inlineProgressFill,
                { backgroundColor: tintColor, width: `${item.progress}%` },
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            {t("games.eyebrow")}
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>{t("games.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            {t("games.subtitle")}
          </Text>
        </View>

        <View style={[
          styles.statsOverview,
          {
            backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
            borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)",
          }
        ]}>
          <View style={styles.radialContainer}>
            <View style={[
              styles.radialCircle,
              {
                borderColor: isDark ? "rgba(212, 175, 55, 0.15)" : "rgba(184, 150, 76, 0.15)",
                backgroundColor: isDark ? "rgba(229, 193, 88, 0.05)" : "rgba(184, 150, 76, 0.05)",
                borderWidth: 2,
              }
            ]}>
              <View style={styles.radialCenterText}>
                <Text style={[styles.radialLevelNumber, { color: tintColor, fontFamily: typography.fonts.bold }]}>12</Text>
                <Text style={[styles.radialLevelLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{t("games.lvl")}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statDetails}>
            <Text style={[styles.statCounselTitle, { color: tintColor, fontFamily: typography.fonts.bold }]}>
              {t("games.masterCounsel")}
            </Text>
            <View style={styles.expRow}>
              <Text style={[styles.statExpText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                1,240 <Text style={{ color: colors.subtext, fontSize: 10 }}>/ 2,000 EXP</Text>
              </Text>
            </View>
            <View style={[styles.expTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
              <View style={[styles.expFill, { backgroundColor: tintColor, width: "62%" }]} />
            </View>
            <Text style={[styles.statRankDesc, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              {t("games.expToRank", { remaining: "760" })}
            </Text>
          </View>
        </View>

        <View style={styles.gamesList}>
          {gameCategories.map(renderGameCard)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 2.5,
    opacity: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: "Cormorant-Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginTop: 6,
    opacity: 0.5,
  },
  statsOverview: {
    marginBottom: 32,
    borderWidth: 0.5,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  radialContainer: {
    marginRight: 20,
    backgroundColor: "transparent",
  },
  radialCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  radialCenterText: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  radialLevelNumber: {
    fontSize: 26,
    lineHeight: 30,
  },
  radialLevelLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    opacity: 0.7,
  },
  statDetails: {
    flex: 1,
    backgroundColor: "transparent",
  },
  statCounselTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  expRow: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  statExpText: {
    fontSize: 18,
  },
  expTrack: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    overflow: "hidden",
    marginBottom: 6,
  },
  expFill: {
    height: "100%",
    borderRadius: 2,
  },
  statRankDesc: {
    fontSize: 10,
    opacity: 0.5,
  },
  gamesList: {
    backgroundColor: "transparent",
  },
  gameCard: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "column",
    padding: 24,
    marginBottom: 20,
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
  cardTitle: {
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
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "transparent",
  },
  langText: {
    fontSize: 11,
    opacity: 0.7,
  },
  inlineProgressContainer: {
    flex: 1,
    height: 4,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  inlineProgressBg: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    overflow: "hidden",
  },
  inlineProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
