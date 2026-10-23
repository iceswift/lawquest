const fs = require('fs');
const path = require('path');

const thFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/th/th-ocs-2026-04-28.json');
const enFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/en/en-ai-draft-2026-04-29.json');
const outFile = path.resolve(__dirname, 'batch4_comparison.txt');

const th = JSON.parse(fs.readFileSync(thFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

let out = '';
for (let i = 300; i < 400; i++) {
  out += `--- INDEX ${i} | ${th.sections[i].sectionId} | NO: ${th.sections[i].sectionNo}\n`;
  out += `[TH]: ${th.sections[i].text}\n`;
  out += `[EN]: ${en.sections[i].text}\n\n`;
}

fs.writeFileSync(outFile, out, 'utf8');
console.log('Created comparison file.');
