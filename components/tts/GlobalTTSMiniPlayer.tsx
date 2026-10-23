import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { pauseGlobalTTS, resumeGlobalTTS, stopGlobalTTS, useGlobalTTS } from "@/services/ttsService";

export function GlobalTTSMiniPlayer({ isReaderScreen = false }: { isReaderScreen?: boolean }) {
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const { i18n } = useTranslation();
  const ttsState = useGlobalTTS();

  const { isPlaying, isPaused, queueContext } = ttsState;

  // Show if either playing or paused (but not stopped entirely)
  if ((!isPlaying && !isPaused) || !queueContext) {
    return null;
  }

  const handlePress = () => {
    if (isReaderScreen) return; // Reader screen auto-syncs UI, no need to navigate

    router.push({
      pathname: "/legal-section",
      params: {
        codeId: queueContext.codeId,
        language: queueContext.language,
        versionId: queueContext.versionId,
        sectionId: queueContext.sectionId,
      },
    });
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      void pauseGlobalTTS();
    } else {
      void resumeGlobalTTS();
    }
  };

  const handleStop = () => {
    void stopGlobalTTS();
  };

  const label = i18n.language === "th" 
    ? (isPlaying ? "กำลังเล่น:" : "หยุดพัก:") 
    : (isPlaying ? "Playing:" : "Paused:");
  const sectionText = queueContext.sectionId.toUpperCase();

  return (
    <View style={[styles.container, isReaderScreen && { bottom: Platform.OS === "ios" ? 40 : 30 }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
        <BlurView
          intensity={isDark ? 30 : 50}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blurContainer,
            {
              backgroundColor: isDark
                ? "rgba(20,20,20,0.85)"
                : "rgba(255,255,255,0.85)",
              borderColor: colors.glassBorder,
            },
          ]}
        >
          <View style={styles.infoSection}>
            <View style={[styles.iconBox, { backgroundColor: tintColor + "20" }]}>
              <Ionicons name="volume-medium" size={16} color={tintColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.playingLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]} numberOfLines={1}>
                {label}
              </Text>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.text, fontFamily: typography.fonts.bold },
                ]}
                numberOfLines={1}
              >
                {sectionText}
              </Text>
            </View>
          </View>

          <View style={styles.controlsSection}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.controlBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleStop}
              style={styles.controlBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="stop-circle" size={26} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 105,
    left: 20,
    right: 20,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  blurContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  playingLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  controlsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingLeft: 12,
  },
  controlBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
});
