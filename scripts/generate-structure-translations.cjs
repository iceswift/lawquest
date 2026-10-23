const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../data/legal-v2");
const STRUCTURES_DIR = path.join(ROOT_DIR, "structures");
const TRANSLATIONS_DIR = path.join(ROOT_DIR, "structure-translations");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const THAI_NUMERALS = {
  "๐": "0",
  "๑": "1",
  "๒": "2",
  "๓": "3",
  "๔": "4",
  "๕": "5",
  "๖": "6",
  "๗": "7",
  "๘": "8",
  "๙": "9",
};

function convertThaiNumerals(str) {
  return str.replace(/[๐-๙]/g, (match) => THAI_NUMERALS[match]);
}

const PREFIX_MAP = {
  บรรพ: "Book",
  ภาค: "Part",
  ลักษณะ: "Title",
  หมวด: "Chapter",
  ส่วนที่: "Part",
  ส่วน: "Part",
  ข้อความเบื้องต้น: "Preliminary",
};

// Very basic dictionary for common legal terms (just as a fallback/starting point)
const DICTIONARY = {
  "หลักทั่วไป": "General Principles",
  "บทเบ็ดเสร็จทั่วไป": "General Provisions",
  "บุคคล": "Persons",
  "บุคคลธรรมดา": "Natural Persons",
  "สภาพบุคคล": "Personality",
  "ความสามารถ": "Capacity",
  "ภูมิลำเนา": "Domicile",
  "สาบสูญ": "Disappearance",
  "นิติบุคคล": "Juristic Persons",
  "ทรัพย์": "Property",
  "ทรัพย์สิน": "Property",
  "นิติกรรม": "Juristic Acts",
  "สัญญา": "Contracts",
  "ระยะเวลา": "Periods of Time",
  "อายุความ": "Prescription",
  "หนี้": "Obligations",
  "ละเมิด": "Wrongful Acts",
  "จัดการงานนอกสั่ง": "Management of Affairs without Mandate",
  "ลาภมิควรได้": "Undue Enrichment",
  "ครอบครัว": "Family",
  "มรดก": "Succession",
};

function hasThaiText(value) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function createDraftEntry(thaiLabel) {
  // Remove footnotes like [2]
  let cleaned = thaiLabel.replace(/\[\d+\]/g, "").trim();

  // Try to match standard format: Prefix + Number + Name
  // e.g. บรรพ ๑ หลักทั่วไป
  const match = cleaned.match(/^([^\s]+)\s+([๐-๙]+)\s*(.*)$/);

  if (match) {
    const rawPrefix = match[1];
    const rawNum = match[2];
    const rawName = match[3];

    const enPrefix = PREFIX_MAP[rawPrefix] || rawPrefix;
    const enNum = convertThaiNumerals(rawNum);
    
    if (rawName) {
      const enName = DICTIONARY[rawName];
      return {
        label: enName ? `${enPrefix} ${enNum} ${enName}` : `${enPrefix} ${enNum}`,
        status: "needsReview",
        reviewNotes: enName
          ? []
          : [
              `Heading name "${rawName}" requires English review; generated label keeps the structural level and number only.`,
            ],
      };
    }
    return {
      label: `${enPrefix} ${enNum}`,
      status: "needsReview",
      reviewNotes: [],
    };
  }

  // Fallback for things without numbers like "ข้อความเบื้องต้น"
  if (PREFIX_MAP[cleaned]) {
    return {
      label: PREFIX_MAP[cleaned],
      status: "needsReview",
      reviewNotes: [],
    };
  }

  if (DICTIONARY[cleaned]) {
    return {
      label: DICTIONARY[cleaned],
      status: "needsReview",
      reviewNotes: [],
    };
  }

  return {
    label: "Heading",
    status: "needsReview",
    reviewNotes: [
      `Heading "${cleaned}" requires English review; generated label avoids mixing Thai text into English packages.`,
    ],
  };
}

function processStructureFiles() {
  if (!fs.existsSync(STRUCTURES_DIR)) return;

  const files = fs
    .readdirSync(STRUCTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".structure.json"));

  for (const file of files) {
    const filePath = path.join(STRUCTURES_DIR, file.name);
    const structure = readJson(filePath);
    
    if (!structure || !structure.codeId || !structure.nodes) continue;
    
    const codeId = structure.codeId;
    const lang = "en";
    const translationFilePath = path.join(TRANSLATIONS_DIR, codeId, `${lang}.json`);
    
    let existingTranslations = readJson(translationFilePath) || {};
    
    let generated = 0;
    let skipped = 0;
    
    for (const node of structure.nodes) {
      const existingEntry = existingTranslations[node.id];
      const existingLabel =
        typeof existingEntry === "string" ? existingEntry : existingEntry?.label;
      const isReviewed =
        typeof existingEntry === "object" &&
        existingEntry &&
        existingEntry.status &&
        existingEntry.status !== "needsReview";

      if (existingEntry && (!hasThaiText(existingLabel ?? "") || isReviewed)) {
        skipped++;
        continue;
      }
      
      existingTranslations[node.id] = createDraftEntry(node.label);
      generated++;
    }
    
    if (generated > 0) {
      writeJson(translationFilePath, existingTranslations);
    }
    
    console.log(`[${codeId}] Generated: ${generated} | Skipped: ${skipped} | Needs Review: ${generated}`);
  }
}

processStructureFiles();
