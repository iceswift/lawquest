const fs = require('fs');

const thV2 = JSON.parse(fs.readFileSync('D:/Project/LawQuest/data/legal-v2/texts/thai-revenue-code/th/th-ocs-2026-04-28.json', 'utf8'));
const thV3 = JSON.parse(fs.readFileSync('D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/th/th-ocs-2026-06-06.json', 'utf8'));

console.log('--- V3 sections with "๓" and suffix ---');
thV3.sections.forEach(s => {
  if (s.sectionNo.startsWith('๓') || s.sectionNo.startsWith('3')) {
    console.log(`V3 ID: ${s.sectionId}, Label: ${s.sectionLabel}, No: ${s.sectionNo}`);
  }
});

console.log('--- V2 sections with "๓" and suffix ---');
thV2.sections.forEach(s => {
  if (s.sectionNo.startsWith('๓') || s.sectionNo.startsWith('3')) {
    console.log(`V2 ID: ${s.sectionId}, Label: ${s.sectionLabel}, No: ${s.sectionNo}`);
  }
});
