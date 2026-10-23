const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DATASET = process.env.LAWQUEST_LEGAL_DATASET ?? "legal-v2";
const ROOT_DIR = path.resolve(__dirname, "../data", DATASET);
const TEXTS_DIR = path.join(ROOT_DIR, "texts");
const SECTIONS_DIR = path.join(ROOT_DIR, "sections");
const STRUCTURES_DIR = path.join(ROOT_DIR, "structures");
const VERSIONS_DIR = path.join(ROOT_DIR, "versions");
const OUTPUT_DIR = path.join(ROOT_DIR, "packages");
const BASE_URL = process.env.LAWQUEST_PACKAGE_BASE_URL ?? "";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function toPosix(relativePath) {
  return relativePath.replace(/\\/g, "/");
}

function withBaseUrl(relativePath) {
  const cleanPath = toPosix(relativePath);
  return BASE_URL ? `${BASE_URL.replace(/\/$/, "")}/${cleanPath}` : cleanPath;
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(".json") && fileName !== ".placeholder.json")
    .sort();
}

function chooseCanonicalTextFiles(codeId) {
  const codeTextDir = path.join(TEXTS_DIR, codeId);
  const selected = [];
  const skipped = [];

  for (const languageEntry of fs.readdirSync(codeTextDir, { withFileTypes: true })) {
    if (!languageEntry.isDirectory()) {
      continue;
    }

    const language = languageEntry.name;
    const languageDir = path.join(codeTextDir, language);
    const byVersion = new Map();

    for (const fileName of listJsonFiles(languageDir)) {
      const filePath = path.join(languageDir, fileName);
      const text = readJson(filePath);
      const versionId = text.versionId ?? fileName.replace(/\.json$/i, "");
      const existing = byVersion.get(versionId);
      const candidate = { language, versionId, fileName, filePath, text };

      if (!existing) {
        byVersion.set(versionId, candidate);
        continue;
      }

      const candidateMatchesVersion = fileName === `${versionId}.json`;
      const existingMatchesVersion = existing.fileName === `${versionId}.json`;

      if (candidateMatchesVersion && !existingMatchesVersion) {
        skipped.push({
          language,
          versionId,
          fileName: existing.fileName,
          reason: `Duplicate versionId; preferred ${fileName} because the file name matches the versionId.`,
        });
        byVersion.set(versionId, candidate);
      } else {
        skipped.push({
          language,
          versionId,
          fileName,
          reason: `Duplicate versionId; kept ${existing.fileName}.`,
        });
      }
    }

    selected.push(...byVersion.values());
  }

  return { selected, skipped };
}

function getCurrentVersionId(language, versionIds) {
  if (versionIds.length === 0) {
    return null;
  }

  const preferredPrefix = language === "th" ? "th-" : language === "en" ? "en-" : "";
  const preferred = [...versionIds]
    .filter((versionId) => versionId.startsWith(preferredPrefix))
    .sort()
    .at(-1);

  return preferred ?? [...versionIds].sort().at(-1);
}

function splitSectionParagraphs(section, codeId, versionId) {
  const text = typeof section.text === "string" ? section.text : "";
  const paragraphs = [];
  const paragraphPattern = /\S(?:[\s\S]*?)(?=\n{2,}\S|$)/g;
  let match;

  while ((match = paragraphPattern.exec(text)) !== null) {
    const paragraphText = match[0].trim();

    if (!paragraphText) {
      continue;
    }

    const leadingWhitespace = match[0].search(/\S/);
    const charStartInSection = match.index + Math.max(leadingWhitespace, 0);
    const charEndInSection = charStartInSection + paragraphText.length;
    const paragraphIndex = paragraphs.length;
    const paragraphId = `${section.sectionId}-p-${paragraphIndex + 1}`;

    paragraphs.push({
      paragraphId,
      codeId,
      versionId,
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      paragraphIndex,
      text: paragraphText,
      charStartInSection,
      charEndInSection,
    });
  }

  if (paragraphs.length === 0) {
    paragraphs.push({
      paragraphId: `${section.sectionId}-p-1`,
      codeId,
      versionId,
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      paragraphIndex: 0,
      text,
      charStartInSection: 0,
      charEndInSection: text.length,
    });
  }

  return paragraphs;
}

function buildParagraphLayer({ codeId, versionId, sections }) {
  const paragraphs = [];
  const nextSections = sections.map((section) => {
    const sectionParagraphs = splitSectionParagraphs(section, codeId, versionId);
    paragraphs.push(...sectionParagraphs);

    return {
      ...section,
      paragraphIds: sectionParagraphs.map((paragraph) => paragraph.paragraphId),
    };
  });

  return {
    paragraphs,
    sections: nextSections,
  };
}

function buildChunkManifest({ codeId, language, versionId, sections, paragraphs }) {
  const chunkSizeSections = 50;
  const paragraphIdsBySectionId = new Map();

  paragraphs.forEach((paragraph) => {
    const paragraphIds = paragraphIdsBySectionId.get(paragraph.sectionId) ?? [];
    paragraphIds.push(paragraph.paragraphId);
    paragraphIdsBySectionId.set(paragraph.sectionId, paragraphIds);
  });

  const chunks = [];

  for (let index = 0; index < sections.length; index += chunkSizeSections) {
    const chunkSections = sections.slice(index, index + chunkSizeSections);
    const sectionIds = chunkSections.map((section) => section.sectionId);
    const paragraphIds = sectionIds.flatMap(
      (sectionId) => paragraphIdsBySectionId.get(sectionId) ?? []
    );
    const chunkIndex = chunks.length;

    chunks.push({
      chunkId: `${codeId}:${language}:${versionId}:chunk-${chunkIndex + 1}`,
      chunkIndex,
      sectionIds,
      paragraphIds,
      fromSectionId: chunkSections[0]?.sectionId ?? null,
      fromSectionNo: chunkSections[0]?.sectionNo ?? null,
      toSectionId: chunkSections.at(-1)?.sectionId ?? null,
      toSectionNo: chunkSections.at(-1)?.sectionNo ?? null,
    });
  }

  return {
    schemaVersion: 1,
    strategy: "fixed_section_window",
    chunkSizeSections,
    chunkCount: chunks.length,
    chunks,
  };
}

function buildReaderIndex({ packageDocument, readerChunks }) {
  return {
    schemaVersion: 1,
    packageId: packageDocument.packageId,
    packageSchemaVersion: packageDocument.schemaVersion,
    packageType: "legal-reader-index",
    code: packageDocument.code,
    language: packageDocument.language,
    version: packageDocument.version,
    structure: packageDocument.structure,
    sectionMetadata: packageDocument.sectionMetadata,
    appendices: packageDocument.appendices,
    sectionCount: packageDocument.sectionCount,
    paragraphCount: packageDocument.paragraphCount,
    chunking: {
      schemaVersion: packageDocument.chunking?.schemaVersion ?? 1,
      strategy: packageDocument.chunking?.strategy ?? "fixed_section_window",
      chunkSizeSections: packageDocument.chunking?.chunkSizeSections ?? 50,
      chunkCount: readerChunks.length,
      chunks: readerChunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        path: chunk.path,
        sha256: chunk.sha256,
        sizeBytes: chunk.sizeBytes,
        sectionIds: chunk.sectionIds,
        fromSectionId: chunk.fromSectionId,
        fromSectionNo: chunk.fromSectionNo,
        toSectionId: chunk.toSectionId,
        toSectionNo: chunk.toSectionNo,
      })),
    },
    sections: packageDocument.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
      ...(section.headingFootnoteRefs
        ? { headingFootnoteRefs: section.headingFootnoteRefs }
        : {}),
      ...(section.bodyFootnoteRefs
        ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
        : {}),
      ...(section.status ? { status: section.status } : {}),
      paragraphIds: section.paragraphIds ?? [],
      needsReview: section.needsReview ?? false,
      reviewNotes: section.reviewNotes ?? [],
    })),
  };
}

function buildReaderChunk({ packageDocument, chunk }) {
  const sectionsById = new Map(
    packageDocument.sections.map((section) => [section.sectionId, section])
  );

  return {
    schemaVersion: 1,
    packageId: packageDocument.packageId,
    packageType: "legal-reader-chunk",
    codeId: packageDocument.code.codeId,
    language: packageDocument.language,
    versionId: packageDocument.version.versionId,
    chunkId: chunk.chunkId,
    chunkIndex: chunk.chunkIndex,
    sectionIds: chunk.sectionIds,
    paragraphIds: chunk.paragraphIds,
    fromSectionId: chunk.fromSectionId,
    fromSectionNo: chunk.fromSectionNo,
    toSectionId: chunk.toSectionId,
    toSectionNo: chunk.toSectionNo,
    sections: chunk.sectionIds
      .map((sectionId) => sectionsById.get(sectionId))
      .filter(Boolean)
      .map((section) => ({
        sectionId: section.sectionId,
        sectionNo: section.sectionNo,
        ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
        ...(section.headingFootnoteRefs
          ? { headingFootnoteRefs: section.headingFootnoteRefs }
          : {}),
        text: section.text,
        ...(section.bodyFootnoteRefs
          ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
          : {}),
        ...(section.status ? { status: section.status } : {}),
        paragraphIds: section.paragraphIds ?? [],
        ...(section.needsReview !== undefined
          ? { needsReview: section.needsReview }
          : {}),
        ...(section.reviewNotes ? { reviewNotes: section.reviewNotes } : {}),
      })),
  };
}

function buildPackage({ code, sectionsMeta, structureMeta, versionsMeta, language, versionId, text }) {
  const paragraphLayer = buildParagraphLayer({
    codeId: code.codeId,
    versionId,
    sections: text.sections,
  });
  const chunking = buildChunkManifest({
    codeId: code.codeId,
    language,
    versionId,
    sections: paragraphLayer.sections,
    paragraphs: paragraphLayer.paragraphs,
  });

  return {
    schemaVersion: 3,
    packageId: `${code.codeId}:${language}:${versionId}`,
    packageType: "legal-code-text",
    code: {
      codeId: code.codeId,
      title: code.title,
      defaultLanguage: code.defaultLanguage,
      sourceDate: code.sourceDate,
      source: code.source,
    },
    language,
    version: {
      versionId,
      basedOnVersionId: text.basedOnVersionId ?? null,
      sourceType: text.sourceType ?? null,
      authoritative: text.isAuthoritative ?? text.authoritative ?? false,
      translationStatus: text.translationStatus ?? null,
      reviewStatus: text.reviewStatus ?? null,
      disclaimer: text.disclaimer ?? null,
    },
    structure: {
      schemaVersion: structureMeta.schemaVersion ?? 1,
      levels: structureMeta.levels ?? [],
      nodeCount: structureMeta.nodeCount ?? structureMeta.nodes?.length ?? 0,
      nodes: structureMeta.nodes ?? [],
    },
    sectionMetadata: {
      structurePathEnabled: sectionsMeta.structurePathEnabled ?? false,
      structurePathVersion: sectionsMeta.structurePathVersion ?? null,
      sections: sectionsMeta.sections ?? [],
    },
    versionHistory: versionsMeta.versions ?? [],
    sectionCount: text.sections.length,
    paragraphCount: paragraphLayer.paragraphs.length,
    sections: paragraphLayer.sections,
    paragraphs: paragraphLayer.paragraphs,
    chunking,
    footnotes: text.footnotes ?? [],
    appendices: text.appendices ?? [],
  };
}

function writePackage(packageDocument) {
  const { codeId } = packageDocument.code;
  const { language } = packageDocument;
  const { versionId } = packageDocument.version;
  const relativeJsonPath = toPosix(
    path.join("objects", codeId, language, `${versionId}.json`)
  );
  const relativeGzipPath = `${relativeJsonPath}.gz`;
  const jsonPath = path.join(OUTPUT_DIR, relativeJsonPath);
  const gzipPath = path.join(OUTPUT_DIR, relativeGzipPath);
  const jsonBuffer = Buffer.from(`${JSON.stringify(packageDocument)}\n`, "utf8");
  const gzipBuffer = zlib.gzipSync(jsonBuffer, { level: 9 });
  const gzipSha256 = sha256(gzipBuffer);
  const contentSha256 = sha256(jsonBuffer);
  const readerArtifacts = writeReaderArtifacts(packageDocument);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonBuffer);
  fs.writeFileSync(gzipPath, gzipBuffer);

  return {
    packageId: packageDocument.packageId,
    language,
    versionId,
    basedOnVersionId: packageDocument.version.basedOnVersionId,
    sourceType: packageDocument.version.sourceType,
    authoritative: packageDocument.version.authoritative,
    translationStatus: packageDocument.version.translationStatus,
    reviewStatus: packageDocument.version.reviewStatus,
    sectionCount: packageDocument.sectionCount,
    paragraphCount: packageDocument.paragraphCount,
    chunkCount: packageDocument.chunking?.chunkCount ?? 0,
    paths: {
      json: relativeJsonPath,
      gzip: relativeGzipPath,
      readerIndex: readerArtifacts.indexPath,
      readerChunks: readerArtifacts.chunkPaths,
    },
    download: {
      url: withCacheBust(withBaseUrl(relativeGzipPath), gzipSha256),
      contentType: "application/json",
      contentEncoding: "gzip",
      sizeBytes: gzipBuffer.length,
      uncompressedSizeBytes: jsonBuffer.length,
      sha256: gzipSha256,
      contentSha256,
    },
  };
}

function writeReaderArtifacts(packageDocument) {
  const { codeId } = packageDocument.code;
  const { language } = packageDocument;
  const { versionId } = packageDocument.version;
  const relativeIndexPath = toPosix(
    path.join("objects", codeId, language, `${versionId}.reader-index.json`)
  );
  const relativeChunksDir = toPosix(
    path.join("objects", codeId, language, `${versionId}.reader-chunks`)
  );
  const readerChunks = (packageDocument.chunking?.chunks ?? []).map((chunk) => {
    const chunkDocument = buildReaderChunk({ packageDocument, chunk });
    const relativeChunkPath = toPosix(
      path.join(relativeChunksDir, `chunk-${chunk.chunkIndex + 1}.json`)
    );
    const chunkBuffer = Buffer.from(`${JSON.stringify(chunkDocument)}\n`, "utf8");

    fs.mkdirSync(path.dirname(path.join(OUTPUT_DIR, relativeChunkPath)), {
      recursive: true,
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, relativeChunkPath), chunkBuffer);

    return {
      ...chunk,
      path: relativeChunkPath,
      sha256: sha256(chunkBuffer),
      sizeBytes: chunkBuffer.length,
    };
  });
  const indexDocument = buildReaderIndex({
    packageDocument,
    readerChunks,
  });

  writeJson(path.join(OUTPUT_DIR, relativeIndexPath), indexDocument);

  return {
    chunkPaths: readerChunks.map((chunk) => chunk.path),
    indexPath: relativeIndexPath,
  };
}

function withCacheBust(url, hash) {
  if (!BASE_URL) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sha=${hash.slice(0, 16)}`;
}

function writeReadme() {
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "README.md"),
    `# LawQuest Legal Packages

This directory is generated by:

\`\`\`bash
npm run build:legal-packages
\`\`\`

## Purpose

The files in this directory are the downloadable legal content packages for the app.
They are designed for a backend flow where legal codes are not bundled with the app.
The app should fetch \`manifest.json\`, compare versions and checksums, then download
only the packages selected by the user.

## Files

- \`manifest.json\` is the package registry used by the app.
- \`manifest.json.gz\` is the compressed manifest for CDN/R2 delivery.
- \`objects/<codeId>/<language>/<versionId>.json\` is an uncompressed package for local debugging.
- \`objects/<codeId>/<language>/<versionId>.json.gz\` is the downloadable package.
- \`objects/<codeId>/<language>/<versionId>.reader-index.json\` is the lightweight Reader index.
- \`objects/<codeId>/<language>/<versionId>.reader-chunks/chunk-N.json\` stores Reader section text in fixed windows.

## Download Strategy

1. App fetches \`manifest.json\`.
2. App compares local \`codeId + language + versionId + sha256\`.
3. If missing or outdated, app downloads the \`.json.gz\` object.
4. App verifies \`download.sha256\`.
5. App stores the package in local offline cache.
6. Reader screens load from the local package, not from the network.

## Reader Sidecars

Reader sidecars are generated from the same immutable package content:

- The Reader index keeps structure, section metadata, section ids, and chunk metadata without full section text.
- Reader chunks keep section text in smaller windows so the app can later load only the visible/target window.
- The full package remains the canonical import/archive artifact for checksum validation, SQLite import, and backend release.

## Backend Mapping

Recommended Cloudflare object layout:

\`\`\`text
manifest.json
manifest.json.gz
objects/<codeId>/<language>/<versionId>.json.gz
objects/<codeId>/<language>/<versionId>.reader-index.json
objects/<codeId>/<language>/<versionId>.reader-chunks/chunk-N.json
\`\`\`

If using Cloudflare R2 + Workers, upload the generated \`packages\` directory and set
\`LAWQUEST_PACKAGE_BASE_URL\` when building if the manifest should contain absolute URLs.

Example:

\`\`\`bash
LAWQUEST_PACKAGE_BASE_URL=https://content.lawquest.app npm run build:legal-packages
\`\`\`

## Immutability Rule

Do not overwrite an existing package for the same \`versionId\` after it has been released.
Create a new version instead. This keeps client cache, checksum validation, and legal
version history predictable.
`,
    "utf8"
  );
}

const legalCodes = readJson(path.join(ROOT_DIR, "legal-codes.json"));
const buildStartedAt = new Date().toISOString();
const codes = [];
const buildWarnings = [];

if (fs.existsSync(OUTPUT_DIR)) {
  const resolvedOutput = path.resolve(OUTPUT_DIR);
  const resolvedRoot = path.resolve(ROOT_DIR);

  if (!resolvedOutput.startsWith(resolvedRoot)) {
    throw new Error(`Refusing to clean output outside ${DATASET}: ${resolvedOutput}`);
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

for (const code of legalCodes.codes) {
  const codeId = code.codeId;
  const sectionsMeta = readJson(path.join(SECTIONS_DIR, `${codeId}.sections.json`));
  const structureMeta = readJson(path.join(STRUCTURES_DIR, `${codeId}.structure.json`));
  
  // Inject structure translations (labels object)
  const translations = {};
  const TRANSLATIONS_DIR = path.join(ROOT_DIR, "structure-translations", codeId);
  if (fs.existsSync(TRANSLATIONS_DIR)) {
    const langFiles = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith(".json"));
    for (const f of langFiles) {
      const lang = f.replace(".json", "");
      translations[lang] = readJson(path.join(TRANSLATIONS_DIR, f));
    }
  }
  
  if (structureMeta.nodes) {
    structureMeta.nodes = structureMeta.nodes.map(node => {
      const labels = { th: node.label };
      
      for (const lang of Object.keys(translations)) {
        if (translations[lang] && translations[lang][node.id]) {
          const entry = translations[lang][node.id];
          labels[lang] = typeof entry === "string" ? entry : entry.label;
        }
      }
      return { ...node, labels };
    });
  }

  const versionsMeta = readJson(path.join(VERSIONS_DIR, `${codeId}.versions.json`));
  const { selected, skipped } = chooseCanonicalTextFiles(codeId);
  const packages = [];
  const languages = {};

  for (const warning of skipped) {
    buildWarnings.push({ codeId, ...warning });
  }

  for (const item of selected) {
    if (item.language !== "th" && structureMeta.nodes) {
      const missingCount = structureMeta.nodes.filter(n => !n.labels || !n.labels[item.language]).length;
      if (missingCount > 0) {
        buildWarnings.push({
          codeId,
          language: item.language,
          versionId: item.versionId,
          reason: `Missing structure translations for ${missingCount} nodes in ${item.language}`,
        });
      }
    }

    const packageDocument = buildPackage({
      code,
      sectionsMeta,
      structureMeta,
      versionsMeta,
      language: item.language,
      versionId: item.versionId,
      text: item.text,
    });
    const packageEntry = writePackage(packageDocument);
    packages.push(packageEntry);

    if (!languages[item.language]) {
      languages[item.language] = {
        currentVersionId: null,
        versions: [],
      };
    }

    languages[item.language].versions.push(packageEntry);
  }

  for (const language of Object.keys(languages)) {
    const versionIds = languages[language].versions.map((entry) => entry.versionId);
    languages[language].currentVersionId = getCurrentVersionId(language, versionIds);
  }

  codes.push({
    codeId,
    title: code.title,
    defaultLanguage: code.defaultLanguage,
    sourceDate: code.sourceDate,
    languages,
    packageCount: packages.length,
  });
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildStartedAt,
  baseUrl: BASE_URL || null,
  strategy: {
    download: "on_demand",
    cache: "local_offline_cache",
    updateCheck: "manifest_sha256_and_version",
    note:
      "Packages are immutable by versionId. Upload new versions instead of overwriting existing package objects.",
  },
  summary: {
    codeCount: codes.length,
    packageCount: codes.reduce((sum, code) => sum + code.packageCount, 0),
    warningCount: buildWarnings.length,
  },
  codes,
  warnings: buildWarnings,
};

writeJson(path.join(OUTPUT_DIR, "manifest.json"), manifest);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "manifest.json.gz"),
  zlib.gzipSync(Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8"), { level: 9 })
);
writeReadme();

console.log(
  `Built ${manifest.summary.packageCount} package(s) for ${manifest.summary.codeCount} legal code(s).`
);
if (buildWarnings.length > 0) {
  console.log(`Build warnings: ${buildWarnings.length}`);
}
