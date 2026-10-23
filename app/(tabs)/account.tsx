import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import * as Localization from "expo-localization";
import { useTranslation } from "react-i18next";
import i18n from "../../constants/i18n";
import { ACCENT_COLORS, useAppTheme } from "../../context/ThemeContext";

export default function AccountScreen() {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, theme, isDark, tintColor, setTintColor, colors, typography, layout } =
    useAppTheme();
  const { status, user, sendMagicLink, signOut, redirectUrl } = useAuth();

  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const subtextColor = isDark ? Colors.dark.subtext : Colors.light.subtext;
  const cardBg = isDark ? Colors.dark.card : Colors.light.card;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const isAuthenticated = status === "authenticated";
  const profileEmail = user?.email ?? "";
  const profileName = profileEmail || "Guest mode";
  const avatarText = profileEmail
    ? profileEmail.slice(0, 2).toUpperCase()
    : "G";

  const [languageMode, setLanguageModeState] = useState(
    i18n.language.toUpperCase(),
  );
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const setLanguageMode = (mode: string) => {
    setLanguageModeState(mode);
    if (mode === "SYSTEM") {
      const deviceLanguage =
        Localization.getLocales()[0].languageCode?.split("-")[0] || "en";
      i18n.changeLanguage(deviceLanguage);
    } else {
      i18n.changeLanguage(mode.toLowerCase());
    }
  };

  const [activeMenu, setActiveMenu] = useState<"language" | "theme" | null>(
    null,
  );

  const handleSendMagicLink = async () => {
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await sendMagicLink(email);
      setAuthMessage("Check your email for a LawQuest sign-in link.");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to send the sign-in link right now.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await signOut();
      setEmail("");
    } catch (error) {
      Alert.alert(
        "Sign out failed",
        error instanceof Error ? error.message : "Unable to sign out right now.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle?: string,
    color: string = tintColor,
    rightElement?: React.ReactNode,
  ) => (
    <View style={[styles.menuItem, { borderBottomColor: colors.goldSubtle }]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.surfaceSoft,
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.menuSubtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </View>
  );

  const CustomDropdown = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.dropdownContainer,
        {
          backgroundColor: colors.surfaceSoft,
          borderColor: colors.goldSubtle,
          borderWidth: 1,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.dropdownValue, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={14} color={colors.subtext} />
    </TouchableOpacity>
  );

  const DropdownMenu = () => {
    if (!activeMenu) return null;

    const options =
      activeMenu === "language"
        ? [
            { label: t("account.languageOptions.th"), value: "TH" },
            { label: t("account.languageOptions.en"), value: "EN" },
            { label: t("account.languageOptions.system"), value: "SYSTEM" },
          ]
        : [
            { label: t("account.themeOptions.light"), value: "light" },
            { label: t("account.themeOptions.dark"), value: "dark" },
            { label: t("account.themeOptions.system"), value: "system" },
          ];

    const currentValue = activeMenu === "language" ? languageMode : themeMode;
    const onSelect = (val: any) => {
      if (activeMenu === "language") setLanguageMode(val);
      else setThemeMode(val);
      setActiveMenu(null);
    };

    return (
      <Modal transparent visible animationType="fade">
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setActiveMenu(null)}
        >
          <View
            style={[
              styles.dropdownMenu,
              { backgroundColor: colors.card, borderColor: colors.goldSubtle },
            ]}
          >
            <Text
              style={[
                styles.menuHeader,
                { color: colors.subtext, borderBottomColor: colors.goldSubtle, fontFamily: typography.fonts.bold },
              ]}
            >
              {activeMenu === "language"
                ? t("account.language").toUpperCase()
                : t("account.theme").toUpperCase()}
            </Text>
            {options.map((opt, index) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionRow,
                  index !== options.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.goldSubtle,
                  },
                  currentValue === opt.value && {
                    backgroundColor: colors.surfaceSoft,
                  },
                ]}
                onPress={() => onSelect(opt.value)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: colors.text, fontFamily: typography.fonts.bold },
                    currentValue === opt.value && {
                      color: tintColor,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {currentValue === opt.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={tintColor}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      contentContainerStyle={styles.content}
    >
      <DropdownMenu />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
          {isAuthenticated ? "PRIVATE CHAMBER" : "LOCAL CHAMBER"}
        </Text>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>Account</Text>
        <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
          {isAuthenticated
            ? "Manage your synced LawQuest profile"
            : "Read, save, highlight, and take notes before signing in"}
        </Text>
      </View>

      {/* Profile Card */}
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.goldSubtle },
        ]}
      >
        <View style={styles.profileRow}>
          <View style={[styles.avatarWrapper, { borderColor: tintColor }]}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.surfaceSoft,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: tintColor, fontFamily: typography.fonts.bold }]}>{avatarText}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {profileName}
            </Text>
            <Text style={[styles.userRole, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              {isAuthenticated
                ? "Signed in with Supabase Auth"
                : "Local-first guest workspace"}
            </Text>
          </View>
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.goldSubtle }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {isAuthenticated ? "ON" : "GUEST"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
              ACCOUNT
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.goldSubtle }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              LOCAL
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
              WRITES
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.goldSubtle }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {isAuthenticated ? "READY" : "OFF"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
              SYNC
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: typography.fonts.bold }]}>
        Member Access
      </Text>
      <View
        style={[
          styles.card,
          styles.authCard,
          { backgroundColor: colors.card, borderColor: colors.goldSubtle },
        ]}
      >
        {status === "loading" ? (
          <View style={styles.authLoadingRow}>
            <ActivityIndicator color={tintColor} />
            <Text style={[styles.authBody, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              Checking your session...
            </Text>
          </View>
        ) : isAuthenticated ? (
          <>
            <Text style={[styles.authTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Sync account active
            </Text>
            <Text style={[styles.authBody, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              Your account is ready for the next sync phase. Local data still stays available on this device.
            </Text>
            <TouchableOpacity
              disabled={authBusy}
              onPress={handleSignOut}
              style={[
                styles.authButton,
                { backgroundColor: colors.surfaceSoft, borderColor: colors.goldSubtle },
                authBusy && styles.disabledButton,
              ]}
            >
              {authBusy ? (
                <ActivityIndicator color={tintColor} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={18} color={tintColor} />
                  <Text style={[styles.authButtonText, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                    Sign out
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.authTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Continue as guest
            </Text>
            <Text style={[styles.authBody, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              Sign in only when you want to sync notes, highlights, saved sections, and preferences across devices.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.subtext}
              style={[
                styles.authInput,
                {
                  backgroundColor: colors.surfaceSoft,
                  borderColor: colors.goldSubtle,
                  color: colors.text,
                  fontFamily: typography.fonts.primary,
                },
              ]}
              value={email}
            />
            <TouchableOpacity
              disabled={authBusy}
              onPress={handleSendMagicLink}
              style={[
                styles.authButton,
                { backgroundColor: tintColor, borderColor: tintColor },
                authBusy && styles.disabledButton,
              ]}
            >
              {authBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#fff" />
                  <Text style={[styles.authButtonText, { color: "#fff", fontFamily: typography.fonts.bold }]}>
                    Send sign-in link
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.redirectHint, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              Redirect: {redirectUrl}
            </Text>
          </>
        )}
        {authMessage ? (
          <Text style={[styles.authMessage, { color: tintColor, fontFamily: typography.fonts.primary }]}>
            {authMessage}
          </Text>
        ) : null}
        {authError ? (
          <Text style={[styles.authMessage, { color: "#ff3b30", fontFamily: typography.fonts.primary }]}>
            {authError}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: typography.fonts.bold }]}>
        {t("account.preferences")}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.goldSubtle },
        ]}
      >
        {renderMenuItem(
          "language-outline",
          t("account.language"),
          undefined,
          tintColor,
          <CustomDropdown
            label="Language"
            value={languageMode === "SYSTEM" ? t("common.auto") : languageMode}
            onPress={() => setActiveMenu("language")}
          />,
        )}

        {renderMenuItem(
          isDark ? "moon-outline" : "sunny-outline",
          t("account.darkMode"),
          undefined,
          tintColor,
          <CustomDropdown
            label="Theme"
            value={
              themeMode === "system"
                ? t("common.auto")
                : t(`account.themeOptions.${themeMode}`)
            }
            onPress={() => setActiveMenu("theme")}
          />,
        )}

        <View style={styles.colorPickerSection}>
          <View style={styles.colorPickerHeader}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors.surfaceSoft,
                },
              ]}
            >
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={tintColor}
              />
            </View>
            <Text style={[styles.menuTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {t("account.appColorTheme")}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.colorList}
          >
            {ACCENT_COLORS.map((item) => (
              <TouchableOpacity
                key={item.color}
                style={[
                  styles.colorSquare,
                  { backgroundColor: item.color },
                  tintColor === item.color && {
                    borderColor: textColor,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setTintColor(item.color)}
              >
                {tintColor === item.color && (
                  <Ionicons name="checkmark" size={18} color="white" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.colorSquare,
                styles.plusSquare,
                { borderColor: colors.goldSubtle },
              ]}
              onPress={() => router.push("/theme-color")}
            >
              <Ionicons name="add" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: typography.fonts.bold }]}>
        {t("account.usage")}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.goldSubtle },
        ]}
      >
        {renderMenuItem("bookmark-outline", t("account.bookmarks"))}
        {renderMenuItem("text-outline", t("account.fontSize"))}
        {renderMenuItem("notifications-outline", t("account.notifications"))}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: typography.fonts.bold }]}>
        {t("account.support")}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.goldSubtle },
        ]}
      >
        {renderMenuItem("help-circle-outline", t("account.helpCenter"))}
        <TouchableOpacity onPress={() => router.push("/about")}>
          {renderMenuItem("information-circle-outline", t("account.about"))}
        </TouchableOpacity>
      </View>

      {isAuthenticated ? (
        <TouchableOpacity
          disabled={authBusy}
          onPress={handleSignOut}
          style={[
            styles.signOutButton,
            {
              borderColor: isDark ? "rgba(255,59,48,0.3)" : "rgba(255,59,48,0.2)",
            },
            authBusy && styles.disabledButton,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#ff3b30"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.signOutText}>{t("account.signOut")}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[styles.versionText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
        Version 1.2.0 - Local-first member foundation
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 32,
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
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Inter-Bold",
    marginBottom: 14,
    marginLeft: 4,
    letterSpacing: 0.2,
    opacity: 0.4,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
    overflow: "hidden",
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
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  profileInfo: {
    marginLeft: 16,
    backgroundColor: "transparent",
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.3,
  },
  userRole: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginTop: 2,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    borderTopWidth: 1,
    backgroundColor: "transparent",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    marginTop: 4,
    letterSpacing: 0.5,
    opacity: 0.4,
  },
  authCard: {
    padding: 18,
  },
  authLoadingRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
  },
  authTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  authBody: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.65,
  },
  authInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    height: 48,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  authButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    marginTop: 12,
  },
  authButtonText: {
    fontSize: 13,
    fontFamily: "Inter-Bold",
  },
  authMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  redirectHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    opacity: 0.45,
  },
  disabledButton: {
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.1)",
  },
  menuContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    marginTop: 2,
    opacity: 0.5,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: "space-between",
  },
  dropdownValue: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    marginRight: 6,
  },
  colorPickerSection: {
    padding: 18,
    backgroundColor: "transparent",
  },
  colorPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "transparent",
  },
  colorList: {
    flexDirection: "row",
  },
  colorSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  plusSquare: {
    borderWidth: 1,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  dropdownMenu: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 8,
  },
  menuHeader: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    textAlign: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
    letterSpacing: 1,
    opacity: 0.5,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
  signOutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  signOutText: {
    color: "#ff3b30",
    fontSize: 14,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.2,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter-Medium",
    marginTop: 40,
    opacity: 0.3,
  },
});
