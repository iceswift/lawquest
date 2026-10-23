const fs = require('fs');
const path = require('path');

const codes = [
  'thai-criminal-code',
  'thai-revenue-code',
  'thai-civil-procedure-code',
  'thai-civil-commercial-code'
];

codes.forEach(codeId => {
  const file = `D:/Project/LawQuest/data/legal-v3/texts/${codeId}/th/th-ocs-2026-06-06.json`;
  if (!fs.existsSync(file)) {
    console.log(`${codeId}: file not found`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`${codeId}:`);
  console.log(`  - sections count: ${data.sections.length}`);
  console.log(`  - appendices count: ${data.appendices.length}`);
  if (data.appendices.length > 0) {
    data.appendices.forEach(app => {
      console.log(`    - appendixId: ${app.appendixId}`);
      console.log(`    - label: ${app.label}`);
    });
  }
});
