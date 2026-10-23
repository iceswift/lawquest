import { LegalPackageDocument } from "@/services/legalStorage";

export type LegalReaderSectionMetadata = NonNullable<
  LegalPackageDocument["sectionMetadata"]
>["sections"][number];
export type LegalReaderSection = LegalPackageDocument["sections"][number];
export type LegalReaderSearchScope = "all" | "section" | "text" | "structure";
export type LegalReaderSearchIntent = {
  normalizedQuery: string;
  rawQuery: string;
  sectionNoQuery: string | null;
  terms: string[];
  type: "section" | "text";
};
export type LegalReaderStructureNode = NonNullable<
  NonNullable<LegalPackageDocument["structure"]>["nodes"]
>[number];

type LegalReaderSearchIndexEntry = {
  index: number;
  normalizedSectionNo: string;
  normalizedSectionTitle: string;
  normalizedStructurePath: string;
  normalizedText: string;
  section: LegalReaderSection;
};

export type LegalReaderDerivedPackage = {
  nodeById: Map<string, LegalReaderStructureNode>;
  outlineNodes: LegalReaderStructureNode[];
  searchIndex: LegalReaderSearchIndexEntry[];
  sectionMetadataById: Map<string, LegalReaderSectionMetadata>;
  sections: LegalReaderSection[];
  sectionsByStructureNodeId: Map<string, LegalReaderSection[]>;
  structureLabelById: Map<string, string>;
};

const EMPTY_DERIVED_PACKAGE: LegalReaderDerivedPackage = {
  nodeById: new Map(),
  outlineNodes: [],
  searchIndex: [],
  sectionMetadataById: new Map(),
  sections: [],
  sectionsByStructureNodeId: new Map(),
  structureLabelById: new Map(),
};

const derivedPackageCache = new WeakMap<
  LegalPackageDocument,
  Map<string, LegalReaderDerivedPackage>
>();

export function getLegalReaderDerivedPackage(
  legalPackage: LegalPackageDocument | null,
  language: string,
) {
  if (!legalPackage) {
    return EMPTY_DERIVED_PACKAGE;
  }

  const cachedByLanguage = derivedPackageCache.get(legalPackage);
  const cached = cachedByLanguage?.get(language);
  if (cached) {
    return cached;
  }

  const sectionMetadataById = new Map(
    legalPackage.sectionMetadata?.sections.map((section) => [
      section.id,
      section,
    ]) ?? [],
  );
  const outlineNodes = legalPackage.structure?.nodes ?? [];
  const nodeById = new Map(outlineNodes.map((node) => [node.id, node]));
  const structureLabelById = new Map(
    outlineNodes.map((node) => [
      node.id,
      getLegalReaderStructureLabel(node, language),
    ]),
  );
  const sectionById = new Map(
    legalPackage.sections.map((section) => [section.sectionId, section]),
  );
  const sectionsByStructureNodeId = new Map<string, LegalReaderSection[]>();

  outlineNodes.forEach((node) => {
    sectionsByStructureNodeId.set(
      node.id,
      node.sectionIds
        .map((sectionId) => sectionById.get(sectionId))
        .filter((section): section is LegalReaderSection => Boolean(section)),
    );
  });

  const derivedPackage: LegalReaderDerivedPackage = {
    nodeById,
    outlineNodes,
    searchIndex: buildSearchIndex(
      legalPackage.sections,
      sectionMetadataById,
      structureLabelById,
      language,
    ),
    sectionMetadataById,
    sections: legalPackage.sections,
    sectionsByStructureNodeId,
    structureLabelById,
  };

  const nextCachedByLanguage = cachedByLanguage ?? new Map();
  nextCachedByLanguage.set(language, derivedPackage);
  if (!cachedByLanguage) {
    derivedPackageCache.set(legalPackage, nextCachedByLanguage);
  }

  return derivedPackage;
}

export function getLegalReaderStructureLabel(
  node: LegalReaderStructureNode,
  language: string,
) {
  return node.labels?.[language] ?? node.labels?.th ?? node.label;
}

export function getLegalReaderSelectedStructureNode(
  derivedPackage: LegalReaderDerivedPackage,
  selectedStructureNodeId: string | null,
) {
  if (!selectedStructureNodeId) {
    return null;
  }

  return derivedPackage.nodeById.get(selectedStructureNodeId) ?? null;
}

export function selectLegalReaderSections({
  derivedPackage,
  searchIntent,
  searchScope,
  selectedStructureNodeId,
}: {
  derivedPackage: LegalReaderDerivedPackage;
  searchIntent: LegalReaderSearchIntent;
  searchScope: LegalReaderSearchScope;
  selectedStructureNodeId: string | null;
}) {
  const scopedSections = selectedStructureNodeId
    ? (derivedPackage.sectionsByStructureNodeId.get(selectedStructureNodeId) ??
      [])
    : derivedPackage.sections;

  if (!searchIntent.normalizedQuery) {
    return scopedSections;
  }

  if (!selectedStructureNodeId) {
    return rankSearchResults(
      derivedPackage.searchIndex,
      searchIntent,
      searchScope,
    );
  }

  const scopedSectionIds = new Set(
    scopedSections.map((section) => section.sectionId),
  );

  return rankSearchResults(
    derivedPackage.searchIndex.filter((entry) =>
      scopedSectionIds.has(entry.section.sectionId),
    ),
    searchIntent,
    searchScope,
  );
}

export function parseLegalReaderSearchIntent(
  query: string,
): LegalReaderSearchIntent {
  const rawQuery = query.trim();
  const normalizedQuery = normalizeTextForSearch(rawQuery);
  const sectionNoQuery = normalizeLegalSectionQuery(rawQuery);

  return {
    normalizedQuery,
    rawQuery,
    sectionNoQuery,
    terms: normalizedQuery.split(" ").filter(Boolean),
    type: sectionNoQuery ? "section" : "text",
  };
}

export function normalizeTextForSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0E50-\u0E59]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0e50),
    )
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u201C\u201D\u2018\u2019"']/g, "")
    .replace(/[.,;:!?()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSectionDisplayForLanguage(
  section: LegalReaderSection,
  language: string,
) {
  const trimmedText = section.text.trimStart();
  return {
    title: formatSectionTitle(section.sectionNo, language),
    text: stripOwnSectionPrefix(trimmedText, section.sectionNo, language),
  };
}

function buildSearchIndex(
  sections: LegalReaderSection[],
  metadataById: Map<string, LegalReaderSectionMetadata>,
  structureLabelById: Map<string, string>,
  language: string,
): LegalReaderSearchIndexEntry[] {
  return sections.map((section, index) => {
    const metadata = metadataById.get(section.sectionId);
    const parsedSection = parseSectionDisplayForLanguage(section, language);
    const structurePath =
      metadata?.structurePath
        ?.map((nodeId) => structureLabelById.get(nodeId))
        .filter(Boolean)
        .join(" ") ?? "";

    return {
      index,
      normalizedSectionNo: normalizeTextForSearch(section.sectionNo),
      normalizedSectionTitle: normalizeTextForSearch(parsedSection.title),
      normalizedStructurePath: normalizeTextForSearch(structurePath),
      normalizedText: normalizeTextForSearch(section.text),
      section,
    };
  });
}

function rankSearchResults(
  searchIndex: LegalReaderSearchIndexEntry[],
  intent: LegalReaderSearchIntent,
  scope: LegalReaderSearchScope,
) {
  return searchIndex
    .map((entry) => {
      const exactSectionMatch =
        intent.sectionNoQuery === entry.normalizedSectionNo;
      const sectionTitleMatch = matchesAllTerms(
        entry.normalizedSectionTitle,
        intent.terms,
      );
      const partialSectionMatch = Boolean(
        intent.sectionNoQuery &&
          entry.normalizedSectionNo.includes(intent.sectionNoQuery),
      );
      const textMatch = matchesAllTerms(entry.normalizedText, intent.terms);
      const structureMatch = matchesAllTerms(
        entry.normalizedStructurePath,
        intent.terms,
      );
      const scopeAllowsSection = scope === "all" || scope === "section";
      const scopeAllowsText = scope === "all" || scope === "text";
      const scopeAllowsStructure = scope === "all" || scope === "structure";

      if (
        !(scopeAllowsSection && (exactSectionMatch || partialSectionMatch)) &&
        !(scopeAllowsSection && sectionTitleMatch) &&
        !(scopeAllowsStructure && structureMatch) &&
        !(scopeAllowsText && textMatch)
      ) {
        return null;
      }

      const rank =
        scopeAllowsSection && exactSectionMatch
          ? 0
          : scopeAllowsSection && partialSectionMatch
            ? 10
            : scopeAllowsSection && sectionTitleMatch
              ? 14
              : scopeAllowsStructure && structureMatch
                ? 20
                : 30;

      return {
        index: entry.index,
        rank,
        section: entry.section,
      };
    })
    .filter(
      (item): item is { index: number; rank: number; section: LegalReaderSection } =>
        item !== null,
    )
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.section);
}

function matchesAllTerms(value: string, terms: string[]) {
  return terms.every((term) => value.includes(term));
}

function normalizeLegalSectionQuery(query: string) {
  const normalized = normalizeTextForSearch(query)
    .replace(/^(section|sec|\u0E21\u0E32\u0E15\u0E23\u0E32)\s*/i, "")
    .trim();

  return /^[0-9]+(?:\/[0-9]+)?$/.test(normalized) ? normalized : null;
}

const THAI_SECTION_SUFFIX_TO_ENGLISH = new Map([
  ["\u0E17\u0E27\u0E34", "bis"],
  ["\u0E15\u0E23\u0E35", "ter"],
  ["\u0E08\u0E31\u0E15\u0E27\u0E32", "quater"],
  ["\u0E40\u0E1A\u0E0D\u0E08", "quinquies"],
  ["\u0E09", "sexies"],
  ["\u0E2A\u0E31\u0E15\u0E15", "septies"],
  ["\u0E2D\u0E31\u0E0F\u0E10", "octies"],
  ["\u0E2D\u0E31\u0E10", "octies"],
  ["\u0E19\u0E27", "nonies"],
  ["\u0E17\u0E28", "decies"],
  ["\u0E40\u0E2D\u0E01\u0E32\u0E17\u0E28", "undecies"],
  ["\u0E17\u0E27\u0E32\u0E17\u0E28", "duodecies"],
  ["\u0E40\u0E15\u0E23\u0E2A", "terdecies"],
  ["\u0E08\u0E15\u0E38\u0E17\u0E28", "quaterdecies"],
  ["\u0E1B\u0E31\u0E13\u0E23\u0E2A", "quindecies"],
  ["\u0E42\u0E2A\u0E2C\u0E2A", "sexdecies"],
  ["\u0E2A\u0E31\u0E15\u0E15\u0E23\u0E2A", "septendecies"],
  ["\u0E2D\u0E31\u0E0F\u0E10\u0E32\u0E23\u0E2A", "octodecies"],
  ["\u0E40\u0E2D\u0E01\u0E39\u0E19\u0E27\u0E35\u0E2A\u0E15\u0E34", "undevicies"],
]);

function formatSectionTitle(sectionNo: string, language: string) {
  const localizedSectionNo =
    language === "th" ? toThaiNumeralsSafe(sectionNo) : formatEnglishSectionNo(sectionNo);

  return language === "th"
    ? `\u0E21\u0E32\u0E15\u0E23\u0E32 ${localizedSectionNo}`
    : `Section ${localizedSectionNo}`;
}

function formatEnglishSectionNo(sectionNo: string) {
  let normalized = sectionNo.replace(/[\u0E50-\u0E59]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x0e50),
  );

  const suffixEntries = Array.from(THAI_SECTION_SUFFIX_TO_ENGLISH.entries()).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [thaiSuffix, englishSuffix] of suffixEntries) {
    normalized = normalized.replace(
      new RegExp(`\\s*${escapeRegExp(thaiSuffix)}`, "g"),
      ` ${englishSuffix}`,
    );
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function stripOwnSectionPrefix(text: string, sectionNo: string, language: string) {
  const sectionWord =
    language === "th" ? "\u0E21\u0E32\u0E15\u0E23\u0E32" : "Section";
  const aliases = getSectionNoAliases(sectionNo, language).sort(
    (a, b) => b.length - a.length,
  );

  for (const alias of aliases) {
    const flexibleAlias = escapeRegExp(alias).replace(/\\ /g, "\\s*");
    const prefixPattern = new RegExp(
      `^\\s*${sectionWord}\\s+${flexibleAlias}(?:\\s*\\[\\d+\\])?\\s*[.:]?\\s*`,
      language === "th" ? "" : "i",
    );

    if (prefixPattern.test(text)) {
      return text.replace(prefixPattern, "").trimStart();
    }
  }

  return text;
}

function getSectionNoAliases(sectionNo: string, language: string) {
  const aliases = new Set<string>();
  const raw = String(sectionNo).trim();
  const thaiDigits = toThaiNumeralsSafe(raw);
  const english = formatEnglishSectionNo(raw);

  aliases.add(language === "th" ? thaiDigits : english);
  aliases.add(raw);
  aliases.add(thaiDigits);
  aliases.add(english);

  for (const alias of Array.from(aliases)) {
    aliases.add(alias.replace(/\s+/g, ""));
  }

  return Array.from(aliases).filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toThaiNumeralsSafe(value: string) {
  const thaiDigits = [
    "\u0E50",
    "\u0E51",
    "\u0E52",
    "\u0E53",
    "\u0E54",
    "\u0E55",
    "\u0E56",
    "\u0E57",
    "\u0E58",
    "\u0E59",
  ];

  return value.replace(/\d/g, (digit) => thaiDigits[Number(digit)] ?? digit);
}
