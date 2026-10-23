import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, Platform, Dimensions, Modal, Animated, PanResponder } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useAppTheme } from "@/context/ThemeContext";
import { VersionInfoPanel } from "@/components/legal-reader/VersionInfoPanel";
import {
  getSectionTextHighlightParagraphId,
  LegalHighlightRecord,
  readHighlightsForSection,
  saveHighlight,
  removeHighlight,
  HighlightColor,
} from "@/services/highlights";
import {
  LegalPackageDocument,
  LegalParagraphRecord,
  readLegalReaderIndexPackage,
  readLegalReaderParagraphs,
  readLegalReaderSections,
} from "@/services/legalStorage";
import {
  getLegalReaderStructureLabel,
  parseSectionDisplayForLanguage,
} from "@/services/legalReaderSelectors";
import {
  getNoteExcerpt,
  LawQuestNoteRecord,
  readNotesForSection,
} from "@/services/notes";
import { recordRecentlyViewedSection } from "@/services/recentlyViewed";
import {
  isSectionSaved,
  toggleSavedSection,
} from "@/services/savedItems";
import {
  useGlobalTTS,
  startGlobalTTS,
  stopGlobalTTS,
  toggleGlobalAutoPlay,
  clearNeedsNextSection,
  cycleGlobalSpeechRate,
} from "@/services/ttsService";

type LegalSection = LegalPackageDocument["sections"][number];
type SectionMetadata = NonNullable<
  LegalPackageDocument["sectionMetadata"]
>["sections"][number];
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function LegalSectionScreen() {
  const { codeId, language = "th", versionId, sectionId, sectionNo, sectionTitle } =
    useLocalSearchParams<{
      codeId?: string;
      language?: string;
      versionId?: string;
      sectionId?: string;
      sectionNo?: string;
      sectionTitle?: string;
    }>();
  const { isDark, tintColor, colors, typography, layout } = useAppTheme();
  const navigation = useNavigation();
  const [legalPackage, setLegalPackage] = useState<LegalPackageDocument | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [linkedNotes, setLinkedNotes] = useState<LawQuestNoteRecord[]>([]);
  const [highlights, setHighlights] = useState<LegalHighlightRecord[]>([]);
  const [paragraphs, setParagraphs] = useState<LegalParagraphRecord[]>([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [activeHighlightParagraph, setActiveHighlightParagraph] = useState<{ id: string, text: string } | null>(null);


  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          activeOpacity={0.76}
          onPress={() => setShowVersionPanel(true)}
          style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: -8 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={tintColor}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, tintColor]);

  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 1.5) {
          Animated.timing(panY, {
            toValue: Dimensions.get("window").height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowNotesModal(false);
            setTimeout(() => panY.setValue(0), 100);
          });
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const selectedCodeId = String(codeId ?? "");
  const selectedLanguage = String(language ?? "th");
  const selectedSectionId = String(sectionId ?? "");
  
  const ttsState = useGlobalTTS();
  const isCurrentSectionPlaying = ttsState.isPlaying && ttsState.queueContext?.sectionId === selectedSectionId;

  // Stop TTS when the selected section changes IF not auto-playing
  useEffect(() => {
    if (!ttsState.autoPlayNext && ttsState.queueContext?.sectionId && ttsState.queueContext.sectionId !== selectedSectionId) {
      stopGlobalTTS();
    }
  }, [selectedSectionId, ttsState.autoPlayNext, ttsState.queueContext?.sectionId]);
  const textColor = colors.text;
  const subtextColor = colors.subtext;
  const cardBg = colors.card;
  const borderColor = colors.glassBorder;
  const pageBg = colors.background;

  useEffect(() => {
    let mounted = true;

    if (!selectedCodeId || !selectedSectionId) {
      setLoading(false);
      setLegalPackage(null);
      return;
    }

    setLoading(true);
    setParagraphs([]);
    Promise.all([
      readLegalReaderIndexPackage({
        codeId: selectedCodeId,
        language: selectedLanguage,
      }),
      readLegalReaderSections({
        codeId: selectedCodeId,
        language: selectedLanguage,
        sectionIds: [selectedSectionId],
      }),
      readLegalReaderParagraphs({
        codeId: selectedCodeId,
        language: selectedLanguage,
        sectionIds: [selectedSectionId],
      }),
    ])
      .then(([indexPackage, sections, sectionParagraphs]) => {
        const hydratedSection = sections[0] ?? null;
        const nextPackage =
          indexPackage && hydratedSection
            ? {
                ...indexPackage,
                sections: indexPackage.sections.map((item) =>
                  item.sectionId === hydratedSection.sectionId
                    ? hydratedSection
                    : item,
                ),
              }
            : null;

        if (mounted) {
          setLegalPackage(nextPackage);
          setParagraphs(sectionParagraphs);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.warn("Failed to load section package", error);
        if (mounted) {
          setLegalPackage(null);
          setParagraphs([]);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedCodeId, selectedLanguage, selectedSectionId]);

  const section = useMemo(() => {
    return (
      legalPackage?.sections.find(
        (item) => item.sectionId === selectedSectionId,
      ) ?? null
    );
  }, [legalPackage, selectedSectionId]);

  const sectionIndex = useMemo(() => {
    if (!legalPackage) return -1;
    return legalPackage.sections.findIndex((item) => item.sectionId === selectedSectionId);
  }, [legalPackage, selectedSectionId]);

  const prevSection = useMemo(() => {
    if (sectionIndex > 0 && legalPackage) {
      return legalPackage.sections[sectionIndex - 1];
    }
    return null;
  }, [legalPackage, sectionIndex]);

  const nextSection = useMemo(() => {
    if (legalPackage && sectionIndex >= 0 && sectionIndex < legalPackage.sections.length - 1) {
      return legalPackage.sections[sectionIndex + 1];
    }
    return null;
  }, [legalPackage, sectionIndex]);

  const speechParagraphsReady =
    section?.sectionId === selectedSectionId &&
    paragraphs.length > 0 &&
    paragraphs.every((paragraph) => paragraph.sectionId === selectedSectionId);

  const handlePrev = useCallback(() => {
    if (!prevSection) return;
    const parsed = parseSectionDisplay(prevSection, selectedLanguage);
    router.setParams({
      sectionId: prevSection.sectionId,
      sectionNo: prevSection.sectionNo,
      sectionTitle: parsed.title,
    });
  }, [prevSection, selectedLanguage]);

  const handleNext = useCallback(() => {
    if (!nextSection) return;
    const parsed = parseSectionDisplay(nextSection, selectedLanguage);
    router.setParams({
      sectionId: nextSection.sectionId,
      sectionNo: nextSection.sectionNo,
      sectionTitle: parsed.title,
    });
  }, [nextSection, selectedLanguage]);

  // Handle Auto-Play Navigation
  useEffect(() => {
    // If TTS background auto-play advances to the next section while this screen is active,
    // we should sync the UI route parameters to follow along.
    if (
      ttsState.queueContext &&
      ttsState.queueContext.codeId === selectedCodeId &&
      ttsState.queueContext.language === selectedLanguage &&
      ttsState.queueContext.sectionId !== selectedSectionId &&
      ttsState.isPlaying
    ) {
      const advancedSection = legalPackage?.sections.find(
        (s) => s.sectionId === ttsState.queueContext!.sectionId
      );
      if (advancedSection) {
        const parsed = parseSectionDisplayForLanguage(advancedSection, selectedLanguage);
        router.setParams({
          sectionId: advancedSection.sectionId,
          sectionNo: advancedSection.sectionNo,
          sectionTitle: parsed.title,
        });
      }
    }
  }, [ttsState.needsNextSection, ttsState.queueContext?.sectionId, selectedSectionId, nextSection, handleNext]);

  // Auto-Start New Section
  useEffect(() => {
    if (
      section &&
      speechParagraphsReady &&
      ttsState.isWaitingForNextSection &&
      ttsState.autoPlayNext &&
      ttsState.queueContext?.sectionId &&
      ttsState.queueContext.sectionId !== selectedSectionId
    ) {
      const newContext = {
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: String(versionId ?? ""),
        sectionId: selectedSectionId,
      };
      void startGlobalTTS(
        newContext,
        getSpeechParagraphs(section, paragraphs, selectedLanguage),
      );
    }
  }, [
    paragraphs,
    speechParagraphsReady,
    selectedSectionId,
    ttsState.isWaitingForNextSection,
    ttsState.autoPlayNext,
    ttsState.queueContext?.sectionId,
    section,
    selectedLanguage,
    selectedCodeId,
    versionId,
  ]);

  const sectionMetadata = useMemo(() => {
    return (
      legalPackage?.sectionMetadata?.sections.find(
        (item) => item.id === selectedSectionId,
      ) ?? null
    );
  }, [legalPackage, selectedSectionId]);
  const structurePath = useMemo(() => {
    return getStructurePath(legalPackage, sectionMetadata, selectedLanguage);
  }, [legalPackage, sectionMetadata, selectedLanguage]);
  const sourceBadge = useMemo(() => {
    return getSourceBadge(legalPackage, selectedLanguage);
  }, [legalPackage, selectedLanguage]);
  const showTranslationNotice =
    selectedLanguage === "en" && legalPackage?.version.authoritative !== true;

  const parsedSection = useMemo(() => {
    return section
      ? parseSectionDisplay(section, selectedLanguage)
      : {
          title:
            String(sectionTitle ?? "") ||
            (sectionNo ? `Section ${String(sectionNo)}` : "Section"),
          text: "",
        };
  }, [section, sectionNo, sectionTitle, selectedLanguage]);

  useEffect(() => {
    if (!legalPackage || !section) {
      return;
    }

    void recordRecentlyViewedSection({
      codeId: selectedCodeId,
      language: selectedLanguage,
      versionId: legalPackage.version.versionId,
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      title: parsedSection.title,
      excerpt: parsedSection.text,
      codeTitle: legalPackage.code.title,
      structurePath,
    });
  }, [
    legalPackage,
    parsedSection.text,
    parsedSection.title,
    section,
    selectedCodeId,
    selectedLanguage,
    structurePath,
  ]);

  useEffect(() => {
    let mounted = true;

    if (!legalPackage || !section) {
      setIsSaved(false);
      setLinkedNotes([]);
      setHighlights([]);
      return;
    }

    Promise.all([
      isSectionSaved({
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: section.sectionId,
      }),
      readNotesForSection({
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: section.sectionId,
      }),
      readHighlightsForSection({
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: section.sectionId,
      }),
    ])
      .then(([nextIsSaved, nextLinkedNotes, nextHighlights]) => {
        if (mounted) {
          setIsSaved(nextIsSaved);
          setLinkedNotes(nextLinkedNotes);
          setHighlights(nextHighlights);
        }
      })
      .catch((error) => {
        console.warn("Failed to load section workspace state", error);
      });

    return () => {
      mounted = false;
    };
  }, [legalPackage, section, selectedCodeId, selectedLanguage]);

  const openNote = () => {
    if (!legalPackage || !section) {
      return;
    }

    router.push({
      pathname: "/notes",
      params: {
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: section.sectionId,
        sectionNo: section.sectionNo,
        sectionTitle: parsedSection.title,
      },
    });
  };
  const openExistingNote = (noteId: string) => {
    router.push({
      pathname: "/notes",
      params: { noteId },
    });
  };
  const toggleSaved = async () => {
    if (!legalPackage || !section) {
      return;
    }

    try {
      const result = await toggleSavedSection({
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        authoritative: legalPackage.version.authoritative,
        reviewStatus: legalPackage.version.reviewStatus,
        sourceType: legalPackage.version.sourceType,
        translationStatus: legalPackage.version.translationStatus,
        sectionId: section.sectionId,
        sectionNo: section.sectionNo,
        title: parsedSection.title,
        excerpt: parsedSection.text,
        codeTitle: legalPackage.code.title,
        structurePath,
      });

      setIsSaved(result.saved);
    } catch (error) {
      console.warn("Failed to toggle saved section", error);
    }
  };

  const handleSaveHighlight = async (color: HighlightColor) => {
    if (!legalPackage || !section || !activeHighlightParagraph) return;
    try {
      const newHighlights = await saveHighlight({
        codeId: selectedCodeId,
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: section.sectionId,
        paragraphId: activeHighlightParagraph.id,
        startOffset: 0,
        endOffset: activeHighlightParagraph.text.length,
        selectedText: activeHighlightParagraph.text,
        color,
        sectionNo: section.sectionNo,
        title: parsedSection.title,
        codeTitle: legalPackage.code.title,
        structurePath
      });
      setHighlights(newHighlights);
    } catch (err) {
      console.warn("Failed to save highlight", err);
    }
    setActiveHighlightParagraph(null);
  };

  const handleRemoveHighlight = async () => {
    if (!activeHighlightParagraph) return;
    const existingHighlight = highlights.find(h => h.target.paragraphId === activeHighlightParagraph.id);
    if (existingHighlight) {
      try {
        const newHighlights = await removeHighlight(existingHighlight.id);
        setHighlights(newHighlights);
      } catch (err) {
        console.warn("Failed to remove highlight", err);
      }
    }
    setActiveHighlightParagraph(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerState}>
            <Text style={[styles.stateText, { color: subtextColor, fontFamily: typography.fonts.bold }]}>
              Loading section...
            </Text>
          </View>
        ) : !legalPackage || !section ? (
          <View style={styles.centerState}>
            <Ionicons name="file-tray-outline" size={34} color={subtextColor} />
            <Text style={[styles.stateText, { color: subtextColor, fontFamily: typography.fonts.bold }]}>
              Section not found
            </Text>
          </View>
        ) : (
          <View style={styles.mainCanvas}>
            
            {/* 1. Centered Premium Header Banner */}
            <View style={styles.immersiveHeader}>
              <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                {legalPackage.code.title.toUpperCase()}
              </Text>
              <Text style={[styles.title, { color: textColor, fontFamily: typography.fonts.regal }]}>
                {parsedSection.title}
              </Text>
              {structurePath ? (
                <Text style={[styles.subtitle, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
                  {structurePath}
                </Text>
              ) : null}
            </View>

            {showTranslationNotice ? (
              <View
                style={[
                  styles.noticeCard,
                  {
                    backgroundColor: "rgba(216, 67, 21, 0.06)",
                    borderColor: "rgba(216, 67, 21, 0.16)",
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#D84315"
                />
                <Text style={[styles.noticeText, { color: textColor, fontFamily: typography.fonts.primary }]}>
                  English text is an unofficial reference draft and still needs
                  legal review. Thai remains the authoritative source.
                </Text>
              </View>
            ) : null}

            {/* 2. Executive Card for Law Text (Matching Reader/Saved Screen Box Design) */}
            <View
              style={[
                styles.parchmentSheet,
                { backgroundColor: cardBg, borderColor: colors.glassBorder },
              ]}
            >
              <View style={styles.parchmentInner}>
                <View style={styles.paragraphList}>
                  {getDisplayParagraphs(section, paragraphs, selectedLanguage).map(
                    (paragraph) => (
                      <Text
                        key={paragraph.paragraphId}
                        style={[
                          styles.body,
                          { color: textColor, fontFamily: typography.fonts.regal },
                          activeHighlightParagraph?.id === paragraph.paragraphId && {
                            backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
                            borderRadius: 6,
                            overflow: "hidden"
                          }
                        ]}
                        onLongPress={() => setActiveHighlightParagraph({ id: paragraph.paragraphId, text: paragraph.text })}
                        suppressHighlighting={true}
                      >
                        <HighlightedSectionText
                          highlights={highlights}
                          paragraphId={paragraph.paragraphId}
                          text={paragraph.text}
                        />
                      </Text>
                    ),
                  )}
                </View>
              </View>
            </View>

            {/* Removed inline notes panel */}
          </View>
        )}
      </ScrollView>

      {/* Notes Bottom Sheet Modal */}
      {showNotesModal && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowNotesModal(false)}
          transparent
          visible
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            style={StyleSheet.absoluteFill}
            tint={isDark ? "dark" : "light"}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFillObject}
              onPress={() => setShowNotesModal(false)}
            />
            <Animated.View
              style={[
                styles.bottomSheetPanel,
                { backgroundColor: isDark ? "rgba(22, 25, 34, 0.75)" : "rgba(255, 255, 255, 0.85)", borderColor: colors.glassBorder },
                { transform: [{ translateY: panY.interpolate({ inputRange: [0, Dimensions.get("window").height], outputRange: [0, Dimensions.get("window").height], extrapolate: "clamp" }) }] }
              ]}
            >
              <View {...panResponder.panHandlers} style={{ backgroundColor: "transparent" }}>
                <View style={[styles.bottomSheetHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }]} />
                
                <View style={styles.notesPanelHeader}>
                  <View style={styles.notesPanelTitleBlock}>
                    <Text style={[styles.panelTitle, { color: textColor, fontFamily: typography.fonts.regal }]}>
                      Linked Notes
                    </Text>
                    <Text style={[styles.panelSubtitle, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
                      Notes stay attached to this section.
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowNotesModal(false);
                      openNote();
                    }}
                    style={[
                      styles.smallActionButton,
                      { backgroundColor: tintColor + "14", borderColor: colors.glassBorder, borderWidth: 0.5 },
                    ]}
                  >
                    <Ionicons name="add" size={16} color={tintColor} />
                    <Text style={[styles.smallActionText, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                      New
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {linkedNotes.length > 0 ? (
                  <View style={styles.linkedNotesList}>
                    {linkedNotes.map((note) => (
                      <TouchableOpacity
                        key={note.id}
                        activeOpacity={0.84}
                        onPress={() => {
                          setShowNotesModal(false);
                          openExistingNote(note.id);
                        }}
                        style={[
                          styles.linkedNoteCard,
                          {
                            backgroundColor: cardBg,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={(colors.leatherGradient || (isDark ? ["#161922", "#0B0D13"] : ["#FFFFFF", "#FAF8F2"])) as [string, string, ...string[]]}
                          style={StyleSheet.absoluteFill}
                        />
                        
                        <View style={styles.linkedNoteInner}>
                          <View style={styles.linkedNoteHeader}>
                            <View style={styles.folderRow}>
                              <Ionicons name="folder-outline" size={11} color={tintColor} style={{ marginRight: 4 }} />
                              <Text
                                style={[styles.linkedNoteFolder, { color: tintColor, fontFamily: typography.fonts.bold }]}
                                numberOfLines={1}
                              >
                                {note.folder}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.linkedNoteDate,
                                { color: subtextColor, fontFamily: typography.fonts.primary },
                              ]}
                            >
                              {formatNoteDate(note.updatedAt)}
                            </Text>
                          </View>
                          
                          <View style={styles.noteTitleRow}>
                            {note.isPinned && (
                              <Ionicons name="pin" size={12} color={tintColor} style={{ marginRight: 6, transform: [{ rotate: "45deg" }] }} />
                            )}
                            <Text
                              style={[styles.linkedNoteTitle, { color: textColor, fontFamily: typography.fonts.bold }]}
                              numberOfLines={1}
                            >
                              {note.title}
                            </Text>
                          </View>
                          
                          {note.body ? (
                            <Text
                              style={[styles.linkedNoteExcerpt, { color: subtextColor, fontFamily: typography.fonts.primary }]}
                              numberOfLines={2}
                            >
                              {getNoteExcerpt(note)}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.notesEmptyState,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)" },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color={subtextColor}
                      style={{ opacity: 0.5 }}
                    />
                    <Text style={[styles.notesEmptyText, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
                      No notes linked yet.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </BlurView>
        </Modal>
      )}

      {/* 3. Immersive Bottom Navigation Bar (Matching Main TabBar Aesthetics) */}
      {!loading && legalPackage && section && (
        <View style={[styles.floatingBarWrapper, { backgroundColor: "transparent" }]}>
          
          {activeHighlightParagraph ? (
            <BlurView
              intensity={isDark ? 30 : 50}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.floatingBarBlur,
                {
                  backgroundColor: isDark ? "rgba(20,20,20,0.85)" : "rgba(255,255,255,0.85)",
                  borderColor: colors.glassBorder,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  alignItems: "center"
                },
              ]}
            >
              <Text style={{ color: textColor, fontFamily: typography.fonts.bold, fontSize: 13 }}>
                {selectedLanguage === "th" ? "ไฮไลท์" : "Highlight"}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "transparent" }}>
                {(["yellow", "green", "blue", "pink", "purple"] as HighlightColor[]).map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => handleSaveHighlight(color)}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: getHighlightBackground(color),
                      borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }}
                  />
                ))}
                
                {highlights.some(h => h.target.paragraphId === activeHighlightParagraph.id) && (
                  <>
                    <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 }} />
                    <TouchableOpacity
                      onPress={handleRemoveHighlight}
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                        borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
                        alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color={subtextColor} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <TouchableOpacity onPress={() => setActiveHighlightParagraph(null)}>
                 <Ionicons name="close-circle-outline" size={26} color={subtextColor} />
              </TouchableOpacity>
            </BlurView>
          ) : (
            <>
              <View style={[styles.togglesRow, { backgroundColor: "transparent" }]}>
                {/* Speed Toggle */}
                <TouchableOpacity
              activeOpacity={0.8}
              onPress={cycleGlobalSpeechRate}
              style={[
                styles.autoPlayToggle,
                {
                  backgroundColor: isDark ? "rgba(40,40,40,0.9)" : "rgba(240,240,240,0.9)",
                  borderColor: colors.glassBorder,
                }
              ]}
            >
              <Ionicons
                name="speedometer-outline"
                size={12}
                color={subtextColor}
              />
              <Text style={[
                styles.autoPlayToggleText,
                { color: subtextColor }
              ]}>
                {ttsState.speechRate.toFixed(2)}x
              </Text>
            </TouchableOpacity>

            {/* Auto-Play Toggle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleGlobalAutoPlay}
              style={[
                styles.autoPlayToggle,
                {
                  backgroundColor: ttsState.autoPlayNext ? tintColor : (isDark ? "rgba(40,40,40,0.9)" : "rgba(240,240,240,0.9)"),
                  borderColor: ttsState.autoPlayNext ? tintColor : colors.glassBorder,
                }
              ]}
            >
              <Ionicons
                name="play-forward-outline"
                size={12}
                color={ttsState.autoPlayNext ? (isDark ? "#000" : "#fff") : subtextColor}
              />
              <Text style={[
                styles.autoPlayToggleText,
                { color: ttsState.autoPlayNext ? (isDark ? "#000" : "#fff") : subtextColor }
              ]}>
                {selectedLanguage === "th" ? "อ่านต่อเนื่อง" : "Auto Next"}
              </Text>
            </TouchableOpacity>
          </View>

          <BlurView
            intensity={isDark ? 30 : 50}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.floatingBarBlur,
              {
                backgroundColor: isDark ? "rgba(20,20,20,0.85)" : "rgba(255,255,255,0.85)",
                borderColor: colors.goldSubtle,
              },
            ]}
          >
            {/* Prev Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrev}
              disabled={!prevSection}
              style={[styles.floatingTabItem, { opacity: !prevSection ? 0.3 : 1 }]}
            >
              <View style={styles.floatingIconContainer}>
                <Ionicons
                  name="chevron-back-outline"
                  size={22}
                  color={colors.subtext}
                />
              </View>
              <Text
                style={[
                  styles.floatingTabLabel,
                  { color: colors.subtext, fontFamily: typography.fonts.bold },
                ]}
              >
                {selectedLanguage === "th" ? "ก่อนหน้า" : "PREV"}
              </Text>
            </TouchableOpacity>

            {/* Save Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleSaved}
              style={styles.floatingTabItem}
            >
              <View style={styles.floatingIconContainer}>
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isSaved ? tintColor : colors.subtext}
                />
              </View>
              <Text
                style={[
                  styles.floatingTabLabel,
                  { color: isSaved ? tintColor : colors.subtext, fontFamily: typography.fonts.bold },
                ]}
              >
                {isSaved
                  ? (selectedLanguage === "th" ? "บันทึกแล้ว" : "SAVED")
                  : (selectedLanguage === "th" ? "บันทึก" : "SAVE")}
              </Text>
            </TouchableOpacity>

            {/* Listen Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (isCurrentSectionPlaying) {
                  stopGlobalTTS();
                } else {
                  const newContext = {
                    codeId: selectedCodeId,
                    language: selectedLanguage,
                    versionId: String(versionId ?? ""),
                    sectionId: selectedSectionId,
                  };
                  void startGlobalTTS(
                    newContext,
                    getSpeechParagraphs(section, paragraphs, selectedLanguage),
                  );
                }
              }}
              style={styles.floatingTabItem}
            >
              <View style={styles.floatingIconContainer}>
                <Ionicons
                  name={isCurrentSectionPlaying ? "stop-circle-outline" : "volume-medium-outline"}
                  size={22}
                  color={isCurrentSectionPlaying ? tintColor : colors.subtext}
                />
              </View>
              <Text
                style={[
                  styles.floatingTabLabel,
                  { color: isCurrentSectionPlaying ? tintColor : colors.subtext, fontFamily: typography.fonts.bold },
                ]}
              >
                {selectedLanguage === "th" ? (isCurrentSectionPlaying ? "หยุด" : "ฟัง") : (isCurrentSectionPlaying ? "STOP" : "LISTEN")}
              </Text>
            </TouchableOpacity>

            {/* Note Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowNotesModal(true)}
              style={styles.floatingTabItem}
            >
              <View style={styles.floatingIconContainer}>
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={linkedNotes.length > 0 ? tintColor : colors.subtext}
                />
                {linkedNotes.length > 0 && (
                  <View style={[styles.floatingBadgeOverlay, { backgroundColor: tintColor }]}>
                    <Text style={styles.floatingBadgeOverlayText}>
                      {linkedNotes.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.floatingTabLabel,
                  { color: linkedNotes.length > 0 ? tintColor : colors.subtext, fontFamily: typography.fonts.bold },
                ]}
              >
                {selectedLanguage === "th" ? "โน้ต" : "NOTE"}
              </Text>
            </TouchableOpacity>

            {/* Next Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNext}
              disabled={!nextSection}
              style={[styles.floatingTabItem, { opacity: !nextSection ? 0.3 : 1 }]}
            >
              <View style={styles.floatingIconContainer}>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color={colors.subtext}
                />
              </View>
              <Text
                style={[
                  styles.floatingTabLabel,
                  { color: colors.subtext, fontFamily: typography.fonts.bold },
                ]}
              >
                {selectedLanguage === "th" ? "ถัดไป" : "NEXT"}
              </Text>
            </TouchableOpacity>
          </BlurView>
        </>
      )}
      </View>
    )}
      {showVersionPanel && legalPackage && (
        <VersionInfoPanel
          borderColor={colors.border}
          cardBg={colors.card}
          isDark={isDark}
          legalPackage={legalPackage}
          onClose={() => setShowVersionPanel(false)}
          readerCopy={getReaderCopy(selectedLanguage)}
          sourceBadge={sourceBadge}
          subtextColor={subtextColor}
          summary={getVersionSummary(legalPackage, selectedLanguage)}
          textColor={textColor}
          tintColor={tintColor}
          visible={showVersionPanel}
          availableLanguages={["th", "en"]}
          selectedLanguage={selectedLanguage}
          onLanguageChange={() => {
            const nextLang = selectedLanguage === "th" ? "en" : "th";
            router.setParams({ language: nextLang });
          }}
          languageLabel={selectedLanguage === "th" ? "ภาษา / Language" : "Language"}
        />
      )}

    </View>
  );
}

function getSourceBadge(
  legalPackage: LegalPackageDocument | null,
  language: string,
): { color: string; icon: IoniconName; label: string } | null {
  if (!legalPackage) {
    return null;
  }

  if (legalPackage.version.authoritative) {
    return {
      color: "#2E7D32", // Soft green
      icon: "shield-checkmark-outline",
      label: language === "th" ? "ต้นฉบับทางการ" : "Authoritative",
    };
  }

  if (legalPackage.version.reviewStatus === "needs_legal_review") {
    return {
      color: "#D84315", // Warm orange-red
      icon: "alert-circle-outline",
      label: language === "en" ? "Unofficial" : "รอตรวจ",
    };
  }

  return {
    color: "#757575",
    icon: "information-circle-outline",
    label: "Reference",
  };
}

function getDisplayParagraphs(
  section: LegalSection | null,
  paragraphs: LegalParagraphRecord[],
  language: string,
) {
  if (!section || paragraphs.length === 0) {
    return [
      {
        paragraphId: section
          ? getSectionTextHighlightParagraphId(section.sectionId)
          : "section-text",
        text: section ? parseSectionDisplay(section, language).text : "",
      },
    ].filter((paragraph) => paragraph.text.trim().length > 0);
  }

  return paragraphs
    .map((paragraph, index) => {
      if (index > 0) {
        return paragraph;
      }

      return {
        ...paragraph,
        text: parseSectionDisplay(
          {
            ...section,
            text: paragraph.text,
          },
          language,
        ).text,
      };
    })
    .filter((paragraph) => paragraph.text.trim().length > 0);
}

function getSpeechParagraphs(
  section: LegalSection | null,
  paragraphs: LegalParagraphRecord[],
  language: string,
) {
  if (!section) {
    return [];
  }

  const sectionTitle = parseSectionDisplay(section, language).title;
  const bodyParagraphs = getDisplayParagraphs(section, paragraphs, language);

  return [
    {
      paragraphId: `${section.sectionId}-tts-heading`,
      text: sectionTitle,
    },
    ...bodyParagraphs,
  ].filter((paragraph) => paragraph.text.trim().length > 0);
}

function HighlightedSectionText({
  highlights,
  paragraphId,
  text,
}: {
  highlights: LegalHighlightRecord[];
  paragraphId: string;
  text: string;
}) {
  const segments = splitTextByHighlights(
    text,
    highlights
      .filter(
        (highlight) =>
          highlight.target.paragraphId === paragraphId &&
          highlight.target.startOffset < text.length &&
          highlight.target.endOffset > 0,
      )
      .map((highlight) => ({
        color: highlight.color,
        endOffset: Math.min(text.length, highlight.target.endOffset),
        startOffset: Math.max(0, highlight.target.startOffset),
      }))
      .filter((highlight) => highlight.endOffset > highlight.startOffset)
      .sort((left, right) => left.startOffset - right.startOffset),
  );

  return (
    <>
      {segments.map((segment, index) => (
        <Text
          key={`${segment.text}-${index}`}
          style={
            segment.color
              ? {
                  backgroundColor: getHighlightBackground(segment.color),
                  borderRadius: 4,
                }
              : undefined
          }
        >
          {segment.text}
        </Text>
      ))}
    </>
  );
}

function splitTextByHighlights(
  text: string,
  highlights: Array<{
    color: LegalHighlightRecord["color"];
    endOffset: number;
    startOffset: number;
  }>,
) {
  const segments: Array<{
    color?: LegalHighlightRecord["color"];
    text: string;
  }> = [];
  let cursor = 0;

  highlights.forEach((highlight) => {
    const startOffset = Math.max(cursor, highlight.startOffset);
    const endOffset = Math.max(startOffset, highlight.endOffset);

    if (startOffset > cursor) {
      segments.push({ text: text.slice(cursor, startOffset) });
    }

    if (endOffset > startOffset) {
      segments.push({
        color: highlight.color,
        text: text.slice(startOffset, endOffset),
      });
      cursor = endOffset;
    }
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

function getHighlightBackground(color: LegalHighlightRecord["color"]) {
  switch (color) {
    case "blue":
      return "rgba(96,165,250,0.28)";
    case "green":
      return "rgba(74,222,128,0.26)";
    case "pink":
      return "rgba(244,114,182,0.25)";
    case "purple":
      return "rgba(168,85,247,0.24)";
    case "yellow":
    default:
      return "rgba(250,204,21,0.32)";
  }
}

function getLanguageFlag(language: string) {
  switch (language) {
    case "th":
      return "🇹🇭";
    case "en":
      return "🇬🇧";
    default:
      return "🌐";
  }
}

function getStructurePath(
  legalPackage: LegalPackageDocument | null,
  metadata: SectionMetadata | null,
  language: string,
) {
  if (!legalPackage || !metadata?.structurePath?.length) {
    return "";
  }

  const labelById = new Map(
    legalPackage.structure?.nodes?.map((node) => [
      node.id,
      getLegalReaderStructureLabel(node, language),
    ]) ?? [],
  );

  return metadata.structurePath
    .map((nodeId) => labelById.get(nodeId))
    .filter(Boolean)
    .join(" / ");
}

function parseSectionDisplay(section: LegalSection, language: string) {
  return parseSectionDisplayForLanguage(section, language);
  const trimmedText = "";
  const thaiMatch = trimmedText.match(
    /^(มาตรา\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?)(?:\s+|$)/,
  );
  const englishMatch = trimmedText.match(
    /^(Section\s+[0-9]+(?:\/[0-9]+)?\.?)(?:\s+|$)/i,
  );
  const fallbackTitle =
    language === "th"
      ? `มาตรา ${toThaiNumerals(section.sectionNo)}`
      : `Section ${section.sectionNo}`;

  if (thaiMatch) {
    return {
      title: thaiMatch![1],
      text: trimmedText.slice(thaiMatch![0].length).trimStart(),
    };
  }

  if (englishMatch) {
    return {
      title: englishMatch![1].replace(/\.$/, ""),
      text: trimmedText.slice(englishMatch![0].length).trimStart(),
    };
  }

  return {
    title: fallbackTitle,
    text: trimmedText,
  };
}

function toThaiNumerals(value: string) {
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return value.replace(/\d/g, (digit) => thaiDigits[Number(digit)] ?? digit);
}

function formatNoteDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 130, // Extra padding to scroll past the floating action bar
  },
  centerState: {
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 12,
    minHeight: 280,
    justifyContent: "center",
  },
  stateText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  mainCanvas: {
    backgroundColor: "transparent",
    width: "100%",
  },
  immersiveHeader: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingTop: 10,
    marginBottom: 24,
    width: "100%",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    opacity: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.55,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  languageFlag: {
    fontSize: 14,
    marginRight: 6,
  },
  languageText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "transparent",
    marginBottom: 0,
    marginTop: 4,
  },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  sourceChipText: {
    fontSize: 9,
    letterSpacing: 0.5,
    marginLeft: 5,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  metaChipText: {
    fontSize: 9,
    letterSpacing: 0.5,
    marginLeft: 5,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.85,
  },
  parchmentSheet: {
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 200,
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
  parchmentInner: {
    backgroundColor: "transparent",
    padding: 24,
    width: "100%",
  },
  paragraphList: {
    backgroundColor: "transparent",
    gap: 18,
  },
  body: {
    fontSize: 19,
    lineHeight: 31,
    letterSpacing: 0.1,
  },
  notesPanel: {
    marginTop: 35,
    borderTopWidth: 1,
    paddingTop: 24,
    backgroundColor: "transparent",
  },
  notesPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  notesPanelTitleBlock: {
    flex: 1,
    backgroundColor: "transparent",
  },
  panelTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  panelSubtitle: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  smallActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  smallActionText: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  linkedNotesList: {
    backgroundColor: "transparent",
    gap: 12,
  },
  linkedNoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  linkedNoteInner: {
    backgroundColor: "transparent",
    padding: 16,
  },
  linkedNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    flex: 1,
  },
  linkedNoteFolder: {
    fontSize: 9,
    letterSpacing: 1,
  },
  linkedNoteDate: {
    fontSize: 10,
    opacity: 0.5,
  },
  noteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  linkedNoteTitle: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  linkedNoteExcerpt: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.55,
  },
  notesEmptyState: {
    alignItems: "center",
    borderRadius: 20,
    padding: 24,
    gap: 6,
  },
  notesEmptyText: {
    fontSize: 12,
    opacity: 0.5,
  },
  floatingBarWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 24,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    backgroundColor: "transparent",
  },
  floatingBarBlur: {
    flexDirection: "row",
    alignSelf: "center",
    width: Dimensions.get("window").width - 40,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: "hidden",
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  floatingIconContainer: {
    position: "relative",
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  floatingTabLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  floatingBadgeOverlay: {
    position: "absolute",
    top: -6,
    right: -12,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  floatingBadgeOverlayText: {
    color: "#0F1115",
    fontSize: 8,
    fontFamily: "Inter-Bold",
    fontWeight: "900",
  },
  togglesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  autoPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  autoPlayToggleText: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  bottomSheetPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 24,
    height: Dimensions.get("window").height * 0.75,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  bottomSheetHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
});

function getReaderCopy(language: string) {
  if (language === "th") {
    return {
      baseVersion: "อ้างอิงจาก",
      none: "-",
      reviewStatus: "สถานะตรวจทาน",
      sections: "จำนวนมาตรา",
      sourceType: "ประเภทแหล่งข้อมูล",
      translationStatus: "สถานะแปล",
      versionId: "รหัสเวอร์ชัน",
      versionInfo: "ข้อมูลเวอร์ชัน",
    };
  }
  return {
    baseVersion: "Based on",
    none: "-",
    reviewStatus: "Review status",
    sections: "Sections",
    sourceType: "Source type",
    translationStatus: "Translation status",
    versionId: "Version ID",
    versionInfo: "Version info",
  };
}

function getVersionSummary(
  legalPackage: LegalPackageDocument | null,
  language: string,
) {
  if (!legalPackage) {
    return "";
  }

  const version = legalPackage.version;
  const sourceLabel = version.authoritative
    ? language === "th"
      ? "ต้นฉบับทางการ"
      : "authoritative"
    : version.reviewStatus === "needs_legal_review"
      ? language === "th"
        ? "รอตรวจทาน"
        : "needs legal review"
      : language === "th"
        ? "ใช้อ้างอิง"
        : "reference";

  return `${version.versionId} / ${sourceLabel}`;
}
