const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const V2_DIR = path.join(ROOT_DIR, "data", "legal-v2");
const V3_DIR = path.join(ROOT_DIR, "data", "legal-v3");
const V3_TEXTS_DIR = path.join(V3_DIR, "texts");
const V3_SECTIONS_DIR = path.join(V3_DIR, "sections");
const V3_STRUCTURES_DIR = path.join(V3_DIR, "structures");
const V3_VERSIONS_DIR = path.join(V3_DIR, "versions");
const V3_STRUCTURE_TRANSLATIONS_DIR = path.join(V3_DIR, "structure-translations");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
}

function getSingleJsonFile(dir) {
  const files = listJsonFiles(dir);
  if (files.length !== 1) {
    throw new Error(`Expected exactly one JSON file in ${dir}, found ${files.length}.`);
  }
  return path.join(dir, files[0]);
}

function createSectionMeta({ codeId, title, thaiText, oldSections }) {
  const oldBySectionNo = new Map(
    (oldSections.sections ?? []).map((section) => [String(section.sectionNo), section])
  );

  return {
    codeId,
    title,
    structurePathEnabled: true,
    structurePathVersion: "legal-v3-remapped-from-legal-v2",
    sectionCount: thaiText.sections.length,
    sections: thaiText.sections.map((section) => {
      const previous = oldBySectionNo.get(String(section.sectionNo));
      return {
        id: section.sectionId,
        codeId,
        sectionNo: section.sectionNo,
        heading: section.sectionLabel,
        hierarchy: previous?.hierarchy ?? {
          book: null,
          part: null,
          title: null,
          chapter: null,
          section: null,
        },
        footnoteRefs: [
          ...(section.headingFootnoteRefs ?? []),
          ...(section.bodyFootnoteRefs ?? []),
        ],
        structurePath: previous?.structurePath ?? [],
        status: section.status ?? "active",
      };
    }),
  };
}

function remapStructure({ codeId, oldStructure, oldSections, thaiText }) {
  const sectionIdByNo = new Map(
    thaiText.sections.map((section) => [String(section.sectionNo), section.sectionId])
  );
  const oldSectionById = new Map(
    (oldSections.sections ?? []).map((section) => [section.id, section])
  );

  function remapSectionId(oldSectionId) {
    const oldSection = oldSectionById.get(oldSectionId);
    if (!oldSection) return oldSectionId;
    return sectionIdByNo.get(String(oldSection.sectionNo)) ?? oldSectionId;
  }

  const nodes = (oldStructure.nodes ?? []).map((node) => {
    const sectionIds = (node.sectionIds ?? []).map(remapSectionId);
    const fromSectionId = node.sectionRange?.fromSectionId
      ? remapSectionId(node.sectionRange.fromSectionId)
      : null;
    const toSectionId = node.sectionRange?.toSectionId
      ? remapSectionId(node.sectionRange.toSectionId)
      : null;

    return {
      ...node,
      codeId,
      sectionIds,
      sectionRange: node.sectionRange
        ? {
            ...node.sectionRange,
            fromSectionId,
            toSectionId,
            sectionCount: sectionIds.length,
          }
        : node.sectionRange,
    };
  });

  return {
    ...oldStructure,
    codeId,
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    sectionCount: thaiText.sections.length,
    nodes,
  };
}

function createVersions({ codeId, title, source, textsByLanguage }) {
  const versions = [];
  const current = {};
  const thaiVersionId = textsByLanguage.th.versionId;

  for (const [language, text] of Object.entries(textsByLanguage)) {
    current[language] = text.versionId;
    versions.push({
      versionId: text.versionId,
      language,
      label:
        language === "th"
          ? `${title} Thai source (${text.versionId})`
          : `${title} ${language} AI-assisted draft (${text.versionId})`,
      sourceType: text.sourceType ?? null,
      source,
      authoritative: Boolean(text.isAuthoritative || text.authoritative),
      status: language === "th" ? "current" : text.translationStatus ?? "draft",
      basedOnVersionId: language === "th" ? null : text.basedOnVersionId ?? thaiVersionId,
      textPath: `texts/${codeId}/${language}/${text.versionId}.json`,
      sectionCount: text.sections?.length ?? 0,
      appendixCount: text.appendices?.length ?? 0,
    });
  }

  return {
    codeId,
    title,
    current,
    versions,
    translationPolicy: {
      en: {
        preferredSourceType: "official_translation",
        fallbackSourceType: "ai_assisted",
        requiresBasedOnVersionId: true,
        authoritative: false,
      },
      "zh-CN": {
        preferredSourceType: "official_translation",
        fallbackSourceType: "ai_assisted",
        requiresBasedOnVersionId: true,
        authoritative: false,
      },
    },
  };
}

const v2LegalCodes = readJson(path.join(V2_DIR, "legal-codes.json"));
const v3Codes = [];

for (const code of v2LegalCodes.codes) {
  const codeId = code.codeId;
  const textBaseDir = path.join(V3_TEXTS_DIR, codeId);
  if (!fs.existsSync(textBaseDir)) {
    throw new Error(`Missing v3 text directory for ${codeId}.`);
  }

  const textsByLanguage = {};
  for (const languageEntry of fs.readdirSync(textBaseDir, { withFileTypes: true })) {
    if (!languageEntry.isDirectory()) continue;
    const language = languageEntry.name;
    const textPath = getSingleJsonFile(path.join(textBaseDir, language));
    textsByLanguage[language] = readJson(textPath);
  }

  if (!textsByLanguage.th) {
    throw new Error(`${codeId} is missing th legal-v3 text.`);
  }

  const oldSections = readJson(path.join(V2_DIR, "sections", `${codeId}.sections.json`));
  const oldStructure = readJson(path.join(V2_DIR, "structures", `${codeId}.structure.json`));
  const sectionsMeta = createSectionMeta({
    codeId,
    title: code.title,
    thaiText: textsByLanguage.th,
    oldSections,
  });
  const structureMeta = remapStructure({
    codeId,
    oldStructure,
    oldSections,
    thaiText: textsByLanguage.th,
  });
  const versionsMeta = createVersions({
    codeId,
    title: code.title,
    source: code.source,
    textsByLanguage,
  });

  writeJson(path.join(V3_SECTIONS_DIR, `${codeId}.sections.json`), sectionsMeta);
  writeJson(path.join(V3_STRUCTURES_DIR, `${codeId}.structure.json`), structureMeta);
  writeJson(path.join(V3_VERSIONS_DIR, `${codeId}.versions.json`), versionsMeta);

  const oldTranslationsDir = path.join(V2_DIR, "structure-translations", codeId);
  const newTranslationsDir = path.join(V3_STRUCTURE_TRANSLATIONS_DIR, codeId);
  if (fs.existsSync(oldTranslationsDir)) {
    for (const fileName of fs.readdirSync(oldTranslationsDir)) {
      if (!fileName.endsWith(".json")) continue;
      fs.mkdirSync(newTranslationsDir, { recursive: true });
      fs.copyFileSync(
        path.join(oldTranslationsDir, fileName),
        path.join(newTranslationsDir, fileName)
      );
    }
  }

  writeJson(
    path.join(newTranslationsDir, "zh-CN.json"),
    Object.fromEntries(
      (structureMeta.nodes ?? []).map((node) => [
        node.id,
        {
          label: node.label,
          status: "thai_fallback_needs_translation",
        },
      ])
    )
  );

  v3Codes.push({
    ...code,
    currentVersions: versionsMeta.current,
    paths: {
      sections: `sections/${codeId}.sections.json`,
      versions: `versions/${codeId}.versions.json`,
      thaiText: `texts/${codeId}/th/${textsByLanguage.th.versionId}.json`,
      structure: `structures/${codeId}.structure.json`,
    },
    sourceDate: textsByLanguage.th.versionId.replace(/^th-ocs-/, ""),
    structureNodeCount: structureMeta.nodeCount,
  });
}

writeJson(path.join(V3_DIR, "legal-codes.json"), {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  codeCount: v3Codes.length,
  codes: v3Codes,
});

console.log(`Prepared legal-v3 metadata for ${v3Codes.length} legal code(s).`);
