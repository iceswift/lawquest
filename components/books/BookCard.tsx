import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback } from "react";
import {
    Dimensions,
    DimensionValue,
    Platform,
    StyleSheet,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useAppTheme } from "@/context/ThemeContext";

import { BookVersionSummary, LawBook } from "./types";

const { width } = Dimensions.get("window");
const DEFAULT_COLUMN_COUNT = 2;
const DEFAULT_CARD_WIDTH = (width - 56) / DEFAULT_COLUMN_COUNT;

type BookCardProps = {
  actionLabel: string;
  authoritativeLanguages: string[];
  borderColor: string;
  failed: boolean;
  installed: boolean;
  installedLanguages: string[];
  isBusy: boolean;
  isDark: boolean;
  isPinned: boolean;
  item: LawBook;
  onOpenMenu: (item: LawBook, installed: boolean, packageSize: string) => void;
  onCancelOperation?: (item: LawBook) => void;
  onPress: (item: LawBook, installedLanguages: string[]) => void;
  operationLabel?: string;
  packageSize: string;
  progress: number;
  subtextColor: string;
  textColor: string;
  tintColor: string;
  title: string;
  versionSummary: BookVersionSummary | null;
  layout?: "grid" | "list";
  cardWidth?: DimensionValue;
  scale?: number;
};

export const BookCard = memo(function BookCard({
  actionLabel,
  authoritativeLanguages,
  borderColor,
  failed,
  installed,
  installedLanguages,
  isBusy,
  isDark,
  isPinned,
  item,
  onOpenMenu,
  onCancelOperation,
  onPress,
  operationLabel,
  packageSize,
  progress,
  subtextColor,
  textColor,
  tintColor,
  title,
  versionSummary,
  layout,
  cardWidth,
  scale = 1,
}: BookCardProps) {
  const { colors } = useAppTheme();
  const coverColor = colors.card;

  const outerRadius = Math.round((54 * scale) / 2);
  const outerSize = outerRadius * 2;
  const innerRadius = Math.round((48 * scale) / 2);
  const innerSize = innerRadius * 2;
  const iconSize = Math.round(18 * scale);

  const handlePress = useCallback(() => {
    if (isBusy) {
      return;
    }

    onPress(item, installedLanguages);
  }, [installedLanguages, isBusy, item, onPress]);

  const handleOpenMenu = useCallback(() => {
    onOpenMenu(item, installed, packageSize);
  }, [installed, item, onOpenMenu, packageSize]);

  if (layout === "list") {
    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
            borderColor: isPinned 
              ? (isDark ? "rgba(229, 193, 88, 0.75)" : "rgba(184, 150, 76, 0.85)")
              : (isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)"),
          },
        ]}
        disabled={isBusy}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.listEmblemContainer,
            {
              borderColor: isDark ? "rgba(212,175,55,0.35)" : "rgba(184,150,76,0.45)",
              backgroundColor: isDark ? "rgba(212,175,55,0.05)" : "rgba(184,150,76,0.08)",
            },
          ]}
        >
          <View
            style={{
              position: "absolute",
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 0.5,
              borderColor: isDark ? "rgba(212,175,55,0.2)" : "rgba(184,150,76,0.25)",
            }}
          />
          <FontAwesome5 name={item.icon} size={16} color={tintColor} />
        </View>

        <View style={styles.listMainArea}>
          <Text style={[styles.listTitle, { color: textColor }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.listLanguageRow}>
            {installedLanguages.length > 0 ? (
              installedLanguages.map((lang) => (
                <View
                  key={lang}
                  style={[
                    styles.miniBadge,
                    {
                      borderColor: tintColor + "30",
                      backgroundColor: isDark ? "rgba(229, 193, 88, 0.03)" : "rgba(184, 150, 76, 0.03)",
                    },
                  ]}
                >
                  <Text style={[styles.miniBadgeText, { color: tintColor }]}>
                    {lang.toUpperCase()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.pendingText, { color: subtextColor }]}>
                PENDING
              </Text>
            )}
            
            {isBusy && operationLabel && (
              <Text style={[styles.listOperationLabel, { color: tintColor }]}>
                {operationLabel} {Math.round(progress * 100)}%
              </Text>
            )}
          </View>
        </View>

        <View style={styles.listRightArea}>
          <TouchableOpacity onPress={handleOpenMenu} hitSlop={10} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color={subtextColor} style={{ opacity: 0.5 }} />
          </TouchableOpacity>

          {!isBusy && (
            <View
              style={[
                styles.actionTag,
                {
                  borderColor: isPinned ? tintColor : (installed ? "transparent" : tintColor + "40"),
                  backgroundColor: isPinned ? (isDark ? "rgba(229,193,88,0.06)" : "rgba(184,150,76,0.06)") : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.actionTagText,
                  { color: isPinned ? tintColor : (installed ? subtextColor : tintColor) },
                ]}
              >
                {isPinned ? "✦ PINNED" : (installed ? "COLLECTION" : "ARCHIVE")}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.bookCard,
        {
          width: cardWidth ?? DEFAULT_CARD_WIDTH,
          backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
          borderColor: isPinned 
            ? (isDark ? "rgba(229, 193, 88, 0.75)" : "rgba(184, 150, 76, 0.85)")
            : (isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)"),
        },
      ]}
      disabled={isBusy}
      onPress={handlePress}
      activeOpacity={0.92}
    >

      <View style={styles.bookContent}>
        {/* Top Meta */}
        <View style={styles.bookHeader}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: installed
                  ? "#10B981"
                  : failed
                    ? "#EF4444"
                    : "rgba(212, 175, 55, 0.3)",
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleOpenMenu}
            style={styles.menuButton}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={14}
              color={subtextColor}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
        </View>

        {/* Main Title Area */}
        <View style={styles.bookMainArea}>
          {/* Simple Circular Seal */}
          <View
            style={[
              styles.emblemContainer,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: outerRadius,
                borderColor: isDark ? "rgba(212,175,55,0.4)" : "rgba(184,150,76,0.5)",
                backgroundColor: "transparent",
                borderWidth: 1.5,
              },
            ]}
          >
            <FontAwesome5 name={item.icon} size={iconSize} color={tintColor} />
          </View>

          <Text
            style={[styles.bookTitle, { color: textColor }]}
            numberOfLines={3}
          >
            {title}
          </Text>

          {/* Languages & Version */}
          <View style={styles.badgeContainer}>
            {installedLanguages.length > 0 ? (
              <View style={styles.languageRow}>
                {installedLanguages.map((lang) => (
                  <View
                    key={lang}
                    style={[
                      styles.miniBadge,
                      {
                        borderColor: tintColor + "30",
                        backgroundColor: isDark ? "rgba(229, 193, 88, 0.03)" : "rgba(184, 150, 76, 0.03)",
                      },
                    ]}
                  >
                    <Text style={[styles.miniBadgeText, { color: tintColor }]}>
                      {lang.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.pendingText, { color: subtextColor }]}>
                PENDING
              </Text>
            )}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.bookFooter}>
          {isBusy ? (
            <View style={styles.downloadStatus}>
              {operationLabel && (
                <Text
                  numberOfLines={1}
                  style={[styles.operationLabel, { color: subtextColor }]}
                >
                  {operationLabel}
                </Text>
              )}
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: tintColor, width: `${progress * 100}%` },
                  ]}
                />
              </View>
              {onCancelOperation && operationLabel?.toLowerCase().includes("index") && (
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => onCancelOperation(item)}
                  style={styles.cancelOperationButton}
                >
                  <Ionicons name="close-circle-outline" size={16} color={subtextColor} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.actionTag,
                {
                  borderColor: isPinned ? tintColor : (installed ? "transparent" : tintColor + "40"),
                  backgroundColor: isPinned ? (isDark ? "rgba(229,193,88,0.06)" : "rgba(184,150,76,0.06)") : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.actionTagText,
                  { color: isPinned ? tintColor : (installed ? subtextColor : tintColor) },
                ]}
              >
                {isPinned ? "✦ PINNED" : (installed ? "COLLECTION" : "ARCHIVE")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  bookCard: {
    aspectRatio: 1 / 1.55,
    borderRadius: 20,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 0.5,
    position: "relative",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardAccentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bookSpine: {
    width: 16,
    height: "100%",
    position: "relative",
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.1)",
  },
  spineRib: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  bookContent: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 14,
  },
  bookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuButton: {
    padding: 2,
  },
  bookMainArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  emblemContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  bookTitle: {
    fontSize: 18,
    fontFamily: "Cormorant-Bold",
    lineHeight: 22,
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  badgeContainer: {
    marginTop: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  languageRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "transparent",
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  miniBadgeText: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  pendingText: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
    opacity: 0.3,
  },
  indexStatusBadge: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 5,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 3,
    marginTop: 7,
    maxWidth: "100%",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  indexStatusText: {
    fontFamily: "Inter-Bold",
    fontSize: 7,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  bookFooter: {
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  actionTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  actionTagText: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
  },
  downloadStatus: {
    gap: 6,
    width: "100%",
    backgroundColor: "transparent",
  },
  cancelOperationButton: {
    alignSelf: "flex-end",
    backgroundColor: "transparent",
    marginTop: -2,
  },
  operationLabel: {
    fontFamily: "Inter-Bold",
    fontSize: 9,
    letterSpacing: 0,
    opacity: 0.62,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 2,
    width: "100%",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  bookmarkTag: {
    position: "absolute",
    top: 0,
    right: 16,
    width: 14,
    height: 24,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  listCard: {
    width: "100%",
    borderRadius: 16,
    flexDirection: "row",
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 12,
    alignItems: "center",
  },
  listEmblemContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  listMainArea: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  listTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    lineHeight: 20,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  listLanguageRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  listRightArea: {
    alignItems: "flex-end",
    marginLeft: 12,
    justifyContent: "space-between",
    height: 48,
    backgroundColor: "transparent",
  },
  listOperationLabel: {
    fontFamily: "Inter-Bold",
    fontSize: 9,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
});
