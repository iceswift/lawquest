const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../data/legal-v2");
const TEXTS_DIR = path.join(ROOT_DIR, "texts");

const THAI_CHAR_PATTERN = /[\u0E00-\u0E7F]/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listFiles(dir, predicate) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, predicate));
      continue;
    }

    if (entry.isFile() && predicate(fullPath, entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRelative(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function makeIssue(severity, code, message, sectionNo = null) {
  return { severity, code, message, sectionNo };
}

function validateTranslationFile(enPath) {
  const issues = [];
  const pathParts = enPath.split(path.sep);
  const codeId = pathParts[pathParts.length - 3];
  const language = pathParts[pathParts.length - 2];
  const thDir = path.join(TEXTS_DIR, codeId, "th");
  const thPath = fs
    .readdirSync(thDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => path.join(thDir, fileName))[0];

  if (!thPath) {
    return {
      file: normalizeRelative(enPath),
      status: "error",
      summary: { errors: 1, warnings: 0 },
      issues: [
        makeIssue(
          "error",
          "missing-thai-source",
          `Thai source file not found for codeId ${codeId}.`
        ),
      ],
    };
  }

  let th;
  let en;

  try {
    th = readJson(thPath);
  } catch (error) {
    issues.push(
      makeIssue(
        "error",
        "invalid-thai-json",
        `Thai source JSON could not be parsed: ${error.message}`
      )
    );
  }

  try {
    en = readJson(enPath);
  } catch (error) {
    issues.push(
      makeIssue(
        "error",
        "invalid-translation-json",
        `Translation JSON could not be parsed: ${error.message}`
      )
    );
  }

  if (!th || !en) {
    return buildResult(enPath, issues);
  }

  if (en.schemaVersion !== 2) {
    issues.push(
      makeIssue(
        "error",
        "schema-version",
        `Expected schemaVersion 2, found ${JSON.stringify(en.schemaVersion)}.`
      )
    );
  }

  if (en.codeId !== codeId) {
    issues.push(
      makeIssue(
        "error",
        "code-id",
        `Expected codeId ${codeId}, found ${JSON.stringify(en.codeId)}.`
      )
    );
  }

  if (en.language !== language) {
    issues.push(
      makeIssue(
        "error",
        "language",
        `Expected language ${language}, found ${JSON.stringify(en.language)}.`
      )
    );
  }

  if (language !== "en") {
    issues.push(
      makeIssue(
        "warning",
        "unexpected-language",
        `Validator currently targets English translations, found ${language}.`
      )
    );
  }

  if (en.basedOnVersionId !== th.versionId) {
    issues.push(
      makeIssue(
        "error",
        "based-on-version",
        `Expected basedOnVersionId ${th.versionId}, found ${JSON.stringify(
          en.basedOnVersionId
        )}.`
      )
    );
  }

  if (!Array.isArray(en.sections)) {
    issues.push(makeIssue("error", "sections-array", "sections must be an array."));
    return buildResult(enPath, issues);
  }

  if (en.sections.length !== th.sections.length) {
    issues.push(
      makeIssue(
        "error",
        "section-count",
        `Expected ${th.sections.length} sections, found ${en.sections.length}.`
      )
    );
  }

  const seenIds = new Set();
  const thIds = new Set(th.sections.map((section) => section.sectionId));
  const enIds = new Set(en.sections.map((section) => section.sectionId));
  const missing = th.sections.filter((section) => !enIds.has(section.sectionId));
  const extra = en.sections.filter((section) => !thIds.has(section.sectionId));

  for (const section of missing.slice(0, 20)) {
    issues.push(
      makeIssue(
        "error",
        "missing-section",
        `Missing translated section ${section.sectionId}.`,
        section.sectionNo
      )
    );
  }

  if (missing.length > 20) {
    issues.push(
      makeIssue(
        "error",
        "missing-section-truncated",
        `${missing.length - 20} additional missing section(s) not shown.`
      )
    );
  }

  for (const section of extra.slice(0, 20)) {
    issues.push(
      makeIssue(
        "error",
        "extra-section",
        `Extra translated section ${section.sectionId}.`,
        section.sectionNo
      )
    );
  }

  if (extra.length > 20) {
    issues.push(
      makeIssue(
        "error",
        "extra-section-truncated",
        `${extra.length - 20} additional extra section(s) not shown.`
      )
    );
  }

  const maxLength = Math.max(th.sections.length, en.sections.length);
  for (let index = 0; index < maxLength; index += 1) {
    const thSection = th.sections[index];
    const enSection = en.sections[index];

    if (!thSection || !enSection) {
      continue;
    }

    if (thSection.sectionId !== enSection.sectionId) {
      issues.push(
        makeIssue(
          "error",
          "section-id-order",
          `At index ${index}, expected sectionId ${thSection.sectionId}, found ${enSection.sectionId}.`,
          enSection.sectionNo
        )
      );
      break;
    }

    if (thSection.sectionNo !== enSection.sectionNo) {
      issues.push(
        makeIssue(
          "error",
          "section-no-order",
          `At index ${index}, expected sectionNo ${thSection.sectionNo}, found ${enSection.sectionNo}.`,
          enSection.sectionNo
        )
      );
      break;
    }
  }

  for (const section of en.sections) {
    if (seenIds.has(section.sectionId)) {
      issues.push(
        makeIssue(
          "error",
          "duplicate-section-id",
          `Duplicate sectionId ${section.sectionId}.`,
          section.sectionNo
        )
      );
    }
    seenIds.add(section.sectionId);

    for (const key of [
      "sectionId",
      "sectionNo",
      "text",
      "translationStatus",
      "reviewStatus",
      "needsReview",
      "reviewNotes",
    ]) {
      if (!(key in section)) {
        issues.push(
          makeIssue(
            "error",
            "missing-section-field",
            `Missing section field ${key}.`,
            section.sectionNo
          )
        );
      }
    }

    if (typeof section.text !== "string" || !section.text.trim()) {
      issues.push(
        makeIssue("error", "empty-text", "Translated text is empty.", section.sectionNo)
      );
    }

    if (hasOwnSectionPrefix(section.text ?? "", section.sectionNo)) {
      issues.push(
        makeIssue(
          "warning",
          "own-section-prefix",
          "Translated text repeats its own section number; UI should render section numbers separately.",
          section.sectionNo
        )
      );
    }

    if (THAI_CHAR_PATTERN.test(section.text ?? "")) {
      issues.push(
        makeIssue(
          "warning",
          "thai-in-english-text",
          "Thai characters found in English text.",
          section.sectionNo
        )
      );
    }

    if (!Array.isArray(section.reviewNotes)) {
      issues.push(
        makeIssue(
          "error",
          "review-notes-array",
          "reviewNotes must be an array.",
          section.sectionNo
        )
      );
    }

    if (section.needsReview === true && section.reviewNotes.length === 0) {
      issues.push(
        makeIssue(
          "warning",
          "needs-review-without-notes",
          "needsReview is true but reviewNotes is empty.",
          section.sectionNo
        )
      );
    }
  }

  return buildResult(enPath, issues);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasOwnSectionPrefix(text, sectionNo) {
  return getSectionNoAliases(sectionNo).some((alias) => {
    const ownPrefixPattern = new RegExp(
      `^\\s*Section\\s+${escapeRegExp(alias)}(?:\\s*\\[\\d+\\])?\\b[\\s.:-]*`,
      "i"
    );

    return ownPrefixPattern.test(text);
  });
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

function buildResult(filePath, issues) {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  return {
    file: normalizeRelative(filePath),
    status: errors > 0 ? "error" : warnings > 0 ? "warning" : "pass",
    summary: { errors, warnings },
    issues,
  };
}

const targets = process.argv.slice(2);
const translationFiles =
  targets.length > 0
    ? targets.map((target) => path.resolve(process.cwd(), target))
    : listFiles(
        TEXTS_DIR,
        (fullPath, fileName) =>
          fileName.endsWith(".json") &&
          fileName !== ".placeholder.json" &&
          fullPath.split(path.sep).includes("en")
      );

const results = translationFiles.map(validateTranslationFile);
const totalErrors = results.reduce((sum, result) => sum + result.summary.errors, 0);
const totalWarnings = results.reduce(
  (sum, result) => sum + result.summary.warnings,
  0
);

for (const result of results) {
  const label =
    result.status === "pass" ? "PASS" : result.status === "warning" ? "WARN" : "FAIL";
  console.log(
    `${label} ${result.file} (${result.summary.errors} error(s), ${result.summary.warnings} warning(s))`
  );

  for (const issue of result.issues.slice(0, 30)) {
    const location = issue.sectionNo ? ` section ${issue.sectionNo}` : "";
    console.log(`  - [${issue.severity}] ${issue.code}${location}: ${issue.message}`);
  }

  if (result.issues.length > 30) {
    console.log(`  - ... ${result.issues.length - 30} additional issue(s) not shown`);
  }
}

console.log(
  `Validated ${results.length} translation file(s): ${totalErrors} error(s), ${totalWarnings} warning(s).`
);

if (totalErrors > 0) {
  process.exitCode = 1;
}
