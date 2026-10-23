const fs = require('fs');
const path = require('path');

const SOURCE_PATH = 'D:/Learn/Expo/law_quest/reasearch/ประมวล/ประมวลกฎหมายวิธีพิจารณาความแพ่ง/ประมวลกฎหมายวิธีพิจารณาความแพ่ง.txt';
const OUTPUT_DIR = 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/th';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'th-ocs-2026-06-06.json');

const THAI_DIGITS = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
};

const LATIN_SUFFIXES = {
  'ทวิ': 'bis',
  'ตรี': 'ter',
  'จัตวา': 'quater',
  'เบญจ': 'quinquies',
  'ฉ': 'sexies',
  'สัตต': 'septies',
  'อัฏฐ': 'octies',
  'อัฎฐ': 'octies',
  'นว': 'nonies',
  'ทศ': 'decies'
};

const SECTION_SUFFIX_PATTERN = '(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ)';
const SECTION_NO_PATTERN = `[๐-๙0-9]+(?:\\s*${SECTION_SUFFIX_PATTERN})?(?:\\/[๐-๙0-9]+)?|[๐-๙0-9]+(?:\\/[๐-๙0-9]+)?(?:\\s*${SECTION_SUFFIX_PATTERN})?`;
const HEADING_LINE_PATTERN = '(?:ภาค|ลักษณะ|หมวด|ส่วนที่|ส่วน)\\s+[๐-๙0-9]+(?:\\/[๐-๙0-9]+)?';

const APPENDIX_SLUGS = {
  'ตาราง ๑': 'table-1',
  'ตาราง ๒': 'table-2',
  'ตาราง ๓': 'table-3',
  'ตาราง ๔': 'table-4',
  'ตาราง ๕': 'table-5',
  'ตาราง ๖': 'table-6',
  'ตาราง ๗': 'table-7'
};

function toArabicDigits(str) {
  return str.replace(/[๐-๙]/g, m => THAI_DIGITS[m]);
}

function normalizeWhitespace(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSectionNo(thaiNoStr) {
  let val = toArabicDigits(thaiNoStr).trim();
  val = val.replace(/\s+/g, ' ');
  for (const suffix of Object.keys(LATIN_SUFFIXES)) {
    val = val.replace(new RegExp(`([0-9])(${suffix})`, 'g'), '$1 $2');
  }
  return normalizeWhitespace(val);
}

function normalizedSectionNoForId(sectionNo) {
  let res = sectionNo.trim();
  for (const [key, val] of Object.entries(LATIN_SUFFIXES)) {
    res = res.replace(new RegExp(`\\s*${key}`, 'g'), `-${val}`);
  }
  res = res.replace(/\//g, '-');
  res = res.replace(/\s+/g, '');
  return res;
}

function getAppendixSlug(label) {
  const trimmed = label.trim();
  if (APPENDIX_SLUGS[trimmed]) {
    return APPENDIX_SLUGS[trimmed];
  }
  const tableMatch = trimmed.match(/^ตาราง\s+([๑-๗๐-๙1-7]+)/);
  if (tableMatch) {
    const thaiNum = tableMatch[1];
    const arabicNum = toArabicDigits(thaiNum);
    return `table-${arabicNum}`;
  }
  return 'appendix';
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
  if (/^ภาค\s+[๐-๙0-9]+/.test(block)) return 'part';
  if (/^ลักษณะ\s+[๐-๙0-9]+(?:\/[๐-๙0-9]+)?/.test(block)) return 'title';
  if (/^หมวด\s+[๐-๙0-9]+/.test(block)) return 'chapter';
  if (/^(?:ส่วนที่|ส่วน)\s+[๐-๙0-9]+/.test(block)) return 'section';
  return null;
}

function isArticleBlock(block) {
  return new RegExp(`^มาตรา\\s+(?:${SECTION_NO_PATTERN})(?=[\\s\\[])`).test(block);
}

function parseAppendices(codeId, tailText) {
  const appendices = [];
  
  // 1. Delineate notes start
  const notesStartMatch = tailText.match(/\r?\n\s*(?:หมายเหตุ\s*:-|พระราชบัญญัติ|พระราชกำหนด|ประกาศของคณะปฏิวัติ|ประกาศคณะปฏิวัติ|รัฐธรรมนูญแก้ไขเพิ่มเติม|\[\d+\])/);
  const appendicesArea = notesStartMatch ? tailText.slice(0, notesStartMatch.index) : tailText;
  
  // 2. Identify appendix headings
  const appendixHeaderRegex = /(?:\r?\n|^)\s*(บัญชีอัตราค่าธรรมเนียมและค่าใช้จ่ายท้ายประมวลกฎหมายที่ดิน|บัญชีค่าตอบแทนท้ายประมวลกฎหมายที่ดิน|บัญชีแนบท้ายประมวลกฎหมายวิธีพิจารณาความอาญา|บัญชีอัตราอากรแสตมป์|ตาราง\s+[๑-๗๐-๙1-7]|อัตราค่าธรรมเนียม)(?:\[(\d+)\])?\s*(?:\r?\n|$)/g;
  
  const matches = [];
  let match;
  while ((match = appendixHeaderRegex.exec(appendicesArea)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      label: match[1].trim(),
      footnoteRef: match[2]
    });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const startIdx = currentMatch.index + currentMatch.length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : appendicesArea.length;
    
    let text = appendicesArea.slice(startIdx, endIdx).trim();
    text = normalizeWhitespace(text);
    
    const label = currentMatch.label;
    const headingFootnoteRefs = currentMatch.footnoteRef ? [currentMatch.footnoteRef] : [];
    const bodyFootnoteRefs = [...new Set([...text.matchAll(/\[(\d+)\]/g)].map(m => m[1]))];
    
    const reviewNotes = [];
    if (!text) {
      reviewNotes.push('Appendix body is empty in raw source');
    }
    
    const slug = getAppendixSlug(label);
    const appendixId = `${codeId}-appendix-${slug}`;
    
    appendices.push({
      appendixId,
      label,
      headingFootnoteRefs,
      text,
      bodyFootnoteRefs,
      reviewStatus: 'needs_review',
      reviewNotes
    });
  }
  
  return appendices;
}

function main() {
  console.log(`Reading source file: ${SOURCE_PATH}`);
  const rawText = fs.readFileSync(SOURCE_PATH, 'utf8');

  const { bodyStart, bodyEnd } = getBodyBounds(rawText);
  const bodyText = rawText.slice(bodyStart, bodyEnd);
  const blocks = splitBlocks(bodyText);

  const sections = [];
  let currentSection = null;

  function pushCurrentSection() {
    if (!currentSection) return;

    const fullBlockText = normalizeWhitespace(currentSection.textBlocks.join('\n\n'));
    
    // We match heading using HEADING_LINE_PATTERN equivalent for section
    const headingMatch = fullBlockText.match(/^มาตรา\s+([๐-๙0-9]+(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ))?(?:\/[๐-๙0-9]+)?|[๐-๙0-9]+(?:\/[๐-๙0-9]+)?(?:\s*(?:ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ))?)/);
    if (!headingMatch) {
      throw new Error(`Failed to match heading in section text: ${fullBlockText.substring(0, 100)}`);
    }

    const sectionLabel = normalizeWhitespace(headingMatch[0]);
    const sectionNo = parseSectionNo(headingMatch[1]);
    const sectionId = `thai-civil-procedure-code-section-${normalizedSectionNoForId(sectionNo)}`;

    const remaining = fullBlockText.slice(headingMatch[0].length).trim();
    let headingFootnoteRefs = [];
    let text = remaining;

    const footnoteMatch = remaining.match(/^\[(\d+)\]/);
    if (footnoteMatch) {
      headingFootnoteRefs = [footnoteMatch[1]];
      text = remaining.slice(footnoteMatch[0].length).trim();
    }

    const bodyFootnoteRefs = [...new Set([...text.matchAll(/\[(\d+)\]/g)].map(m => m[1]))];

    const isRepealed = text === '(ยกเลิก)' || text.startsWith('(ยกเลิก)');
    const status = isRepealed ? 'repealed' : 'active';

    const reviewNotes = [];
    if (!text) {
      reviewNotes.push('Section body is empty in raw source');
    }

    sections.push({
      sectionId,
      sectionNo,
      sectionLabel,
      headingFootnoteRefs,
      text,
      bodyFootnoteRefs,
      status,
      reviewStatus: 'needs_review',
      reviewNotes,
      _rawBlockText: fullBlockText // stored temporarily for validation
    });

    currentSection = null;
  }

  for (let index = 0; index < blocks.length; index += 1) {
    let block = blocks[index];
    const kind = headingKind(block);

    if (kind) {
      pushCurrentSection();
      continue;
    }

    if (isArticleBlock(block)) {
      pushCurrentSection();
      currentSection = {
        textBlocks: [block]
      };
      continue;
    }

    if (currentSection) {
      currentSection.textBlocks.push(block);
    }
  }

  pushCurrentSection();

  console.log(`Parsed ${sections.length} sections.`);

  // Parse appendices
  const tailText = rawText.slice(bodyEnd);
  const appendices = parseAppendices('thai-civil-procedure-code', tailText);
  console.log(`Parsed ${appendices.length} appendices.`);

  // Validation
  const sectionIds = new Set();
  const sectionNos = new Set();
  let repealedCount = 0;
  const sectionsWithReviewNotes = [];

  for (const s of sections) {
    // 1. Every section has required fields
    const required = ['sectionId', 'sectionNo', 'sectionLabel', 'headingFootnoteRefs', 'text', 'bodyFootnoteRefs', 'status', 'reviewStatus', 'reviewNotes'];
    for (const field of required) {
      if (s[field] === undefined) {
        throw new Error(`Section ${s.sectionNo} is missing field: ${field}`);
      }
    }

    // 2. No text begins with มาตรา
    if (s.text.startsWith('มาตรา')) {
      throw new Error(`Section ${s.sectionNo} body text begins with มาตรา: ${s.text}`);
    }

    // 3. No heading footnote marker remains at the beginning of text
    if (s.text.startsWith('[')) {
      const match = s.text.match(/^\[\d+\]/);
      if (match) {
        throw new Error(`Section ${s.sectionNo} has heading footnote remaining in text: ${s.text}`);
      }
    }

    // 4. Check uniqueness of sectionNo and sectionId
    if (sectionIds.has(s.sectionId)) {
      throw new Error(`Duplicate sectionId found: ${s.sectionId}`);
    }
    sectionIds.add(s.sectionId);

    if (sectionNos.has(s.sectionNo)) {
      console.warn(`Warning: Duplicate sectionNo found: ${s.sectionNo}`);
    }
    sectionNos.add(s.sectionNo);

    // 5. Cross-reference safety check
    const raw = s._rawBlockText;
    const firstOccur = raw.indexOf('มาตรา');
    const secondOccur = raw.indexOf('มาตรา', firstOccur + 5);
    if (secondOccur >= 0) {
      if (!s.text.includes('มาตรา')) {
        throw new Error(`Section ${s.sectionNo} has lost internal 'มาตรา' references: ${s.text}`);
      }
    }

    // Clean up temporary field
    delete s._rawBlockText;

    if (s.status === 'repealed') {
      repealedCount++;
    }

    if (s.reviewNotes.length > 0) {
      sectionsWithReviewNotes.push(s.sectionNo);
    }
  }

  const output = {
    schemaVersion: 3,
    codeId: 'thai-civil-procedure-code',
    language: 'th',
    versionId: 'th-ocs-2026-06-06',
    sourceType: 'official_thai_text_structured_from_txt',
    sourceName: 'สำนักงานคณะกรรมการกฤษฎีกา',
    sourceUrl: 'https://www.ocs.go.th/searchlaw-law?tab=law5',
    isAuthoritative: true,
    disclaimer: 'versionId specifies the structured JSON generation date, not necessarily the legal effective date.',
    sections: sections,
    appendices: appendices
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Saved output to ${OUTPUT_JSON}`);

  console.log('--- Summary Report ---');
  console.log(`codeId: ${output.codeId}`);
  console.log(`total sections: ${sections.length}`);
  console.log(`total appendices: ${appendices.length}`);
  console.log(`first sectionNo: ${sections[0].sectionNo}`);
  console.log(`last sectionNo: ${sections[sections.length - 1].sectionNo}`);
  console.log(`repealed count: ${repealedCount}`);
  console.log(`sections with reviewNotes: ${sectionsWithReviewNotes.join(', ') || 'none'}`);
  console.log(`validation result: PASS`);
}

main();
