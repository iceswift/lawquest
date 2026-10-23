const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../data/legal-v2");
const LEGAL_CODES_PATH = path.join(ROOT_DIR, "legal-codes.json");
const WORKFLOW_PATH = path.join(ROOT_DIR, "translation-workflow.json");
const SOURCES_PATH = path.join(ROOT_DIR, "english-translation-sources.json");

const checkedAt = new Date().toISOString();

const sourceCandidates = {
  "thai-civil-commercial-code": {
    status: "candidate_found",
    nextAction:
      "Verify against an official OCS-hosted source before importing the English text.",
    candidateSources: [
      {
        title: "Civil and Commercial Code, WIPO Global IP DB mirror",
        url: "https://www.globalipdb.inpit.go.jp/jpowp/wp-content/uploads/2013/09/TH035EN.pdf",
        sourceType: "ocs_contracted_external_mirror",
        language: "en",
        reliability: "candidate",
        note:
          "Search metadata says this was translated under contract for the Office of the Council of State Law for ASEAN project, but the file is hosted on an external mirror.",
      },
    ],
  },
  "thai-civil-procedure-code": {
    status: "candidate_found",
    nextAction:
      "Verify against an official OCS-hosted source before importing the English text.",
    candidateSources: [
      {
        title: "Civil Procedure Code, WIPO Global IP DB mirror",
        url: "https://www.globalipdb.inpit.go.jp/jpowp/wp-content/uploads/2013/09/TH032EN.pdf",
        sourceType: "ocs_contracted_external_mirror",
        language: "en",
        reliability: "candidate",
        note:
          "Search metadata says this was translated under contract for the Office of the Council of State Law for ASEAN project, but the file is hosted on an external mirror.",
      },
    ],
  },
  "thai-criminal-code": {
    status: "candidate_found",
    nextAction:
      "Find an official OCS-hosted copy or another government-hosted copy before importing.",
    candidateSources: [
      {
        title: "Criminal Code, AnyFlip mirror",
        url: "https://online.anyflip.com/zhvkw/mney/mobile/index.html",
        sourceType: "ocs_contracted_external_mirror",
        language: "en",
        reliability: "candidate",
        note:
          "Search metadata says this was translated under contract for the Office of the Council of State Law for ASEAN project, but AnyFlip is only a mirror and should not be treated as the authoritative host.",
      },
    ],
  },
  "thai-land-code": {
    status: "candidate_found",
    nextAction:
      "Verify the source chain and publication date before importing the English text.",
    candidateSources: [
      {
        title: "Land Code, MAFF Japan hosted PDF",
        url: "https://www.maff.go.jp/j/kokusai/kokkyo/yosan/pdf/h21_kaigai_06.pdf",
        sourceType: "government_mirror",
        language: "en",
        reliability: "candidate",
        note:
          "Search metadata references an older Krisdika/OCS outsite data path, but the available file is hosted by another government domain.",
      },
    ],
  },
  "thai-narcotics-code": {
    status: "candidate_found",
    nextAction:
      "Treat as a competent-authority reference only; verify whether OCS has a separate translation.",
    candidateSources: [
      {
        title: "Narcotics Code, ONCB unofficial translation mirror",
        url: "https://online.anyflip.com/kqjot/igfi/mobile/index.html",
        sourceType: "competent_authority_unofficial",
        language: "en",
        reliability: "reference_only",
        note:
          "Search metadata says this is an unofficial translation by the Office of the Narcotics Control Board for information only.",
      },
    ],
  },
  "thai-revenue-code": {
    status: "candidate_found",
    nextAction:
      "Verify whether this NACC-hosted PDF is current enough and whether OCS has a newer host.",
    candidateSources: [
      {
        title: "Revenue Code, NACC hosted PDF",
        url: "https://www.nacc.go.th/files/article/attachments/269898a98c1539537ae1b44eef28db9cdb66656.pdf",
        sourceType: "government_mirror",
        language: "en",
        reliability: "candidate",
        note:
          "Search metadata indicates an Office of the Council of State translation notice, but the hosted copy is from NACC.",
      },
    ],
  },
};

const defaultMissing = {
  status: "not_found",
  nextAction:
    "No credible English translation candidate found yet. Continue official-source search before creating an AI-assisted draft.",
  candidateSources: [],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const legalCodes = readJson(LEGAL_CODES_PATH);
const workflow = readJson(WORKFLOW_PATH);

const sourceRows = legalCodes.codes.map((code) => {
  const candidate = sourceCandidates[code.codeId] ?? defaultMissing;

  return {
    codeId: code.codeId,
    title: code.title,
    language: "en",
    basedOnVersionId: code.currentVersions.th,
    status: candidate.status,
    checkedAt,
    nextAction: candidate.nextAction,
    candidateSources: candidate.candidateSources.map((source) => ({
      ...source,
      checkedAt,
    })),
  };
});

const sourcesDocument = {
  schemaVersion: 1,
  checkedAt,
  policy: {
    authoritativeRule:
      "Thai text remains authoritative. English candidates must be linked to the Thai version they translate.",
    ingestionRule:
      "Do not import candidate text until source status, date, and license/usage notes are reviewed.",
    sourcePriority: [
      "official_ocs_hosted",
      "government_mirror",
      "competent_authority_unofficial",
      "external_mirror",
      "ai_assisted_draft",
    ],
  },
  summary: {
    totalCodes: sourceRows.length,
    candidateFound: sourceRows.filter((row) => row.status === "candidate_found")
      .length,
    notFound: sourceRows.filter((row) => row.status === "not_found").length,
  },
  sources: sourceRows,
};

const sourceByCodeId = new Map(sourceRows.map((row) => [row.codeId, row]));
const updatedWorkflow = {
  ...workflow,
  checkedAt,
  queue: workflow.queue.map((item) => {
    const row = sourceByCodeId.get(item.codeId);

    if (!row) {
      return item;
    }

    return {
      ...item,
      status: row.status,
      checkedAt: row.checkedAt,
      nextAction: row.nextAction,
      candidateSourceCount: row.candidateSources.length,
      candidateSources: row.candidateSources,
    };
  }),
};

writeJson(SOURCES_PATH, sourcesDocument);
writeJson(WORKFLOW_PATH, updatedWorkflow);

console.log(
  `Updated English translation source tracking: ${sourcesDocument.summary.candidateFound} candidate(s), ${sourcesDocument.summary.notFound} not found.`
);
