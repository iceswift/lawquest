const fs = require('fs');
const path = require('path');

const CODE_ID = 'thai-criminal-procedure-code';
const TH_FILE = 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-procedure-code/th/th-ocs-2026-06-06.json';
const EN_DIR = 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-procedure-code/en';
const EN_FILE = path.join(EN_DIR, 'en-ai-draft-2026-06-07.json');
const REF_FILE = 'D:/Project/LawQuest/data/legal-v2/texts/thai-criminal-procedure-code/en/en-ai-draft-2026-04-29.json';

const appendix0Text = `Offences under the Penal Code referred to in Section 79 which a private person has the power to arrest without a warrant:

Assault against the Royal Family: Section 97 and Section 99

Rebellion within the Kingdom: Section 101 to Section 104

Rebellion outside the Kingdom: Section 105 to Section 111

Offences against Friendly Relations with Foreign Countries: Section 112

Damage to foreign flags or symbols: Section 115

Offences against Officials: Section 119 to Section 122 and Section 127

Escape from custody: Section 163 to Section 166

Offences against Religion: Section 172 to Section 173

Rioting: Section 183 and Section 184

Causing public danger, depriving the public of convenience in travel and communication, and depriving the public of comfort: Section 185 to Section 194, Section 196, Section 197, and Section 199

Counterfeiting Currency: Section 202 to Section 205 and Section 210

Rape: Section 243 to Section 246

Offences against Life: Section 249 and Section 251

Offences against Body: Section 254 to Section 257

Offences against Liberty: Section 268, Section 270, and Section 276

Theft: Section 288 to Section 296

Snatching, robbery, gang robbery, and piracy: Section 297 to Section 302

Extortion: Section 303`;

// Manual Overrides for Erroneous V2 Translations
const manualOverrides = {
  'thai-criminal-procedure-code-section-240': `In the case where the Court does not schedule a date for the examination of evidence under Section 173/1, when a party intends to cite a document in their possession as evidence, they shall submit such documentary evidence to the Court not less than fifteen days before the date of preliminary examination or the date of witness examination, so that the other party has an opportunity to inspect and request a copy of such document before it is adduced, unless the document the party intends to cite is a record of witness testimony, or a document displaying the name or address of a witness, or the Court deems appropriate to order otherwise due to the nature and necessity of such document.

In cases not subject to the submission of documents under paragraph one, when a document is used as evidence in court, it shall be read out or sent to the parties for inspection. If any party requires a copy, the Court has the power to order the party citing the document to send a copy to the other party as it deems appropriate.

If any party fails to submit a document under paragraph one or a copy of a document under paragraph two, or fails to submit documentary evidence or physical evidence under Section 173/2 paragraph one, the Court has the power to refuse to admit such evidence, unless the Court finds that it is for the benefit of justice, or such non-compliance was not intentional and does not prejudice the other party's opportunity to conduct the case.`,
  'thai-criminal-procedure-code-section-241': `Anything used as physical evidence must be brought to court.

In the case where it cannot be brought, the Court shall inspect and record a report at the place where the physical evidence is located, at the time and by the method the Court deems appropriate according to the nature of the physical evidence.`,
  'thai-criminal-procedure-code-section-242': `During an inquiry, preliminary examination, or trial, objects which are physical evidence shall be shown to the parties or witnesses for inspection.

If there is an opening of packages or destruction of seals, the new packaging or sealing shall be done in the presence of the relevant parties or witnesses.`,
  'thai-criminal-procedure-code-section-244': `If the Court or an administrative or superior police official deems it necessary for a preliminary examination, trial, or inquiry to examine a corpse, even if it has already been placed in a coffin or buried, they shall have the power to order the corpse to be delivered to an expert for examination. However, any action taken under such order must take religious principles into consideration and must not cause any other serious danger.`
};

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
    label = label.replace(new RegExp(`${thaiSuffix}(?=\\/|$)`, 'g'), engSuffix);
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
  return id.replace(/-quad$/, '-quater');
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
    
    let text = '';
    if (manualOverrides[sectionId]) {
      text = manualOverrides[sectionId];
    } else {
      text = refMap.get(sectionId) || '';
      text = cleanText(text);
    }
    
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
    
    if (appendixId === 'thai-criminal-procedure-code-appendix-offence-schedule') {
      label = 'Schedule of Offences Annexed to the Criminal Procedure Code';
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
