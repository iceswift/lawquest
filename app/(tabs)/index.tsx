import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
} from "react-native";

import { RecentlyViewedPanel } from "@/components/home/RecentlyViewedPanel";
import { RecentNotesPanel } from "@/components/home/RecentNotesPanel";
import { ShortcutsGrid } from "@/components/home/ShortcutsGrid";
import { Text, View } from "@/components/Themed";
import { useHomeActivity } from "@/hooks/useHomeActivity";
import {
    DEFAULT_HOME_SHORTCUTS,
    getHomeShortcutRoute,
    HomeShortcutItem,
    readHomeShortcuts,
    saveHomeShortcutOrder,
} from "@/services/homeShortcuts";
import { useAppTheme } from "../../context/ThemeContext";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { isDark, tintColor, colors, layout, typography } = useAppTheme();

  const [isEditMode, setIsEditMode] = useState(false);
  const [data, setData] = useState<HomeShortcutItem[]>(() => [
    ...DEFAULT_HOME_SHORTCUTS,
  ]);
  const { recentNotes, recentlyViewedSections } = useHomeActivity(3);

  useEffect(() => {
    let isActive = true;

    readHomeShortcuts()
      .then((shortcuts) => {
        if (isActive) {
          setData(shortcuts);
        }
      })
      .catch((error) => {
        console.warn("Failed to load home shortcuts", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleShortcutDataChange = useCallback((nextData: HomeShortcutItem[]) => {
    setData(nextData);
    saveHomeShortcutOrder(nextData).catch((error) => {
      console.warn("Failed to save home shortcuts", error);
    });
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: layout.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isEditMode}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
          <Link href="/country" asChild>
            <TouchableOpacity style={styles.topBarIcon}>
              <Text style={{ fontSize: 24 }}>🇹🇭</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/notifications" asChild>
            <TouchableOpacity style={styles.topBarIcon}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={tintColor}
              />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Text style={{ textAlign: "center" }}>
            <Text style={[styles.logoTextPrimary, { color: tintColor, fontFamily: typography.fonts.regal }]}>LAW</Text>
            <Text style={[styles.logoTextSecondary, { color: colors.text, fontWeight: "200" }]}>QUEST</Text>
          </Text>
          <Text style={[styles.logoSubtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            CHAMBERS OF JURISPRUDENCE
          </Text>
        </View>

        {/* Search Bar Section */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? "rgba(18, 21, 29, 0.65)" : "rgba(255, 255, 255, 0.72)",
              borderColor: colors.glassBorder,
              borderWidth: 1,
              height: layout.search.height,
              borderRadius: layout.search.borderRadius,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.subtext}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={t("home.welcome")}
            placeholderTextColor={colors.subtext + "90"}
            style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.primary }]}
            editable={!isEditMode}
            showSoftInputOnFocus={false}
            onPressIn={() => {
              if (!isEditMode) {
                router.push("/home-search");
              }
            }}
          />
        </View>

        <View style={[styles.mainContent, { paddingHorizontal: layout.spacing.lg }]}>
          <ShortcutsGrid
            borderColor={colors.border}
            cardBg={colors.card}
            data={data}
            isDark={isDark}
            isEditMode={isEditMode}
            onDataChange={handleShortcutDataChange}
            onEditModeChange={setIsEditMode}
            onShortcutPress={(item) => {
              const route = getHomeShortcutRoute(item.key);

              if (route) {
                router.push(route);
              }
            }}
            textColor={colors.text}
            tintColor={tintColor}
          />

          {!isEditMode && (
            <RecentlyViewedPanel
              borderColor={colors.border}
              cardBg={colors.card}
              isDark={isDark}
              items={recentlyViewedSections}
              subtextColor={colors.subtext}
              textColor={colors.text}
              tintColor={tintColor}
            />
          )}

          {!isEditMode && (
            <RecentNotesPanel
              borderColor={colors.border}
              cardBg={colors.card}
              isDark={isDark}
              items={recentNotes}
              subtextColor={colors.subtext}
              textColor={colors.text}
              tintColor={tintColor}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
  },
  mainContent: {
    width: "100%",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  topBarIcon: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48, // Slightly tighter layout
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logoTextPrimary: {
    fontSize: 42,
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  logoTextSecondary: {
    fontSize: 42,
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  logoSubtitle: {
    fontSize: 9,
    letterSpacing: 4,
    textTransform: "uppercase",
    opacity: 0.5,
    marginTop: 8,
  },
  searchBar: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 20,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    marginBottom: 35,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  iconButton: {
    padding: 4,
  },
});
