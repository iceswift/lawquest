const fs = require('fs');
const path = require('path');

const SOURCE_PATH =
  process.argv[2] ||
  'D:/Learn/Expo/law_quest/reasearch/ประมวล/ประมวลกฎหมายแพ่งและพาณิชย์/ประมวลกฎหมายแพ่งและพาณิชย์.txt';

const OUTPUT_DIR = path.resolve(__dirname, '../data/legal');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'thai-civil-commercial-code.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'thai-civil-commercial-code.report.json');

const SOURCE = {
  name: 'สำนักงานคณะกรรมการกฤษฎีกา',
  url: 'https://www.ocs.go.th/searchlaw-law?tab=law5',
};

const SECTION_SUFFIX_PATTERN = '(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|นว|ทศ)';

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
  return normalizeWhitespace(toArabicDigits(value));
}

function sectionSlug(sectionNo) {
  return sectionNo
    .replace(/\s*ทวิ$/, '-bis')
    .replace(/\s*ตรี$/, '-ter')
    .replace(/\s*จัตวา$/, '-quad')
    .replace(/\s*เบญจ$/, '-quin')
    .replace(/\s*ฉ$/, '-hex')
    .replace(/\s*สัตต$/, '-sept')
    .replace(/\s*อัฏฐ$/, '-oct')
    .replace(/\s*นว$/, '-nov')
    .replace(/\s*ทศ$/, '-dec')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-');
}

function getSectionNo(block) {
  const match = block.match(new RegExp(`^มาตรา\\s+([๐-๙0-9]+(?:\\/[๐-๙0-9]+)?(?:\\s+${SECTION_SUFFIX_PATTERN})?)(?=[\\s\\[])`));
  return match ? normalizeSectionNo(match[1]) : null;
}

function getBodyBounds(rawText) {
  const bodyStart = rawText.indexOf('ข้อความเบื้องต้น');
  if (bodyStart < 0) {
    throw new Error('Cannot find the beginning of the Civil and Commercial Code body.');
  }

  const section1755 = rawText.indexOf('มาตรา ๑๗๕๕', bodyStart);
  if (section1755 < 0) {
    throw new Error('Cannot find section 1755, which is expected to end the main code body.');
  }

  const afterLastSection = rawText.slice(section1755);
  const appendixMatch = afterLastSection.match(/\r?\n\s*พระราช(?:กฤษฎีกา|บัญญัติ)/);
  const bodyEnd = appendixMatch ? section1755 + appendixMatch.index : rawText.length;

  return { bodyStart, bodyEnd };
}

function splitBlocks(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/g)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function headingKind(block) {
  if (block === 'ข้อความเบื้องต้น') return 'preliminary';
  if (/^บรรพ\s+[๐-๙0-9]+$/.test(block)) return 'book';
  if (/^ลักษณะ\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?$/.test(block)) return 'title';
  if (/^หมวด\s+[๐-๙0-9]+$/.test(block)) return 'chapter';
  if (/^(?:ส่วนที่|ส่วน)\s+[๐-๙0-9]+$/.test(block)) return 'part';
  return null;
}

function headingLooksIncomplete(block) {
  return /^(บรรพ|ลักษณะ|หมวด|ส่วนที่|ส่วน)\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?$/.test(block);
}

function isArticleBlock(block) {
  return new RegExp(`^มาตรา\\s+[๐-๙0-9]+(?:\\/[๐-๙0-9]+)?(?:\\s+${SECTION_SUFFIX_PATTERN})?(?=[\\s\\[])`).test(block);
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

function parseCivilCommercialCode(rawText) {
  const { bodyStart, bodyEnd } = getBodyBounds(rawText);
  const body = rawText.slice(bodyStart, bodyEnd);
  const tail = rawText.slice(bodyEnd);
  const blocks = splitBlocks(body);

  const headings = [];
  const sections = [];
  const hierarchy = {
    preliminary: null,
    book: null,
    title: null,
    chapter: null,
    part: null,
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

      if (kind === 'preliminary') {
        hierarchy.preliminary = heading.text;
        hierarchy.book = null;
        hierarchy.title = null;
        hierarchy.chapter = null;
        hierarchy.part = null;
      } else if (kind === 'book') {
        hierarchy.preliminary = null;
        hierarchy.book = heading.text;
        hierarchy.title = null;
        hierarchy.chapter = null;
        hierarchy.part = null;
      } else if (kind === 'title') {
        hierarchy.title = heading.text;
        hierarchy.chapter = null;
        hierarchy.part = null;
      } else if (kind === 'chapter') {
        hierarchy.chapter = heading.text;
        hierarchy.part = null;
      } else {
        hierarchy.part = heading.text;
      }

      continue;
    }

    if (isArticleBlock(block)) {
      pushCurrentSection();

      const sectionNo = getSectionNo(block);
      currentSection = {
        id: `thai-civil-commercial-code-section-${sectionSlug(sectionNo)}`,
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
    .filter((section) => !section.hierarchy.preliminary && !section.hierarchy.book)
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
  const parsed = parseCivilCommercialCode(rawText);
  const report = buildReport(parsed, rawText);

  const output = {
    codeId: 'thai-civil-commercial-code',
    title: 'ประมวลกฎหมายแพ่งและพาณิชย์',
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
