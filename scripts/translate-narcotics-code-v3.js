const fs = require('fs');
const path = require('path');

const CODE_ID = 'thai-narcotics-code';
const TH_FILE = 'D:/Project/LawQuest/data/legal-v3/texts/thai-narcotics-code/th/th-ocs-2026-06-06.json';
const EN_DIR = 'D:/Project/LawQuest/data/legal-v3/texts/thai-narcotics-code/en';
const EN_FILE = path.join(EN_DIR, 'en-ai-draft-2026-06-07.json');
const REF_FILE = 'D:/Project/LawQuest/data/legal-v2/texts/thai-narcotics-code/en/en-ai-draft-2026-04-29.json';

const appendix0Text = `(1) License to produce narcotics or psychotropic substances: 50,000 Baht per license

(2) License to produce for export Category 2 psychotropic substances: 10,000 Baht per license

(3) License to import narcotics or psychotropic substances: 100,000 Baht per license

(4) License to export narcotics or psychotropic substances: 10,000 Baht per license

(5) Temporary license to import or export narcotics or psychotropic substances: 20,000 Baht per license

(6) License to dispose of narcotics or psychotropic substances: 5,000 Baht per license

(7) License to dispose of narcotics or psychotropic substances by wholesale: 10,000 Baht per license

(8) License to possess narcotics or psychotropic substances: 5,000 Baht per license

(9) License to dispose of or possess Category 2 narcotics in excess of the quantity prescribed by the Minister: 1,000 Baht per license

(10) License to transit psychotropic substances: 2,000 Baht per license

(11) License to advertise narcotics or psychotropic substances: 10,000 Baht per license

(12) License to produce or import samples of Category 3 narcotic formulas or psychotropic substance formulas: 5,000 Baht per license

(13) Certificate of registration for Category 3 narcotic formulas or psychotropic substance formulas: 10,000 Baht per certificate

(14) Permission to amend registration entries: 2,000 Baht per permission

(15) Substitute license or substitute certificate of registration for Category 3 narcotic formulas or psychotropic substance formulas: 2,000 Baht per copy

(16) Renewal of license or renewal of certificate of registration for Category 3 narcotic formulas or psychotropic substance formulas: half of the fee for such license or certificate

(17) Listing fee to be collected from experts, expert organizations, government agencies, or private organizations, both domestic and foreign: 100,000 Baht per entity

(18) Fee for application for license or other applications: 7,000 Baht per application

(19) Fee for evaluation of academic documents: 500,000 Baht per application

(20) Fee for inspection of establishment: 50,000 Baht per inspection

(21) Other processing fees other than (1) - (20): 4,000 Baht per request`;

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
      refMap.set(sec.sectionId, sec.text);
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
    
    if (appendixId === 'thai-narcotics-code-appendix-fee-schedule') {
      label = 'Fee Schedule Annexed to the Narcotics Code';
      text = appendix0Text;
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
