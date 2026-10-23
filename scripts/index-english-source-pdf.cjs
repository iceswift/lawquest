const fs = require("fs");
const path = require("path");

const DEFAULT_SOURCE_PATH =
  "D:/Learn/Expo/law_quest/reasearch/แปล/การจัดทำคำแปลกฎหมายของสำนักงานคณะกรรมการกฤษฎีกา.pdf";
const SOURCE_PATH = process.env.LAWQUEST_ENGLISH_SOURCE_PDF ?? DEFAULT_SOURCE_PATH;
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../data/legal-v2/english-translation-source-index.json"
);

function normalizeUrl(rawUrl) {
  return rawUrl
    .replace(/\\\)/g, ")")
    .replace(/\\\(/g, "(")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .trim();
}

function getHost(url) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "unknown";
  }
}

function getLinkKind(url) {
  const lowerUrl = url.toLowerCase();
  const host = getHost(url);

  if (host.includes("sharepoint.com")) {
    if (lowerUrl.includes("/:w:/")) {
      return "sharepoint_word_document";
    }

    if (lowerUrl.includes("/:b:/")) {
      return "sharepoint_pdf";
    }

    return "sharepoint_file";
  }

  if (host === "web.krisdika.go.th" && lowerUrl.endsWith(".pdf")) {
    return "legacy_krisdika_pdf";
  }

  if (host.endsWith("ocs.go.th") && lowerUrl.includes("searchlaw-law-eng")) {
    return "ocs_translation_search_page";
  }

  if (host.endsWith("ocs.go.th")) {
    return "ocs_page";
  }

  if (host.includes("drive.google.com")) {
    return "google_drive_folder";
  }

  if (url.startsWith("mailto:")) {
    return "email";
  }

  return "external_link";
}

function countBy(items, keySelector) {
  return items.reduce((counts, item) => {
    const key = keySelector(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

if (!fs.existsSync(SOURCE_PATH)) {
  throw new Error(`English source PDF not found: ${SOURCE_PATH}`);
}

const pdfStat = fs.statSync(SOURCE_PATH);
const pdfBytes = fs.readFileSync(SOURCE_PATH);
const pdfText = pdfBytes.toString("latin1");
const uriMatches = [...pdfText.matchAll(/\/URI\((.*?)\)/g)].map((match) =>
  normalizeUrl(match[1])
);
const pageCountMatch = pdfText.match(/\/Count\s+(\d+)/);
const pageCount = pageCountMatch ? Number(pageCountMatch[1]) : null;

const linkCounts = new Map();
for (const url of uriMatches) {
  linkCounts.set(url, (linkCounts.get(url) ?? 0) + 1);
}

const links = [...linkCounts.entries()]
  .map(([url, occurrences]) => ({
    url,
    host: getHost(url),
    kind: getLinkKind(url),
    occurrences,
  }))
  .sort((a, b) => a.kind.localeCompare(b.kind) || a.url.localeCompare(b.url));

const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceDocument: {
    title: "การจัดทำคำแปลกฎหมายของสำนักงานคณะกรรมการกฤษฎีกา",
    localPath: SOURCE_PATH.replace(/\\/g, "/"),
    fileSizeBytes: pdfStat.size,
    lastModifiedAt: pdfStat.mtime.toISOString(),
    pageCount,
    note:
      "The PDF text layer uses custom encoding, so this index extracts embedded links only. Use links as source-discovery evidence, not as imported legal text.",
  },
  officialEntryPoints: [
    {
      title: "OCS translation search",
      url: "https://www.ocs.go.th/searchlaw-law-eng",
    },
    {
      title: "OCS translation page embedded in the PDF",
      url: "https://ocs.go.th/council-of-state/#/static/page/simple/182/th.html",
    },
    {
      title: "Legacy Krisdika translation page",
      url: "https://krisdika.ocs.go.th/translations-of-law",
    },
  ],
  summary: {
    totalEmbeddedUris: uriMatches.length,
    uniqueLinks: links.length,
    byHost: countBy(links, (link) => link.host),
    byKind: countBy(links, (link) => link.kind),
  },
  links,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(
  `Indexed ${index.summary.uniqueLinks} unique link(s) from ${index.summary.totalEmbeddedUris} embedded URI(s).`
);
