const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.resolve(__dirname, '../data/legal');
const OUTPUT_DIR = path.resolve(__dirname, '../data/legal-v2');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function dateFromSource(source) {
  if (!source?.retrievedAt) return new Date().toISOString().slice(0, 10);
  const date = new Date(source.retrievedAt);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function buildThaiVersionId(code, sourceDate) {
  const sourceKey = code.source?.name?.includes('กฤษฎีกา') ? 'ocs' : 'source';
  return `th-${sourceKey}-${sourceDate}`;
}

function buildCodeRecord(code, sourceDate, thaiVersionId) {
  return {
    codeId: code.codeId,
    title: code.title,
    defaultLanguage: 'th',
    source: code.source,
    currentVersions: {
      th: thaiVersionId,
    },
    paths: {
      sections: `sections/${code.codeId}.sections.json`,
      versions: `versions/${code.codeId}.versions.json`,
      thaiText: `texts/${code.codeId}/th/${thaiVersionId}.json`,
    },
    officialTranslation: {
      en: {
        status: 'not_checked',
        note: 'Use official OCS translation first when available; otherwise create an AI-assisted draft linked to the Thai version.',
      },
    },
    sourceDate,
  };
}

function buildSectionRecord(codeId, section, thaiVersionId) {
  return {
    id: section.id,
    codeId,
    sectionNo: section.sectionNo,
    heading: section.heading,
    hierarchy: section.hierarchy,
    footnoteRefs: section.footnoteRefs || [],
    textVersions: {
      th: thaiVersionId,
    },
  };
}

function buildTextRecord(section) {
  return {
    sectionId: section.id,
    sectionNo: section.sectionNo,
    text: section.text,
    footnoteRefs: section.footnoteRefs || [],
  };
}

function buildVersionsFile(code, sourceDate, thaiVersionId) {
  return {
    codeId: code.codeId,
    title: code.title,
    current: {
      th: thaiVersionId,
    },
    versions: [
      {
        versionId: thaiVersionId,
        language: 'th',
        label: `${code.title} Thai source (${sourceDate})`,
        sourceType: 'official_thai_source',
        source: code.source,
        authoritative: true,
        status: 'current',
        basedOnVersionId: null,
        textPath: `texts/${code.codeId}/th/${thaiVersionId}.json`,
        sectionCount: code.sections.length,
      },
    ],
    translationPolicy: {
      en: {
        preferredSourceType: 'official_translation',
        fallbackSourceType: 'ai_assisted',
        requiresBasedOnVersionId: true,
        authoritative: false,
        statuses: ['not_checked', 'official_available', 'official_missing', 'ai_draft', 'reviewed'],
      },
    },
  };
}

function exportCode(fileName) {
  const inputPath = path.join(INPUT_DIR, fileName);
  const code = readJson(inputPath);

  if (!code.codeId || !Array.isArray(code.sections)) {
    throw new Error(`Invalid legal code file: ${fileName}`);
  }

  const sourceDate = dateFromSource(code.source);
  const thaiVersionId = buildThaiVersionId(code, sourceDate);

  const sectionsFile = {
    codeId: code.codeId,
    title: code.title,
    structure: code.structure || [],
    sectionCount: code.sections.length,
    sections: code.sections.map((section) => buildSectionRecord(code.codeId, section, thaiVersionId)),
  };

  const textFile = {
    codeId: code.codeId,
    title: code.title,
    language: 'th',
    versionId: thaiVersionId,
    sourceType: 'official_thai_source',
    authoritative: true,
    source: code.source,
    generatedAt: new Date().toISOString(),
    sectionCount: code.sections.length,
    sections: code.sections.map(buildTextRecord),
    footnotes: code.footnotes || {},
  };

  const versionsFile = buildVersionsFile(code, sourceDate, thaiVersionId);
  const codeRecord = buildCodeRecord(code, sourceDate, thaiVersionId);

  writeJson(path.join(OUTPUT_DIR, 'sections', `${code.codeId}.sections.json`), sectionsFile);
  writeJson(path.join(OUTPUT_DIR, 'versions', `${code.codeId}.versions.json`), versionsFile);
  writeJson(path.join(OUTPUT_DIR, 'texts', code.codeId, 'th', `${thaiVersionId}.json`), textFile);
  writeJson(path.join(OUTPUT_DIR, 'texts', code.codeId, 'en', '.placeholder.json'), {
    codeId: code.codeId,
    language: 'en',
    status: 'not_started',
    note: 'English translations should be stored here as versioned text layers and linked via basedOnVersionId.',
  });

  return codeRecord;
}

function main() {
  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((fileName) => fileName.endsWith('.json') && !fileName.endsWith('.report.json'))
    .sort();

  const codes = files.map(exportCode);

  writeJson(path.join(OUTPUT_DIR, 'legal-codes.json'), {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    codeCount: codes.length,
    codes,
  });

  writeJson(path.join(OUTPUT_DIR, 'translation-workflow.json'), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    policy: {
      priority: ['official_translation', 'ai_assisted', 'reviewed'],
      rule: 'Thai legal text remains authoritative. English text must be linked to the Thai version it is based on.',
      englishDisclaimer:
        'English translations are for learning and reference only unless an official source explicitly states otherwise.',
    },
    languages: {
      th: {
        role: 'canonical',
        authoritative: true,
      },
      en: {
        role: 'translation_layer',
        authoritative: false,
      },
    },
    queue: codes.map((code) => ({
      codeId: code.codeId,
      title: code.title,
      basedOnVersionId: code.currentVersions.th,
      language: 'en',
      status: 'not_checked',
      nextAction: 'Check OCS or other official sources for an English translation before creating an AI-assisted draft.',
    })),
  });

  console.log(`Exported ${codes.length} legal codes to ${OUTPUT_DIR}`);
}

main();
