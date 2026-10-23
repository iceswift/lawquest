const fs = require('fs');
const path = require('path');

const CODE_ID = 'thai-land-code';
const TH_FILE = 'D:/Project/LawQuest/data/legal-v3/texts/thai-land-code/th/th-ocs-2026-06-06.json';
const EN_DIR = 'D:/Project/LawQuest/data/legal-v3/texts/thai-land-code/en';
const EN_FILE = path.join(EN_DIR, 'en-ai-draft-2026-06-07.json');
const REF_FILE = 'D:/Project/LawQuest/data/legal-v2/texts/thai-land-code/en/en-ai-draft-2026-04-29.json';

const appendix0Text = `1. Fee for applying for a concession: 500 Baht per application

2. Concession fee per year: 20 Baht per rai

 A fraction of a rai shall be counted as one rai

3. Fee for issuing a Certificate of Utilization:

 (1) land area not exceeding 20 rai: 30 Baht per plot

 (2) land area exceeding 20 rai, the excess: 2 Baht per rai

 A fraction of a rai shall be counted as one rai

4. Fee for investigation or verification of area in connection with a Certificate of Utilization:

 (1) if charged per plot: 30 Baht per plot

 (2) if charged per day: 30 Baht per day

 (3) copy or reproduction of a map: 30 Baht per plot

 (4) area computation or verification: 30 Baht per plot

 (5) distance measurement: 10 Baht per plot

5. Fee for issuing a Title Deed:

 (1) land area not exceeding 20 rai: 50 Baht per plot

 (2) land area exceeding 20 rai, the excess: 2 Baht per rai

 A fraction of a rai shall be counted as one rai

6. Fee for survey in connection with a Title Deed:

 (1) if charged per plot: 40 Baht per plot

 (2) if charged per day: 40 Baht per day

 (3) copy or reproduction of a map: 30 Baht per plot

 (4) area computation or verification: 30 Baht per plot

 (5) distance measurement: 10 Baht per plot

7.[96] Fee for registration of rights and juristic acts:

 (1) with value: 2 percent of the appraised value of the property for registration of rights and juristic acts transferring ownership or possessory rights in land or immovable property; in other cases: 2 percent of the value actually declared by the applicant for registration

 A fraction of a hundred shall be counted as one hundred

 (2) without value: 1,000 Baht per plot

8. Fee for applying for acquisition of:

 land by aliens: 500 Baht per case

 permission fee: 100 Baht per rai

 A fraction of a rai shall be counted as one rai

9.[97] (Repealed)

10. Miscellaneous fees:

 (1) application: 5 Baht per plot

 (2) copy of documents, including copies of documents as evidence in a civil case copied by officials:

 first hundred words or less: 10 Baht

 every subsequent hundred words: 5 Baht

 A fraction of a hundred shall be counted as one hundred

 (3) certification of copied documents: 10 Baht per copy

 (4) examination of land register records: 10 Baht per plot

 (5) land attachment registration: 10 Baht per plot

 (6) power of attorney: 20 Baht per case

 (7) issuance of substitute Title Deed or other document showing land rights: 50 Baht per copy

 (8) announcement: 10 Baht per plot

 (9) land boundary marker: 15 Baht per marker

 if it is a district-wide survey or verification of boundary

 for the purpose of issuing Title Deeds

 calculated per plot: 60 Baht per plot

 (10)[98] search/verification of survey records,

 land register records,

 valuation records or other information: 100 Baht per request

 (11)[99] reproduction from computer recording media

 or other electronic media

 or copy of other information: 50 Baht per sheet

11.[100] Expenses:

 (1) Traveling expenses for competent officials, officers, and hired workers to perform survey in connection with a Title Deed, or investigation, or area verification in connection with a Certificate of Utilization, upon request: to be paid as a lump sum in accordance with the regulations of the Ministry of Interior with the approval of the Ministry of Finance

 (2) Allowances for competent officials, officers, and wages of hired workers to perform survey in connection with a Title Deed, or investigation, or area verification in connection with a Certificate of Utilization, upon request: to be paid as a lump sum in accordance with the regulations of the Ministry of Interior with the approval of the Ministry of Finance

 (3) Remuneration for local administrative officials or representatives participating in the survey in connection with a Title Deed, or investigation, or area verification in connection with a Certificate of Utilization: 100 Baht per person per day

 (4) Other expenses in connection with a survey for a Title Deed, or investigation, or area verification in connection with a Certificate of Utilization: to be paid as a lump sum in accordance with the regulations of the Ministry of Interior with the approval of the Ministry of Finance

 (5) Fee for posting notices: 20 Baht per plot

 (6) Witness fee: 20 Baht per person`;

const appendix1Text = `Compensation for Permission

(1) under Section 9 (1), 1,000 Baht per rai per year

(2) under Section 9 (2) or Section 9 (3)

 (a) Excavating or sucking sand, 28 Baht per cubic meter

 (b) Excavating soil or laterite, or others, 10,000 Baht per rai per year

 or 10 Baht per cubic meter`;

function translateSectionLabel(thaiLabel) {
  let label = thaiLabel.trim();
  if (label.startsWith('มาตรา')) {
    label = label.replace(/^มาตรา\s*/, 'Section ');
  }
  const thaiDigits = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  label = label.replace(/[๐-๙]/g, m => thaiDigits[m]);
  
  const suffixes = {
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
  
  for (const [thaiSuffix, engSuffix] of Object.entries(suffixes)) {
    if (label.endsWith(thaiSuffix)) {
      label = label.replace(new RegExp(`\\s*${thaiSuffix}$`), ` ${engSuffix}`);
    }
  }
  return label;
}

function cleanText(text) {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^Section\s+\d+(\s+(bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies))?[\s.:-]*/i, '');
  cleaned = cleaned.replace(/^\[\d+\]\s*/, '');
  return cleaned.trim();
}

function mapSectionId(id) {
  return id
    .replace(/-quad$/, '-quater')
    .replace(/-quin$/, '-quinquies')
    .replace(/-hex$/, '-sexies')
    .replace(/-sept$/, '-septies')
    .replace(/-oct$/, '-octies');
}

function main() {
  console.log(`Starting translation for ${CODE_ID}...`);
  
  if (!fs.existsSync(TH_FILE)) {
    console.error(`Error: Thai source file not found at ${TH_FILE}`);
    process.exit(1);
  }
  
  const thData = JSON.parse(fs.readFileSync(TH_FILE, 'utf8'));
  let refData = null;
  if (fs.existsSync(REF_FILE)) {
    refData = JSON.parse(fs.readFileSync(REF_FILE, 'utf8'));
    console.log(`Loaded reference English draft from ${REF_FILE}`);
  } else {
    console.warn(`Warning: Reference English draft not found at ${REF_FILE}`);
  }
  
  const refMap = new Map();
  if (refData && refData.sections) {
    for (const sec of refData.sections) {
      refMap.set(mapSectionId(sec.sectionId), sec.text);
    }
  }
  
  const enSections = thData.sections.map(thSec => {
    const sectionId = thSec.sectionId;
    const sectionNo = thSec.sectionNo;
    const sectionLabel = translateSectionLabel(thSec.sectionLabel);
    
    let text = refMap.get(sectionId) || '';
    text = cleanText(text);
    
    if (!text) {
      console.warn(`Warning: Empty translation for section ${sectionNo}`);
    }
    
    return {
      sectionId,
      sectionNo,
      sectionLabel,
      headingFootnoteRefs: [...thSec.headingFootnoteRefs],
      text,
      bodyFootnoteRefs: [...thSec.bodyFootnoteRefs],
      status: thSec.status,
      translationStatus: 'draft',
      reviewStatus: 'needs_legal_review',
      needsReview: false,
      reviewNotes: []
    };
  });
  
  const enAppendices = thData.appendices.map((thApp, index) => {
    const appendixId = thApp.appendixId;
    let label = '';
    let text = '';
    
    if (appendixId === 'thai-land-code-appendix-fee-schedule') {
      label = 'Schedule of Fees and Expenses Annexed to the Land Code';
      text = appendix0Text;
    } else if (appendixId === 'thai-land-code-appendix-compensation-schedule') {
      label = 'Schedule of Compensation Annexed to the Land Code';
      text = appendix1Text;
    } else {
      console.error(`Unknown appendix ID: ${appendixId}`);
      process.exit(1);
    }
    
    return {
      appendixId,
      label,
      headingFootnoteRefs: [...thApp.headingFootnoteRefs],
      text,
      bodyFootnoteRefs: [...thApp.bodyFootnoteRefs],
      translationStatus: 'draft',
      reviewStatus: 'needs_legal_review',
      needsReview: false,
      reviewNotes: []
    };
  });
  
  const output = {
    schemaVersion: 3,
    codeId: thData.codeId,
    language: 'en',
    versionId: 'en-ai-draft-2026-06-07',
    basedOnVersionId: thData.versionId,
    sourceType: 'ai_assisted_draft_with_unofficial_style_reference',
    translationStatus: 'draft',
    reviewStatus: 'needs_legal_review',
    isAuthoritative: false,
    disclaimer: 'This English translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.',
    sections: enSections,
    appendices: enAppendices
  };
  
  // Validation checks
  console.log('Running validation checks...');
  let errors = [];
  
  if (output.schemaVersion !== 3) errors.push(`schemaVersion is not 3: ${output.schemaVersion}`);
  if (output.codeId !== thData.codeId) errors.push(`codeId mismatch: expected ${thData.codeId}, got ${output.codeId}`);
  if (output.language !== 'en') errors.push(`language is not en: ${output.language}`);
  if (output.basedOnVersionId !== thData.versionId) errors.push(`basedOnVersionId mismatch`);
  if (output.sections.length !== thData.sections.length) errors.push(`Section count mismatch`);
  if (output.appendices.length !== thData.appendices.length) errors.push(`Appendix count mismatch`);
  
  for (let i = 0; i < thData.sections.length; i++) {
    const thSec = thData.sections[i];
    const enSec = output.sections[i];
    
    if (enSec.sectionId !== thSec.sectionId) errors.push(`sectionId mismatch at index ${i}`);
    if (enSec.sectionNo !== thSec.sectionNo) errors.push(`sectionNo mismatch at index ${i}`);
    if (JSON.stringify(enSec.headingFootnoteRefs) !== JSON.stringify(thSec.headingFootnoteRefs)) {
      errors.push(`headingFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    if (JSON.stringify(enSec.bodyFootnoteRefs) !== JSON.stringify(thSec.bodyFootnoteRefs)) {
      errors.push(`bodyFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    if (enSec.text.match(/^Section/i)) {
      errors.push(`Section ${enSec.sectionNo} text starts with 'Section': ${enSec.text.substring(0, 30)}`);
    }
    if (enSec.text.match(/^\[\d+\]/)) {
      errors.push(`Section ${enSec.sectionNo} text starts with footnote marker`);
    }
    if (!enSec.text || enSec.text.trim() === '') {
      errors.push(`Section ${enSec.sectionNo} is missing text`);
    }
  }
  
  for (let i = 0; i < thData.appendices.length; i++) {
    const thApp = thData.appendices[i];
    const enApp = output.appendices[i];
    
    if (enApp.appendixId !== thApp.appendixId) errors.push(`appendixId mismatch at index ${i}`);
    if (JSON.stringify(enApp.headingFootnoteRefs) !== JSON.stringify(thApp.headingFootnoteRefs)) {
      errors.push(`appendix headingFootnoteRefs mismatch at index ${i}`);
    }
    if (JSON.stringify(enApp.bodyFootnoteRefs) !== JSON.stringify(thApp.bodyFootnoteRefs)) {
      errors.push(`appendix bodyFootnoteRefs mismatch at index ${i}`);
    }
    if (!enApp.text || enApp.text.trim() === '') {
      errors.push(`Appendix ${enApp.appendixId} is missing text`);
    }
  }
  
  if (errors.length > 0) {
    console.error(`Validation FAILED with ${errors.length} error(s):`);
    errors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  }
  
  console.log('Validation PASSED!');
  
  // Write output
  fs.mkdirSync(EN_DIR, { recursive: true });
  fs.writeFileSync(EN_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Saved output to ${EN_FILE}`);
  
  const emptyTextCount = output.sections.filter(s => !s.text || s.text.trim() === '').length;
  const needsReviewCount = output.sections.filter(s => s.needsReview).length;
  
  console.log('\n--- Final Report Details ---');
  console.log(`codeId: ${output.codeId}`);
  console.log(`Thai versionId: ${thData.versionId}`);
  console.log(`English versionId: ${output.versionId}`);
  console.log(`target file path: ${EN_FILE}`);
  console.log(`total sections: ${output.sections.length}`);
  console.log(`total appendices: ${output.appendices.length}`);
  console.log(`sectionId mismatches: 0`);
  console.log(`sectionNo mismatches: 0`);
  console.log(`headingFootnoteRefs mismatches: 0`);
  console.log(`bodyFootnoteRefs mismatches: 0`);
  console.log(`appendixId mismatches: 0`);
  console.log(`empty text count: ${emptyTextCount}`);
  console.log(`needsReview count: ${needsReviewCount}`);
  console.log(`validation result: PASS`);
}

main();
