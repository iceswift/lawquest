import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActionSheetIOS,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

import { BookCard } from "@/components/books/BookCard";
import { DownloadPackageModal } from "@/components/books/DownloadPackageModal";
import { DownloadLanguageOption, LawBook } from "@/components/books/types";
import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
    formatPackageSize,
    getCodePackageSizeBytes,
    getCurrentLanguagePackages,
    getInstalledCurrentLanguagesForCode,
    getInstalledPackageRegistry,
    getPackageManifest,
    getManifestCode,
    hasPackageUpdateAvailable,
    installCodePackages,
    InstalledPackageRegistry,
    isInstalledCurrent,
    loadCachedPackageManifest,
    cleanupPendingPackageStorage,
    repairPackageCache,
    refreshPackageManifest,
    removeCodePackages,
} from "@/services/legalContent";
import {
    beginGuardedNavigation,
    endGuardedNavigation,
} from "@/services/navigationGuards";
import { useAppTheme } from "../../context/ThemeContext";
const READER_NAVIGATION_KEY = "legal-reader";
const READER_NAVIGATION_COOLDOWN_MS = 850;
const BOOK_UI_METADATA: Record<
  string,
  Pick<LawBook, "category" | "color" | "icon" | "id" | "titleKey">
> = {
  "thai-criminal-code": {
    id: "criminal",
    titleKey: "books.items.criminal",
    icon: "balance-scale",
    category: "criminal",
    color: "#8B0000",
  },
  "thai-civil-commercial-code": {
    id: "civil",
    titleKey: "books.items.civil",
    icon: "balance-scale",
    category: "civil",
    color: "#1A2A6C",
  },
  "thai-criminal-procedure-code": {
    id: "criminalProc",
    titleKey: "books.items.criminalProc",
    icon: "balance-scale",
    category: "procedure",
    color: "#4B0082",
  },
  "thai-civil-procedure-code": {
    id: "civilProc",
    titleKey: "books.items.civilProc",
    icon: "balance-scale",
    category: "procedure",
    color: "#2D5A27",
  },
  "thai-revenue-code": {
    id: "revenue",
    titleKey: "books.items.revenue",
    icon: "balance-scale",
    category: "special",
    color: "#C5A059",
  },
  "thai-land-code": {
    id: "land",
    titleKey: "books.items.land",
    icon: "balance-scale",
    category: "special",
    color: "#8B4513",
  },
  "thai-narcotics-code": {
    id: "narcotics",
    titleKey: "books.items.narcotics",
    icon: "balance-scale",
    category: "special",
    color: "#54585A",
  },
  "thai-military-criminal-code": {
    id: "military",
    titleKey: "books.items.military",
    icon: "balance-scale",
    category: "special",
    color: "#2F4F4F",
  },
};
export default function BooksScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? (width >= 1024 ? 4 : 3) : 2;
  const containerWidth = width - 40; // 20 padding on each side
  const gap = 16;
  const cardWidth = (containerWidth - (numColumns - 1) * gap) / numColumns;
  const tabletScale = isTablet ? 1.4 : 1;

  const { isDark, tintColor, colors, layout, typography } = useAppTheme();
  const crimsonColor = isDark ? "#E55B5B" : "#9E2A2B";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "criminal" | "civil" | "procedure" | "special"
  >("all");
  const [installedPackages, setInstalledPackages] =
    useState<InstalledPackageRegistry>({});
  const [busyCodeId, setBusyCodeId] = useState<string | null>(null);
  const [failedCodeIds, setFailedCodeIds] = useState<Record<string, string>>(
    {},
  );
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [packageOperationLabels, setPackageOperationLabels] = useState<
    Record<string, string>
  >({});
  const [manifestRevision, setManifestRevision] = useState(0);
  const [downloadCandidate, setDownloadCandidate] = useState<LawBook | null>(
    null,
  );
  const [selectedModalLanguages, setSelectedModalLanguages] = useState<
    string[]
  >([]);
  const [pinnedBooks, setPinnedBooks] = useState<string[]>([]);
  const [menuCandidate, setMenuCandidate] = useState<{
    item: LawBook;
    installed: boolean;
    packageSize: string;
  } | null>(null);
  const [isListView, setIsListView] = useState(false);

  const packageOperationRef = useRef<string | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);

  // Animation for Category Indicator
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);
  const [layouts, setLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});

  const PINNED_BOOKS_KEY = "lawquest_pinned_books";

  useEffect(() => {
    loadPinnedBooks();
  }, []);

  const loadPinnedBooks = async () => {
    try {
      const stored = await AsyncStorage.getItem(PINNED_BOOKS_KEY);
      if (stored) {
        setPinnedBooks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load pinned books", e);
    }
  };

  const savePinnedBooks = async (newPinned: string[]) => {
    try {
      await AsyncStorage.setItem(PINNED_BOOKS_KEY, JSON.stringify(newPinned));
    } catch (e) {
      console.error("Failed to save pinned books", e);
    }
  };

  const { t } = useTranslation();

  const books = useMemo(() => getRemoteCatalogBooks(), [manifestRevision]);

  useEffect(() => {
    let mounted = true;

    const refreshInstalledPackages = async () => {
      const registry = await getInstalledPackageRegistry();

      if (mounted) {
        setInstalledPackages(registry);
      }
    };

    loadCachedPackageManifest()
      .then(async () => {
        if (mounted) {
          setManifestRevision((revision) => revision + 1);
        }

        await refreshInstalledPackages();
        await refreshPackageManifest();

        if (mounted) {
          setManifestRevision((revision) => revision + 1);
        }

        await refreshInstalledPackages();
      })
      .catch((error) => {
        console.warn("Failed to initialize package manifest", error);
        refreshInstalledPackages();
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categories = [
    { id: "all", label: t("books.categories.all") },
    { id: "criminal", label: t("books.categories.criminal") },
    { id: "civil", label: t("books.categories.civil") },
    { id: "procedure", label: t("books.categories.procedure") },
    { id: "special", label: t("books.categories.special") },
  ];

  const filteredBooks = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();

    return books.filter((book) => {
      const title = getBookTitle(book, t).toLowerCase();
      const matchesSearch =
        title.includes(normalizedQuery) ||
        book.codeId.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        selectedCategory === "all" || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, debouncedSearchQuery, selectedCategory, t]);

  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      const aPinned = pinnedBooks.includes(a.codeId);
      const bPinned = pinnedBooks.includes(b.codeId);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [filteredBooks, pinnedBooks]);

  const downloadDetails = useMemo(() => {
    if (!downloadCandidate) {
      return null;
    }

    const code = getManifestCode(downloadCandidate.codeId);

    if (!code) {
      return null;
    }

    const packages = getCurrentLanguagePackages(code, selectedModalLanguages);
    const totalBytes = packages.reduce(
      (total, [, packageVersion]) => total + packageVersion.download.sizeBytes,
      0,
    );

    return {
      languages: packages
        .map(([language]) => language.toUpperCase())
        .join(" + "),
      packages,
      sectionCount: packages[0]?.[1].sectionCount ?? 0,
      size: formatPackageSize(totalBytes),
      title: getBookTitle(downloadCandidate, t),
    };
  }, [downloadCandidate, selectedModalLanguages, t, manifestRevision]);
  const downloadLanguageOptions = useMemo<DownloadLanguageOption[]>(() => {
    if (!downloadCandidate) {
      return [];
    }

    const code = getManifestCode(downloadCandidate.codeId);

    if (!code) {
      return [];
    }

    const installedLanguages = getInstalledCurrentLanguages(
      downloadCandidate.codeId,
      installedPackages[downloadCandidate.codeId],
    );

    return getCurrentLanguagePackages(code).map(
      ([language, packageVersion]) => ({
        isInstalled: installedLanguages.includes(language),
        isSelected: selectedModalLanguages.includes(language),
        language,
        sizeLabel: formatPackageSize(packageVersion.download.sizeBytes),
        sourceBadge: getPackageSourceBadge(packageVersion),
        versionId: packageVersion.versionId,
      }),
    );
  }, [
    downloadCandidate,
    installedPackages,
    manifestRevision,
    selectedModalLanguages,
  ]);

  const openReader = useCallback((codeId: string, language: string) => {
    const navigationKey = READER_NAVIGATION_KEY;

    if (!beginGuardedNavigation(navigationKey, READER_NAVIGATION_COOLDOWN_MS)) {
      return;
    }

    try {
      router.push({
        pathname: "/legal-reader",
        params: {
          codeId,
          language,
        },
      });
    } catch (error) {
      endGuardedNavigation(navigationKey);
      throw error;
    }
  }, []);

  const openDownloadModal = useCallback((book: LawBook) => {
    if (busyCodeId) {
      return;
    }

    const installedLanguages = getInstalledCurrentLanguages(
      book.codeId,
      installedPackages[book.codeId],
    );
    const updateAvailable = hasPackageUpdateAvailable(
      book.codeId,
      installedPackages[book.codeId],
      installedLanguages,
    );

    if (installedLanguages.length > 0 && !updateAvailable) {
      openReader(
        book.codeId,
        installedLanguages.includes("th") ? "th" : installedLanguages[0],
      );
      return;
    }

    setSelectedModalLanguages(
      updateAvailable
        ? installedLanguages
        : getDefaultDownloadLanguages(
            book.codeId,
            installedPackages[book.codeId],
          ),
    );
    setDownloadCandidate(book);
  }, [busyCodeId, installedPackages, openReader]);

  const openLanguageDownloadModal = useCallback((book: LawBook) => {
    if (busyCodeId) {
      return;
    }

    setSelectedModalLanguages(
      getDefaultDownloadLanguages(book.codeId, installedPackages[book.codeId]),
    );
    setDownloadCandidate(book);
  }, [busyCodeId, installedPackages]);

  const handleBookCardPress = useCallback(
    (book: LawBook, languages: string[]) => {
      const installed = languages.length > 0;

      if (installed) {
        openReader(book.codeId, languages.includes("th") ? "th" : languages[0]);
      } else {
        openDownloadModal(book);
      }
    },
    [openDownloadModal, openReader],
  );

  const handlePackagePress = async (book: LawBook) => {
    if (busyCodeId || packageOperationRef.current) {
      return;
    }

    if (selectedModalLanguages.length === 0) {
      Alert.alert(
        "Select language",
        "Please select at least one language to download.",
      );
      return;
    }

    setDownloadCandidate(null);
    packageOperationRef.current = `install:${book.codeId}`;
    setBusyCodeId(book.codeId);
    setPackageOperationLabels((current) => ({
      ...current,
      [book.codeId]: "Downloading",
    }));
    setFailedCodeIds((current) => {
      const next = { ...current };
      delete next[book.codeId];
      return next;
    });
    setDownloadProgress((current) => ({
      ...current,
      [book.codeId]: 0,
    }));

    try {
      const installed = isInstalledCurrent(
        book.codeId,
        installedPackages[book.codeId],
        selectedModalLanguages,
      );

      if (installed) {
        const readerLanguage = selectedModalLanguages.includes("th")
          ? "th"
          : selectedModalLanguages[0];
        openReader(book.codeId, readerLanguage);
      } else {
        await installCodePackages(
          book.codeId,
          selectedModalLanguages,
          (progress) => {
            setDownloadProgress((current) => ({
              ...current,
              [book.codeId]: progress.progress,
            }));
          },
        );
        setInstalledPackages(await getInstalledPackageRegistry());
        Alert.alert(
          "Download complete",
          "The archive is ready. Open it from the Library when you want to read.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not download this legal package. Please try again.";

      console.error("Failed to install legal package", error);
      setFailedCodeIds((current) => ({
        ...current,
        [book.codeId]: message,
      }));
      Alert.alert("Download failed", message);
    } finally {
      setDownloadProgress((current) => {
        const next = { ...current };
        delete next[book.codeId];
        return next;
      });
      setPackageOperationLabels((current) => {
        const next = { ...current };
        delete next[book.codeId];
        return next;
      });
      setBusyCodeId(null);
      packageOperationRef.current = null;
    }
  };

  const handleRemovePackage = useCallback(async (codeId: string) => {
    if (busyCodeId || packageOperationRef.current) {
      return;
    }

    packageOperationRef.current = `remove:${codeId}`;
    setBusyCodeId(codeId);
    setPackageOperationLabels((current) => ({
      ...current,
      [codeId]: "Removing",
    }));
    setFailedCodeIds((current) => {
      const next = { ...current };
      delete next[codeId];
      return next;
    });

    try {
      await removeCodePackages(codeId);
      setInstalledPackages(await getInstalledPackageRegistry());
    } catch (error) {
      console.error("Failed to remove legal package", error);
      setFailedCodeIds((current) => ({
        ...current,
        [codeId]:
          error instanceof Error
            ? error.message
            : "Could not remove this legal package. Please try again.",
      }));
      Alert.alert(
        "Remove failed",
        error instanceof Error
          ? error.message
          : "Could not remove this legal package. Please try again.",
      );
    } finally {
      setPackageOperationLabels((current) => {
        const next = { ...current };
        delete next[codeId];
        return next;
      });
      setBusyCodeId(null);
      packageOperationRef.current = null;
    }
  }, [busyCodeId]);

  const handleRepairPackage = useCallback(async (codeId: string) => {
    if (busyCodeId || packageOperationRef.current) {
      return;
    }

    packageOperationRef.current = `repair:${codeId}`;
    setBusyCodeId(codeId);
    setPackageOperationLabels((current) => ({
      ...current,
      [codeId]: "Repairing cache",
    }));
    setFailedCodeIds((current) => {
      const next = { ...current };
      delete next[codeId];
      return next;
    });

    try {
      const result = await repairPackageCache(codeId);
      const cleanupResult = await cleanupPendingPackageStorage({
        codeId,
        limit: 4,
      });
      setInstalledPackages(await getInstalledPackageRegistry());

      if (result.repaired) {
        const languages = result.removedLanguages
          .map((item) => item.language.toUpperCase())
          .join(", ");
        const rebuiltLanguages = result.rebuiltReaderSidecars
          .map((item) => item.language.toUpperCase())
          .join(", ");

        Alert.alert(
          "Cache repaired",
          languages
            ? `Removed damaged cache for: ${languages}. Download the archive again to restore offline access.`
            : rebuiltLanguages
              ? `Rebuilt reader cache for: ${rebuiltLanguages}.`
              : "Removed damaged cache records. Download the archive again to restore offline access.",
        );
      } else if (cleanupResult.deleted > 0) {
        Alert.alert(
          "Storage cleaned",
          cleanupResult.remaining > 0
            ? `Cleaned ${cleanupResult.deleted} old archive file(s). ${cleanupResult.remaining} remain queued.`
            : `Cleaned ${cleanupResult.deleted} old archive file(s).`,
        );
      } else {
        Alert.alert("Cache looks good", "No damaged archive files were found.");
      }
    } catch (error) {
      console.error("Failed to repair legal package cache", error);
      Alert.alert(
        "Repair failed",
        error instanceof Error
          ? error.message
          : "Could not repair this archive cache. Please try again.",
      );
    } finally {
      setPackageOperationLabels((current) => {
        const next = { ...current };
        delete next[codeId];
        return next;
      });
      setBusyCodeId(null);
      packageOperationRef.current = null;
    }
  }, [busyCodeId]);

  const confirmRemove = useCallback((item: LawBook) => {
    Alert.alert(
      t("books.confirmDeletion"),
      t("books.deleteConfirmMessage", {
        name: getBookTitle(item, t).toUpperCase(),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("books.confirmDelete"),
          style: "destructive",
          onPress: () => handleRemovePackage(item.codeId),
        },
      ],
    );
  }, [handleRemovePackage, t]);

  const handleCategoryChange = (catId: string) => {
    const prevCat = selectedCategory;
    setSelectedCategory(catId as any);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const nextLayout = layouts[catId];
    if (nextLayout) {
      const targetX = nextLayout.x + nextLayout.width / 2;
      indicatorWidth.value = 4;
      indicatorX.value = withSpring(targetX, {
        damping: 20,
        stiffness: 120,
        mass: 0.8,
      });
    }
  };

  const onCategoryLayout = (catId: string, x: number, width: number) => {
    setLayouts((prev) => {
      const next = { ...prev, [catId]: { x, width } };
      if (catId === selectedCategory) {
        indicatorX.value = x + width / 2;
        indicatorWidth.value = 4;
        indicatorOpacity.value = 1;
      }
      return next;
    });
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value - indicatorWidth.value / 2 }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  const togglePin = useCallback((codeId: string) => {
    setPinnedBooks((prev) => {
      const newPinned = prev.includes(codeId)
        ? prev.filter((id) => id !== codeId)
        : [...prev, codeId];
      savePinnedBooks(newPinned);
      return newPinned;
    });
  }, []);

  const openBookMenu = useCallback(
    (item: LawBook, installed: boolean, packageSize: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMenuCandidate({ item, installed, packageSize });
    },
    []
  );

  const renderBookItem = useCallback(({ item }: { item: LawBook }) => {
    const installedLanguages = getInstalledCurrentLanguages(
      item.codeId,
      installedPackages[item.codeId],
    );
    const installed = installedLanguages.length > 0;
    const updateAvailable = hasPackageUpdateAvailable(
      item.codeId,
      installedPackages[item.codeId],
      installedLanguages,
    );
    const failed = Boolean(failedCodeIds[item.codeId]);
    const packageSize = formatPackageSize(getCodePackageSizeBytes(item.codeId));
    const isBusy = busyCodeId === item.codeId;
    const progress = downloadProgress[item.codeId] ?? 0;
    const operationLabel = packageOperationLabels[item.codeId];
    const versionSummary = getBookVersionSummary(
      item.codeId,
      installedPackages[item.codeId],
      installedLanguages,
      updateAvailable,
    );
    const packageStatus = getPackageUiStatus({
      failed,
      installed,
      isBusy,
      updateAvailable,
    });

    const statusColor =
      packageStatus === "FAILED"
        ? "#DC2626"
        : packageStatus === "UPDATE AVAILABLE"
          ? "#D97706"
          : packageStatus === "INSTALLED"
            ? tintColor
            : colors.subtext;

    const actionLabel = installed
      ? t("books.openArchive")
      : failed
        ? t("books.retry")
        : updateAvailable
          ? t("books.revise")
          : t("books.download");
    const authoritativeLanguages = installedLanguages.filter((language) =>
      isAuthoritativeLanguage(item.codeId, language),
    );

    return (
      <BookCard
        actionLabel={actionLabel}
        authoritativeLanguages={authoritativeLanguages}
        borderColor={colors.goldSubtle}
        failed={failed}
        installed={installed}
        installedLanguages={installedLanguages}
        isBusy={isBusy}
        isDark={isDark}
        isPinned={pinnedBooks.includes(item.codeId)}
        item={item}
        layout={isListView ? "list" : "grid"}
        onOpenMenu={openBookMenu}
        onPress={handleBookCardPress}
        operationLabel={operationLabel}
        packageSize={packageSize}
        progress={progress}
        subtextColor={colors.subtext}
        textColor={colors.text}
        tintColor={tintColor}
        title={getBookTitle(item, t)}
        versionSummary={versionSummary}
        cardWidth={isListView ? "100%" : cardWidth}
        scale={isListView ? 1 : tabletScale}
      />
    );
  }, [
    busyCodeId,
    colors.goldSubtle,
    colors.subtext,
    colors.text,
    downloadProgress,
    failedCodeIds,
    handleBookCardPress,
    installedPackages,
    isDark,
    isListView,
    openBookMenu,
    pinnedBooks,
    t,
    tintColor,
    isTablet,
    tabletScale,
    cardWidth,
  ]);

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
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            COLLECTION ARCHIVE
          </Text>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>Library</Text>
              <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                {books.length} {t("books.archivalPackages")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search & Categories */}
        <View style={styles.stickySection}>
          <BlurView
            intensity={isDark ? 20 : 40}
            style={styles.blurWrapper}
            tint={isDark ? "dark" : "light"}
          >
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
                  placeholder={t("books.searchPlaceholder")}
                  placeholderTextColor={colors.subtext}
                  style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.primary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== "" && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.subtext}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View
              style={[
                styles.categoryShelf,
                { borderTopColor: colors.goldSubtle, borderBottomColor: colors.goldSubtle },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsListView((v) => !v);
                  }}
                  style={styles.viewToggleBtn}
                >
                  <Ionicons name={isListView ? "grid" : "list"} size={16} color={colors.subtext} />
                </TouchableOpacity>
                <View style={[styles.categoryDivider, { backgroundColor: colors.goldSubtle }]} />

                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => handleCategoryChange(cat.id)}
                      onLayout={(e) =>
                        onCategoryLayout(
                          cat.id,
                          e.nativeEvent.layout.x,
                          e.nativeEvent.layout.width,
                        )
                      }
                      style={styles.categoryButton}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: active ? tintColor : colors.subtext,
                            opacity: active ? 1 : 0.6,
                            fontFamily: typography.fonts.bold,
                          },
                        ]}
                      >
                        {cat.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Animated.View
                  style={[
                    styles.activeCategoryIndicator,
                    { backgroundColor: tintColor },
                    animatedIndicatorStyle,
                  ]}
                />
              </ScrollView>
            </View>
          </BlurView>
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            key={isListView ? "list" : "grid"}
            data={sortedBooks}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            numColumns={isListView ? 1 : numColumns}
            scrollEnabled={false}
            columnWrapperStyle={isListView ? undefined : styles.columnWrapper}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5
                  name="book-open"
                  size={40}
                  color={colors.goldSubtle}
                  style={{ marginBottom: 16 }}
                />
                <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
                  {t("common.no_results")?.toUpperCase() || "NO ARCHIVES FOUND"}
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {downloadCandidate && (
        <DownloadPackageModal
          backdropBorderColor={colors.goldSubtle}
          cardBg={isDark ? "#1E2330" : "#FFFFFF"}
          description={
            process.env.EXPO_PUBLIC_DEMO_MODE === "true"
              ? "FICTIONAL DEMO CONTENT FOR TESTING. THESE LIBRARY RULES ARE NOT THAI LAW."
              :
            t("books.modal.description") ||
            "PROVISIONING THIS LEGAL ASSET FOR OFFLINE ACCESS. THE THAI TEXT REMAINS THE ULTIMATE AUTHORITY."
          }
          isDark={isDark}
          languageOptions={downloadLanguageOptions}
          onClose={() => setDownloadCandidate(null)}
          onConfirm={() => {
            if (downloadCandidate) {
              void handlePackagePress(downloadCandidate);
            }
          }}
          onToggleLanguage={(language) => {
            setSelectedModalLanguages((current) => {
              if (current.includes(language)) {
                return current.filter((item) => item !== language);
              }

              return [...current, language];
            });
          }}
          sectionCount={downloadDetails?.sectionCount ?? 0}
          sizeLabel={downloadDetails?.size ?? "-"}
          subtextColor={colors.subtext}
          textColor={colors.text}
          tintColor={tintColor}
          title={downloadDetails?.title ?? "Legal Code"}
          visible
        />
      )}

      {/* Android/iOS Custom Dropdown Menu */}
      {menuCandidate && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setMenuCandidate(null)}
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            style={styles.dropdownBackdrop}
            tint={isDark ? "dark" : "light"}
          >
            <View
              style={[
                styles.dropdownCard,
                {
                  backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(212, 175, 55, 0.25)"
                    : "rgba(184, 150, 76, 0.3)",
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
                    name="options-outline"
                    size={24}
                    color={tintColor}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setMenuCandidate(null)}
                  style={[
                    styles.modalCloseButton,
                    {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ backgroundColor: isDark ? "#1E2330" : "#FFFFFF" }}>
                <View style={[styles.modalMainContent, { backgroundColor: isDark ? "#1E2330" : "#FFFFFF" }]}>
                  <Text
                    style={[styles.modalTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {getBookTitle(menuCandidate.item, t)}
                  </Text>
                  
                  <Text style={[styles.modalDescription, { color: colors.subtext }]}>
                    {t("books.archivalActions") || "ARCHIVE ACTIONS"}
                  </Text>

                  <View style={[styles.actionMenuBox, { backgroundColor: isDark ? "#1E2330" : "#FFFFFF" }]}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        {
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                        }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (menuCandidate) {
                          setPinnedBooks((current) => {
                            const isPinned = current.includes(menuCandidate.item.codeId);
                            const next = isPinned
                              ? current.filter((id) => id !== menuCandidate.item.codeId)
                              : [...current, menuCandidate.item.codeId];
                            void savePinnedBooks(next);
                            return next;
                          });
                          setMenuCandidate(null);
                        }
                      }}
                    >
                      <Ionicons
                        name={
                          menuCandidate && pinnedBooks.includes(menuCandidate.item.codeId)
                            ? "pin"
                            : "pin-outline"
                        }
                        size={18}
                        color={tintColor}
                      />
                      <Text style={[styles.dropdownText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        {menuCandidate && pinnedBooks.includes(menuCandidate.item.codeId)
                          ? t("books.unpinArchive")
                          : t("books.pinArchive")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        {
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                        }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (menuCandidate) {
                          openLanguageDownloadModal(menuCandidate.item);
                          setMenuCandidate(null);
                        }
                      }}
                    >
                      <Ionicons name="language-outline" size={18} color={tintColor} />
                      <View style={{ flex: 1, backgroundColor: "transparent" }}>
                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {t("books.downloadLanguages") || "Download Languages"}
                        </Text>
                        <Text style={[styles.dropdownSubtext, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                          {t("books.archivalOptions") || "Select Thai or English version"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View 
                      style={[
                        styles.dropdownItem,
                        {
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                        }
                      ]}
                    >
                      <Ionicons name="information-circle-outline" size={18} color={colors.subtext} />
                      <View style={{ flex: 1, backgroundColor: "transparent" }}>
                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {t("books.viewSize")}
                        </Text>
                        <Text style={[styles.dropdownSubtext, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                          {menuCandidate.packageSize}
                        </Text>
                      </View>
                    </View>

                    {menuCandidate.installed && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          {
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.06)",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(0,0,0,0.01)",
                          }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (menuCandidate) {
                            void handleRepairPackage(menuCandidate.item.codeId);
                            setMenuCandidate(null);
                          }
                        }}
                      >
                        <Ionicons name="construct-outline" size={18} color={tintColor} />
                        <View style={{ flex: 1, backgroundColor: "transparent" }}>
                          <Text style={[styles.dropdownText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                            {t("books.repairCache") || "Repair cache"}
                          </Text>
                          <Text style={[styles.dropdownSubtext, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                            {t("books.repairCacheDetail") || "Check files and remove damaged archives"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {menuCandidate.installed && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          {
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(219, 68, 55, 0.1)", // Light red tint for delete
                            backgroundColor: isDark
                              ? "rgba(219, 68, 55, 0.05)"
                              : "rgba(219, 68, 55, 0.02)",
                          }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (menuCandidate) {
                            confirmRemove(menuCandidate.item);
                            setMenuCandidate(null);
                          }
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color={crimsonColor} />
                        <View style={{ flex: 1, backgroundColor: "transparent" }}>
                          <Text style={[styles.dropdownText, { color: crimsonColor, fontFamily: typography.fonts.bold }]}>
                            {t("books.deleteArchive") || "Remove from Device"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
      )}
    </View>
  );
}

function getRemoteCatalogBooks(): LawBook[] {
  return getPackageManifest().codes.map((code) => {
    const metadata = BOOK_UI_METADATA[code.codeId];

    return {
      id: metadata?.id ?? code.codeId,
      codeId: code.codeId,
      titleKey: metadata?.titleKey,
      titleFallback: code.title || code.codeId,
      icon: metadata?.icon ?? "balance-scale",
      category: metadata?.category ?? "special",
      color: metadata?.color ?? "#6B7280",
    };
  });
}

function getBookTitle(book: LawBook, t: (key: string) => string) {
  if (book.titleKey) {
    return t(book.titleKey);
  }

  return book.titleFallback || book.codeId;
}

function getAvailableLanguages(codeId: string) {
  const code = getManifestCode(codeId);
  return code
    ? getCurrentLanguagePackages(code).map(([language]) => language)
    : [];
}

function getInstalledCurrentLanguages(
  codeId: string,
  record?: InstalledPackageRegistry[string],
) {
  return getInstalledCurrentLanguagesForCode(codeId, record);
}

function getDefaultDownloadLanguages(
  codeId: string,
  record?: InstalledPackageRegistry[string],
) {
  const availableLanguages = getAvailableLanguages(codeId);
  const installedLanguages = getInstalledCurrentLanguages(codeId, record);
  const missingLanguages = availableLanguages.filter(
    (language) => !installedLanguages.includes(language),
  );

  if (missingLanguages.length > 0) {
    return missingLanguages.includes("th") ? ["th"] : [missingLanguages[0]];
  }

  return installedLanguages.length > 0
    ? installedLanguages
    : availableLanguages.slice(0, 1);
}

function getPackageUiStatus({
  failed,
  installed,
  isBusy,
  updateAvailable,
}: {
  failed: boolean;
  installed: boolean;
  isBusy: boolean;
  updateAvailable: boolean;
}) {
  if (isBusy) {
    return "DOWNLOADING";
  }

  if (failed) {
    return "FAILED";
  }

  if (updateAvailable) {
    return "UPDATE AVAILABLE";
  }

  if (installed) {
    return "INSTALLED";
  }

  return "NOT DOWNLOADED";
}

function getPackageSourceBadge(packageVersion: {
  authoritative?: boolean;
  reviewStatus?: string | null;
  translationStatus?: string | null;
}) {
  if (packageVersion.authoritative) {
    return {
      color: "#059669",
      label: "OFFICIAL",
    };
  }

  if (
    packageVersion.reviewStatus === "needs_legal_review" ||
    packageVersion.translationStatus === "draft"
  ) {
    return {
      color: "#D97706", // Keep as warning color for now, but could use colors.statusWarning if passed
      label: "UNOFFICIAL",
    };
  }

  return {
    color: "#6B7280", // Keep as muted color
    label: "REFERENCE",
  };
}

function getBookVersionSummary(
  codeId: string,
  record: InstalledPackageRegistry[string] | undefined,
  installedLanguages: string[],
  updateAvailable: boolean,
) {
  const code = getManifestCode(codeId);

  if (!code || installedLanguages.length === 0) {
    return null;
  }

  const language = installedLanguages.includes("th")
    ? "th"
    : installedLanguages[0];
  const currentVersion = getCurrentLanguagePackages(code, [language])[0]?.[1];
  const installedVersion = record?.packages[language];

  if (!installedVersion && !currentVersion) {
    return null;
  }

  if (updateAvailable && currentVersion) {
    return {
      icon: "cloud-download-outline" as const,
      label: "UPDATE AVAILABLE",
      meta: `${language.toUpperCase()} ${installedVersion?.versionId ?? "-"} -> ${currentVersion.versionId}`,
      tint: "#D97706",
    };
  }

  return {
    icon: "git-branch-outline" as const,
    label: "CURRENT VERSION",
    meta: `${language.toUpperCase()} ${installedVersion?.versionId ?? currentVersion?.versionId ?? "-"}`,
    tint: "#059669",
  };
}

function isAuthoritativeLanguage(codeId: string, language: string) {
  const code = getManifestCode(codeId);
  const packageVersion = code
    ? getCurrentLanguagePackages(code, [language])[0]?.[1]
    : null;

  return Boolean(packageVersion?.authoritative);
}

// Redundant function removed

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 22,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 2.5,
    opacity: 0.5,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontFamily: "Cormorant-Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginTop: 6,
    opacity: 0.5,
    textAlign: "center",
  },
  stickySection: {
    zIndex: 10,
  },
  blurWrapper: {
    paddingBottom: 16,
  },
  searchRow: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  searchBar: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: 16,
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
  categoriesContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryShelf: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginTop: 20,
    backgroundColor: "transparent",
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryDivider: {
    width: 1,
    height: 16,
    marginRight: 16,
    alignSelf: "center",
    opacity: 0.3,
  },
  categoryButton: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginRight: 24,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  activeCategoryIndicator: {
    position: "absolute",
    bottom: 2,
    height: 4,
    borderRadius: 2,
  },
  gridContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter-Bold",
    opacity: 0.4,
    letterSpacing: 1,
  },
  dropdownBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dropdownCard: {
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
    marginBottom: 24,
  },
  actionMenuBox: {
    paddingHorizontal: 28,
    paddingBottom: 32,
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
  },
  dropdownSubtext: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    marginTop: 2,
    opacity: 0.5,
  },
});
