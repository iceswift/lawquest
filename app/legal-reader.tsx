import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { BlurView } from "expo-blur";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Animated,
    Modal,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TextInputSelectionChangeEventData,
    TouchableOpacity,
} from "react-native";

import { ReaderLoadingState } from "@/components/legal-reader/ReaderLoadingState";
import { SectionCard } from "@/components/legal-reader/SectionCard";
import { VersionInfoPanel } from "@/components/legal-reader/VersionInfoPanel";
import { Text, View } from "@/components/Themed";
import { GlobalTTSMiniPlayer } from "@/components/tts/GlobalTTSMiniPlayer";
import {
  getSectionTextHighlightParagraphId,
  HighlightColor,
  LegalHighlightRecord,
  readHighlights,
  removeHighlight,
  saveHighlight,
} from "@/services/highlights";
import Colors from "@/constants/Colors";
import { useAppTheme } from "@/context/ThemeContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  releaseReaderPackageCache,
  repairPackageCache,
} from "@/services/legalContent";
import {
    LegalParagraphRecord,
    LegalPackageDocument,
    readInstalledLegalPackageLanguages,
    readLegalReaderIndexPackage,
    readLegalReaderParagraphs,
    readLegalReaderSectionWindow,
    readLegalReaderSections,
} from "@/services/legalStorage";
import { getLegalSectionLocationKey } from "@/services/legalLocations";
import {
  getLegalReaderDerivedPackage,
  getLegalReaderSelectedStructureNode,
  getLegalReaderStructureLabel,
  LegalReaderSearchScope,
  LegalReaderSection,
  LegalReaderStructureNode,
  normalizeTextForSearch as normalizeReaderTextForSearch,
  parseLegalReaderSearchIntent,
  selectLegalReaderSections,
} from "@/services/legalReaderSelectors";
import {
    getSavedSectionKey,
    readSavedSectionKeys,
} from "@/services/savedItems";
import { endGuardedNavigation } from "@/services/navigationGuards";

const READER_NAVIGATION_KEY = "legal-reader";

type LegalSection = LegalReaderSection;
type SearchScope = LegalReaderSearchScope;
type SearchSource = "reader";
type StructureNode = LegalReaderStructureNode;
type ReaderHighlightDraft = {
  paragraphs: Array<{
    paragraphId: string;
    text: string;
  }>;
  sectionId: string;
  sectionNo: string;
  title: string;
  structurePath?: string;
};
type ReaderNoteLink = {
  codeId?: string;
  language?: string;
  versionId?: string;
  sectionId: string;
};
type ReaderNote = {
  linkedSectionIds?: string[];
  linkedSections?: ReaderNoteLink[];
};


const NOTES_STORAGE_KEY = "@lawquest_notes_v2";
const OUTLINE_SELECTION_KEY_PREFIX = "@lawquest_reader_outline_selection:";
const RECENT_READER_SEARCHES_KEY_PREFIX = "@lawquest_reader_recent_searches:";
const MAX_RECENT_SEARCHES = 8;

export default function LegalReaderScreen() {
  const {
    codeId,
    language = "th",
    versionId,
    sectionId,
    structureNodeId,
  } = useLocalSearchParams<{
    codeId: string;
    language?: string;
    versionId?: string;
    sectionId?: string;
    structureNodeId?: string;
  }>();
  const { isDark, tintColor, colors, typography, layout } = useAppTheme();
  const navigation = useNavigation();
  const listRef = useRef<FlashListRef<LegalSection>>(null);
  const outlineSelectionOverrideRef = useRef(false);
  const [legalPackage, setLegalPackage] = useState<LegalPackageDocument | null>(
    null,
  );
  const [selectedLanguage, setSelectedLanguage] = useState(String(language));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [versionPanelVisible, setVersionPanelVisible] = useState(false);
  const [selectedStructureNodeId, setSelectedStructureNodeId] = useState<
    string | null
  >(structureNodeId ? String(structureNodeId) : null);
  const [isHeaderLocked, setIsHeaderLocked] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    String(language),
  ]);
  const [loading, setLoading] = useState(true);
  const [handledTargetSectionId, setHandledTargetSectionId] = useState<
    string | null
  >(null);
  const [noteCountBySectionId, setNoteCountBySectionId] = useState<
    Map<string, number>
  >(() => new Map());
  const [savedSectionKeys, setSavedSectionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [highlightsBySectionId, setHighlightsBySectionId] = useState<
    Map<string, LegalHighlightRecord[]>
  >(() => new Map());
  const [highlightDraft, setHighlightDraft] =
    useState<ReaderHighlightDraft | null>(null);
  const [managedHighlight, setManagedHighlight] =
    useState<LegalHighlightRecord | null>(null);
  const [hydratedSectionsById, setHydratedSectionsById] = useState<
    Map<string, LegalSection>
  >(() => new Map());
  const [readerParagraphsBySectionId, setReaderParagraphsBySectionId] =
    useState<Map<string, LegalParagraphRecord[]>>(() => new Map());
  const [readerLoadError, setReaderLoadError] = useState<string | null>(null);
  const [readerLoadRevision, setReaderLoadRevision] = useState(0);
  const [readerRepairing, setReaderRepairing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const requestedHydrationSectionIdsRef = useRef<Set<string>>(new Set());
  const hydrationGenerationRef = useRef(0);
  const readerLoadRequestIdRef = useRef(0);
  const blurTimeoutRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchTrigger = useRef(new Animated.Value(1)).current;
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);

  const isHeaderLockedRef = useRef(isHeaderLocked);
  const realScrollYRef = useRef(0);

  useEffect(() => {
    isHeaderLockedRef.current = isHeaderLocked;
    if (!isHeaderLocked) {
      Animated.timing(scrollY, {
        toValue: realScrollYRef.current,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isHeaderLocked, scrollY]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<import("react-native").NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.y;
      realScrollYRef.current = offset;

      if (!isHeaderLockedRef.current) {
        scrollY.setValue(offset);
      }
    },
    [scrollY],
  );
  const targetSectionId = sectionId ? String(sectionId) : null;
  const targetStructureNodeId = structureNodeId
    ? String(structureNodeId)
    : null;
  const readerVersionId =
    legalPackage?.version.versionId ?? (versionId ? String(versionId) : "current");
  const outlineSelectionKey = `${OUTLINE_SELECTION_KEY_PREFIX}${String(codeId)}:${selectedLanguage}:${readerVersionId}`;

  const isSearchActive = searchQuery.trim().length > 0 || searchFocused;

  const headerTranslateY = useMemo(() => {
    const clamped = Animated.diffClamp(scrollY, 0, 200);
    const clampedInterpolated = clamped.interpolate({
      inputRange: [0, 200],
      outputRange: [0, -200],
      extrapolate: "clamp",
    });

    // Create a top mask that scales down the translation as scrollY approaches 0.
    // topMask is 0 at scrollY = 0, and 1 at scrollY >= 50.
    const topMask = scrollY.interpolate({
      inputRange: [0, 50],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    const scrollTranslateY = Animated.multiply(clampedInterpolated, topMask);
    return Animated.multiply(scrollTranslateY, searchTrigger);
  }, [scrollY, searchTrigger]);

  useEffect(() => {
    Animated.timing(searchTrigger, {
      toValue: isSearchActive ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isSearchActive, searchTrigger]);

  const headerOpacity = useMemo(() => {
    if (isSearchActive) {
      return new Animated.Value(1);
    }

    return headerTranslateY.interpolate({
      inputRange: [-200, 0],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
  }, [isSearchActive, headerTranslateY]);

  const textColor = colors.text;
  const subtextColor = colors.subtext;
  const cardBg = colors.card;
  const borderColor = colors.glassBorder;
  const pageBg = colors.background;

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const initialLanguage = String(language);

    readInstalledLegalPackageLanguages(String(codeId))
      .then((installedLanguages) => {
        if (!mounted) {
          return;
        }

        const nextLanguages =
          installedLanguages.length > 0
            ? installedLanguages
            : [initialLanguage];

        setAvailableLanguages(nextLanguages);
        setSelectedLanguage((currentLanguage) => {
          if (nextLanguages.includes(currentLanguage)) {
            return currentLanguage;
          }

          return nextLanguages.includes(initialLanguage)
            ? initialLanguage
            : nextLanguages[0];
        });
      })
      .catch((error) => {
        console.warn("Failed to load installed reader languages", error);
        if (mounted) {
          setAvailableLanguages([initialLanguage]);
          setSelectedLanguage(initialLanguage);
        }
      });

    return () => {
      mounted = false;
    };
  }, [codeId, language]);

  useEffect(() => {
    let mounted = true;
    const requestId = readerLoadRequestIdRef.current + 1;
    readerLoadRequestIdRef.current = requestId;
    hydrationGenerationRef.current += 1;

    setLoading(true);
    setReaderLoadError(null);
    setHydratedSectionsById(new Map());
    setReaderParagraphsBySectionId(new Map());
    requestedHydrationSectionIdsRef.current.clear();
    readLegalReaderIndexPackage({
      codeId: String(codeId),
      language: selectedLanguage,
    })
      .then((nextPackage) => {
        if (mounted && readerLoadRequestIdRef.current === requestId) {
          setLegalPackage(nextPackage);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load legal package", error);
        if (mounted && readerLoadRequestIdRef.current === requestId) {
          setLegalPackage(null);
          setReaderLoadError(
            error instanceof Error
              ? error.message
              : "Could not load this archive.",
          );
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [codeId, readerLoadRevision, selectedLanguage]);

  useEffect(() => {
    return () => {
      hydrationGenerationRef.current += 1;
      requestedHydrationSectionIdsRef.current.clear();
      releaseReaderPackageCache(String(codeId));
    };
  }, [codeId]);

  useEffect(() => {
    let mounted = true;

    readRecentReaderSearches(String(codeId), selectedLanguage)
      .then((nextSearches) => {
        if (mounted) {
          setRecentSearches(nextSearches);
        }
      })
      .catch((error) => {
        console.warn("Failed to load recent reader searches", error);
      });

    return () => {
      mounted = false;
    };
  }, [codeId, selectedLanguage]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        endGuardedNavigation(READER_NAVIGATION_KEY);
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      Promise.all([
        readNoteCountsBySectionId(
          legalPackage
            ? {
                codeId: String(codeId),
                language: selectedLanguage,
                versionId: legalPackage.version.versionId,
              }
            : undefined,
        ),
        readSavedSectionKeys(),
      ])
        .then(([counts, savedKeys]) => {
          if (mounted) {
            setNoteCountBySectionId(counts);
            setSavedSectionKeys(savedKeys);
          }
        })
        .catch((error) => {
          console.warn("Failed to load reader section state", error);
        });

      return () => {
        mounted = false;
      };
    }, [codeId, legalPackage, selectedLanguage]),
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      readHighlights()
        .then((highlights) => {
          if (!mounted) {
            return;
          }

          setHighlightsBySectionId(
            groupReaderHighlightsBySectionId(highlights, {
              codeId: String(codeId),
              language: selectedLanguage,
              versionId: legalPackage?.version.versionId,
            }),
          );
        })
        .catch((error) => {
          console.warn("Failed to load reader highlights", error);
        });

      return () => {
        mounted = false;
      };
    }, [codeId, legalPackage?.version.versionId, selectedLanguage]),
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      AsyncStorage.getItem(outlineSelectionKey)
        .then(async (pendingSelection) => {
          if (!mounted || pendingSelection === null) {
            return;
          }

          await AsyncStorage.removeItem(outlineSelectionKey);
          outlineSelectionOverrideRef.current = true;
          setSearchQuery("");
          setSearchScope("all");
          setSelectedStructureNodeId(
            pendingSelection === "__all__" ? null : pendingSelection,
          );
        })
        .catch((error) => {
          console.warn("Failed to read pending outline selection", error);
        });

      return () => {
        mounted = false;
      };
    }, [outlineSelectionKey]),
  );

  useEffect(() => {
    if (
      !targetSectionId ||
      !legalPackage ||
      handledTargetSectionId === targetSectionId
    ) {
      return;
    }

    setSearchQuery("");
    setSelectedStructureNodeId(null);
    setHandledTargetSectionId(targetSectionId);
  }, [handledTargetSectionId, legalPackage, targetSectionId]);

  const searchIntent = useMemo(
    () => parseLegalReaderSearchIntent(debouncedSearchQuery),
    [debouncedSearchQuery],
  );

  const readerPackage = useMemo(() => {
    if (!legalPackage || hydratedSectionsById.size === 0) {
      return legalPackage;
    }

    return {
      ...legalPackage,
      sections: legalPackage.sections.map(
        (section) => hydratedSectionsById.get(section.sectionId) ?? section,
      ),
    };
  }, [hydratedSectionsById, legalPackage]);

  const derivedPackage = useMemo(
    () => getLegalReaderDerivedPackage(readerPackage, selectedLanguage),
    [readerPackage, selectedLanguage],
  );
  const { outlineNodes, sectionMetadataById, structureLabelById } =
    derivedPackage;
  useEffect(() => {
    if (outlineSelectionOverrideRef.current) {
      return;
    }

    setSelectedStructureNodeId(targetStructureNodeId);
  }, [targetStructureNodeId]);

  const selectedStructureNode = useMemo(
    () =>
      getLegalReaderSelectedStructureNode(
        derivedPackage,
        selectedStructureNodeId,
      ),
    [derivedPackage, selectedStructureNodeId],
  );
  const selectedStructureLabel = selectedStructureNode
    ? getLegalReaderStructureLabel(selectedStructureNode, selectedLanguage)
    : null;

  const jsonFilteredSections = useMemo(
    () =>
      selectLegalReaderSections({
        derivedPackage,
        searchIntent,
        searchScope,
        selectedStructureNodeId,
      }),
    [derivedPackage, searchIntent, searchScope, selectedStructureNodeId],
  );
  const searchSource: SearchSource | null = debouncedSearchQuery.trim()
    ? "reader"
    : null;
  const filteredSections = jsonFilteredSections;

  const hydrateReaderSectionRecords = useCallback((sections: LegalSection[]) => {
    const hydratedSections = sections.filter((section) => section.text.trim());

    if (hydratedSections.length === 0) {
      return;
    }

    hydratedSections.forEach((section) =>
      requestedHydrationSectionIdsRef.current.add(section.sectionId),
    );

    setHydratedSectionsById((currentSections) => {
      const nextSections = new Map(currentSections);

      hydratedSections.forEach((section) => {
        nextSections.set(section.sectionId, section);
      });

      return nextSections;
    });
  }, []);
  const hydrateReaderParagraphRecords = useCallback(
    (paragraphs: LegalParagraphRecord[]) => {
      if (paragraphs.length === 0) {
        return;
      }

      setReaderParagraphsBySectionId((currentParagraphs) => {
        const nextParagraphs = new Map(currentParagraphs);

        paragraphs.forEach((paragraph) => {
          const sectionParagraphs =
            nextParagraphs.get(paragraph.sectionId) ?? [];
          const sectionParagraphById = new Map(
            sectionParagraphs.map((item) => [item.paragraphId, item]),
          );

          sectionParagraphById.set(paragraph.paragraphId, paragraph);
          nextParagraphs.set(
            paragraph.sectionId,
            Array.from(sectionParagraphById.values()).sort(
              (left, right) => left.paragraphIndex - right.paragraphIndex,
            ),
          );
        });

        return nextParagraphs;
      });
    },
    [],
  );

  const hydrateReaderSections = useCallback(
    async (sectionIds: string[]) => {
      const hydrationGeneration = hydrationGenerationRef.current;
      const nextSectionIds = Array.from(new Set(sectionIds)).filter(
        (sectionId) =>
          sectionId &&
          !hydratedSectionsById.has(sectionId) &&
          !requestedHydrationSectionIdsRef.current.has(sectionId),
      );

      if (nextSectionIds.length === 0) {
        return;
      }

      nextSectionIds.forEach((sectionId) =>
        requestedHydrationSectionIdsRef.current.add(sectionId),
      );

      try {
        const [sections, paragraphs] = await Promise.all([
          readLegalReaderSections({
            codeId: String(codeId),
            language: selectedLanguage,
            sectionIds: nextSectionIds,
          }),
          readLegalReaderParagraphs({
            codeId: String(codeId),
            language: selectedLanguage,
            sectionIds: nextSectionIds,
          }),
        ]);

        if (hydrationGenerationRef.current !== hydrationGeneration) {
          return;
        }

        const hydratedSectionIds = new Set(
          sections
            .filter((section) => section.text.trim())
            .map((section) => section.sectionId),
        );

        nextSectionIds.forEach((sectionId) => {
          if (!hydratedSectionIds.has(sectionId)) {
            requestedHydrationSectionIdsRef.current.delete(sectionId);
          }
        });
        hydrateReaderSectionRecords(sections);
        hydrateReaderParagraphRecords(paragraphs);
      } catch (error) {
        if (hydrationGenerationRef.current !== hydrationGeneration) {
          return;
        }

        nextSectionIds.forEach((sectionId) =>
          requestedHydrationSectionIdsRef.current.delete(sectionId),
        );
        console.warn("Failed to hydrate reader sections", error);
      }
    },
    [
      codeId,
      hydratedSectionsById,
      hydrateReaderParagraphRecords,
      hydrateReaderSectionRecords,
      selectedLanguage,
    ],
  );

  useEffect(() => {
    if (loading || filteredSections.length === 0) {
      return;
    }

    let mounted = true;
    const hydrationGeneration = hydrationGenerationRef.current;

    readLegalReaderSectionWindow({
      after: 30,
      before: targetSectionId ? 30 : 0,
      codeId: String(codeId),
      language: selectedLanguage,
      sectionId: targetSectionId,
    })
      .then((sections) => {
        if (mounted && hydrationGenerationRef.current === hydrationGeneration) {
          hydrateReaderSectionRecords(sections);
        }
      })
      .catch((error) => {
        console.warn("Failed to hydrate reader section window", error);
      });

    return () => {
      mounted = false;
    };
  }, [
    codeId,
    filteredSections.length,
    hydrateReaderSectionRecords,
    loading,
    selectedLanguage,
    targetSectionId,
  ]);

  useEffect(() => {
    const wantsTextSearch =
      debouncedSearchQuery.trim() &&
      searchIntent.type === "text" &&
      (searchScope === "all" || searchScope === "text");

    if (
      !wantsTextSearch ||
      derivedPackage.sections.length === 0
    ) {
      return;
    }

    void hydrateReaderSections(
      derivedPackage.sections.map((section) => section.sectionId),
    );
  }, [
    debouncedSearchQuery,
    derivedPackage.sections,
    hydrateReaderSections,
    searchIntent.type,
    searchScope,
    selectedStructureNodeId,
    targetSectionId,
  ]);

  useEffect(() => {
    if (!targetSectionId || loading || filteredSections.length === 0) {
      return;
    }

    const targetIndex = filteredSections.findIndex(
      (section) => section.sectionId === targetSectionId,
    );
    if (targetIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      listRef.current
        ?.scrollToIndex({
          animated: true,
          index: targetIndex,
          viewPosition: 0.12,
        })
        .catch((error) => {
          console.warn("Failed to scroll to target section", error);
        });
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [filteredSections, loading, targetSectionId]);

  const readerCopy = useMemo(
    () => getReaderCopy(selectedLanguage),
    [selectedLanguage],
  );
  const localizedTitle = getLocalizedCodeTitle(
    String(codeId),
    selectedLanguage,
    legalPackage?.code.title ?? "Legal Code",
  );
  const resultLabel = debouncedSearchQuery.trim()
    ? readerCopy.resultCount(filteredSections.length)
    : readerCopy.sectionCount(filteredSections.length);
  const searchSourceLabel = searchSource
    ? readerCopy.searchSources[searchSource]
    : null;
  const sourceBadge = useMemo(
    () => getSourceBadge(legalPackage, selectedLanguage, readerCopy),
    [legalPackage, readerCopy, selectedLanguage],
  );
  const versionSummary = useMemo(
    () => getVersionSummary(legalPackage, selectedLanguage),
    [legalPackage, selectedLanguage],
  );
  const languageFlag = getLanguageFlag(selectedLanguage);
  const cycleLanguage = useCallback(() => {
    if (availableLanguages.length <= 1) {
      return;
    }

    const currentIndex = availableLanguages.indexOf(selectedLanguage);
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % availableLanguages.length : 0;

    setSelectedLanguage(availableLanguages[nextIndex]);
  }, [availableLanguages, selectedLanguage]);
  const commitSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return;
      }

      const nextSearches = await saveRecentReaderSearch(
        String(codeId),
        selectedLanguage,
        trimmedQuery,
      );
      setRecentSearches(nextSearches);

      if (filteredSections.length > 0) {
        listRef.current
          ?.scrollToIndex({
            animated: true,
            index: 0,
            viewPosition: 0,
          })
          .catch((error) => {
            console.warn("Failed to scroll to first search result", error);
          });
      }
    },
    [codeId, filteredSections.length, selectedLanguage],
  );
  const selectRecentSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedStructureNodeId(null);
  }, []);
  const clearRecentSearches = useCallback(async () => {
    await saveRecentReaderSearches(String(codeId), selectedLanguage, []);
    setRecentSearches([]);
  }, [codeId, selectedLanguage]);
  const updateSavedSectionState = useCallback(
    (
      section: {
        codeId: string;
        language: string;
        versionId?: string;
        sectionId: string;
      },
      saved: boolean,
    ) => {
      setSavedSectionKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        const sectionKey = getSavedSectionKey(section);

        if (saved) {
          nextKeys.add(sectionKey);
        } else {
          nextKeys.delete(sectionKey);
        }

        return nextKeys;
      });
    },
    [],
  );
  const openHighlightSelection = useCallback((draft: ReaderHighlightDraft) => {
    setHighlightDraft(draft);
  }, []);
  const closeHighlightSelection = useCallback(() => {
    setHighlightDraft(null);
  }, []);
  const openHighlightManager = useCallback((highlight: LegalHighlightRecord) => {
    setManagedHighlight(highlight);
  }, []);
  const closeHighlightManager = useCallback(() => {
    setManagedHighlight(null);
  }, []);
  const saveReaderHighlight = useCallback(
    async ({
      color,
      draft,
      endOffset,
      paragraphId,
      selectedText,
      startOffset,
    }: {
      color: HighlightColor;
      draft: ReaderHighlightDraft;
      endOffset: number;
      paragraphId: string;
      selectedText: string;
      startOffset: number;
    }) => {
      if (!legalPackage) {
        return;
      }

      const nextHighlights = await saveHighlight({
        codeId: String(codeId),
        language: selectedLanguage,
        versionId: legalPackage.version.versionId,
        sectionId: draft.sectionId,
        paragraphId,
        startOffset,
        endOffset,
        selectedText,
        color,
        sectionNo: draft.sectionNo,
        title: draft.title,
        codeTitle: legalPackage.code.title,
        structurePath: draft.structurePath,
      });

      setHighlightsBySectionId(
        groupReaderHighlightsBySectionId(nextHighlights, {
          codeId: String(codeId),
          language: selectedLanguage,
          versionId: legalPackage.version.versionId,
        }),
      );
      setHighlightDraft(null);
    },
    [codeId, legalPackage, selectedLanguage],
  );
  const updateReaderHighlightColor = useCallback(
    async (highlight: LegalHighlightRecord, color: HighlightColor) => {
      if (!legalPackage) {
        return;
      }

      const nextHighlights = await saveHighlight({
        ...highlight.target,
        selectedText: highlight.selectedText,
        color,
        noteId: highlight.noteId,
      });

      setHighlightsBySectionId(
        groupReaderHighlightsBySectionId(nextHighlights, {
          codeId: String(codeId),
          language: selectedLanguage,
          versionId: legalPackage.version.versionId,
        }),
      );
      setManagedHighlight(null);
    },
    [codeId, legalPackage, selectedLanguage],
  );
  const deleteReaderHighlight = useCallback(
    async (highlight: LegalHighlightRecord) => {
      const nextHighlights = await removeHighlight(highlight.id);

      setHighlightsBySectionId(
        groupReaderHighlightsBySectionId(nextHighlights, {
          codeId: String(codeId),
          language: selectedLanguage,
          versionId: legalPackage?.version.versionId,
        }),
      );
      setManagedHighlight(null);
    },
    [codeId, legalPackage?.version.versionId, selectedLanguage],
  );
  const hydrateReaderSection = useCallback(
    (sectionId: string) => {
      void hydrateReaderSections([sectionId]);
    },
    [hydrateReaderSections],
  );
  const retryReaderLoad = useCallback(() => {
    setReaderLoadRevision((revision) => revision + 1);
  }, []);
  const repairReaderCache = useCallback(async () => {
    if (readerRepairing) {
      return;
    }

    setReaderRepairing(true);
    try {
      await repairPackageCache(String(codeId));
      setReaderLoadRevision((revision) => revision + 1);
    } catch (error) {
      setReaderLoadError(
        error instanceof Error
          ? error.message
          : "Could not repair this archive cache.",
      );
    } finally {
      setReaderRepairing(false);
    }
  }, [codeId, readerRepairing]);
  const openVersionPanel = useCallback(() => {
    setVersionPanelVisible(true);
  }, []);
  const clearSearchQuery = useCallback(() => {
    setSearchQuery("");
  }, []);
  const openOutline = useCallback(() => {
    outlineSelectionOverrideRef.current = false;
    router.push({
      pathname: "/legal-outline",
      params: {
        codeId: String(codeId),
        language: selectedLanguage,
        versionId: readerVersionId,
        ...(selectedStructureNodeId
          ? { structureNodeId: selectedStructureNodeId }
          : {}),
      },
    });
  }, [codeId, readerVersionId, selectedLanguage, selectedStructureNodeId]);
  const renderSectionItem = useCallback(
    ({ item }: { item: LegalSection }) => {
      if (!legalPackage) {
        return null;
      }

      return (
        <SectionCard
          borderColor={borderColor}
          cardBg={cardBg}
          codeTitle={legalPackage.code.title}
          versionId={legalPackage.version.versionId}
          authoritative={legalPackage.version.authoritative}
          reviewStatus={legalPackage.version.reviewStatus}
          sourceType={legalPackage.version.sourceType}
          translationStatus={legalPackage.version.translationStatus}
          item={item}
          highlights={highlightsBySectionId.get(item.sectionId) ?? []}
          isTarget={targetSectionId === item.sectionId}
          codeId={String(codeId)}
          language={selectedLanguage}
          metadata={sectionMetadataById.get(item.sectionId)}
          noteCount={noteCountBySectionId.get(item.sectionId) ?? 0}
          onHighlightManage={openHighlightManager}
          onHighlightPress={openHighlightSelection}
          onNeedHydration={hydrateReaderSection}
          paragraphs={
            readerParagraphsBySectionId.get(item.sectionId) ??
            []
          }
          isSaved={savedSectionKeys.has(
            getSavedSectionKey({
              codeId: String(codeId),
              language: selectedLanguage,
              versionId: legalPackage.version.versionId,
              sectionId: item.sectionId,
            }),
          )}
          onSavedChange={updateSavedSectionState}
          readerCopy={readerCopy}
          searchIntent={searchIntent}
          structureLabelById={structureLabelById}
          subtextColor={subtextColor}
          textColor={textColor}
          tintColor={tintColor}
          isDark={isDark}
        />
      );
    },
    [
      borderColor,
      cardBg,
      codeId,
      hydrateReaderSection,
      highlightsBySectionId,
      isDark,
      legalPackage,
      noteCountBySectionId,
      readerParagraphsBySectionId,
      readerCopy,
      savedSectionKeys,
      searchIntent,
      sectionMetadataById,
      selectedLanguage,
      structureLabelById,
      subtextColor,
      targetSectionId,
      textColor,
      tintColor,
      updateSavedSectionState,
    ],
  );
  const sectionKeyExtractor = useCallback(
    (item: LegalSection) => item.sectionId,
    [],
  );
  const handleViewableSectionsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ item?: LegalSection | null }>;
    }) => {
      void hydrateReaderSections(
        viewableItems
          .map((viewableItem) => viewableItem.item?.sectionId)
          .filter((sectionId): sectionId is string => Boolean(sectionId)),
      );
    },
  );
  useEffect(() => {
    handleViewableSectionsChanged.current = ({
      viewableItems,
    }: {
      viewableItems: Array<{ item?: LegalSection | null }>;
    }) => {
      void hydrateReaderSections(
        viewableItems
          .map((viewableItem) => viewableItem.item?.sectionId)
          .filter((sectionId): sectionId is string => Boolean(sectionId)),
      );
    };
  }, [hydrateReaderSections]);
  const emptySearchState = useMemo(
    () => (
      <View style={styles.emptySearch}>
        <Ionicons name="search-outline" size={30} color={subtextColor} />
        <Text style={[styles.centerText, { color: subtextColor }]}>
          {readerCopy.noResults}
        </Text>
      </View>
    ),
    [readerCopy.noResults, subtextColor],
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "transparent" }}>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={() => setIsHeaderLocked((prev) => !prev)}
            style={{ paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <Ionicons
              name={isHeaderLocked ? "lock-closed" : "lock-open-outline"}
              size={22}
              color={isHeaderLocked ? tintColor : colors.subtext}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={openVersionPanel}
            style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: -8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={tintColor} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, openVersionPanel, tintColor, isHeaderLocked, colors.subtext]);

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <Animated.View
        style={[
          styles.headerShell,
          {
            backgroundColor: pageBg,
            borderBottomColor: borderColor,
            borderBottomWidth: 0.5,
          },
          !loading && {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            JURISPRUDENCE READER
          </Text>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text
                style={[styles.title, { color: textColor, fontFamily: typography.fonts.regal }]}
                numberOfLines={2}
              >
                {localizedTitle}
              </Text>
              {legalPackage && (
                <Text style={[styles.subtitle, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
                  {selectedLanguage.toUpperCase()} • {legalPackage.version.versionId} • {resultLabel}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ position: "relative", zIndex: 100, backgroundColor: "transparent" }}>
          <View style={styles.searchAndOutlineRow}>
            <View
              style={[
                styles.searchContainer,
                { flex: 1, backgroundColor: isDark ? "#1E2330" : "#FFFFFF", borderColor, borderWidth: 0.5 },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={subtextColor} style={{ marginRight: 6 }} />
              <TextInput
                value={searchQuery}
                onFocus={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                    blurTimeoutRef.current = null;
                  }
                  setSearchFocused(true);
                }}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => {
                    setSearchFocused(false);
                  }, 180);
                }}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => void commitSearch(searchQuery)}
                placeholder={readerCopy.searchPlaceholder}
                placeholderTextColor={subtextColor + "80"}
                returnKeyType="search"
                style={[styles.searchInput, { color: textColor, fontFamily: typography.fonts.primary, padding: 0 }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearchQuery}>
                  <Ionicons name="close-circle" size={16} color={subtextColor} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={openOutline}
              style={[
                styles.compactOutlineButton,
                { backgroundColor: isDark ? "#1E2330" : "#FFFFFF", borderColor, borderWidth: 0.5 },
              ]}
            >
              <Ionicons name="map-outline" size={15} color={tintColor} />
              <Text
                style={[styles.compactOutlineText, { color: textColor, fontFamily: typography.fonts.bold }]}
                numberOfLines={1}
              >
                {selectedStructureLabel ? (selectedStructureLabel.length > 10 ? selectedStructureLabel.slice(0, 10) + "..." : selectedStructureLabel) : readerCopy.outline}
              </Text>
            </TouchableOpacity>
          </View>

          {searchFocused && !searchQuery.trim() && recentSearches.length > 0 && (
            <View style={[styles.recentSearchBlock, { borderColor, backgroundColor: isDark ? "rgba(16, 20, 27, 0.45)" : "rgba(255, 255, 255, 0.45)" }]}>
              <BlurView
                intensity={Platform.OS === "ios" ? 85 : 95}
                tint={isDark ? "dark" : "light"}
                style={styles.recentSearchBlurContainer}
              >
                <View style={styles.recentSearchHeader}>
                  <Text style={[styles.recentSearchTitle, { color: subtextColor }]}>
                    {readerCopy.recentSearches}
                  </Text>
                  <TouchableOpacity hitSlop={8} onPress={clearRecentSearches}>
                    <Text style={[styles.recentSearchClear, { color: tintColor }]}>
                      {readerCopy.clear}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.recentSearchList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {recentSearches.map((query) => (
                    <TouchableOpacity
                      key={query}
                      activeOpacity={0.82}
                      onPress={() => selectRecentSearch(query)}
                      style={[
                        styles.recentSearchRowItem,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "transparent" }}>
                        <Ionicons name="time-outline" size={15} color={subtextColor} />
                        <Text
                          style={[styles.recentSearchText, { color: textColor, fontFamily: typography.fonts.primary }]}
                          numberOfLines={1}
                        >
                          {query}
                        </Text>
                      </View>
                      <Ionicons name="trending-up-outline" size={14} color={tintColor} style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </BlurView>
            </View>
          )}
        </View>

        {searchQuery.trim().length > 0 && (
          <View style={styles.searchScopeRow}>
            {(["all", "section", "text", "structure"] as const).map((scope) => {
              const active = searchScope === scope;

              return (
                <TouchableOpacity
                  key={scope}
                  onPress={() => setSearchScope(scope)}
                  style={[
                    styles.searchScopeChip,
                    { borderColor, borderWidth: 0.5 },
                    active && {
                      backgroundColor: tintColor + "12",
                      borderColor: tintColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.searchScopeText,
                      { color: active ? tintColor : subtextColor, fontFamily: active ? typography.fonts.bold : typography.fonts.primary },
                    ]}
                  >
                    {readerCopy.searchScopes[scope]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {searchQuery.trim().length > 0 && searchSourceLabel && (
          <View style={styles.searchSourceRow}>
            <View
              style={[
                styles.searchSourceChip,
                {
                  borderColor,
                  borderWidth: 0.5,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <Ionicons
                name="reader-outline"
                size={11}
                color={subtextColor}
              />
              <Text
                style={[
                  styles.searchSourceText,
                  { color: subtextColor, fontFamily: typography.fonts.primary },
                ]}
              >
                {searchSourceLabel}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {loading ? (
        <ReaderLoadingState
          borderColor={borderColor}
          cardBg={cardBg}
          isDark={isDark}
          readerCopy={readerCopy}
          subtextColor={subtextColor}
          textColor={textColor}
          tintColor={tintColor}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={filteredSections}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={handleViewableSectionsChanged.current}
          keyExtractor={sectionKeyExtractor}
          contentContainerStyle={styles.listContent}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 10,
          }}
          extraData={{
            hydratedSectionsById,
            highlightsBySectionId,
            noteCountBySectionId,
            readerParagraphsBySectionId,
            savedSectionKeys,
            targetSectionId,
            tintColor,
            isDark,
          }}
          renderItem={renderSectionItem}
          ListEmptyComponent={emptySearchState}
        />
      )}

      {versionPanelVisible && (
        <VersionInfoPanel
          borderColor={borderColor}
          cardBg={cardBg}
          isDark={isDark}
          legalPackage={legalPackage}
          onClose={() => setVersionPanelVisible(false)}
          readerCopy={readerCopy}
          sourceBadge={sourceBadge}
          subtextColor={subtextColor}
          summary={versionSummary}
          textColor={textColor}
          tintColor={tintColor}
          visible
          availableLanguages={availableLanguages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={cycleLanguage}
          languageLabel={language === "th" ? "ภาษา / Language" : "Language"}
        />
      )}
      <HighlightSelectionModal
        borderColor={borderColor}
        cardBg={cardBg}
        draft={highlightDraft}
        isDark={isDark}
        onClose={closeHighlightSelection}
        onSave={saveReaderHighlight}
        readerCopy={readerCopy}
        subtextColor={subtextColor}
        textColor={textColor}
        tintColor={tintColor}
      />
      <HighlightManagementModal
        borderColor={borderColor}
        cardBg={cardBg}
        highlight={managedHighlight}
        isDark={isDark}
        onClose={closeHighlightManager}
        onDelete={deleteReaderHighlight}
        onUpdateColor={updateReaderHighlightColor}
        readerCopy={readerCopy}
        subtextColor={subtextColor}
        textColor={textColor}
        tintColor={tintColor}
      />
      <GlobalTTSMiniPlayer isReaderScreen={true} />
    </View>
  );
}

function HighlightManagementModal({
  borderColor,
  cardBg,
  highlight,
  isDark,
  onClose,
  onDelete,
  onUpdateColor,
  readerCopy,
  subtextColor,
  textColor,
  tintColor,
}: {
  borderColor: string;
  cardBg: string;
  highlight: LegalHighlightRecord | null;
  isDark: boolean;
  onClose: () => void;
  onDelete: (highlight: LegalHighlightRecord) => Promise<void>;
  onUpdateColor: (
    highlight: LegalHighlightRecord,
    color: HighlightColor,
  ) => Promise<void>;
  readerCopy: ReturnType<typeof getReaderCopy>;
  subtextColor: string;
  textColor: string;
  tintColor: string;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (highlight) {
      setBusy(false);
    }
  }, [highlight]);

  const updateColor = async (color: HighlightColor) => {
    if (!highlight || busy) {
      return;
    }

    setBusy(true);
    try {
      await onUpdateColor(highlight, color);
    } finally {
      setBusy(false);
    }
  };
  const deleteHighlight = async () => {
    if (!highlight || busy) {
      return;
    }

    setBusy(true);
    try {
      await onDelete(highlight);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={Boolean(highlight)}
    >
      <View style={styles.highlightBackdrop}>
        <View
          style={[
            styles.highlightPanel,
            {
              backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
              borderColor,
            },
          ]}
        >
          <View style={styles.highlightHeader}>
            <View style={styles.highlightTitleBlock}>
              <Text style={[styles.highlightEyebrow, { color: tintColor }]}>
                {readerCopy.highlightEyebrow}
              </Text>
              <Text style={[styles.highlightTitle, { color: textColor }]}>
                {readerCopy.manageHighlight}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={onClose}
              style={[
                styles.highlightCloseButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  borderColor,
                },
              ]}
            >
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          {highlight ? (
            <View
              style={[
                styles.highlightPreviewCard,
                {
                  backgroundColor: getHighlightSwatchColor(highlight.color),
                  borderColor,
                },
              ]}
            >
              <Text style={styles.highlightPreviewText}>
                {highlight.selectedText}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.highlightHint, { color: subtextColor }]}>
            {readerCopy.highlightColorHint}
          </Text>
          <View style={styles.highlightColorRow}>
            {(["yellow", "green", "blue", "pink", "purple"] as const).map(
              (color) => {
                const selected = highlight?.color === color;

                return (
                  <TouchableOpacity
                    key={color}
                    accessibilityLabel={color}
                    activeOpacity={0.82}
                    disabled={busy}
                    onPress={() => void updateColor(color)}
                    style={[
                      styles.highlightColorButton,
                      {
                        backgroundColor: getHighlightSwatchColor(color),
                        borderColor: selected ? tintColor : borderColor,
                        opacity: busy ? 0.6 : 1,
                        transform: [{ scale: selected ? 1.08 : 1 }],
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color="#111827" />
                    ) : null}
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={busy}
            onPress={() => void deleteHighlight()}
            style={[
              styles.highlightDeleteButton,
              {
                borderColor: "#DC2626",
                opacity: busy ? 0.55 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={17} color="#DC2626" />
            <Text style={styles.highlightDeleteText}>
              {readerCopy.deleteHighlight}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function HighlightSelectionModal({
  borderColor,
  cardBg,
  draft,
  isDark,
  onClose,
  onSave,
  readerCopy,
  subtextColor,
  textColor,
  tintColor,
}: {
  borderColor: string;
  cardBg: string;
  draft: ReaderHighlightDraft | null;
  isDark: boolean;
  onClose: () => void;
  onSave: (selection: {
    color: HighlightColor;
    draft: ReaderHighlightDraft;
    endOffset: number;
    paragraphId: string;
    selectedText: string;
    startOffset: number;
  }) => Promise<void>;
  readerCopy: ReturnType<typeof getReaderCopy>;
  subtextColor: string;
  textColor: string;
  tintColor: string;
}) {
  const [selection, setSelection] = useState({ end: 0, start: 0 });
  const [selectedColor, setSelectedColor] =
    useState<HighlightColor>("yellow");
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(
    null,
  );
  const selectedParagraph =
    draft?.paragraphs.find(
      (paragraph) => paragraph.paragraphId === selectedParagraphId,
    ) ??
    draft?.paragraphs[0] ??
    null;
  const selectedText = useMemo(() => {
    if (!selectedParagraph) {
      return "";
    }

    const startOffset = Math.min(selection.start, selection.end);
    const endOffset = Math.max(selection.start, selection.end);

    return selectedParagraph.text.slice(startOffset, endOffset).trim();
  }, [selectedParagraph, selection.end, selection.start]);

  useEffect(() => {
    if (draft) {
      setSelection({ end: 0, start: 0 });
      setSelectedColor("yellow");
      setSelectedParagraphId(draft.paragraphs[0]?.paragraphId ?? null);
    }
  }, [draft]);

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    setSelection(event.nativeEvent.selection);
  };
  const handleSave = () => {
    if (!draft || !selectedParagraph || !selectedText) {
      return;
    }

    const startOffset = Math.min(selection.start, selection.end);
    const endOffset = Math.max(selection.start, selection.end);

    void onSave({
      color: selectedColor,
      draft,
      endOffset,
      paragraphId: selectedParagraph.paragraphId,
      selectedText,
      startOffset,
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={Boolean(draft)}
    >
      <View style={styles.highlightBackdrop}>
        <View
          style={[
            styles.highlightPanel,
            {
              backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
              borderColor,
            },
          ]}
        >
          <View style={styles.highlightHeader}>
            <View style={styles.highlightTitleBlock}>
              <Text style={[styles.highlightEyebrow, { color: tintColor }]}>
                {readerCopy.highlightEyebrow}
              </Text>
              <Text style={[styles.highlightTitle, { color: textColor }]}>
                {draft?.title ?? readerCopy.highlight}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={onClose}
              style={[
                styles.highlightCloseButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  borderColor,
                },
              ]}
            >
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.highlightHint, { color: subtextColor }]}>
            {readerCopy.highlightHint}
          </Text>
          {draft && draft.paragraphs.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.highlightParagraphTabs}
            >
              {draft.paragraphs.map((paragraph, index) => {
                const active = paragraph.paragraphId === selectedParagraph?.paragraphId;

                return (
                  <TouchableOpacity
                    key={paragraph.paragraphId}
                    activeOpacity={0.82}
                    onPress={() => {
                      setSelectedParagraphId(paragraph.paragraphId);
                      setSelection({ end: 0, start: 0 });
                    }}
                    style={[
                      styles.highlightParagraphTab,
                      {
                        borderColor: active ? tintColor : borderColor,
                        backgroundColor: active ? tintColor + "12" : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.highlightParagraphTabText,
                        { color: active ? tintColor : subtextColor },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <TextInput
            caretHidden
            contextMenuHidden={false}
            multiline
            onChangeText={() => undefined}
            onSelectionChange={handleSelectionChange}
            scrollEnabled
            selectionColor={tintColor + "55"}
            showSoftInputOnFocus={false}
            style={[
              styles.highlightTextInput,
              {
                backgroundColor: isDark ? "#10141B" : "#F8F6F1",
                borderColor,
                color: textColor,
              },
            ]}
            value={selectedParagraph?.text ?? ""}
          />

          <View style={styles.highlightColorRow}>
            {(["yellow", "green", "blue", "pink", "purple"] as const).map(
              (color) => {
                const selected = selectedColor === color;

                return (
                  <TouchableOpacity
                    key={color}
                    accessibilityLabel={color}
                    activeOpacity={0.82}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.highlightColorButton,
                      {
                        backgroundColor: getHighlightSwatchColor(color),
                        borderColor: selected ? tintColor : borderColor,
                        transform: [{ scale: selected ? 1.08 : 1 }],
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color="#111827" />
                    ) : null}
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!selectedText}
            onPress={handleSave}
            style={[
              styles.highlightSaveButton,
              {
                backgroundColor: selectedText ? tintColor : borderColor,
                opacity: selectedText ? 1 : 0.5,
              },
            ]}
          >
            <Ionicons name="color-wand-outline" size={17} color="#fff" />
            <Text style={styles.highlightSaveText}>
              {readerCopy.saveHighlight}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function OutlineModal({
  borderColor,
  cardBg,
  isDark,
  nodes,
  onClose,
  onSelect,
  readerCopy,
  selectedNodeId,
  selectedLanguage = "th",
  subtextColor,
  textColor,
  tintColor,
  visible,
}: {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  nodes: StructureNode[];
  onClose: () => void;
  onSelect: (nodeId: string | null) => void;
  readerCopy: ReturnType<typeof getReaderCopy>;
  selectedNodeId: string | null;
  selectedLanguage?: string;
  subtextColor: string;
  textColor: string;
  tintColor: string;
  visible: boolean;
}) {
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const currentNode = currentParentId
    ? (nodeById.get(currentParentId) ?? null)
    : null;
  const currentChildren = useMemo(() => {
    return nodes
      .filter((node) => (node.parentId ?? null) === currentParentId)
      .sort((a, b) => {
        const aFirstSection = Number(
          a.sectionRange?.fromSectionNo?.split("/")[0] ?? 0,
        );
        const bFirstSection = Number(
          b.sectionRange?.fromSectionNo?.split("/")[0] ?? 0,
        );

        return (
          aFirstSection - bFirstSection ||
          getLegalReaderStructureLabel(a, selectedLanguage).localeCompare(
            getLegalReaderStructureLabel(b, selectedLanguage),
          )
        );
      });
  }, [currentParentId, nodes, selectedLanguage]);
  const currentPath =
    currentNode?.path
      ?.map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is StructureNode => Boolean(node)) ?? [];
  const allSectionCount = useMemo(() => countUniqueSections(nodes), [nodes]);

  useEffect(() => {
    if (visible) {
      setCurrentParentId(
        selectedNodeId
          ? (nodeById.get(selectedNodeId)?.parentId ?? null)
          : null,
      );
    }
  }, [nodeById, selectedNodeId, visible]);

  const goBack = () => {
    if (!currentNode) {
      return;
    }

    setCurrentParentId(currentNode.parentId ?? null);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.outlineBackdrop}>
        <View
          style={[
            styles.outlinePanel,
            { backgroundColor: isDark ? "#1E2330" : "#FFFFFF", borderColor },
          ]}
        >
          <View style={styles.outlineHeader}>
            <View style={styles.outlineTitleBlock}>
              <Text style={[styles.outlineEyebrow, { color: tintColor }]}>
                COLLECTION INDEX
              </Text>
              <Text style={[styles.outlineTitle, { color: textColor }]}>
                {currentNode
                  ? getLegalReaderStructureLabel(currentNode, selectedLanguage)
                  : readerCopy.outline}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.outlineCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor }]}
            >
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.outlineCrumbBar}>
            <TouchableOpacity
              activeOpacity={0.78}
              disabled={!currentNode}
              onPress={goBack}
              style={[
                styles.outlineBackButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor,
                  opacity: currentNode ? 1 : 0.42,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={14} color={textColor} />
              <Text style={[styles.outlineBackText, { color: textColor }]}>
                {readerCopy.back}
              </Text>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.outlineBreadcrumbs}
            >
              <Text
                style={[styles.outlineBreadcrumbText, { color: subtextColor }]}
              >
                {readerCopy.allSections}
              </Text>
              {currentPath.map((node) => (
                <Text
                  key={node.id}
                  style={[
                    styles.outlineBreadcrumbText,
                    {
                      color:
                        node.id === currentParentId ? tintColor : subtextColor,
                    },
                  ]}
                  numberOfLines={1}
                >
                  / {getLegalReaderStructureLabel(node, selectedLanguage)}
                </Text>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={styles.outlineList}
            showsVerticalScrollIndicator={false}
          >
            <OutlineRow
              variant="all"
              borderColor={borderColor}
              count={allSectionCount}
              hasChildren={false}
              label={readerCopy.allSections}
              onPress={() => onSelect(null)}
              selected={selectedNodeId === null}
              subtextColor={subtextColor}
              textColor={textColor}
              tintColor={tintColor}
            />

            {currentNode && (
              <OutlineRow
                variant="action"
                borderColor={borderColor}
                count={
                  currentNode.sectionRange?.sectionCount ??
                  currentNode.sectionIds.length
                }
                hasChildren={false}
                label={readerCopy.showThisHeading}
                onPress={() => onSelect(currentNode.id)}
                rangeLabel={formatSectionRange(currentNode, readerCopy)}
                selected={selectedNodeId === currentNode.id}
                subtextColor={subtextColor}
                textColor={textColor}
                tintColor={tintColor}
              />
            )}

            {currentChildren.map((node) => {
              const childCount = nodes.filter(
                (candidate) => candidate.parentId === node.id,
              ).length;

              return (
                <OutlineRow
                  variant="folder"
                  key={node.id}
                  borderColor={borderColor}
                  count={
                    node.sectionRange?.sectionCount ?? node.sectionIds.length
                  }
                  hasChildren={childCount > 0}
                  label={getLegalReaderStructureLabel(node, selectedLanguage)}
                  onPress={() => {
                    if (childCount > 0) {
                      setCurrentParentId(node.id);
                      return;
                    }

                    onSelect(node.id);
                  }}
                  rangeLabel={formatSectionRange(node, readerCopy)}
                  selected={selectedNodeId === node.id}
                  subtextColor={subtextColor}
                  textColor={textColor}
                  tintColor={tintColor}
                />
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OutlineRow({
  borderColor,
  count,
  hasChildren,
  label,
  onPress,
  rangeLabel,
  selected,
  subtextColor,
  textColor,
  tintColor,
  variant,
}: {
  borderColor: string;
  count: number;
  hasChildren: boolean;
  label: string;
  onPress: () => void;
  rangeLabel?: string;
  selected: boolean;
  subtextColor: string;
  textColor: string;
  tintColor: string;
  variant: "action" | "all" | "folder";
}) {
  const isAction = variant === "action";
  const iconName =
    variant === "all"
      ? "reader-outline"
      : isAction
        ? "filter-outline"
        : hasChildren
          ? "folder-outline"
          : "document-text-outline";

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.outlineRow,
        {
          borderColor: selected || isAction ? tintColor : borderColor,
          backgroundColor: isAction
            ? tintColor + "12"
            : selected
              ? tintColor + "0E"
              : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.outlineIconBubble,
          {
            backgroundColor:
              selected || isAction ? tintColor : tintColor + "12",
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={16}
          color={selected || isAction ? "#fff" : tintColor}
        />
      </View>
      <View style={styles.outlineRowText}>
        <Text
          style={[
            styles.outlineRowLabel,
            { color: selected ? tintColor : textColor },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text style={[styles.outlineRowMeta, { color: subtextColor }]}>
          {rangeLabel ? `${rangeLabel} · ` : ""}
          {count.toLocaleString()} sections
        </Text>
      </View>
      {hasChildren ? (
        <Ionicons name="chevron-forward" size={18} color={subtextColor} />
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={18} color={tintColor} />
      ) : null}
    </TouchableOpacity>
  );
}

function countUniqueSections(nodes: StructureNode[]) {
  const sectionIds = new Set<string>();

  nodes.forEach((node) => {
    node.sectionIds.forEach((sectionId) => sectionIds.add(sectionId));
  });

  return sectionIds.size;
}

function formatSectionRange(
  node: StructureNode,
  readerCopy: ReturnType<typeof getReaderCopy>,
) {
  const range = node.sectionRange;

  if (!range?.fromSectionNo) {
    return undefined;
  }

  if (range.fromSectionNo === range.toSectionNo || !range.toSectionNo) {
    return `${readerCopy.sectionRangePrefix} ${range.fromSectionNo}`;
  }

  return `${readerCopy.sectionRangePrefix} ${range.fromSectionNo}-${range.toSectionNo}`;
}

async function readNoteCountsBySectionId(target?: {
  codeId: string;
  language: string;
  versionId?: string;
}) {
  const rawValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
  const counts = new Map<string, number>();

  if (!rawValue) {
    return counts;
  }

  const parsed = JSON.parse(rawValue) as
    | ReaderNote[]
    | { notes?: ReaderNote[] };
  const notes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.notes)
      ? parsed.notes
      : [];

  notes.forEach((note) => {
    const sectionIds = new Set<string>();

    if (!target) {
      note.linkedSectionIds?.forEach((sectionId) => sectionIds.add(sectionId));
      note.linkedSections?.forEach((section) =>
        sectionIds.add(section.sectionId),
      );
    } else {
      const hasStructuredLinks = note.linkedSections?.some(
        (section) => section.codeId,
      );

      note.linkedSections?.forEach((section) => {
        if (!section.codeId) {
          return;
        }

        const sectionKey = getLegalSectionLocationKey({
          codeId: section.codeId,
          language: section.language,
          versionId: section.versionId,
          sectionId: section.sectionId,
        });
        const targetKey = getLegalSectionLocationKey({
          codeId: target.codeId,
          language: target.language,
          versionId: target.versionId,
          sectionId: section.sectionId,
        });

        if (sectionKey === targetKey) {
          sectionIds.add(section.sectionId);
        }
      });

      if (!hasStructuredLinks) {
        note.linkedSectionIds?.forEach((sectionId) => sectionIds.add(sectionId));
      }
    }

    sectionIds.forEach((sectionId) => {
      counts.set(sectionId, (counts.get(sectionId) ?? 0) + 1);
    });
  });

  return counts;
}

async function readRecentReaderSearches(codeId: string, language: string) {
  const rawValue = await AsyncStorage.getItem(
    getRecentReaderSearchesKey(codeId, language),
  );

  if (!rawValue) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_RECENT_SEARCHES);
}

async function saveRecentReaderSearch(
  codeId: string,
  language: string,
  query: string,
) {
  const normalizedQuery = query.trim();
  const currentSearches = await readRecentReaderSearches(codeId, language);
  const nextSearches = [
    normalizedQuery,
    ...currentSearches.filter(
      (item) =>
        normalizeReaderTextForSearch(item) !==
        normalizeReaderTextForSearch(normalizedQuery),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  await saveRecentReaderSearches(codeId, language, nextSearches);
  return nextSearches;
}

async function saveRecentReaderSearches(
  codeId: string,
  language: string,
  searches: string[],
) {
  await AsyncStorage.setItem(
    getRecentReaderSearchesKey(codeId, language),
    JSON.stringify(searches),
  );
}

function getRecentReaderSearchesKey(codeId: string, language: string) {
  return `${RECENT_READER_SEARCHES_KEY_PREFIX}${codeId}:${language}`;
}

function normalizeSectionQuery(query: string) {
  const normalized = normalizeTextForSearch(query)
    .replace(/^(section|sec|มาตรา)\s*/i, "")
    .trim();

  return /^[0-9]+(?:\/[0-9]+)?$/.test(normalized) ? normalized : null;
}

function normalizeTextForSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0E50-\u0E59]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0e50),
    )
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[“”‘’"']/g, "")
    .replace(/[.,;:!?()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLegalSectionQuery(query: string) {
  const normalized = normalizeTextForSearch(query)
    .replace(/^(section|sec|\u0E21\u0E32\u0E15\u0E23\u0E32)\s*/i, "")
    .trim();

  return /^[0-9]+(?:\/[0-9]+)?$/.test(normalized) ? normalized : null;
}

function parseSectionDisplay(
  section: LegalPackageDocument["sections"][number],
  language: string,
) {
  const trimmedText = section.text.trimStart();
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
      title: thaiMatch[1],
      text: trimmedText.slice(thaiMatch[0].length).trimStart(),
    };
  }

  if (englishMatch) {
    return {
      title: englishMatch[1].replace(/\.$/, ""),
      text: trimmedText.slice(englishMatch[0].length).trimStart(),
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

function getReaderCopy(language: string) {
  if (language === "th") {
    return {
      loading:
        "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25...",
      loadingIndex:
        "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E14\u0E31\u0E0A\u0E19\u0E35",
      loadingNotes:
        "\u0E42\u0E2B\u0E25\u0E14\u0E42\u0E19\u0E49\u0E15",
      loadingPackage:
        "\u0E2D\u0E48\u0E32\u0E19\u0E41\u0E1E\u0E47\u0E01\u0E40\u0E01\u0E08",
      loadingSubtitle:
        "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E21\u0E32\u0E15\u0E23\u0E32 \u0E2A\u0E32\u0E23\u0E1A\u0E31\u0E0D \u0E41\u0E25\u0E30\u0E42\u0E19\u0E49\u0E15\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E01\u0E44\u0E27\u0E49",
      loadingTitle:
        "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E34\u0E14 Reader",
      allSections: "\u0E17\u0E38\u0E01\u0E21\u0E32\u0E15\u0E23\u0E32",
      authoritative:
        "\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23",
      back: "\u0E01\u0E25\u0E31\u0E1A",
      baseVersion:
        "\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E08\u0E32\u0E01",
      chooseHeading:
        "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48\u0E08\u0E30\u0E2D\u0E48\u0E32\u0E19",
      clear: "\u0E25\u0E49\u0E32\u0E07",
      currentVersion:
        "\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E48\u0E32\u0E19",
      deleteHighlight: "\u0E25\u0E1A\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      detailedSearch: "\u0E04\u0E49\u0E19\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14",
      fastSearch: "\u0E04\u0E49\u0E19\u0E14\u0E48\u0E27\u0E19",
      highlight: "\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      highlightColorHint: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2A\u0E35\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      highlightEyebrow: "HIGHLIGHT",
      highlightHint:
        "\u0E25\u0E32\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E35\u0E48\u0E08\u0E30\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      manageHighlight: "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      needsReview: "\u0E23\u0E2D\u0E15\u0E23\u0E27\u0E08",
      noResults:
        "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E21\u0E32\u0E15\u0E23\u0E32\u0E17\u0E35\u0E48\u0E04\u0E49\u0E19\u0E2B\u0E32",
      none: "-",
      note: "\u0E42\u0E19\u0E49\u0E15",
      open: "\u0E40\u0E1B\u0E34\u0E14",
      outline: "\u0E2A\u0E32\u0E23\u0E1A\u0E31\u0E0D",
      packageNotFound:
        "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1E\u0E47\u0E01\u0E40\u0E01\u0E08",
      resultCount: (count: number) =>
        `${count.toLocaleString()} \u0E1C\u0E25\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32`,
      save: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01",
      saveHighlight:
        "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E2E\u0E44\u0E25\u0E15\u0E4C",
      saved: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E49\u0E27",
      searchPlaceholder:
        "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E21\u0E32\u0E15\u0E23\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21",
      searchScopes: {
        all: "\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",
        section: "\u0E21\u0E32\u0E15\u0E23\u0E32",
        structure: "\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07",
        text: "\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32",
      },
      searchSources: {
        fallback: "Reader fallback",
        fast: "Fast index",
        reader: "Reader fallback",
      },
      sectionRangePrefix: "\u0E21\u0E32\u0E15\u0E23\u0E32",
      sectionSearch:
        "\u0E04\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22\u0E40\u0E25\u0E02\u0E21\u0E32\u0E15\u0E23\u0E32",
      sectionCount: (count: number) =>
        `${count.toLocaleString()} \u0E21\u0E32\u0E15\u0E23\u0E32`,
      showThisHeading:
        "\u0E41\u0E2A\u0E14\u0E07\u0E21\u0E32\u0E15\u0E23\u0E32\u0E43\u0E19\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E19\u0E35\u0E49",
      referenceOnly:
        "\u0E43\u0E0A\u0E49\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07",
      recentSearches:
        "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14",
      reviewStatus:
        "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E15\u0E23\u0E27\u0E08\u0E17\u0E32\u0E19",
      sections: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E21\u0E32\u0E15\u0E23\u0E32",
      sourceType:
        "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25",
      textSearch:
        "\u0E04\u0E49\u0E19\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21",
      translationStatus:
        "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E41\u0E1B\u0E25",
      unofficialDraft:
        "\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23",
      versionId: "\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19",
      versionInfo:
        "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19",
    };
  }

  return {
    allSections: "All sections",
    authoritative: "Authoritative",
    back: "Back",
    baseVersion: "Based on",
    chooseHeading: "Choose a heading",
    clear: "Clear",
    currentVersion: "Reading version",
    deleteHighlight: "Delete highlight",
    detailedSearch: "Detailed",
    fastSearch: "Fast",
    highlight: "Highlight",
    highlightColorHint: "Choose highlight color.",
    highlightEyebrow: "HIGHLIGHT",
    highlightHint: "Select the text you want to highlight.",
    manageHighlight: "Manage highlight",
    loading: "Loading legal package...",
    loadingIndex: "Preparing index",
    loadingNotes: "Loading notes",
    loadingPackage: "Reading package",
    loadingSubtitle: "Preparing sections, outline, and linked notes.",
    loadingTitle: "Opening Reader",
    needsReview: "Needs review",
    noResults: "No matching sections",
    none: "-",
    note: "Note",
    open: "Open",
    outline: "Outline",
    packageNotFound: "Package not found",
    recentSearches: "Recent searches",
    resultCount: (count: number) => `${count.toLocaleString()} results`,
    save: "Save",
    saveHighlight: "Save highlight",
    saved: "Saved",
    searchPlaceholder: "Search section or text",
    searchScopes: {
      all: "All",
      section: "Section",
      structure: "Structure",
      text: "Text",
    },
    searchSources: {
      fallback: "Reader fallback",
      fast: "Fast index",
      reader: "Reader fallback",
    },
    sectionRangePrefix: "Section",
    sectionSearch: "Section no.",
    sectionCount: (count: number) => `${count.toLocaleString()} sections`,
    showThisHeading: "Show sections in this heading",
    referenceOnly: "Reference only",
    reviewStatus: "Review status",
    sections: "Sections",
    sourceType: "Source type",
    textSearch: "Text search",
    translationStatus: "Translation status",
    unofficialDraft: "Unofficial",
    versionId: "Version ID",
    versionInfo: "Version info",
  };
}

function getLocalizedCodeTitle(
  codeId: string,
  language: string,
  fallback: string,
) {
  if (language !== "en") {
    return fallback;
  }

  const englishTitles: Record<string, string> = {
    "thai-civil-commercial-code": "Civil and Commercial Code",
    "thai-civil-procedure-code": "Civil Procedure Code",
    "thai-criminal-code": "Criminal Code",
    "thai-criminal-procedure-code": "Criminal Procedure Code",
    "thai-land-code": "Land Code",
    "thai-military-criminal-code": "Military Criminal Code",
    "thai-narcotics-code": "Narcotics Code",
    "thai-revenue-code": "Revenue Code",
  };

  return englishTitles[codeId] ?? fallback;
}

function getSourceBadge(
  legalPackage: LegalPackageDocument | null,
  language: string,
  readerCopy: ReturnType<typeof getReaderCopy>,
) {
  if (!legalPackage) {
    return null;
  }

  if (legalPackage.version.authoritative) {
    return {
      color: "#059669",
      icon: "shield-checkmark-outline" as const,
      label: readerCopy.authoritative,
    };
  }

  if (legalPackage.version.reviewStatus === "needs_legal_review") {
    return {
      color: "#D97706",
      icon: "alert-circle-outline" as const,
      label:
        language === "en" ? readerCopy.unofficialDraft : readerCopy.needsReview,
    };
  }

  return {
    color: "#6B7280",
    icon: "information-circle-outline" as const,
    label: readerCopy.referenceOnly,
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

function groupReaderHighlightsBySectionId(
  highlights: LegalHighlightRecord[],
  target: {
    codeId: string;
    language: string;
    versionId?: string;
  },
) {
  const nextHighlights = new Map<string, LegalHighlightRecord[]>();

  highlights.forEach((highlight) => {
    if (
      highlight.target.codeId !== target.codeId ||
      highlight.target.language !== target.language
    ) {
      return;
    }

    if (target.versionId && highlight.target.versionId !== target.versionId) {
      return;
    }

    const sectionHighlights =
      nextHighlights.get(highlight.target.sectionId) ?? [];

    sectionHighlights.push(highlight);
    nextHighlights.set(highlight.target.sectionId, sectionHighlights);
  });

  return nextHighlights;
}

function getHighlightSwatchColor(color: HighlightColor) {
  switch (color) {
    case "blue":
      return "#93C5FD";
    case "green":
      return "#86EFAC";
    case "pink":
      return "#F9A8D4";
    case "purple":
      return "#C4B5FD";
    case "yellow":
    default:
      return "#FDE68A";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerShell: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: 8,
    backgroundColor: "transparent",
    position: "relative",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  headerLanguageButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 0.5,
    flexDirection: "row",
    height: 32,
    paddingHorizontal: 8,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerLanguageFlag: {
    fontSize: 15,
    marginRight: 6,
  },
  headerLanguageCode: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.7,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    opacity: 0.8,
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Cormorant-Bold",
    letterSpacing: -0.3,
    lineHeight: 38,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 4,
    opacity: 0.6,
    textAlign: "center",
  },
  searchAndOutlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  compactOutlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 24,
    borderWidth: 0.5,
  },
  compactOutlineText: {
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  searchSourceRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  searchSourceChip: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 9,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  searchSourceToggle: {
    borderRadius: 9,
    borderWidth: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  searchSourceText: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    letterSpacing: 0,
  },
  searchContainer: {
    height: 42,
    borderRadius: 24,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13.5,
    fontFamily: "Inter-Medium",
  },
  searchScopeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    backgroundColor: "transparent",
  },
  searchScopeChip: {
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  searchScopeText: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.2,
  },
  recentSearchBlock: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 999,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 4,
  },
  recentSearchBlurContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recentSearchHeader: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  recentSearchTitle: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    opacity: 0.45,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  recentSearchClear: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
  },
  recentSearchList: {
    marginTop: 2,
    maxHeight: 200,
  },
  recentSearchRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    backgroundColor: "transparent",
  },
  recentSearchText: {
    fontSize: 13.5,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 240,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    gap: 16,
  },
  centerText: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
    opacity: 0.5,
    textAlign: "center",
  },
  centerActionRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 10,
  },
  centerActionButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  centerActionText: {
    fontFamily: "Inter-Bold",
    fontSize: 12,
  },
  emptySearch: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    backgroundColor: "transparent",
    gap: 16,
  },
  highlightBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  highlightPanel: {
    maxHeight: "86%",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 0.5,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  highlightHeader: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  highlightTitleBlock: {
    backgroundColor: "transparent",
    flex: 1,
    marginRight: 12,
  },
  highlightEyebrow: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.55,
  },
  highlightTitle: {
    fontSize: 25,
    fontFamily: "Cormorant-Bold",
  },
  highlightCloseButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 0.5,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  highlightHint: {
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
    marginBottom: 12,
    opacity: 0.65,
  },
  highlightTextInput: {
    borderRadius: 18,
    borderWidth: 0.5,
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 26,
    maxHeight: 320,
    minHeight: 190,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  highlightParagraphTabs: {
    gap: 8,
    paddingBottom: 12,
  },
  highlightParagraphTab: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 0.5,
    height: 34,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 10,
  },
  highlightParagraphTabText: {
    fontFamily: "Inter-Bold",
    fontSize: 12,
  },
  highlightColorRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 14,
  },
  highlightColorButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  highlightSaveButton: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  highlightSaveText: {
    color: "#fff",
    fontFamily: "Inter-Bold",
    fontSize: 13,
  },
  highlightPreviewCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  highlightPreviewText: {
    color: "#111827",
    fontFamily: "Inter-SemiBold",
    fontSize: 15,
    lineHeight: 23,
  },
  highlightDeleteButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  highlightDeleteText: {
    color: "#DC2626",
    fontFamily: "Inter-Bold",
    fontSize: 13,
  },
  outlineBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  outlinePanel: {
    maxHeight: "85%",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 0.5,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  outlineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  outlineTitleBlock: {
    backgroundColor: "transparent",
    flex: 1,
  },
  outlineEyebrow: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: 4,
  },
  outlineTitle: {
    fontSize: 26,
    fontFamily: "Cormorant-Bold",
  },
  outlineCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  outlineCrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  outlineBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  outlineBackText: {
    fontSize: 12,
    fontFamily: "Inter-Bold",
  },
  outlineBreadcrumbs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  outlineBreadcrumbText: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
  },
  outlineList: {
    paddingBottom: 20,
  },
  outlineRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  outlineIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  outlineRowText: {
    flex: 1,
    backgroundColor: "transparent",
  },
  outlineRowLabel: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    lineHeight: 20,
  },
  outlineRowMeta: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
    marginTop: 4,
    fontWeight: "700",
  },
});
