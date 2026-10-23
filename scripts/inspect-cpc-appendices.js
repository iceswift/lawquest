const fs = require('fs');

const file = 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/th/th-ocs-2026-06-06.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.appendices.forEach(app => {
  console.log(`Appendix ID: ${app.appendixId}`);
  console.log(`Label: ${app.label}`);
  console.log(`Text preview (first 300 chars):`);
  console.log(app.text.substring(0, 300));
  console.log('---');
});
