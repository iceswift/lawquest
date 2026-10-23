const fs = require('fs');
const path = require('path');

const SOURCE_PATH =
  process.argv[2] ||
  'D:/Learn/Expo/law_quest/reasearch/ประมวล/ประมวลกฎหมายวิธีพิจารณาความแพ่ง/ประมวลกฎหมายวิธีพิจารณาความแพ่ง.txt';

const OUTPUT_DIR = path.resolve(__dirname, '../data/legal');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'thai-civil-procedure-code.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'thai-civil-procedure-code.report.json');

const SOURCE = {
  name: 'สำนักงานคณะกรรมการกฤษฎีกา',
  url: 'https://www.ocs.go.th/searchlaw-law?tab=law5',
};

const SECTION_SUFFIX_PATTERN = '(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ)';
const SECTION_NO_PATTERN = `[๐-๙0-9]+(?:\\s*${SECTION_SUFFIX_PATTERN})?(?:\\/[๐-๙0-9]+)?|[๐-๙0-9]+(?:\\/[๐-๙0-9]+)?(?:\\s*${SECTION_SUFFIX_PATTERN})?`;
const HEADING_LINE_PATTERN = '(?:ภาค|ลักษณะ|หมวด|ส่วนที่|ส่วน)\\s+[๐-๙0-9]+(?:\\/[๐-๙0-9]+)?';

const THAI_DIGITS = new Map([
  ['๐', '0'],
  ['๑', '1'],
  ['๒', '2'],
  ['๓', '3'],
  ['๔', '4'],
  ['๕', '5'],
  ['๖', '6'],
  ['๗', '7'],
  ['๘', '8'],
  ['๙', '9'],
]);

function toArabicDigits(value) {
  return value.replace(/[๐-๙]/g, (digit) => THAI_DIGITS.get(digit) || digit);
}

function normalizeWhitespace(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeSectionNo(value) {
  return normalizeWhitespace(toArabicDigits(value).replace(new RegExp(`([0-9])\\s*(${SECTION_SUFFIX_PATTERN.slice(3, -1)})`), '$1 $2'));
}

function sectionSlug(sectionNo) {
  return sectionNo
    .replace(/\s*ทวิ/g, '-bis')
    .replace(/\s*ตรี/g, '-ter')
    .replace(/\s*จัตวา/g, '-quad')
    .replace(/\s*เบญจ/g, '-quin')
    .replace(/\s*ฉ/g, '-hex')
    .replace(/\s*สัตต/g, '-sept')
    .replace(/\s*อัฏฐ/g, '-oct')
    .replace(/\s*อัฎฐ/g, '-oct')
    .replace(/\s*นว/g, '-nov')
    .replace(/\s*ทศ/g, '-dec')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-');
}

function getSectionNo(block) {
  const match = block.match(new RegExp(`^มาตรา\\s+(${SECTION_NO_PATTERN})(?=[\\s\\[])`));
  return match ? normalizeSectionNo(match[1]) : null;
}

function getBodyBounds(rawText) {
  const bodyStart = rawText.indexOf('ประมวลกฎหมายวิธีพิจารณาความแพ่ง', 9000);
  if (bodyStart < 0) {
    throw new Error('Cannot find the beginning of the Civil Procedure Code body.');
  }

  const section367 = rawText.indexOf('มาตรา ๓๖๗', bodyStart);
  if (section367 < 0) {
    throw new Error('Cannot find section 367, which is expected to end the main code body.');
  }

  const afterLastSection = rawText.slice(section367);
  const tableMatch = afterLastSection.match(/\r?\n\s*ตาราง\s+๑/);
  if (!tableMatch) {
    throw new Error('Cannot find the court-fee table marker that follows section 367.');
  }

  return { bodyStart, bodyEnd: section367 + tableMatch.index };
}

function splitBlocks(text) {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(new RegExp(`\\n(${HEADING_LINE_PATTERN})\\s*\\n`, 'g'), '\n\n$1\n\n');

  return normalized
    .split(/\n\s*\n/g)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function headingKind(block) {
  if (/^ภาค\s+[๐-๙0-9]+$/.test(block)) return 'part';
  if (/^ลักษณะ\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?$/.test(block)) return 'title';
  if (/^หมวด\s+[๐-๙0-9]+$/.test(block)) return 'chapter';
  if (/^(?:ส่วนที่|ส่วน)\s+[๐-๙0-9]+$/.test(block)) return 'section';
  return null;
}

function headingLooksIncomplete(block) {
  return new RegExp(`^${HEADING_LINE_PATTERN}$`).test(block);
}

function isArticleBlock(block) {
  return new RegExp(`^มาตรา\\s+(?:${SECTION_NO_PATTERN})(?=[\\s\\[])`).test(block);
}

function parseFootnotes(text) {
  const footnotes = {};

  for (const block of splitBlocks(text)) {
    const match = block.match(/^\[(\d+)\]\s*(.+)$/s);
    if (!match) continue;
    footnotes[match[1]] = normalizeWhitespace(match[2]);
  }

  return footnotes;
}

function parseCivilProcedureCode(rawText) {
  const { bodyStart, bodyEnd } = getBodyBounds(rawText);
  const body = rawText.slice(bodyStart, bodyEnd);
  const tail = rawText.slice(bodyEnd);
  const blocks = splitBlocks(body);

  const headings = [];
  const sections = [];
  const hierarchy = {
    part: null,
    title: null,
    chapter: null,
    section: null,
  };

  let currentSection = null;

  function pushCurrentSection() {
    if (!currentSection) return;
    currentSection.text = normalizeWhitespace(currentSection.textBlocks.join('\n\n'));
    currentSection.footnoteRefs = [...new Set([...currentSection.text.matchAll(/\[(\d+)\]/g)].map((match) => match[1]))];
    delete currentSection.textBlocks;
    sections.push(currentSection);
    currentSection = null;
  }

  for (let index = 0; index < blocks.length; index += 1) {
    let block = blocks[index];
    const kind = headingKind(block);

    if (kind) {
      pushCurrentSection();

      if (headingLooksIncomplete(block) && blocks[index + 1] && !headingKind(blocks[index + 1]) && !isArticleBlock(blocks[index + 1])) {
        block = `${block} ${blocks[index + 1]}`;
        index += 1;
      }

      const heading = {
        id: `${kind}-${headings.length + 1}`,
        kind,
        text: normalizeWhitespace(block),
      };

      headings.push(heading);

      if (kind === 'part') {
        hierarchy.part = heading.text;
        hierarchy.title = null;
        hierarchy.chapter = null;
        hierarchy.section = null;
      } else if (kind === 'title') {
        hierarchy.title = heading.text;
        hierarchy.chapter = null;
        hierarchy.section = null;
      } else if (kind === 'chapter') {
        hierarchy.chapter = heading.text;
        hierarchy.section = null;
      } else {
        hierarchy.section = heading.text;
      }

      continue;
    }

    if (isArticleBlock(block)) {
      pushCurrentSection();

      const sectionNo = getSectionNo(block);
      currentSection = {
        id: `thai-civil-procedure-code-section-${sectionSlug(sectionNo)}`,
        sectionNo,
        heading: `มาตรา ${sectionNo}`,
        hierarchy: { ...hierarchy },
        textBlocks: [block],
      };
      continue;
    }

    if (currentSection) {
      currentSection.textBlocks.push(block);
    }
  }

  pushCurrentSection();

  return {
    bodyStart,
    bodyEnd,
    headings,
    sections,
    footnotes: parseFootnotes(tail),
  };
}

function buildReport(parsed, rawText) {
  const duplicateSectionIds = parsed.sections
    .map((section) => section.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  const emptySections = parsed.sections.filter((section) => !section.text).map((section) => section.sectionNo);
  const sectionNos = parsed.sections.map((section) => section.sectionNo);
  const sectionsWithoutHierarchy = parsed.sections
    .filter((section) => !section.hierarchy.part)
    .map((section) => section.sectionNo);
  const missingFootnoteRefs = [
    ...new Set(
      parsed.sections
        .flatMap((section) => section.footnoteRefs)
        .filter((ref) => !parsed.footnotes[ref]),
    ),
  ];

  return {
    sourcePath: SOURCE_PATH,
    generatedAt: new Date().toISOString(),
    input: {
      characters: rawText.length,
      thaiCharacters: (rawText.match(/[\u0E00-\u0E7F]/g) || []).length,
      mojibakeCharacters: (rawText.match(/[ÃÂ�]/g) || []).length,
      bodyStart: parsed.bodyStart,
      bodyEnd: parsed.bodyEnd,
    },
    output: {
      headingCount: parsed.headings.length,
      sectionCount: parsed.sections.length,
      uniqueSectionCount: new Set(sectionNos).size,
      firstSections: sectionNos.slice(0, 12),
      lastSections: sectionNos.slice(-12),
      footnoteCount: Object.keys(parsed.footnotes).length,
      sectionsWithFootnotes: parsed.sections.filter((section) => section.footnoteRefs.length > 0).length,
      duplicateSectionIds,
      emptySections,
      sectionsWithoutHierarchy,
      missingFootnoteRefs,
    },
  };
}

function main() {
  const rawText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const parsed = parseCivilProcedureCode(rawText);
  const report = buildReport(parsed, rawText);

  const output = {
    codeId: 'thai-civil-procedure-code',
    title: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
    language: 'th',
    source: {
      ...SOURCE,
      retrievedAt: new Date().toISOString(),
      localCopyPath: SOURCE_PATH,
    },
    structure: parsed.headings,
    sections: parsed.sections,
    footnotes: parsed.footnotes,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUTPUT_REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_REPORT}`);
  console.log(`Sections: ${report.output.sectionCount}`);
  console.log(`Headings: ${report.output.headingCount}`);
  console.log(`Footnotes: ${report.output.footnoteCount}`);
}

main();
