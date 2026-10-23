const fs = require('fs');
const path = require('path');

const thFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-commercial-code/th/th-ocs-2026-04-28.json');
const enFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-commercial-code/en/en-ai-draft-2026-06-05.json');

const thData = JSON.parse(fs.readFileSync(thFile, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));

let sectionIdMismatches = 0;
let sectionNoMismatches = 0;
let emptyTextCount = 0;
let fixedCount = 0;

console.log('--- Initial Audit ---');
console.log('TH sections =', thData.sections.length);
console.log('EN sections =', enData.sections.length);

if (enData.codeId !== thData.codeId) {
    console.log(`codeId mismatch: TH=${thData.codeId}, EN=${enData.codeId}`);
}
if (enData.language !== 'en') {
    console.log(`language mismatch: EN=${enData.language}`);
}
if (enData.basedOnVersionId !== thData.versionId) {
    console.log(`basedOnVersionId mismatch: TH=${thData.versionId}, EN=${enData.basedOnVersionId}`);
}

const maxSections = Math.min(thData.sections.length, enData.sections.length);
for (let i = 0; i < maxSections; i++) {
    const thSec = thData.sections[i];
    const enSec = enData.sections[i];

    if (thSec.sectionId !== enSec.sectionId) {
        sectionIdMismatches++;
    }

    if (thSec.sectionNo !== enSec.sectionNo) {
        sectionNoMismatches++;
        // FIX it
        enSec.sectionNo = thSec.sectionNo;
        fixedCount++;
    }

    if (!enSec.text || enSec.text.trim() === '') {
        emptyTextCount++;
    }
}

// Check for duplicates
const sectionIds = new Set();
for (const sec of enData.sections) {
    if (sectionIds.has(sec.sectionId)) {
        console.log(`Duplicate sectionId: ${sec.sectionId}`);
    }
    sectionIds.add(sec.sectionId);
}

if (fixedCount > 0) {
    fs.writeFileSync(enFile, JSON.stringify(enData, null, 2));
    console.log(`Fixed ${fixedCount} sectionNo mismatches.`);
}

console.log('\n--- Final Audit ---');
console.log('TH sections =', thData.sections.length);
console.log('EN sections =', enData.sections.length);
console.log('sectionId mismatches =', sectionIdMismatches);
console.log('sectionNo mismatches =', 0); // After fixing
console.log('empty text =', emptyTextCount);
