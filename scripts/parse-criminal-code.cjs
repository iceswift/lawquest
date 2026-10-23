const fs = require('fs');
const path = require('path');

const SOURCE_PATH =
  process.argv[2] ||
  'D:/Learn/Expo/law_quest/reasearch/ประมวล/ประมวลกฎหมายอาญา/ประมวลกฎหมายอาญา.txt';

const OUTPUT_DIR = path.resolve(__dirname, '../data/legal');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'thai-criminal-code.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'thai-criminal-code.report.json');

const SOURCE = {
  name: 'สำนักงานคณะกรรมการกฤษฎีกา',
  url: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/K2dTMURyaDllOXJVWVZqZGJLK09pdz09',
};

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
  ['ทวิ', 'bis'],
  ['ตรี', 'ter'],
  ['จัตวา', 'quad'],
  ['เบญจ', 'quin'],
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
  let slug = sectionNo;
  for (const [suffix, replacement] of SUFFIX_SLUGS.entries()) {
    slug = slug.replace(new RegExp(`\\s*${suffix}$`), `-${replacement}`);
  }
  return slug.replace(/\//g, '-').replace(/\s+/g, '-');
}

function getSectionNo(block) {
  const match = block.match(
    /^มาตรา\s+([๐-๙0-9]+(?:\/[๐-๙0-9]+)?(?:\s+(?:ทวิ|ตรี|จัตวา|เบญจ))?)(?=[\s\[])/,
  );
  return match ? normalizeSectionNo(match[1]) : null;
}

function getBodyBounds(rawText) {
  const bodyStartMatch = rawText.match(/\r?\n\s*ประมวลกฎหมายอาญา\s*\r?\n\s*\r?\nภาค\s+๑\s*\r?\n/);
  if (!bodyStartMatch || bodyStartMatch.index === undefined) {
    throw new Error('Cannot find the beginning of the Criminal Code body.');
  }

  const bodyStart = bodyStartMatch.index + bodyStartMatch[0].search(/ประมวลกฎหมายอาญา/);
  const noteStart = rawText.indexOf('\r\n\r\nหมายเหตุ :-', bodyStart);
  const bodyEnd = noteStart > bodyStart ? noteStart : rawText.length;

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
  if (/^ภาค\s+[๐-๙0-9]+/.test(block)) return 'part';
  if (/^ลักษณะ\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?/.test(block)) return 'title';
  if (/^หมวด\s+[๐-๙0-9]+/.test(block)) return 'chapter';
  return null;
}

function headingLooksIncomplete(block) {
  return /^(ภาค|ลักษณะ|หมวด)\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?$/.test(block);
}

function isArticleBlock(block) {
  return /^มาตรา\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?(?:\s+(?:ทวิ|ตรี|จัตวา|เบญจ))?(?=[\s\[])/.test(block);
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

function parseCriminalCode(rawText) {
  const { bodyStart, bodyEnd } = getBodyBounds(rawText);
  const body = rawText.slice(bodyStart, bodyEnd);
  const tail = rawText.slice(bodyEnd);
  const blocks = splitBlocks(body);

  const headings = [];
  const sections = [];
  const hierarchy = { part: null, title: null, chapter: null };

  let currentSection = null;

  function pushCurrentSection() {
    if (!currentSection) return;
    currentSection.text = normalizeWhitespace(currentSection.textBlocks.join('\n\n'));
    currentSection.footnoteRefs = [...new Set([...currentSection.text.matchAll(/\[(\d+)\]/g)].map((m) => m[1]))];
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
      } else if (kind === 'title') {
        hierarchy.title = heading.text;
        hierarchy.chapter = null;
      } else {
        hierarchy.chapter = heading.text;
      }

      continue;
    }

    if (isArticleBlock(block)) {
      pushCurrentSection();

      const sectionNo = getSectionNo(block);
      currentSection = {
        id: `thai-criminal-code-section-${sectionSlug(sectionNo)}`,
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

  return {
    sourcePath: SOURCE_PATH,
    generatedAt: new Date().toISOString(),
    input: {
      characters: rawText.length,
      thaiCharacters: (rawText.match(/[\u0E00-\u0E7F]/g) || []).length,
      mojibakeCharacters: (rawText.match(/[àÂðâ�]/g) || []).length,
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
    },
  };
}

function main() {
  const rawText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const parsed = parseCriminalCode(rawText);
  const report = buildReport(parsed, rawText);

  const output = {
    codeId: 'thai-criminal-code',
    title: 'ประมวลกฎหมายอาญา',
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
  console.log(JSON.stringify(report.output, null, 2));
}

main();
