const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/th/th-ocs-2026-04-28.json');
const targetFile = path.resolve(__dirname, 'batch5_th.json');

const data = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
const batch5 = data.sections.slice(400);

fs.writeFileSync(targetFile, JSON.stringify(batch5, null, 2));
console.log('Extracted', batch5.length, 'sections.');
