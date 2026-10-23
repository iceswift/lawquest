const fs = require("fs");
const path = require("path");

const DEFAULT_SOURCE_DIR = "D:/Learn/Expo/law_quest/reasearch/แปล";
const SOURCE_DIR = process.env.LAWQUEST_ENGLISH_REFERENCE_DIR ?? DEFAULT_SOURCE_DIR;
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../data/legal-v2/english-reference-documents.json"
);

const codeMatchers = [
  {
    codeId: "thai-criminal-code",
    match: (name) => name.includes("อาญา") && !name.includes("วิธีพิจารณา"),
  },
  {
    codeId: "thai-criminal-procedure-code",
    match: (name) =>
      name.toLowerCase().includes("criminal procedure") ||
      (name.includes("วิธีพิจารณา") && name.includes("อาญา")),
  },
  {
    codeId: "thai-civil-commercial-code",
    match: (name) => name.includes("แพ่งและพาณิชย์"),
  },
  {
    codeId: "thai-civil-procedure-code",
    match: (name) =>
      name.toLowerCase().includes("civil procedure") ||
      (name.includes("วิธีพิจารณา") && name.includes("แพ่ง")),
  },
  {
    codeId: "thai-land-code",
    match: (name) => name.includes("ที่ดิน"),
  },
];

function getEmbeddedLinks(pdfBytes) {
  const pdfText = pdfBytes.toString("latin1");
  const links = [...pdfText.matchAll(/\/URI\((.*?)\)/g)].map((match) =>
    match[1]
      .replace(/\\\)/g, ")")
      .replace(/\\\(/g, "(")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .trim()
  );

  return [...new Set(links)];
}

function getPageCount(pdfBytes) {
  const pdfText = pdfBytes.toString("latin1");
  const match = pdfText.match(/\/Count\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

function inferCodeId(fileName) {
  const normalizedName = fileName.normalize("NFC");
  return codeMatchers.find(({ match }) => match(normalizedName))?.codeId ?? null;
}

function inferDocumentRole(fileName) {
  if (fileName.includes("การจัดทำคำแปลกฎหมาย")) {
    return "source_directory_index";
  }

  return "unofficial_translation_style_reference";
}

if (!fs.existsSync(SOURCE_DIR)) {
  throw new Error(`English reference directory not found: ${SOURCE_DIR}`);
}

const files = fs
  .readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
  .map((entry) => {
    const filePath = path.join(SOURCE_DIR, entry.name);
    const stat = fs.statSync(filePath);
    const bytes = fs.readFileSync(filePath);
    const links = getEmbeddedLinks(bytes);

    return {
      fileName: entry.name,
      localPath: filePath.replace(/\\/g, "/"),
      codeId: inferCodeId(entry.name),
      role: inferDocumentRole(entry.name),
      language: "en",
      sourceLabel: "Unofficial Translation",
      usage: "style_reference_only",
      fileSizeBytes: stat.size,
      lastModifiedAt: stat.mtime.toISOString(),
      pageCount: getPageCount(bytes),
      embeddedLinkCount: links.length,
      embeddedLinks: links.slice(0, 25),
      notes:
        "Use this document to study terminology and translation style only. Do not treat it as authoritative legal text.",
    };
  })
  .sort((a, b) => (a.codeId ?? "").localeCompare(b.codeId ?? "") || a.fileName.localeCompare(b.fileName));

const mappedDocs = files.filter((file) => file.codeId);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceDirectory: SOURCE_DIR.replace(/\\/g, "/"),
  policy: {
    thaiTextRule:
      "Current Thai JSON text remains the translation base and the only authoritative legal text in LawQuest.",
    englishReferenceRule:
      "Unofficial English PDFs may be used for terminology, tone, and consistency checks only.",
    aiTranslationRule:
      "AI-assisted English text must be generated section-by-section from the Thai JSON and linked to basedOnVersionId.",
    importRule:
      "Do not bulk-import unofficial PDF text as a legal text layer without review and explicit source labeling.",
  },
  recommendedOutputShape: {
    codeId: "thai-criminal-code",
    language: "en",
    versionId: "en-ai-draft-YYYY-MM-DD",
    basedOnVersionId: "th-ocs-2026-04-28",
    sourceType: "ai_assisted_draft_with_unofficial_style_reference",
    sections: [
      {
        sectionId: "thai-criminal-code-section-1",
        articleNo: "1",
        text: "English translation draft...",
        translationStatus: "draft",
        reviewStatus: "needs_legal_review",
      },
    ],
  },
  summary: {
    totalPdfFiles: files.length,
    mappedToKnownCodes: mappedDocs.length,
    unmappedFiles: files.length - mappedDocs.length,
    mappedCodeIds: [...new Set(mappedDocs.map((file) => file.codeId))],
  },
  documents: files,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(
  `Indexed ${output.summary.totalPdfFiles} PDF(s); ${output.summary.mappedToKnownCodes} mapped to known legal code(s).`
);
