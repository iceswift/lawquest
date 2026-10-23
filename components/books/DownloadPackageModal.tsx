import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";

import { DownloadLanguageOption } from "./types";

type DownloadPackageModalProps = {
  backdropBorderColor: string;
  cardBg: string;
  description: string;
  isDark: boolean;
  languageOptions: DownloadLanguageOption[];
  onClose: () => void;
  onConfirm: () => void;
  onToggleLanguage: (language: string) => void;
  sectionCount: number;
  sizeLabel: string;
  subtextColor: string;
  textColor: string;
  tintColor: string;
  title: string;
  visible: boolean;
};

export function DownloadPackageModal({
  backdropBorderColor,
  cardBg,
  description,
  isDark,
  languageOptions,
  onClose,
  onConfirm,
  onToggleLanguage,
  sectionCount,
  sizeLabel,
  subtextColor,
  textColor,
  tintColor,
  title,
  visible,
}: DownloadPackageModalProps) {
  const confirmDisabled = languageOptions.every((option) => !option.isSelected);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <BlurView
        intensity={isDark ? 30 : 50}
        style={styles.modalBackdrop}
        tint={isDark ? "dark" : "light"}
      >
        <View
          style={[
            styles.downloadModal,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)",
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalSealContainer,
                {
                  backgroundColor: isDark
                    ? Colors.dark.surfaceMuted
                    : Colors.light.surface,
                  borderColor: tintColor + "30",
                },
              ]}
            >
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color={tintColor}
              />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalCloseButton,
                {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Ionicons name="close" size={20} color={subtextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.modalMainContent}>
              <Text
                style={[styles.modalTitle, { color: textColor }]}
                numberOfLines={2}
              >
                {title}
              </Text>

              <Text style={[styles.modalDescription, { color: subtextColor }]}>
                {description}
              </Text>

              <View style={styles.languageSelectionList}>
                {languageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.language}
                    activeOpacity={0.88}
                    onPress={() => onToggleLanguage(option.language)}
                    style={[
                      styles.languageChoice,
                      {
                        borderColor: option.isSelected
                          ? tintColor + "60"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                        backgroundColor: option.isSelected
                          ? tintColor + "08"
                          : isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                      },
                    ]}
                  >
                    <View style={styles.languageChoiceLeft}>
                      <View
                        style={[
                          styles.languageCheck,
                          {
                            borderColor: option.isSelected
                              ? tintColor
                              : isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)",
                            backgroundColor: option.isSelected
                              ? tintColor
                              : "transparent",
                          },
                        ]}
                      >
                        {option.isSelected && (
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        )}
                      </View>
                      <View style={styles.languageChoiceTextBlock}>
                        <View style={styles.languageChoiceTitleRow}>
                          <Text
                            style={[
                              styles.languageChoiceTitle,
                              { color: textColor },
                            ]}
                          >
                            {option.language.toUpperCase()} VERSION
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.languageChoiceSubtitle,
                            { color: subtextColor },
                          ]}
                          numberOfLines={1}
                        >
                          {option.versionId} • {option.sourceBadge.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.languageChoiceRight}>
                      {option.isInstalled && (
                        <Text
                          style={[styles.installedBadge, { color: tintColor }]}
                        >
                          ACTIVE
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.languageChoiceSize,
                          { color: subtextColor },
                        ]}
                      >
                        {option.sizeLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={[
                  styles.modalInfoBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.01)"
                      : "rgba(0,0,0,0.01)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <InfoRow
                  label="ACQUISITION"
                  labelColor={subtextColor}
                  value="LOCAL ARCHIVE"
                  valueColor={textColor}
                />
                <View
                  style={[
                    styles.modalSeparator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                />
                <InfoRow
                  label="EST. SIZE"
                  labelColor={subtextColor}
                  value={sizeLabel}
                  valueColor={textColor}
                />
                <View
                  style={[
                    styles.modalSeparator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                />
                <InfoRow
                  label="CONTENT"
                  labelColor={subtextColor}
                  value={`${sectionCount.toLocaleString()} ARTICLES`}
                  valueColor={textColor}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.modalSecondaryButton,
                  {
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  },
                ]}
              >
                <Text
                  style={[styles.modalSecondaryText, { color: subtextColor }]}
                >
                  DISMISS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={confirmDisabled}
                activeOpacity={0.8}
                style={styles.modalPrimaryButtonWrapper}
              >
                <LinearGradient
                  colors={
                    confirmDisabled
                      ? [isDark ? "#333" : "#CCC", isDark ? "#333" : "#CCC"]
                      : [tintColor, isDark ? "#D4AF37" : "#C5A059"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.modalPrimaryButton,
                    { opacity: confirmDisabled ? 0.5 : 1 },
                  ]}
                >
                  <Text style={styles.modalPrimaryText}>
                    AUTHORIZE DOWNLOAD
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

function InfoRow({
  label,
  labelColor,
  value,
  valueColor,
}: {
  label: string;
  labelColor: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={styles.modalInfoRow}>
      <Text style={[styles.modalInfoLabel, { color: labelColor }]}>
        {label}
      </Text>
      <Text style={[styles.modalInfoValue, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  downloadModal: {
    borderRadius: 36,
    borderWidth: 0.5,
    maxHeight: "85%",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 28,
    paddingTop: 28,
    backgroundColor: "transparent",
  },
  modalSealContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalMainContent: {
    backgroundColor: "transparent",
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: "Cormorant-Bold",
    lineHeight: 32,
    letterSpacing: -0.5,
    paddingHorizontal: 28,
    marginTop: 20,
    textAlign: "center",
  },
  modalDescription: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: "Inter-Medium",
    lineHeight: 22,
    opacity: 0.4,
    paddingHorizontal: 28,
    textAlign: "center",
  },
  languageSelectionList: {
    marginTop: 24,
    gap: 12,
    backgroundColor: "transparent",
    paddingHorizontal: 28,
  },
  languageChoice: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languageChoiceLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  languageCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  languageChoiceTextBlock: {
    flex: 1,
    backgroundColor: "transparent",
  },
  languageChoiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  languageChoiceTitle: {
    fontSize: 13,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  languageChoiceSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: "Inter-Medium",
    opacity: 0.4,
  },
  languageChoiceRight: {
    alignItems: "flex-end",
    backgroundColor: "transparent",
    marginLeft: 10,
  },
  installedBadge: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  languageChoiceSize: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    opacity: 0.3,
  },
  modalInfoBox: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginTop: 28,
    marginHorizontal: 28,
  },
  modalSeparator: {
    height: 1,
    width: "100%",
    marginVertical: 14,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modalInfoLabel: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
    opacity: 0.4,
  },
  modalInfoValue: {
    fontSize: 12,
    fontFamily: "Inter-Bold",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: "transparent",
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
  },
  modalPrimaryButtonWrapper: {
    flex: 1.4,
  },
  modalPrimaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter-Bold",
    letterSpacing: 1,
  },
});
