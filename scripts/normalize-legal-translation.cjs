const fs = require("fs");
const path = require("path");

const [, , inputArg] = process.argv;

if (!inputArg) {
  console.error(
    "Usage: node scripts/normalize-legal-translation.cjs <data/legal-v2/texts/<codeId>/en/<file>.json>"
  );
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const parts = inputPath.split(path.sep);
const fileName = parts[parts.length - 1];
const language = parts[parts.length - 2];
const codeId = parts[parts.length - 3];
const rootDir = path.resolve(__dirname, "../data/legal-v2");
const thaiDir = path.join(rootDir, "texts", codeId, "th");
const thaiFile = fs
  .readdirSync(thaiDir)
  .filter((candidate) => candidate.endsWith(".json"))
  .sort()[0];

if (!thaiFile) {
  throw new Error(`Thai source not found for ${codeId}`);
}

const thaiPath = path.join(thaiDir, thaiFile);
const thai = JSON.parse(fs.readFileSync(thaiPath, "utf8"));
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const inputSections = Array.isArray(input) ? input : input.sections;

if (!Array.isArray(inputSections)) {
  throw new Error("Input translation must be an array or an object with sections array.");
}

const inputBySectionId = new Map(
  inputSections.map((section) => [section.sectionId, section])
);
const missing = thai.sections.filter((section) => !inputBySectionId.has(section.sectionId));
const extra = inputSections.filter(
  (section) => !thai.sections.some((thaiSection) => thaiSection.sectionId === section.sectionId)
);

if (missing.length > 0 || extra.length > 0) {
  console.error(
    JSON.stringify(
      {
        missing: missing.map((section) => section.sectionNo).slice(0, 30),
        extra: extra.map((section) => section.sectionNo).slice(0, 30),
      },
      null,
      2
    )
  );
  throw new Error("Cannot normalize while sectionId sets differ.");
}

const normalized = {
  schemaVersion: 2,
  codeId,
  language,
  versionId: getNormalizedVersionId(input, language, fileName),
  basedOnVersionId: thai.versionId,
  sourceType:
    input.sourceType ??
    input.metadata?.sourceType ??
    "ai_assisted_draft_with_unofficial_style_reference",
  translationStatus: input.translationStatus ?? input.metadata?.translationStatus ?? "draft",
  reviewStatus: input.reviewStatus ?? input.metadata?.reviewStatus ?? "needs_legal_review",
  disclaimer:
    input.disclaimer ??
    input.metadata?.disclaimer ??
    "This English translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.",
  sections: thai.sections.map((thaiSection) => {
    const translated = inputBySectionId.get(thaiSection.sectionId);

    return {
      sectionId: thaiSection.sectionId,
      sectionNo: thaiSection.sectionNo,
      text: stripOwnSectionPrefix(translated.text, thaiSection.sectionNo),
      translationStatus: translated.translationStatus ?? "draft",
      reviewStatus: translated.reviewStatus ?? "pending_review",
      needsReview: translated.needsReview ?? false,
      reviewNotes: Array.isArray(translated.reviewNotes) ? translated.reviewNotes : [],
    };
  }),
};

function getNormalizedVersionId(input, language, fileName) {
  const fileVersionId = fileName.replace(/\.json$/i, "");
  const inputVersionId = input.versionId ?? input.metadata?.versionId;

  if (language === "en" && String(inputVersionId ?? "").startsWith("th-")) {
    return fileVersionId;
  }

  return inputVersionId ?? fileVersionId;
}

function stripOwnSectionPrefix(text, sectionNo) {
  if (typeof text !== "string") {
    return text;
  }

  let normalizedText = text;

  for (const alias of getSectionNoAliases(sectionNo)) {
    const pattern = new RegExp(
      `^\\s*Section\\s+${escapeRegExp(alias)}(?:\\s*\\[\\d+\\])?\\s*[.:]?\\s*`,
      "i"
    );
    normalizedText = normalizedText.replace(pattern, "");
  }

  return normalizedText;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionNoAliases(sectionNo) {
  const value = String(sectionNo);
  const aliases = new Set([value]);
  const suffixAliases = {
    "ทวิ": "bis",
    "ตรี": "ter",
    "จัตวา": "quad",
    "เบญจ": "quin",
    "ฉ": "sex",
  };

  for (const [thaiSuffix, latinSuffix] of Object.entries(suffixAliases)) {
    const suffixPattern = new RegExp(`^(\\d+)\\s+${thaiSuffix}$`);
    const match = value.match(suffixPattern);

    if (match) {
      aliases.add(`${match[1]} ${latinSuffix}`);
      aliases.add(`${match[1]}-${latinSuffix}`);
    }

    const slashSuffixPattern = new RegExp(`^(\\d+)/(\\d+)\\s+${thaiSuffix}$`);
    const slashMatch = value.match(slashSuffixPattern);

    if (slashMatch) {
      aliases.add(`${slashMatch[1]}/${slashMatch[2]} ${latinSuffix}`);
      aliases.add(`${slashMatch[1]}/${slashMatch[2]}-${latinSuffix}`);
    }
  }

  return [...aliases];
}

fs.writeFileSync(inputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

console.log(
  `Normalized ${path.relative(process.cwd(), inputPath).replace(/\\/g, "/")} against ${thai.sections.length} Thai section(s).`
);
