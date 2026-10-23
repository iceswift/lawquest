const fs = require("fs");
const path = require("path");

const INPUT_DIR = path.resolve(__dirname, "../data/legal");
const V2_DIR = path.resolve(__dirname, "../data/legal-v2");
const STRUCTURES_DIR = path.join(V2_DIR, "structures");
const SECTIONS_DIR = path.join(V2_DIR, "sections");
const LEGAL_CODES_PATH = path.join(V2_DIR, "legal-codes.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rankOfLabel(label, fallbackKind) {
  if (!label) return 99;

  if (label.startsWith("ข้อความเบื้องต้น")) return 0;
  if (label.startsWith("บรรพ")) return 1;
  if (label.startsWith("ภาค")) return 1;
  if (label.startsWith("ลักษณะ")) return 2;
  if (label.startsWith("หมวด")) return 3;
  if (label.startsWith("ส่วน")) return 4;

  const fallbackRanks = {
    preliminary: 0,
    book: 1,
    part: 1,
    title: 2,
    chapter: 3,
    section: 4,
  };

  return fallbackRanks[fallbackKind] ?? 99;
}

function displayKindOf(label, fallbackKind) {
  if (!label) return fallbackKind;

  if (label.startsWith("ข้อความเบื้องต้น")) return "preliminary";
  if (label.startsWith("บรรพ")) return "book";
  if (label.startsWith("ภาค")) return "part";
  if (label.startsWith("ลักษณะ")) return "title";
  if (label.startsWith("หมวด")) return "chapter";
  if (label.startsWith("ส่วน")) return "section";

  return fallbackKind;
}

function buildStructureNodes(code) {
  const stack = [];

  return (code.structure || []).map((item, index) => {
    const rank = rankOfLabel(item.text, item.kind);

    while (stack.length > 0 && stack[stack.length - 1].rank >= rank) {
      stack.pop();
    }

    const parent =
      rank > 0 && stack[stack.length - 1]?.kind === "preliminary"
        ? null
        : stack[stack.length - 1] ?? null;
    const node = {
      id: item.id,
      codeId: code.codeId,
      kind: displayKindOf(item.text, item.kind),
      sourceKind: item.kind,
      rank,
      label: item.text,
      order: index + 1,
      parentId: parent?.id ?? null,
      path: parent ? [...parent.path, item.id] : [item.id],
      pathLabels: parent ? [...parent.pathLabels, item.text] : [item.text],
      sectionIds: [],
      sectionRange: null,
    };

    stack.push(node);
    return node;
  });
}

function hierarchyValues(section) {
  return Object.values(section.hierarchy || {})
    .filter(Boolean)
    .sort((a, b) => rankOfLabel(a) - rankOfLabel(b));
}

function nodeMatchesSection(node, sectionHierarchyValues) {
  if (node.pathLabels.length > sectionHierarchyValues.length) {
    return false;
  }

  return node.pathLabels.every((label, index) => label === sectionHierarchyValues[index]);
}

function assignSectionsToNodes(nodes, sections) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sectionStructurePaths = new Map();

  for (const section of sections) {
    const values = hierarchyValues(section);
    const matchedNodes = nodes.filter((node) => nodeMatchesSection(node, values));
    const pathIds = matchedNodes
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
      .map((node) => node.id);

    sectionStructurePaths.set(section.id, pathIds);

    for (const nodeId of pathIds) {
      nodeById.get(nodeId).sectionIds.push(section.id);
    }
  }

  for (const node of nodes) {
    if (node.sectionIds.length === 0) {
      continue;
    }

    const firstId = node.sectionIds[0];
    const lastId = node.sectionIds[node.sectionIds.length - 1];
    const firstSection = sections.find((section) => section.id === firstId);
    const lastSection = sections.find((section) => section.id === lastId);

    node.sectionRange = {
      fromSectionId: firstId,
      fromSectionNo: firstSection?.sectionNo ?? null,
      toSectionId: lastId,
      toSectionNo: lastSection?.sectionNo ?? null,
      sectionCount: node.sectionIds.length,
    };
  }

  return sectionStructurePaths;
}

function updateSectionsFile(code, sectionStructurePaths) {
  const sectionsPath = path.join(SECTIONS_DIR, `${code.codeId}.sections.json`);
  const sectionsFile = readJson(sectionsPath);

  sectionsFile.structurePathEnabled = true;
  sectionsFile.structurePathVersion = 1;
  sectionsFile.sections = sectionsFile.sections.map((section) => ({
    ...section,
    structurePath: sectionStructurePaths.get(section.id) ?? [],
  }));

  writeJson(sectionsPath, sectionsFile);
}

function exportStructureFile(code) {
  const nodes = buildStructureNodes(code);
  const sectionStructurePaths = assignSectionsToNodes(nodes, code.sections);

  const structureFile = {
    schemaVersion: 1,
    codeId: code.codeId,
    title: code.title,
    language: "th",
    source: code.source,
    generatedAt: new Date().toISOString(),
    levels: [
      { kind: "preliminary", labelTh: "ข้อความเบื้องต้น", rank: 0 },
      { kind: "book", labelTh: "บรรพ", rank: 1 },
      { kind: "part", labelTh: "ภาค", rank: 1 },
      { kind: "title", labelTh: "ลักษณะ", rank: 2 },
      { kind: "chapter", labelTh: "หมวด", rank: 3 },
      { kind: "section", labelTh: "ส่วน", rank: 4 },
    ],
    nodeCount: nodes.length,
    sectionCount: code.sections.length,
    nodes,
  };

  writeJson(path.join(STRUCTURES_DIR, `${code.codeId}.structure.json`), structureFile);
  updateSectionsFile(code, sectionStructurePaths);

  return {
    codeId: code.codeId,
    structurePath: `structures/${code.codeId}.structure.json`,
    nodeCount: nodes.length,
  };
}

function updateLegalCodes(structureRecords) {
  const legalCodes = readJson(LEGAL_CODES_PATH);
  const recordByCodeId = new Map(
    structureRecords.map((record) => [record.codeId, record])
  );

  legalCodes.codes = legalCodes.codes.map((code) => {
    const record = recordByCodeId.get(code.codeId);

    if (!record) {
      return code;
    }

    return {
      ...code,
      paths: {
        ...code.paths,
        structure: record.structurePath,
      },
      structureNodeCount: record.nodeCount,
    };
  });

  writeJson(LEGAL_CODES_PATH, legalCodes);
}

function main() {
  const structureRecords = fs
    .readdirSync(INPUT_DIR)
    .filter((fileName) => fileName.endsWith(".json") && !fileName.endsWith(".report.json"))
    .sort()
    .map((fileName) => exportStructureFile(readJson(path.join(INPUT_DIR, fileName))));

  updateLegalCodes(structureRecords);

  console.log(`Exported ${structureRecords.length} legal structure file(s).`);
}

main();
