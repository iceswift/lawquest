const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../data/legal-v2");
const TRANSLATIONS_DIR = path.join(ROOT_DIR, "structure-translations");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages", "objects");
const THAI_RE = /[\u0E00-\u0E7F]/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name));
}

function validateTranslationMaps() {
  const issues = [];

  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    return issues;
  }

  for (const codeId of fs.readdirSync(TRANSLATIONS_DIR)) {
    const codeDir = path.join(TRANSLATIONS_DIR, codeId);
    if (!fs.statSync(codeDir).isDirectory()) {
      continue;
    }

    for (const filePath of listJsonFiles(codeDir)) {
      const language = path.basename(filePath, ".json");
      if (language === "th") {
        continue;
      }

      const map = readJson(filePath);
      for (const [nodeId, value] of Object.entries(map)) {
        const label = typeof value === "string" ? value : value?.label;
        if (!label || THAI_RE.test(label)) {
          issues.push({
            codeId,
            filePath,
            label: label ?? "",
            language,
            nodeId,
            source: "translation-map",
          });
        }
      }
    }
  }

  return issues;
}

function validateBuiltPackages() {
  const issues = [];

  if (!fs.existsSync(PACKAGES_DIR)) {
    return issues;
  }

  for (const codeId of fs.readdirSync(PACKAGES_DIR)) {
    const codeDir = path.join(PACKAGES_DIR, codeId);
    if (!fs.statSync(codeDir).isDirectory()) {
      continue;
    }

    for (const language of fs.readdirSync(codeDir)) {
      if (language === "th") {
        continue;
      }

      const langDir = path.join(codeDir, language);
      if (!fs.statSync(langDir).isDirectory()) {
        continue;
      }

      for (const filePath of listJsonFiles(langDir).filter((file) =>
        file.endsWith(".reader-index.json"),
      )) {
        const packageDocument = readJson(filePath);
        for (const node of packageDocument.structure?.nodes ?? []) {
          const label = node.labels?.[language];
          if (!label || THAI_RE.test(label)) {
            issues.push({
              codeId,
              filePath,
              label: label ?? "",
              language,
              nodeId: node.id,
              source: "built-package",
            });
          }
        }
      }
    }
  }

  return issues;
}

const issues = [...validateTranslationMaps(), ...validateBuiltPackages()];

if (issues.length > 0) {
  console.error(
    `Structure translation validation failed: ${issues.length} issue(s).`,
  );

  for (const issue of issues.slice(0, 40)) {
    console.error(
      `- [${issue.source}] ${issue.codeId}/${issue.language} ${issue.nodeId}: ${issue.label}`,
    );
  }

  if (issues.length > 40) {
    console.error(`...and ${issues.length - 40} more issue(s).`);
  }

  process.exit(1);
}

console.log("Structure translation validation passed.");
