import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import {
  getInstalledCurrentLanguagesForCode,
  getInstalledPackageRegistry,
  getPackageManifest,
  InstalledPackageRegistry,
  loadCachedPackageManifest,
  ManifestCode,
  readReaderPackageIndexForReader,
  readReaderPackageSectionsForReader,
} from "@/services/legalContent";
import { LawQuestNoteRecord, readNotes } from "@/services/notes";
import {
  readSavedSectionItems,
  SavedSectionItem,
} from "@/services/savedItems";
import { useAppTheme } from "../context/ThemeContext";

type SearchTool = {
  icon: keyof typeof Ionicons.glyphMap;
  keywords: string[];
  route: string;
  subtitle: string;
  title: string;
};

type SectionResult = {
  codeId: string;
  codeTitle: string;
  language: string;
  sectionId: string;
  sectionNo: string;
  sectionTitle: string;
  versionId?: string;
};

type LegalTextResult = SectionResult & {
  excerpt: string;
};

const SEARCH_TOOLS: SearchTool[] = [
  {
    icon: "calculator-outline",
    keywords: ["ดอกเบี้ย", "interest", "calculator", "คำนวณ"],
    route: "/calculator",
    subtitle: "Calculate statutory or custom interest.",
    title: "Interest Calculator",
  },
  {
    icon: "document-text-outline",
    keywords: ["notes", "note", "canvas", "โน้ต", "จด"],
    route: "/notes",
    subtitle: "Open your legal notes and canvas.",
    title: "Notes",
  },
  {
    icon: "bookmark-outline",
    keywords: ["saved", "bookmark", "บันทึก", "เก็บไว้"],
    route: "/(tabs)/saved",
    subtitle: "Review saved sections.",
    title: "Saved Sections",
  },
  {
    icon: "library-outline",
    keywords: ["books", "ประมวล", "กฎหมาย", "law", "codes"],
    route: "/(tabs)/books",
    subtitle: "Browse and download legal codes.",
    title: "Books",
  },
];

const CODE_ALIASES: Record<string, string[]> = {
  "thai-civil-commercial-code": [
    "แพ่ง",
    "พาณิชย์",
    "civil",
    "commercial",
    "ccc",
  ],
  "thai-civil-procedure-code": [
    "วิแพ่ง",
    "วิธีพิจารณาความแพ่ง",
    "civil procedure",
  ],
  "thai-criminal-code": ["อาญา", "criminal", "penal"],
  "thai-criminal-procedure-code": [
    "วิอาญา",
    "วิธีพิจารณาความอาญา",
    "criminal procedure",
  ],
  "thai-land-code": ["ที่ดิน", "land"],
  "thai-military-criminal-code": ["อาญาทหาร", "military"],
  "thai-narcotics-code": ["ยาเสพติด", "narcotics", "drug"],
  "thai-revenue-code": ["รัษฎากร", "ภาษี", "revenue", "tax"],
};

export default function HomeSearchScreen() {
  const { colors, isDark, tintColor, typography } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [manifestRevision, setManifestRevision] = useState(0);
  const [installedRegistry, setInstalledRegistry] =
    useState<InstalledPackageRegistry>({});
  const [notes, setNotes] = useState<LawQuestNoteRecord[]>([]);
  const [savedSections, setSavedSections] = useState<SavedSectionItem[]>([]);
  const [sectionResults, setSectionResults] = useState<SectionResult[]>([]);
  const [legalTextResults, setLegalTextResults] = useState<LegalTextResult[]>([]);
  const [isSearchingSections, setIsSearchingSections] = useState(false);
  const [isSearchingLegalText, setIsSearchingLegalText] = useState(false);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      await loadCachedPackageManifest();
      const [registry, nextNotes, nextSaved] = await Promise.all([
        getInstalledPackageRegistry(),
        readNotes(),
        readSavedSectionItems(),
      ]);

      if (!isActive) {
        return;
      }

      setInstalledRegistry(registry);
      setNotes(nextNotes);
      setSavedSections(nextSaved);
      setManifestRevision((revision) => revision + 1);
    };

    load().catch((error) => {
      console.warn("Failed to load home search data", error);
    });

    const timer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, []);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const sectionQuery = useMemo(() => parseSectionQuery(query), [query]);
  const legalCodes = useMemo(() => getPackageManifest().codes, [manifestRevision]);

  useEffect(() => {
    let isActive = true;

    const searchSections = async () => {
      if (!sectionQuery) {
        setSectionResults([]);
        return;
      }

      setIsSearchingSections(true);
      const nextResults: SectionResult[] = [];

      for (const code of getPackageManifest().codes) {
        const languages = getInstalledCurrentLanguagesForCode(
          code.codeId,
          installedRegistry[code.codeId],
        );

        for (const language of languages) {
          const readerIndex = await readReaderPackageIndexForReader(
            code.codeId,
            language,
          );

          if (!readerIndex) {
            continue;
          }

          for (const section of readerIndex.sections) {
            if (normalizeSectionNo(section.sectionNo) !== sectionQuery) {
              continue;
            }

            nextResults.push({
              codeId: code.codeId,
              codeTitle: getLocalizedCodeTitle(code, language),
              language,
              sectionId: section.sectionId,
              sectionNo: section.sectionNo,
              sectionTitle:
                section.sectionLabel ??
                formatSectionTitle(section.sectionNo, language),
              versionId: readerIndex.version.versionId,
            });

            if (nextResults.length >= 12) {
              break;
            }
          }

          if (nextResults.length >= 12) {
            break;
          }
        }

        if (nextResults.length >= 12) {
          break;
        }
      }

      if (isActive) {
        setSectionResults(nextResults);
        setIsSearchingSections(false);
      }
    };

    searchSections().catch((error) => {
      console.warn("Failed to search sections", error);
      if (isActive) {
        setSectionResults([]);
        setIsSearchingSections(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [installedRegistry, sectionQuery]);

  useEffect(() => {
    let isActive = true;
    const shouldSearchLegalText =
      normalizedQuery.length >= getLegalTextSearchThreshold(query);

    if (!shouldSearchLegalText) {
      setLegalTextResults([]);
      setIsSearchingLegalText(false);
      return () => {
        isActive = false;
      };
    }

    setIsSearchingLegalText(true);

    const timer = setTimeout(() => {
      const searchLegalText = async () => {
        const nextResults: LegalTextResult[] = [];

        for (const code of getPackageManifest().codes) {
          const languages = getInstalledCurrentLanguagesForCode(
            code.codeId,
            installedRegistry[code.codeId],
          );

          for (const language of languages) {
            const readerIndex = await readReaderPackageIndexForReader(
              code.codeId,
              language,
            );

            if (!readerIndex) {
              continue;
            }

            const sections = await readReaderPackageSectionsForReader(
              code.codeId,
              language,
              readerIndex.sections.map((section) => section.sectionId),
            );

            for (const section of sections) {
              const haystack = normalizeSearchText(
                [
                  section.sectionLabel,
                  section.sectionNo,
                  section.text,
                ]
                  .filter(Boolean)
                  .join(" "),
              );

              if (!haystack.includes(normalizedQuery)) {
                continue;
              }

              nextResults.push({
                codeId: code.codeId,
                codeTitle: getLocalizedCodeTitle(code, language),
                excerpt: createSearchExcerpt(section.text, normalizedQuery),
                language,
                sectionId: section.sectionId,
                sectionNo: section.sectionNo,
                sectionTitle:
                  section.sectionLabel ??
                  formatSectionTitle(section.sectionNo, language),
                versionId: readerIndex.version.versionId,
              });

              if (nextResults.length >= 18) {
                break;
              }
            }

            if (nextResults.length >= 18) {
              break;
            }
          }

          if (nextResults.length >= 18) {
            break;
          }
        }

        if (isActive) {
          setLegalTextResults(nextResults);
          setIsSearchingLegalText(false);
        }
      };

      searchLegalText().catch((error) => {
        console.warn("Failed to search legal text", error);
        if (isActive) {
          setLegalTextResults([]);
          setIsSearchingLegalText(false);
        }
      });
    }, 260);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [installedRegistry, normalizedQuery, query]);

  const codeResults = useMemo(
    () =>
      normalizedQuery
        ? legalCodes
            .filter((code) => matchesCode(code, normalizedQuery))
            .slice(0, 8)
        : [],
    [legalCodes, normalizedQuery],
  );

  const toolResults = useMemo(
    () =>
      normalizedQuery
        ? SEARCH_TOOLS.filter((tool) =>
            tool.keywords.some((keyword) =>
              normalizeSearchText(keyword).includes(normalizedQuery),
            ),
          )
        : SEARCH_TOOLS,
    [normalizedQuery],
  );

  const noteResults = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    return notes
      .filter((note) =>
        normalizeSearchText(
          [note.title, note.body, note.folder].filter(Boolean).join(" "),
        ).includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [notes, normalizedQuery]);

  const savedResults = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    return savedSections
      .filter((item) =>
        normalizeSearchText(
          [
            item.display.title,
            item.display.excerpt,
            item.display.codeTitle,
            item.display.structurePath,
            item.target.sectionNo,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [normalizedQuery, savedSections]);

  const showEmptySearch = query.trim().length === 0;
  const hasResults =
    sectionResults.length > 0 ||
    legalTextResults.length > 0 ||
    codeResults.length > 0 ||
    toolResults.length > 0 ||
    noteResults.length > 0 ||
    savedResults.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? "#171B24" : "#FFFFFF",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.subtext} />
          <TextInput
            ref={inputRef}
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search laws, sections, notes..."
            placeholderTextColor={colors.subtext + "99"}
            returnKeyType="search"
            style={[
              styles.input,
              {
                color: colors.text,
                fontFamily: typography.fonts.primary,
              },
            ]}
            value={query}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showEmptySearch ? (
          <>
            <SearchSection title="Quick Actions" textColor={colors.text}>
              {toolResults.map((tool) => (
                <ResultRow
                  key={tool.route}
                  icon={tool.icon}
                  label={tool.title}
                  meta={tool.subtitle}
                  onPress={() => router.push(tool.route as never)}
                  subtextColor={colors.subtext}
                  textColor={colors.text}
                  tintColor={tintColor}
                />
              ))}
            </SearchSection>

            <SearchSection title="Downloaded Codes" textColor={colors.text}>
              {legalCodes
                .filter(
                  (code) =>
                    getInstalledCurrentLanguagesForCode(
                      code.codeId,
                      installedRegistry[code.codeId],
                    ).length > 0,
                )
                .slice(0, 8)
                .map((code) => (
                  <CodeResultRow
                    code={code}
                    installedRegistry={installedRegistry}
                    key={code.codeId}
                    onPress={() => openCode(code, installedRegistry)}
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
            </SearchSection>
          </>
        ) : (
          <>
            {(sectionResults.length > 0 || isSearchingSections) && (
              <SearchSection title="Exact Sections" textColor={colors.text}>
                {sectionResults.map((section) => (
                  <ResultRow
                    key={`${section.codeId}:${section.language}:${section.sectionId}`}
                    icon="document-text-outline"
                    label={section.sectionTitle}
                    meta={`${section.codeTitle} / ${languageLabel(section.language)}`}
                    onPress={() =>
                      router.push({
                        pathname: "/legal-section",
                        params: {
                          codeId: section.codeId,
                          language: section.language,
                          ...(section.versionId
                            ? { versionId: section.versionId }
                            : {}),
                          sectionId: section.sectionId,
                          sectionNo: section.sectionNo,
                          sectionTitle: section.sectionTitle,
                        },
                      })
                    }
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
                {isSearchingSections && (
                  <HintText color={colors.subtext}>Searching installed indexes...</HintText>
                )}
              </SearchSection>
            )}

            {codeResults.length > 0 && (
              <SearchSection title="Legal Codes" textColor={colors.text}>
                {codeResults.map((code) => (
                  <CodeResultRow
                    code={code}
                    installedRegistry={installedRegistry}
                    key={code.codeId}
                    onPress={() => openCode(code, installedRegistry)}
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
              </SearchSection>
            )}

            {savedResults.length > 0 && (
              <SearchSection title="Saved Sections" textColor={colors.text}>
                {savedResults.map((item) => (
                  <ResultRow
                    key={item.id}
                    icon="bookmark-outline"
                    label={item.display.title}
                    meta={`${item.display.codeTitle} / ${languageLabel(
                      item.target.language,
                    )}`}
                    onPress={() =>
                      router.push({
                        pathname: "/legal-section",
                        params: {
                          codeId: item.target.codeId,
                          language: item.target.language,
                          ...(item.target.versionId
                            ? { versionId: item.target.versionId }
                            : {}),
                          sectionId: item.target.sectionId,
                          sectionNo: item.target.sectionNo,
                          sectionTitle: item.display.title,
                        },
                      })
                    }
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
              </SearchSection>
            )}

            {(legalTextResults.length > 0 || isSearchingLegalText) && (
              <SearchSection title="Legal Text" textColor={colors.text}>
                {legalTextResults.map((section) => (
                  <ResultRow
                    key={`text:${section.codeId}:${section.language}:${section.sectionId}`}
                    icon="reader-outline"
                    label={section.sectionTitle}
                    meta={`${section.codeTitle} / ${languageLabel(
                      section.language,
                    )} / ${section.excerpt}`}
                    onPress={() =>
                      router.push({
                        pathname: "/legal-section",
                        params: {
                          codeId: section.codeId,
                          language: section.language,
                          ...(section.versionId
                            ? { versionId: section.versionId }
                            : {}),
                          sectionId: section.sectionId,
                          sectionNo: section.sectionNo,
                          sectionTitle: section.sectionTitle,
                        },
                      })
                    }
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
                {isSearchingLegalText && (
                  <HintText color={colors.subtext}>
                    Searching downloaded legal text...
                  </HintText>
                )}
              </SearchSection>
            )}

            {noteResults.length > 0 && (
              <SearchSection title="Notes" textColor={colors.text}>
                {noteResults.map((note) => (
                  <ResultRow
                    key={note.id}
                    icon="create-outline"
                    label={note.title || "Untitled note"}
                    meta={`${note.folder} / ${formatDate(note.updatedAt)}`}
                    onPress={() =>
                      router.push({
                        pathname: "/notes",
                        params: { noteId: note.id },
                      })
                    }
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
              </SearchSection>
            )}

            {toolResults.length > 0 && (
              <SearchSection title="Tools" textColor={colors.text}>
                {toolResults.map((tool) => (
                  <ResultRow
                    key={tool.route}
                    icon={tool.icon}
                    label={tool.title}
                    meta={tool.subtitle}
                    onPress={() => router.push(tool.route as never)}
                    subtextColor={colors.subtext}
                    textColor={colors.text}
                    tintColor={tintColor}
                  />
                ))}
              </SearchSection>
            )}

            {!hasResults && !isSearchingSections && (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: isDark ? "#171B24" : "#FFFFFF",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={28}
                  color={tintColor}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No results yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.subtext }]}>
                  Try a code name, section number, note title, or tool like
                  "ดอกเบี้ย".
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SearchSection({
  children,
  textColor,
  title,
}: {
  children: React.ReactNode;
  textColor: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      <View style={styles.resultGroup}>{children}</View>
    </View>
  );
}

function CodeResultRow({
  code,
  installedRegistry,
  onPress,
  subtextColor,
  textColor,
  tintColor,
}: {
  code: ManifestCode;
  installedRegistry: InstalledPackageRegistry;
  onPress: () => void;
  subtextColor: string;
  textColor: string;
  tintColor: string;
}) {
  const installedLanguages = getInstalledCurrentLanguagesForCode(
    code.codeId,
    installedRegistry[code.codeId],
  );
  const languages =
    installedLanguages.length > 0
      ? installedLanguages.map(languageLabel).join(" + ")
      : "Download required";

  return (
    <ResultRow
      icon="library-outline"
      label={code.title}
      meta={languages}
      onPress={onPress}
      subtextColor={subtextColor}
      textColor={textColor}
      tintColor={tintColor}
    />
  );
}

function ResultRow({
  icon,
  label,
  meta,
  onPress,
  subtextColor,
  textColor,
  tintColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  onPress: () => void;
  subtextColor: string;
  textColor: string;
  tintColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={styles.resultRow}
    >
      <View style={[styles.resultIcon, { backgroundColor: tintColor + "18" }]}>
        <Ionicons name={icon} size={18} color={tintColor} />
      </View>
      <View style={styles.resultBody}>
        <Text numberOfLines={1} style={[styles.resultLabel, { color: textColor }]}>
          {label}
        </Text>
        <Text numberOfLines={1} style={[styles.resultMeta, { color: subtextColor }]}>
          {meta}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={subtextColor} />
    </TouchableOpacity>
  );
}

function HintText({ children, color }: { children: string; color: string }) {
  return <Text style={[styles.hintText, { color }]}>{children}</Text>;
}

function openCode(code: ManifestCode, registry: InstalledPackageRegistry) {
  const installedLanguages = getInstalledCurrentLanguagesForCode(
    code.codeId,
    registry[code.codeId],
  );

  if (installedLanguages.length === 0) {
    router.push("/(tabs)/books" as never);
    return;
  }

  const language =
    installedLanguages.find((item) => item === code.defaultLanguage) ??
    installedLanguages.find((item) => item === "th") ??
    installedLanguages[0];
  const currentVersionId = code.languages[language]?.currentVersionId;

  router.push({
    pathname: "/legal-reader",
    params: {
      codeId: code.codeId,
      language,
      ...(currentVersionId ? { versionId: currentVersionId } : {}),
    },
  });
}

function matchesCode(code: ManifestCode, normalizedQuery: string) {
  return normalizeSearchText(
    [code.title, code.codeId, ...(CODE_ALIASES[code.codeId] ?? [])].join(" "),
  ).includes(normalizedQuery);
}

function getLocalizedCodeTitle(code: ManifestCode, language: string) {
  if (language !== "en") {
    return code.title;
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

  return englishTitles[code.codeId] ?? code.title;
}

function formatSectionTitle(sectionNo: string, language: string) {
  if (language === "th") {
    return `มาตรา ${toThaiNumerals(sectionNo)}`;
  }

  if (language === "zh-CN") {
    return `第 ${sectionNo} 条`;
  }

  return `Section ${sectionNo}`;
}

function languageLabel(language: string) {
  switch (language) {
    case "th":
      return "TH";
    case "en":
      return "EN";
    case "zh-CN":
      return "中文";
    default:
      return language.toUpperCase();
  }
}

function normalizeSearchText(value: string) {
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

function getLegalTextSearchThreshold(value: string) {
  return /[\u0E00-\u0E7F]/.test(value) ? 2 : 3;
}

function createSearchExcerpt(text: string, normalizedQuery: string) {
  const compactText = text.replace(/\s+/g, " ").trim();
  const normalizedText = normalizeSearchText(compactText);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index < 0) {
    return compactText.slice(0, 120);
  }

  const start = Math.max(0, index - 42);
  const end = Math.min(compactText.length, index + normalizedQuery.length + 86);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < compactText.length ? "..." : "";

  return `${prefix}${compactText.slice(start, end)}${suffix}`;
}

function parseSectionQuery(value: string) {
  const normalized = normalizeSearchText(value)
    .replace(/^(มาตรา|ม\.?|section|sec\.?)\s*/i, "")
    .trim();

  if (!/^\d/.test(normalized)) {
    return null;
  }

  return normalizeSectionNo(normalized);
}

function normalizeSectionNo(value: string) {
  const suffixMap: Record<string, string> = {
    "ทวิ": "bis",
    "ตรี": "ter",
    "จัตวา": "quater",
    "เบญจ": "quinquies",
    "ฉ": "sexies",
    "สัตต": "septies",
    "อัฏฐ": "octies",
    "อัฎฐ": "octies",
    "นว": "nonies",
    "ทศ": "decies",
  };
  const normalized = normalizeSearchText(value)
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/");

  return normalized
    .split(" ")
    .map((part) => suffixMap[part] ?? part)
    .join(" ")
    .replace(/\s+/g, "");
}

function toThaiNumerals(value: string) {
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return value.replace(/\d/g, (digit) => thaiDigits[Number(digit)] ?? digit);
}

function formatDate(value: string) {
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
  header: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 14,
  },
  closeButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  searchBox: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 42,
  },
  section: {
    backgroundColor: "transparent",
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 11,
    letterSpacing: 1.8,
    marginBottom: 12,
    opacity: 0.55,
    textTransform: "uppercase",
  },
  resultGroup: {
    backgroundColor: "transparent",
    gap: 8,
  },
  resultRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    paddingVertical: 7,
  },
  resultIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  resultBody: {
    backgroundColor: "transparent",
    flex: 1,
  },
  resultLabel: {
    fontFamily: "Inter-SemiBold",
    fontSize: 15,
  },
  resultMeta: {
    fontFamily: "Inter-Regular",
    fontSize: 12,
    marginTop: 3,
  },
  hintText: {
    fontFamily: "Inter-Regular",
    fontSize: 12,
    paddingVertical: 8,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 52,
    padding: 28,
  },
  emptyTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    marginTop: 14,
  },
  emptyText: {
    fontFamily: "Inter-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
});
