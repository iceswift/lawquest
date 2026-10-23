import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";

import { Text, View } from "@/components/Themed";
import { LegalPackageDocument } from "@/services/legalStorage";

type ReaderCopy = {
  baseVersion: string;
  none: string;
  reviewStatus: string;
  sections: string;
  sourceType: string;
  translationStatus: string;
  versionId: string;
  versionInfo: string;
};

type SourceBadge = {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
} | null;

type VersionInfoPanelProps = {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  legalPackage: LegalPackageDocument | null;
  onClose: () => void;
  readerCopy: ReaderCopy;
  sourceBadge: SourceBadge;
  subtextColor: string;
  summary: string;
  textColor: string;
  tintColor: string;
  visible: boolean;
  availableLanguages?: string[];
  selectedLanguage?: string;
  onLanguageChange?: () => void;
  languageLabel?: string;
};

export function VersionInfoPanel({
  borderColor,
  cardBg,
  isDark,
  legalPackage,
  onClose,
  readerCopy,
  sourceBadge,
  subtextColor,
  summary,
  textColor,
  tintColor,
  visible,
  availableLanguages = [],
  selectedLanguage,
  onLanguageChange,
  languageLabel = "Language",
}: VersionInfoPanelProps) {
  if (!legalPackage) {
    return null;
  }

  const version = legalPackage.version;
  const rows = [
    [readerCopy.versionId, version.versionId],
    [readerCopy.baseVersion, version.basedOnVersionId ?? readerCopy.none],
    [readerCopy.sourceType, formatVersionField(version.sourceType)],
    [readerCopy.reviewStatus, formatVersionField(version.reviewStatus)],
    [readerCopy.translationStatus, formatVersionField(version.translationStatus)],
    [readerCopy.sections, legalPackage.sectionCount.toLocaleString()],
  ];

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <BlurView
        intensity={isDark ? 30 : 50}
        style={styles.versionPanelBackdrop}
        tint={isDark ? "dark" : "light"}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.versionPanel,
            { 
              backgroundColor: cardBg, 
              borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)" 
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalSealContainer,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  borderColor: tintColor + "30",
                },
              ]}
            >
              <Ionicons name="options-outline" size={24} color={tintColor} />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalCloseButton,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
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
                {readerCopy.versionInfo.toUpperCase()}
              </Text>
              
              <Text style={[styles.modalDescription, { color: subtextColor }]}>
                {summary.toUpperCase()}
              </Text>

              <View style={styles.actionMenuBox}>
                {availableLanguages.length > 1 && selectedLanguage && (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      {
                        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      }
                    ]}
                    activeOpacity={0.7}
                    onPress={onLanguageChange}
                  >
                    <Ionicons name="language-outline" size={18} color={tintColor} />
                    <Text style={[styles.dropdownText, { color: textColor }]}>
                      {languageLabel}
                    </Text>
                      <View style={{ flex: 1, alignItems: "flex-end", backgroundColor: "transparent" }}>
                         <View style={{ 
                           backgroundColor: tintColor + "15", 
                           paddingHorizontal: 10, 
                           paddingVertical: 4, 
                           borderRadius: 12,
                           borderWidth: 1,
                           borderColor: tintColor + "30"
                         }}>
                           <Text style={{ fontFamily: "Inter-Bold", color: tintColor, fontSize: 11, letterSpacing: 0.5 }}>
                             {selectedLanguage.toUpperCase()}
                           </Text>
                         </View>
                      </View>
                  </TouchableOpacity>
                )}
              </View>

              {sourceBadge && (
                <View style={{ paddingHorizontal: 28, marginBottom: 16, backgroundColor: "transparent" }}>
                  <View
                    style={[
                      styles.versionStatusBand,
                      { backgroundColor: sourceBadge.color + "12" },
                    ]}
                  >
                    <Ionicons
                      name={sourceBadge.icon}
                      size={16}
                      color={sourceBadge.color}
                    />
                    <Text
                      style={[styles.versionStatusText, { color: sourceBadge.color }]}
                    >
                      {sourceBadge.label}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ paddingHorizontal: 28, paddingBottom: 32, backgroundColor: "transparent" }}>
                <View style={styles.versionRows}>
                  {rows.map(([label, value]) => (
                    <View
                      key={label}
                      style={[styles.versionRow, { borderTopColor: borderColor }]}
                    >
                      <Text style={[styles.versionRowLabel, { color: subtextColor }]}>
                        {label}
                      </Text>
                      <Text style={[styles.versionRowValue, { color: textColor }]}>
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>

                {version.disclaimer ? (
                  <View
                    style={[
                      styles.versionDisclaimer,
                      {
                        backgroundColor: isDark
                          ? "rgba(217,119,6,0.12)"
                          : "rgba(217,119,6,0.08)",
                      },
                    ]}
                  >
                    <Ionicons name="warning-outline" size={16} color="#D97706" />
                    <Text style={[styles.versionDisclaimerText, { color: textColor }]}>
                      {version.disclaimer}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

function formatVersionField(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  versionPanelBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  versionPanel: {
    borderRadius: 36,
    borderWidth: 0.5,
    overflow: "hidden",
    maxHeight: "85%",
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
  actionMenuBox: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    marginTop: 20,
    backgroundColor: "transparent",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 0.5,
    gap: 12,
    marginVertical: 6,
  },
  dropdownText: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  versionStatusBand: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  versionStatusText: {
    flex: 1,
    fontFamily: "Inter-Bold",
    fontSize: 14,
  },
  versionRows: {
    backgroundColor: "transparent",
  },
  versionRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  versionRowLabel: {
    fontFamily: "Inter-Medium",
    fontSize: 13,
    opacity: 0.6,
  },
  versionRowValue: {
    fontFamily: "Inter-Bold",
    fontSize: 13,
    textAlign: "right",
  },
  versionDisclaimer: {
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 16,
  },
  versionDisclaimerText: {
    flex: 1,
    fontFamily: "Inter-Medium",
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
  },
});
