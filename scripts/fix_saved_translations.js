const fs = require('fs');
const path = require('path');

const savedPath = path.join('d:', 'Project', 'LawQuest', 'app', '(tabs)', 'saved.tsx');
let content = fs.readFileSync(savedPath, 'utf8');

// 1. Fix bottomSheetPanel background to be glassmorphic
content = content.replace(
  `{ backgroundColor: colors.card, borderColor: colors.glassBorder },`,
  `{ backgroundColor: isDark ? "rgba(22, 25, 34, 0.75)" : "rgba(255, 255, 255, 0.85)", borderColor: colors.glassBorder },`
);

// 2. Translate "Filter Archives" and change font to bold (since regal doesn't support Thai well)
content = content.replace(
  `<Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.regal }]}>
                  Filter Archives
                </Text>`,
  `<Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                  ตัวกรองข้อมูล
                </Text>`
);

// 3. Translate "Reset All" and add a background highlight to the Reset button!
content = content.replace(
  `<TouchableOpacity activeOpacity={0.7} onPress={resetFilters}>
                    <Text style={[styles.resetTextInline, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                      Reset All
                    </Text>
                  </TouchableOpacity>`,
  `<TouchableOpacity activeOpacity={0.7} onPress={resetFilters} style={[styles.resetButtonInline, { backgroundColor: tintColor + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }]}>
                    <Text style={[styles.resetTextInline, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                      ล้างค่าทั้งหมด
                    </Text>
                  </TouchableOpacity>`
);

// 4. Translate Category titles
content = content.replace(`>COLLECTION<`, `>หมวดหมู่ (COLLECTION)<`);
content = content.replace(`>LEGAL STATUS<`, `>สถานะทางกฎหมาย (STATUS)<`);
content = content.replace(`>LANGUAGE<`, `>ภาษา (LANGUAGE)<`);
content = content.replace(`>LAW CODE<`, `>ประมวลกฎหมาย (LAW CODE)<`);

// 5. Translate Filter Options
content = content.replace(`label="All Saved"`, `label="บันทึกทั้งหมด"`);
content = content.replace(`label="Pinned Only"`, `label="ปักหมุดเท่านั้น"`);
content = content.replace(`label="All Status"`, `label="สถานะทั้งหมด"`);
content = content.replace(`label="Authoritative"`, `label="ข้อมูลอ้างอิงหลัก"`);
content = content.replace(`label="Needs Review"`, `label="รอตรวจสอบ"`);
content = content.replace(`label="English Reference"`, `label="อ้างอิงภาษาอังกฤษ"`);
content = content.replace(`label="All Languages"`, `label="ทุกภาษา"`);
content = content.replace(`label="All Codes"`, `label="ทุกประมวลกฎหมาย"`);

// 6. Fix FilterOption Highlight "Button Box" Colors 
const oldFilterOptionColor = `backgroundColor: active ? tintColor + "1A" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderColor: active ? tintColor + "60" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",`;

const newFilterOptionColor = `backgroundColor: active ? tintColor + "25" : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          borderColor: active ? tintColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",`;

content = content.replace(oldFilterOptionColor, newFilterOptionColor);

fs.writeFileSync(savedPath, content, 'utf8');
console.log("Successfully fixed translations and highlight colors in saved.tsx");
