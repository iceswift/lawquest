const fs = require('fs');
const path = require('path');

const targets = [
  { codeId: 'thai-criminal-code', file: 'D:/Project/LawQuest/data/legal-v2/texts/thai-criminal-code/en/en-ai-draft-2026-06-05.json' },
  { codeId: 'thai-revenue-code', file: 'D:/Project/LawQuest/data/legal-v2/texts/thai-revenue-code/en/en-ai-draft-2026-04-29.json' },
  { codeId: 'thai-civil-procedure-code', file: 'D:/Project/LawQuest/data/legal-v2/texts/thai-civil-procedure-code/en/en-ai-draft-2026-06-05.json' },
  { codeId: 'thai-civil-commercial-code', file: 'D:/Project/LawQuest/data/legal-v2/texts/thai-civil-commercial-code/en/en-ai-draft-2026-06-05.json' }
];

targets.forEach(t => {
  if (!fs.existsSync(t.file)) {
    console.log(`${t.codeId}: file not found`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(t.file, 'utf8'));
  console.log(`${t.codeId}:`);
  console.log(`  - schemaVersion: ${data.schemaVersion}`);
  console.log(`  - sections: ${data.sections ? data.sections.length : 'none'}`);
  console.log(`  - has appendices: ${data.appendices !== undefined}`);
  if (data.appendices) {
    console.log(`  - appendices count: ${data.appendices.length}`);
    data.appendices.forEach(app => {
      console.log(`    - appendixId: ${app.appendixId}`);
      console.log(`    - label: ${app.label}`);
    });
  }
});
