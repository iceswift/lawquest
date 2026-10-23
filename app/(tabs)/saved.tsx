import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
    Modal,
    Animated,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { Text, View } from "@/components/Themed";
import { LawCard } from "@/components/LawCard";
import Colors from "@/constants/Colors";
import { useAppTheme } from "@/context/ThemeContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
    getSavedSectionKey,
    readSavedSectionItems,
    removeSavedSection,
    SavedSectionItem,
    saveSectionItem,
    updateSavedItemOrganization,
} from "@/services/savedItems";

const { width } = Dimensions.get("window");

const ALL_FILTER_VALUE = "all";
type SavedCollectionFilter =
  | "all"
  | "pinned"
  | `folder:${string}`
  | `tag:${string}`;
type SavedSourceFilter =
  | "all"
  | "authoritative"
  | "needsReview"
  | "englishReference";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type AppTheme = ReturnType<typeof useAppTheme>;

export default function SavedScreen() {
  const { isDark, tintColor, colors, layout, typography } = useAppTheme();
  const [savedSections, setSavedSections] = useState<SavedSectionItem[]>([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 180);
  const [deletedSnapshot, setDeletedSnapshot] =
    useState<SavedSectionItem | null>(null);
  const [editingItem, setEditingItem] = useState<SavedSectionItem | null>(null);
  const [draftFolder, setDraftFolder] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);
  const [selectedCollectionFilter, setSelectedCollectionFilter] =
    useState<SavedCollectionFilter>("all");
  const [selectedSourceFilter, setSelectedSourceFilter] =
    useState<SavedSourceFilter>("all");
  const [selectedLanguageFilter, setSelectedLanguageFilter] =
    useState(ALL_FILTER_VALUE);
  const [selectedCodeFilter, setSelectedCodeFilter] =
    useState(ALL_FILTER_VALUE);
  const [showFilters, setShowFilters] = useState(false);

  // Bottom Sheet PanResponder
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gs) => {
        if (gs.dy > 100 || gs.vy > 1.5) {
          // Swipe down detected, close modal
          Animated.timing(panY, {
            toValue: Dimensions.get("window").height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowFilters(false);
            // Reset after modal unmounts
            setTimeout(() => panY.setValue(0), 100);
          });
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const loadSavedSections = useCallback(async () => {
    try {
      setSavedSections(await readSavedSectionItems());
    } catch (error) {
      console.warn("Failed to load saved sections", error);
      setSavedSections([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedSections();
    }, [loadSavedSections]),
  );

  useEffect(() => {
    if (!deletedSnapshot) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDeletedSnapshot(null);
    }, 4200);

    return () => clearTimeout(timeoutId);
  }, [deletedSnapshot]);

  const availableLanguages = useMemo(
    () => uniqueValues(savedSections.map((section) => section.target.language)),
    [savedSections],
  );
  const availableCodebooks = useMemo(
    () => uniqueCodebooks(savedSections),
    [savedSections],
  );
  const availableFolders = useMemo(
    () =>
      uniqueValues(
        savedSections
          .map((section) => section.organization.folderId)
          .filter((folder): folder is string => Boolean(folder)),
      ),
    [savedSections],
  );
  const availableTags = useMemo(
    () =>
      uniqueValues(
        savedSections.flatMap((section) => section.organization.tags),
      ),
    [savedSections],
  );
  const filteredSavedSections = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return savedSections.filter((section) => {
      const collectionMatches =
        selectedCollectionFilter === "all" ||
        (selectedCollectionFilter === "pinned" &&
          section.organization.isPinned) ||
        (selectedCollectionFilter.startsWith("folder:") &&
          section.organization.folderId ===
            selectedCollectionFilter.replace("folder:", "")) ||
        (selectedCollectionFilter.startsWith("tag:") &&
          section.organization.tags.includes(
            selectedCollectionFilter.replace("tag:", ""),
          ));
      const sourceMatches =
        selectedSourceFilter === "all" ||
        (selectedSourceFilter === "authoritative" &&
          section.source?.authoritative === true) ||
        (selectedSourceFilter === "needsReview" &&
          section.source?.reviewStatus === "needs_legal_review") ||
        (selectedSourceFilter === "englishReference" &&
          section.target.language === "en" &&
          section.source?.authoritative !== true);
      const languageMatches =
        selectedLanguageFilter === ALL_FILTER_VALUE ||
        section.target.language === selectedLanguageFilter;
      const codeMatches =
        selectedCodeFilter === ALL_FILTER_VALUE ||
        section.target.codeId === selectedCodeFilter;
      const searchable = [
        section.display.codeTitle,
        section.display.title,
        section.target.sectionNo,
        section.target.versionId,
        section.display.excerpt,
        section.display.structurePath,
        section.source?.reviewStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const queryMatches =
        !normalizedQuery || searchable.includes(normalizedQuery);

      return (
        collectionMatches &&
        sourceMatches &&
        languageMatches &&
        codeMatches &&
        queryMatches
      );
    });
  }, [
    debouncedQuery,
    savedSections,
    selectedCodeFilter,
    selectedCollectionFilter,
    selectedLanguageFilter,
    selectedSourceFilter,
  ]);
  const hasActiveFilters =
    selectedCollectionFilter !== "all" ||
    selectedSourceFilter !== "all" ||
    selectedLanguageFilter !== ALL_FILTER_VALUE ||
    selectedCodeFilter !== ALL_FILTER_VALUE ||
    query.trim().length > 0;

  const resetFilters = useCallback(() => {
    setQuery("");
    setSelectedCollectionFilter("all");
    setSelectedSourceFilter("all");
    setSelectedLanguageFilter(ALL_FILTER_VALUE);
    setSelectedCodeFilter(ALL_FILTER_VALUE);
  }, []);

  const removeSection = async (item: SavedSectionItem) => {
    try {
      setDeletedSnapshot(item);
      setSavedSections(await removeSavedSection(item.target));
    } catch (error) {
      console.warn("Failed to remove saved section", error);
    }
  };
  const undoRemoveSection = useCallback(async () => {
    if (!deletedSnapshot) {
      return;
    }

    try {
      setSavedSections(
        await saveSectionItem({
          codeId: deletedSnapshot.target.codeId,
          language: deletedSnapshot.target.language,
          versionId: deletedSnapshot.target.versionId,
          sectionId: deletedSnapshot.target.sectionId,
          sectionNo: deletedSnapshot.target.sectionNo,
          title: deletedSnapshot.display.title,
          excerpt: deletedSnapshot.display.excerpt,
          codeTitle: deletedSnapshot.display.codeTitle,
          structurePath: deletedSnapshot.display.structurePath,
          authoritative: deletedSnapshot.source?.authoritative,
          reviewStatus: deletedSnapshot.source?.reviewStatus,
          sourceType: deletedSnapshot.source?.sourceType,
          translationStatus: deletedSnapshot.source?.translationStatus,
        }),
      );
      setDeletedSnapshot(null);
    } catch (error) {
      console.warn("Failed to restore saved section", error);
    }
  }, [deletedSnapshot]);
  const openOrganizationEditor = useCallback((item: SavedSectionItem) => {
    setEditingItem(item);
    setDraftFolder(item.organization.folderId ?? "");
    setDraftTags(item.organization.tags.join(", "));
    setDraftPinned(item.organization.isPinned);
  }, []);
  const closeOrganizationEditor = () => {
    setEditingItem(null);
    setDraftFolder("");
    setDraftTags("");
    setDraftPinned(false);
  };
  const saveOrganization = async () => {
    if (!editingItem) {
      return;
    }

    try {
      setSavedSections(
        await updateSavedItemOrganization(editingItem.id, {
          folderId: draftFolder,
          tags: draftTags.split(","),
          isPinned: draftPinned,
        }),
      );
      closeOrganizationEditor();
    } catch (error) {
      console.warn("Failed to update saved item organization", error);
    }
  };
  const togglePinned = useCallback(async (item: SavedSectionItem) => {
    try {
      setSavedSections(
        await updateSavedItemOrganization(item.id, {
          isPinned: !item.organization.isPinned,
        }),
      );
    } catch (error) {
      console.warn("Failed to toggle saved item pin", error);
    }
  }, []);
  const applyFolderSuggestion = (folder: string) => {
    setDraftFolder(folder);
  };
  const toggleDraftTag = (tag: string) => {
    const currentTags = parseDraftTags(draftTags);
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((item) => item !== tag)
      : [...currentTags, tag];

    setDraftTags(nextTags.join(", "));
  };

  const listHeader = useMemo(() => {
    const activeFilterCount =
      (selectedCollectionFilter !== "all" ? 1 : 0) +
      (selectedSourceFilter !== "all" ? 1 : 0) +
      (selectedLanguageFilter !== ALL_FILTER_VALUE ? 1 : 0) +
      (selectedCodeFilter !== ALL_FILTER_VALUE ? 1 : 0);

    return (
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
          PERSONAL JURISPRUDENCE ARCHIVE
        </Text>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>Saved</Text>
            <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              {savedSections.length.toLocaleString()} SECTIONS SHELVED
            </Text>
          </View>
        </View>

        {/* Search Bar & Filter Toggle Row */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? "rgba(18, 21, 29, 0.65)" : "rgba(255, 255, 255, 0.72)",
                borderColor: colors.glassBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.subtext} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search saved sections..."
              placeholderTextColor={colors.subtext + "80"}
              style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.primary }]}
            />
            {query.length > 0 ? (
              <TouchableOpacity hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowFilters((prev) => !prev)}
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: showFilters
                  ? tintColor + "20"
                  : isDark
                    ? "rgba(18, 21, 29, 0.65)"
                    : "rgba(255, 255, 255, 0.72)",
                borderColor: showFilters ? tintColor : colors.glassBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={showFilters ? "options" : "options-outline"}
              size={20}
              color={showFilters ? tintColor : colors.subtext}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: tintColor }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

              </View>
    );
  }, [
    availableCodebooks,
    availableFolders,
    availableLanguages,
    availableTags,
    colors,
    hasActiveFilters,
    query,
    resetFilters,
    savedSections.length,
    selectedCodeFilter,
    selectedCollectionFilter,
    selectedLanguageFilter,
    selectedSourceFilter,
    tintColor,
    typography,
    showFilters,
    isDark,
  ]);

  const renderSavedItem = useCallback(({ item }: { item: SavedSectionItem }) => {
    return (
      <SavedSectionCard
        colors={colors}
        item={item}
        onOpenOrganizationEditor={openOrganizationEditor}
        onTogglePinned={togglePinned}
        tintColor={tintColor}
        typography={typography}
      />
    );
  }, [
    colors,
    openOrganizationEditor,
    tintColor,
    togglePinned,
    typography,
    isDark,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={filteredSavedSections}
        keyExtractor={(item) => getSavedSectionKey(item.target)}
        renderItem={renderSavedItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.card, borderColor: colors.goldSubtle },
              ]}
            >
              <Ionicons
                name="bookmark-outline"
                size={32}
                color={colors.subtext}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {savedSections.length === 0
                ? "No saved sections yet"
                : "No matching sections"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
              {savedSections.length === 0
                ? "Tap Save in Reader to build your personal legal shelf."
                : "Try clearing search or filters."}
            </Text>
          </View>
        }
      />
      {deletedSnapshot ? (
        <View
          style={[
            styles.undoToast,
            {
              backgroundColor: colors.card,
              borderColor: colors.goldSubtle,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={styles.undoToastTextBlock}>
            <Text style={[styles.undoToastTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Removed from Saved
            </Text>
            <Text
              style={[styles.undoToastSubtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}
              numberOfLines={1}
            >
              {deletedSnapshot.display.title}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.82} onPress={undoRemoveSection}>
            <Text style={[styles.undoToastAction, { color: tintColor, fontFamily: typography.fonts.bold }]}>
              Undo
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {editingItem && (
        <Modal
          animationType="fade"
          onRequestClose={closeOrganizationEditor}
          transparent
          visible
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            style={styles.modalBackdrop}
            tint={isDark ? "dark" : "light"}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFillObject}
              onPress={closeOrganizationEditor}
            />
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.editorPanel,
                { 
                  backgroundColor: colors.card,
                  borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)", 
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
                  <Ionicons name="folder-outline" size={24} color={tintColor} />
                </View>
                <TouchableOpacity
                  onPress={closeOrganizationEditor}
                  style={[
                    styles.modalCloseButton,
                    {
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.modalMainContent}>
                  <Text
                    style={[styles.modalTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    ORGANIZE
                  </Text>
                  
                  <Text style={[styles.modalDescription, { color: colors.subtext }]} numberOfLines={1}>
                    {editingItem?.display.title?.toUpperCase()}
                  </Text>



                  <View style={{ paddingHorizontal: 28, paddingBottom: 32, backgroundColor: "transparent" }}>
                    <View style={styles.editorField}>
                      <Text style={[styles.editorLabel, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        Folder
                      </Text>
                      <TextInput
                        value={draftFolder}
                        onChangeText={setDraftFolder}
                        placeholder="Exam prep, Criminal Code..."
                        placeholderTextColor={colors.subtext + "70"}
                        style={[
                          styles.editorInput,
                          {
                            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                            borderWidth: 0.5,
                            color: colors.text,
                            fontFamily: typography.fonts.primary,
                          },
                        ]}
                      />
                      {availableFolders.length > 0 ? (
                        <View style={styles.suggestionRow}>
                          {availableFolders.slice(0, 6).map((folder) => (
                            <TouchableOpacity
                              key={folder}
                              activeOpacity={0.78}
                              onPress={() => applyFolderSuggestion(folder)}
                              style={[
                                styles.suggestionChip,
                                {
                                  backgroundColor:
                                    draftFolder.trim() === folder
                                      ? tintColor + "1E"
                                      : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                  borderColor:
                                    draftFolder.trim() === folder
                                      ? tintColor
                                      : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                                  borderWidth: 0.5,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.suggestionText,
                                  {
                                    color:
                                      draftFolder.trim() === folder
                                        ? tintColor
                                        : colors.subtext,
                                    fontFamily: typography.fonts.bold,
                                  },
                                ]}
                              >
                                {folder}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.editorField}>
                      <Text style={[styles.editorLabel, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        Tags
                      </Text>
                      <TextInput
                        value={draftTags}
                        onChangeText={setDraftTags}
                        placeholder="contract, limitation, exam"
                        placeholderTextColor={colors.subtext + "70"}
                        style={[
                          styles.editorInput,
                          {
                            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                            borderWidth: 0.5,
                            color: colors.text,
                            fontFamily: typography.fonts.primary,
                          },
                        ]}
                      />
                      <Text style={[styles.editorHint, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                        Separate tags with commas.
                      </Text>
                      {availableTags.length > 0 ? (
                        <View style={styles.suggestionRow}>
                          {availableTags.slice(0, 8).map((tag) => {
                            const active = parseDraftTags(draftTags).includes(tag);

                            return (
                              <TouchableOpacity
                                key={tag}
                                activeOpacity={0.78}
                                onPress={() => toggleDraftTag(tag)}
                                style={[
                                  styles.suggestionChip,
                                  {
                                    backgroundColor: active
                                      ? tintColor + "1E"
                                      : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                    borderColor: active ? tintColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                                    borderWidth: 0.5,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.suggestionText,
                                    {
                                      color: active ? tintColor : colors.subtext,
                                      fontFamily: typography.fonts.bold,
                                    },
                                  ]}
                                >
                                  #{tag}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={saveOrganization}
                      style={[
                        styles.editorSaveButton,
                        { 
                          backgroundColor: tintColor,
                          marginTop: 16,
                          borderRadius: 20,
                        }
                      ]}
                    >
                      <Text style={[styles.editorSaveText, { color: "#FFFFFF", fontFamily: typography.fonts.bold }]}>DONE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </BlurView>
        </Modal>
      )}

      {/* Bottom Sheet Filter Modal */}
      {showFilters && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
          transparent
          visible
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            style={styles.modalBackdrop}
            tint={isDark ? "dark" : "light"}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFillObject}
              onPress={() => setShowFilters(false)}
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
                
                <View style={[styles.bottomSheetHeader, { backgroundColor: "transparent" }]}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    ตัวกรองข้อมูล
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity activeOpacity={0.7} onPress={resetFilters} style={[styles.resetButtonInline, { backgroundColor: tintColor + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }]}>
                      <Text style={[styles.resetTextInline, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                        ล้างค่าทั้งหมด
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}>
                {/* Collection */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>หมวดหมู่ (COLLECTION)</Text>
                <View style={[styles.filterGrid, { backgroundColor: "transparent" }]}>
                  <FilterOption
                    active={selectedCollectionFilter === "all"}
                    label="บันทึกทั้งหมด"
                    onPress={() => setSelectedCollectionFilter("all")}
                  />
                  <FilterOption
                    active={selectedCollectionFilter === "pinned"}
                    label="ปักหมุดเท่านั้น"
                    onPress={() => setSelectedCollectionFilter("pinned")}
                  />
                  {availableFolders.map((folder) => (
                    <FilterOption
                      key={`folder:${folder}`}
                      active={selectedCollectionFilter === `folder:${folder}`}
                      label={`📂 ${folder}`}
                      onPress={() => setSelectedCollectionFilter(`folder:${folder}`)}
                    />
                  ))}
                  {availableTags.map((tag) => (
                    <FilterOption
                      key={`tag:${tag}`}
                      active={selectedCollectionFilter === `tag:${tag}`}
                      label={`#${tag}`}
                      onPress={() => setSelectedCollectionFilter(`tag:${tag}`)}
                    />
                  ))}
                </View>

                {/* Status */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>สถานะทางกฎหมาย (STATUS)</Text>
                <View style={[styles.filterGrid, { backgroundColor: "transparent" }]}>
                  <FilterOption
                    active={selectedSourceFilter === "all"}
                    label="สถานะทั้งหมด"
                    onPress={() => setSelectedSourceFilter("all")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "authoritative"}
                    label="ข้อมูลอ้างอิงหลัก"
                    onPress={() => setSelectedSourceFilter("authoritative")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "needsReview"}
                    label="รอตรวจสอบ"
                    onPress={() => setSelectedSourceFilter("needsReview")}
                  />
                  <FilterOption
                    active={selectedSourceFilter === "englishReference"}
                    label="อ้างอิงภาษาอังกฤษ"
                    onPress={() => setSelectedSourceFilter("englishReference")}
                  />
                </View>

                {/* Language */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>ภาษา (LANGUAGE)</Text>
                <View style={[styles.filterGrid, { backgroundColor: "transparent" }]}>
                  <FilterOption
                    active={selectedLanguageFilter === ALL_FILTER_VALUE}
                    label="ทุกภาษา"
                    onPress={() => setSelectedLanguageFilter(ALL_FILTER_VALUE)}
                  />
                  {availableLanguages.map((language) => (
                    <FilterOption
                      key={language}
                      active={selectedLanguageFilter === language}
                      label={`${getLanguageFlag(language)} ${language.toUpperCase()}`}
                      onPress={() => setSelectedLanguageFilter(language)}
                    />
                  ))}
                </View>

                {/* Law Code */}
                <Text style={[styles.filterGroupTitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>ประมวลกฎหมาย (LAW CODE)</Text>
                <View style={[styles.filterGrid, { backgroundColor: "transparent" }]}>
                  <FilterOption
                    active={selectedCodeFilter === ALL_FILTER_VALUE}
                    label="ทุกประมวลกฎหมาย"
                    onPress={() => setSelectedCodeFilter(ALL_FILTER_VALUE)}
                  />
                  {availableCodebooks.map((code) => (
                    <FilterOption
                      key={code.codeId}
                      active={selectedCodeFilter === code.codeId}
                      label={code.title}
                      onPress={() => setSelectedCodeFilter(code.codeId)}
                    />
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          </BlurView>
        </Modal>
      )}
    </View>
  );
}

type SavedSectionCardProps = {
  colors: AppTheme["colors"];
  item: SavedSectionItem;
  onOpenOrganizationEditor: (item: SavedSectionItem) => void;
  onTogglePinned: (item: SavedSectionItem) => void | Promise<void>;
  tintColor: string;
  typography: AppTheme["typography"];
};

const SavedSectionCard = memo(function SavedSectionCard({
  colors,
  item,
  onOpenOrganizationEditor,
  onTogglePinned,
  tintColor,
  typography,
}: SavedSectionCardProps) {
  const openSection = useCallback(() => {
    router.push({
      pathname: "/legal-section",
      params: {
        codeId: item.target.codeId,
        language: item.target.language,
        versionId: item.target.versionId,
        sectionId: item.target.sectionId,
        sectionNo: item.target.sectionNo,
        sectionTitle: item.display.title,
      },
    });
  }, [item]);

  const togglePinned = useCallback(() => {
    void onTogglePinned(item);
  }, [item, onTogglePinned]);

  const openOrganizationEditor = useCallback(() => {
    onOpenOrganizationEditor(item);
  }, [item, onOpenOrganizationEditor]);

  return (
    <LawCard
      codeTitle={item.display.codeTitle}
      title={item.display.title}
      excerpt={item.display.excerpt}
      language={item.target.language}
      dateText={formatSavedDate(item.updatedAt)}
      isPinned={item.organization.isPinned}
      folderId={item.organization.folderId}
      onPress={openSection}
      style={{ marginHorizontal: 24, marginTop: 12 }}
      rightAction={
        <>
          <TouchableOpacity
            onPress={togglePinned}
            style={[
              styles.rowIconButton,
              {
                backgroundColor: item.organization.isPinned
                  ? tintColor + "15"
                  : "transparent",
                borderColor: item.organization.isPinned
                  ? tintColor + "30"
                  : "transparent",
                borderRadius: 16,
                borderWidth: item.organization.isPinned ? 0.5 : 0,
              },
            ]}
          >
            <Ionicons
              name={item.organization.isPinned ? "pin" : "pin-outline"}
              size={15}
              color={item.organization.isPinned ? tintColor : colors.subtext}
              style={{ opacity: item.organization.isPinned ? 1 : 0.4 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openOrganizationEditor}
            style={[styles.rowIconButton, { borderRadius: 16 }]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={16}
              color={colors.subtext}
              style={{ opacity: 0.4 }}
            />
          </TouchableOpacity>
        </>
      }
    />
  );
});


function FilterOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors, tintColor, typography, isDark } = useAppTheme();
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.filterOption,
        {
          backgroundColor: active ? tintColor + "25" : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          borderColor: active ? tintColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <Text
        style={[
          styles.filterOptionText,
          { color: active ? tintColor : colors.subtext, fontFamily: typography.fonts.bold },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active && <Ionicons name="checkmark-circle" size={14} color={tintColor} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors, tintColor, typography } = useAppTheme();
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? tintColor : colors.surface,
          borderColor: active ? tintColor : colors.goldSubtle,
        },
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? colors.onAccent : colors.subtext, fontFamily: typography.fonts.bold },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatSavedDate(savedAt: string) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function getSavedSourceBadge(
  item: SavedSectionItem,
): { color: string; icon: IoniconName; label: string } | null {
  if (item.source?.authoritative === true) {
    return {
      color: Colors.light.statusSuccess,
      icon: "shield-checkmark-outline",
      label: "Authoritative",
    };
  }

  if (item.source?.reviewStatus === "needs_legal_review") {
    return {
      color: Colors.light.statusWarning,
      icon: "alert-circle-outline",
      label: item.target.language === "en" ? "Unofficial" : "Needs review",
    };
  }

  if (item.target.language === "en") {
    return {
      color: Colors.light.statusMuted,
      icon: "information-circle-outline",
      label: "Reference",
    };
  }

  return null;
}

function getLanguageFlag(language: string) {
  switch (language) {
    case "th":
      return "\uD83C\uDDF9\uD83C\uDDED";
    case "en":
      return "\uD83C\uDDEC\uD83C\uDDE7";
    default:
      return "\uD83C\uDF10";
  }
}

function uniqueValues(values: string[]) {
  return values.reduce<string[]>((result, value) => {
    if (!result.includes(value)) {
      result.push(value);
    }

    return result;
  }, []);
}

function parseDraftTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function uniqueCodebooks(savedSections: SavedSectionItem[]) {
  const seen = new Set<string>();

  return savedSections.reduce<Array<{ codeId: string; title: string }>>(
    (result, section) => {
      if (seen.has(section.target.codeId)) {
        return result;
      }

      seen.add(section.target.codeId);
      result.push({
        codeId: section.target.codeId,
        title: section.display.codeTitle,
      });
      return result;
    },
    [],
  );
}

const styles = StyleSheet.create({
  bottomSheetPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: "85%",
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  bottomSheetTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  filterGroupTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
  },

  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 24,
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: "Inter-Bold",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  titleBlock: {
    alignItems: "center",
  },
  title: {
    fontFamily: "Cormorant-Bold",
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter-Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 6,
    opacity: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 24,
    gap: 12,
    backgroundColor: "transparent",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter-Medium",
    marginLeft: 10,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: "#0F1115",
    fontSize: 9,
    fontFamily: "Inter-Bold",
    fontWeight: "900",
  },
  filterLedgerSheet: {
    width: "100%",
    borderRadius: 24,
    marginTop: 16,
    overflow: "hidden",
    position: "relative",
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
  parchmentSpine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  filterLedgerInner: {
    padding: 20,
    backgroundColor: "transparent",
  },
  filterLedgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  filterSectionTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  resetButtonInline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resetTextInline: {
    fontSize: 11,
  },
  filterFieldBlock: {
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  filterLabelInline: {
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 8,
    opacity: 0.5,
    textTransform: "uppercase",
  },
  chipRowInline: {
    gap: 6,
    paddingRight: 12,
  },
  filterSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  filterSplitCol: {
    flex: 1,
    backgroundColor: "transparent",
  },
  filterChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  savedRow: {
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    position: "relative",
    overflow: "hidden",
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
  savedBody: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: "transparent",
  },
  codeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  codeTitle: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    letterSpacing: 1.2,
  },
  savedDate: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Cormorant-Bold",
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.5,
    fontFamily: "Inter-Medium",
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langText: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
  orgChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  orgChipText: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
  actionColumn: {
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
  },
  rowIconButton: {
    height: 32,
    width: 32,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    opacity: 0.6,
  },
  undoToast: {
    alignItems: "center",
    borderRadius: 16,
    bottom: 40,
    flexDirection: "row",
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  undoToastTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  undoToastTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  undoToastSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  undoToastAction: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  modalBackdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  editorPanel: {
    borderRadius: 36,
    borderWidth: 0.5,
    overflow: "hidden",
    maxHeight: "85%",
    width: "100%",
    backgroundColor: "transparent",
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
  editorField: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  editorLabel: {
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  editorHint: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    opacity: 0.6,
  },
  editorInput: {
    borderRadius: 20,
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 12,
  },
  editorSaveButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  editorSaveText: {
    fontSize: 14,
    letterSpacing: 1,
  },
});
