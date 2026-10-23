const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/th/th-ocs-2026-04-28.json');
const targetFile = path.resolve(__dirname, 'batch3_th.json');

const data = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
const batch3 = data.sections.slice(200, 300);

fs.writeFileSync(targetFile, JSON.stringify(batch3, null, 2));
console.log('Extracted', batch3.length, 'sections.');
