const fs = require('fs');
const path = require('path');

const SOURCE_PATH =
  process.argv[2] ||
  'D:/Learn/Expo/law_quest/reasearch/ประมวล/ประมวลกฎหมายยาเสพติด/ประมวลกฎหมายยาเสพติด.txt';

const OUTPUT_DIR = path.resolve(__dirname, '../data/legal');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'thai-narcotics-code.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'thai-narcotics-code.report.json');

const SOURCE = {
  name: 'สำนักงานคณะกรรมการกฤษฎีกา',
  url: 'https://www.ocs.go.th/searchlaw-law?tab=law5',
};

const SECTION_SUFFIXES = [
  'เอกาทศ',
  'ทวาทศ',
  'สัตตรส',
  'อัฏฐารส',
  'เอกูนวีสติ',
  'จตุทศ',
  'ปัณรส',
  'โสฬส',
  'เตรส',
  'อัฏฐ',
  'อัฎฐ',
  'สัตต',
  'จัตวา',
  'เบญจ',
  'ทวิ',
  'ตรี',
  'ทศ',
  'นว',
  'ฉ',
];
const SECTION_SUFFIX_PATTERN = `(?:${SECTION_SUFFIXES.join('|')})`;
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

const SUFFIX_SLUGS = new Map([
  ['เอกาทศ', 'undec'],
  ['ทวาทศ', 'duodec'],
  ['เตรส', 'tredec'],
  ['จตุทศ', 'quattuordec'],
  ['ปัณรส', 'quindec'],
  ['โสฬส', 'sexdec'],
  ['สัตตรส', 'septendec'],
  ['อัฏฐารส', 'octodec'],
  ['เอกูนวีสติ', 'undevig'],
  ['ทวิ', 'bis'],
  ['ตรี', 'ter'],
  ['จัตวา', 'quad'],
  ['เบญจ', 'quin'],
  ['ฉ', 'hex'],
  ['สัตต', 'sept'],
  ['อัฏฐ', 'oct'],
  ['อัฎฐ', 'oct'],
  ['นว', 'nov'],
  ['ทศ', 'dec'],
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
  let normalized = toArabicDigits(value);
  for (const suffix of SECTION_SUFFIXES) {
    normalized = normalized.replace(new RegExp(`([0-9])\\s*(${suffix})`), '$1 $2');
  }
  return normalizeWhitespace(normalized);
}

function sectionSlug(sectionNo) {
  let slug = sectionNo;
  for (const [suffix, replacement] of SUFFIX_SLUGS.entries()) {
    slug = slug.replace(new RegExp(`\\s*${suffix}`, 'g'), `-${replacement}`);
  }
  return slug.replace(/\//g, '-').replace(/\s+/g, '-');
}

function getSectionNo(block) {
  const match = block.match(new RegExp(`^มาตรา\\s+(${SECTION_NO_PATTERN})(?=[\\s\\[])`));
  return match ? normalizeSectionNo(match[1]) : null;
}

function getBodyBounds(rawText) {
  const bodyStartMatch = rawText.match(/ประมวลกฎหมายยาเสพติด\s*\r?\n\s*\r?\nภาค\s+๑/);
  if (!bodyStartMatch || bodyStartMatch.index === undefined) {
    throw new Error('Cannot find the beginning of the Narcotics Code body.');
  }

  const bodyStart = bodyStartMatch.index;
  const section186 = rawText.indexOf('มาตรา ๑๘๖', bodyStart);
  if (section186 < 0) {
    throw new Error('Cannot find section 186, which is expected to end the main article body.');
  }

  const bodyEnd = rawText.indexOf('อัตราค่าธรรมเนียม', section186);
  if (bodyEnd < 0) {
    throw new Error('Cannot find the fee schedule marker that follows section 186.');
  }

  return { bodyStart, bodyEnd };
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
  return new RegExp(`^มาตรา\\s+(?:${SECTION_NO_PATTERN})(?!\\s*ถึง)(?=[\\s\\[])`).test(block);
}

function parseFootnotes(text) {
  const footnotes = {};
  const normalized = text.replace(/\r\n/g, '\n');
  const matches = [...normalized.matchAll(/(?:^|\n)\s*\[(\d+)\]\s*/g)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const start = match.index + match[0].length;
    const end = next ? next.index : normalized.length;
    footnotes[match[1]] = normalizeWhitespace(normalized.slice(start, end));
  }

  return footnotes;
}

function parseNarcoticsCode(rawText) {
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
        id: `thai-narcotics-code-section-${sectionSlug(sectionNo)}`,
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
  const parsed = parseNarcoticsCode(rawText);
  const report = buildReport(parsed, rawText);

  const output = {
    codeId: 'thai-narcotics-code',
    title: 'ประมวลกฎหมายยาเสพติด',
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
