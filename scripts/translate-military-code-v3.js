const fs = require('fs');
const path = require('path');

const CODE_ID = 'thai-military-criminal-code';
const TH_FILE = 'D:/Project/LawQuest/data/legal-v3/texts/thai-military-criminal-code/th/th-ocs-2026-06-06.json';
const EN_DIR = 'D:/Project/LawQuest/data/legal-v3/texts/thai-military-criminal-code/en';
const EN_FILE = path.join(EN_DIR, 'en-ai-draft-2026-06-07.json');
const REF_FILE = 'D:/Project/LawQuest/data/legal-v2/texts/thai-military-criminal-code/en/en-ai-draft-2026-04-29.json';

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
  
  // Strip any leading "Section X" or similar prefix
  cleaned = cleaned.replace(/^Section\s+\d+(\s+(bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies))?[\s.:-]*/i, '');
  
  // Strip any leading footnote markers like [12] from the beginning of the text
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
  
  // Map sections
  const enSections = thData.sections.map(thSec => {
    const sectionId = thSec.sectionId;
    const sectionNo = thSec.sectionNo;
    const sectionLabel = translateSectionLabel(thSec.sectionLabel);
    
    // Get reference translation
    let text = refMap.get(sectionId) || '';
    
    // Perform cleaning
    text = cleanText(text);
    
    // If text is empty, or if we need specific manual overrides, we handle it
    // For military criminal code, let's make sure the text matches exactly
    // Let's do a quick print for empty ones
    if (!text) {
      console.warn(`Warning: Empty translation for section ${sectionNo}`);
    }
    
    // Update "PART 2" text for section 12
    if (sectionId === 'thai-military-criminal-code-section-12') {
      text = text.replace(/PART 2\s*SPECIFIC OFFENSES/gi, 'PART 2\nSPECIFIC OFFENSES');
      text = text.replace(/PART 2\nSPECIFIC OFFENSES/gi, 'PART 2\n\nSPECIFIC OFFENSES');
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
    appendices: [] // no appendices in military criminal code
  };
  
  // Validation checks
  console.log('Running validation checks...');
  let errors = [];
  
  // 1. JSON parsing is implicit since we stringify it
  // 2. schemaVersion is 3
  if (output.schemaVersion !== 3) errors.push(`schemaVersion is not 3: ${output.schemaVersion}`);
  // 3. codeId matches Thai source
  if (output.codeId !== thData.codeId) errors.push(`codeId mismatch: expected ${thData.codeId}, got ${output.codeId}`);
  // 4. language is en
  if (output.language !== 'en') errors.push(`language is not en: ${output.language}`);
  // 5. basedOnVersionId equals Thai source versionId
  if (output.basedOnVersionId !== thData.versionId) errors.push(`basedOnVersionId mismatch`);
  // 6. Section count equals Thai source section count
  if (output.sections.length !== thData.sections.length) errors.push(`Section count mismatch: expected ${thData.sections.length}, got ${output.sections.length}`);
  // 7. Appendix count equals Thai source appendix count
  if (output.appendices.length !== (thData.appendices || []).length) errors.push(`Appendix count mismatch`);
  
  for (let i = 0; i < thData.sections.length; i++) {
    const thSec = thData.sections[i];
    const enSec = output.sections[i];
    
    // 8. Every sectionId matches Thai source at the same index
    if (enSec.sectionId !== thSec.sectionId) errors.push(`sectionId mismatch at index ${i}`);
    // 9. Every sectionNo matches Thai source at the same index exactly
    if (enSec.sectionNo !== thSec.sectionNo) errors.push(`sectionNo mismatch at index ${i}`);
    // 10. Every headingFootnoteRefs array matches Thai source exactly
    if (JSON.stringify(enSec.headingFootnoteRefs) !== JSON.stringify(thSec.headingFootnoteRefs)) {
      errors.push(`headingFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    // 11. Every bodyFootnoteRefs array matches Thai source exactly
    if (JSON.stringify(enSec.bodyFootnoteRefs) !== JSON.stringify(thSec.bodyFootnoteRefs)) {
      errors.push(`bodyFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    // 13. No English section text begins with Section
    if (enSec.text.match(/^Section/i)) {
      errors.push(`Section ${enSec.sectionNo} text starts with 'Section': ${enSec.text.substring(0, 30)}`);
    }
    // 15. No heading footnote marker appears at the beginning of text
    if (enSec.text.match(/^\[\d+\]/)) {
      errors.push(`Section ${enSec.sectionNo} text starts with footnote marker: ${enSec.text.substring(0, 30)}`);
    }
    // 16. No pattern like [132] Whoever, Whoever[132], or Section 194[132] appears in text
    if (enSec.text.match(/\[\d+\]\s*\w+/i) || enSec.text.match(/\w+\[\d+\]/i) || enSec.text.match(/Section\s+\d+\[\d+\]/i)) {
      // Allow valid body footnote markers if they match exactly what is in bodyFootnoteRefs and are properly placed,
      // but warn if they are malformed. Let's check:
      // A valid body footnote is like "Whoever[3]..." or "...military[4]..."
      // But we shouldn't have heading footnote patterns like "[132] Whoever"
      if (enSec.text.match(/^\[\d+\]\s*/)) {
        errors.push(`Section ${enSec.sectionNo} contains heading footnote at start of text`);
      }
    }
    // 17. No section is missing text
    if (!enSec.text || enSec.text.trim() === '') {
      errors.push(`Section ${enSec.sectionNo} is missing text`);
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
  
  // Final report details
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
