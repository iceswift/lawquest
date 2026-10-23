const fs = require('fs');
const path = require('path');

const codes = [
  'thai-criminal-code',
  'thai-revenue-code',
  'thai-civil-procedure-code',
  'thai-civil-commercial-code'
];

codes.forEach(codeId => {
  const thV2Path = `D:/Project/LawQuest/data/legal-v2/texts/${codeId}/th/th-ocs-2026-04-28.json`;
  const thV3Path = `D:/Project/LawQuest/data/legal-v3/texts/${codeId}/th/th-ocs-2026-06-06.json`;
  
  if (!fs.existsSync(thV2Path) || !fs.existsSync(thV3Path)) {
    console.log(`${codeId}: files not found`);
    return;
  }
  
  const v2 = JSON.parse(fs.readFileSync(thV2Path, 'utf8'));
  const v3 = JSON.parse(fs.readFileSync(thV3Path, 'utf8'));
  
  console.log(`\n========================================`);
  console.log(`${codeId}: V2: ${v2.sections.length} secs, V3: ${v3.sections.length} secs`);
  
  const v2Map = new Map(v2.sections.map(s => [s.sectionId.replace(/-quad$/, '-quater').replace(/-quin$/, '-quinquies').replace(/-hex$/, '-sexies').replace(/-sept$/, '-septies').replace(/-oct$/, '-octies'), s]));
  
  let newSections = 0;
  let diffSections = 0;
  
  for (const s3 of v3.sections) {
    const s2 = v2Map.get(s3.sectionId);
    if (!s2) {
      console.log(`  [NEW] ${s3.sectionId} (${s3.sectionLabel})`);
      newSections++;
      continue;
    }
    
    // Clean and normalize
    let cleanV2 = s2.text.replace(/^มาตรา\s+[๐-๙\w\/]+(\s+(ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ))?/, '').trim();
    cleanV2 = cleanV2.replace(/^\[\d+\]/, '').trim();
    
    let cleanV3 = s3.text.replace(/^มาตรา\s+[๐-๙\w\/]+(\s+(ทวิ|ตรี|จัตวา|เบญจ|ฉ|สัตต|อัฏฐ|อัฎฐ|นว|ทศ))?/, '').trim();
    cleanV3 = cleanV3.replace(/^\[\d+\]/, '').trim();
    
    const normV2 = cleanV2.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
    const normV3 = cleanV3.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
    
    if (normV2 !== normV3) {
      console.log(`  [DIFF] ${s3.sectionId} (${s3.sectionLabel})`);
      console.log(`    V2: ${normV2.substring(0, 100)}`);
      console.log(`    V3: ${normV3.substring(0, 100)}`);
      diffSections++;
    }
  }
  
  console.log(`Summary for ${codeId}: New: ${newSections}, Diff: ${diffSections}`);
});
