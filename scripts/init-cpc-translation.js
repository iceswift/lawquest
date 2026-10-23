const fs = require('fs');
const path = require('path');

const thFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/th/th-ocs-2026-04-28.json');
const enFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/en/en-ai-draft-2026-06-05.json');

if (!fs.existsSync(thFile)) {
  console.error("Thai source file not found at " + thFile);
  process.exit(1);
}

const thData = JSON.parse(fs.readFileSync(thFile, 'utf8'));

const enData = {
  schemaVersion: 2,
  codeId: thData.codeId,
  language: "en",
  versionId: "en-ai-draft-2026-06-05",
  basedOnVersionId: thData.versionId,
  sourceType: "ai_assisted_draft_with_unofficial_style_reference",
  translationStatus: "draft",
  reviewStatus: "needs_legal_review",
  disclaimer: "This English translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.",
  sections: thData.sections.map(section => ({
    sectionId: section.sectionId,
    sectionNo: section.sectionNo,
    text: "",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  }))
};

fs.mkdirSync(path.dirname(enFile), { recursive: true });
fs.writeFileSync(enFile, JSON.stringify(enData, null, 2), 'utf8');
console.log("Initialized English translation draft with " + enData.sections.length + " sections.");
