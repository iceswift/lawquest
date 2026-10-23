const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const dataset = process.env.LAWQUEST_LEGAL_DATASET ?? getArgValue("--dataset") ?? "legal-v2";
const PACKAGES_DIR = path.join(ROOT_DIR, "data", dataset, "packages");
const MANIFEST_PATH = path.join(PACKAGES_DIR, "manifest.json");
const MANIFEST_GZIP_PATH = path.join(PACKAGES_DIR, "manifest.json.gz");
const OBJECTS_DIR = path.join(PACKAGES_DIR, "objects");
const DEFAULT_WORKER_URL = "https://lawquest-content-api.contacticev1.workers.dev";
const DEFAULT_R2_BUCKET = "lawquest-legal-packages";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipBuild = args.has("--skip-build");
const skipValidate = args.has("--skip-validate");
const skipUpload = args.has("--skip-upload") || dryRun;
const skipRemoteVerify = args.has("--skip-remote-verify") || dryRun;
const workerUrl = getArgValue("--worker-url") ?? process.env.LAWQUEST_PACKAGE_BASE_URL ?? DEFAULT_WORKER_URL;
const bucket = getArgValue("--bucket") ?? process.env.LAWQUEST_R2_BUCKET ?? DEFAULT_R2_BUCKET;

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  console.log(`LawQuest legal package release ${dryRun ? "(dry-run)" : ""}`);
  console.log(`Worker URL: ${workerUrl}`);
  console.log(`R2 bucket: ${bucket}`);
  console.log(`Dataset: ${dataset}`);

  if (!skipValidate) {
    run("npm.cmd", ["run", "validate:legal-translations"]);
  }

  if (!skipBuild) {
    run("npm.cmd", ["run", "build:legal-packages"], {
      env: {
        ...process.env,
        LAWQUEST_LEGAL_DATASET: dataset,
        LAWQUEST_PACKAGE_BASE_URL: workerUrl,
      },
    });
  }

  const manifest = readJson(MANIFEST_PATH);
  const uploadPlan = verifyPackages(manifest);
  printSummary(manifest, uploadPlan);

  if (skipUpload) {
    console.log("\nUpload skipped.");
  } else {
    uploadObjects(uploadPlan);
  }

  if (skipRemoteVerify) {
    console.log("Remote verification skipped.");
  } else {
    await verifyRemote(manifest);
  }

  console.log(`\nLegal package release ${dryRun ? "dry-run " : ""}completed.`);
}

function verifyPackages(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("manifest.json is not a JSON object.");
  }

  if (!Array.isArray(manifest.codes)) {
    throw new Error("manifest.json does not contain codes[].");
  }

  if (!fs.existsSync(MANIFEST_GZIP_PATH)) {
    throw new Error("manifest.json.gz is missing.");
  }

  const uploadPlan = [
    { key: "manifest.json", filePath: MANIFEST_PATH },
    { key: "manifest.json.gz", filePath: MANIFEST_GZIP_PATH },
  ];
  const seenPackageIds = new Set();
  let manifestPackageCount = 0;

  for (const code of manifest.codes) {
    if (!code.codeId || !code.languages) {
      throw new Error(`Invalid code entry in manifest: ${JSON.stringify(code)}`);
    }

    for (const [language, entry] of Object.entries(code.languages)) {
      const currentVersion = entry.versions?.find(
        (version) => version.versionId === entry.currentVersionId
      );

      if (!currentVersion) {
        throw new Error(`${code.codeId}:${language} is missing current version ${entry.currentVersionId}.`);
      }

      for (const version of entry.versions ?? []) {
        manifestPackageCount += 1;

        if (seenPackageIds.has(version.packageId)) {
          throw new Error(`Duplicate packageId: ${version.packageId}`);
        }

        seenPackageIds.add(version.packageId);
        verifyPackageFile(version, "json", version.download.contentSha256, version.download.uncompressedSizeBytes);
        verifyPackageFile(version, "gzip", version.download.sha256, version.download.sizeBytes);

        uploadPlan.push({
          key: version.paths.json,
          filePath: path.join(PACKAGES_DIR, version.paths.json),
        });
        uploadPlan.push({
          key: version.paths.gzip,
          filePath: path.join(PACKAGES_DIR, version.paths.gzip),
        });
      }
    }
  }

  if (manifest.summary?.packageCount && manifest.summary.packageCount !== manifestPackageCount) {
    throw new Error(
      `Manifest packageCount mismatch: summary=${manifest.summary.packageCount}, actual=${manifestPackageCount}`
    );
  }

  if (!fs.existsSync(OBJECTS_DIR)) {
    throw new Error("objects directory is missing.");
  }

  return uploadPlan;
}

function verifyPackageFile(version, kind, expectedSha256, expectedSize) {
  const relativePath = version.paths?.[kind];
  const filePath = relativePath ? path.join(PACKAGES_DIR, relativePath) : null;

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${version.packageId} is missing ${kind} file.`);
  }

  const buffer = fs.readFileSync(filePath);

  if (buffer.length !== expectedSize) {
    throw new Error(
      `${version.packageId} ${kind} size mismatch: expected ${expectedSize}, got ${buffer.length}`
    );
  }

  const actualSha256 = sha256(buffer);

  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${version.packageId} ${kind} sha256 mismatch: expected ${expectedSha256}, got ${actualSha256}`
    );
  }
}

function uploadObjects(uploadPlan) {
  console.log(`\nUploading ${uploadPlan.length} objects to R2...`);

  for (const item of uploadPlan) {
    console.log(`- ${item.key}`);
    run("npx.cmd", ["wrangler", "r2", "object", "put", `${bucket}/${item.key}`, "--file", item.filePath, "--remote"], {
      cwd: ROOT_DIR,
    });
  }
}

async function verifyRemote(manifest) {
  console.log("\nVerifying Worker endpoints...");
  const manifestResponse = await fetch(`${workerUrl.replace(/\/$/, "")}/manifest`, { method: "GET" });

  if (!manifestResponse.ok) {
    throw new Error(`/manifest returned ${manifestResponse.status}`);
  }

  const remoteManifest = await manifestResponse.json();

  if (remoteManifest.summary?.packageCount !== manifest.summary?.packageCount) {
    throw new Error(
      `/manifest packageCount mismatch: expected ${manifest.summary?.packageCount}, got ${remoteManifest.summary?.packageCount}`
    );
  }

  const samplePackage = firstCurrentPackage(manifest);

  if (!samplePackage) {
    throw new Error("No package found for remote package verification.");
  }

  const sampleResponse = await fetch(samplePackage.download.url, { method: "HEAD" });

  if (!sampleResponse.ok) {
    throw new Error(`Sample package HEAD returned ${sampleResponse.status}: ${samplePackage.download.url}`);
  }

  const contentLength = Number(sampleResponse.headers.get("content-length"));

  if (contentLength !== samplePackage.download.sizeBytes) {
    throw new Error(
      `Sample package content-length mismatch: expected ${samplePackage.download.sizeBytes}, got ${contentLength}`
    );
  }

  console.log(`- /manifest OK (${remoteManifest.summary?.packageCount ?? "unknown"} packages)`);
  console.log(`- sample package OK (${samplePackage.packageId})`);
}

function firstCurrentPackage(manifest) {
  for (const code of manifest.codes) {
    for (const entry of Object.values(code.languages)) {
      const current = entry.versions.find((version) => version.versionId === entry.currentVersionId);

      if (current) {
        return current;
      }
    }
  }

  return null;
}

function printSummary(manifest, uploadPlan) {
  const totalBytes = uploadPlan.reduce((total, item) => total + fs.statSync(item.filePath).size, 0);

  console.log("\nPackage verification passed.");
  console.log(`- codes: ${manifest.codes.length}`);
  console.log(`- packages: ${manifest.summary?.packageCount ?? "unknown"}`);
  console.log(`- upload objects: ${uploadPlan.length}`);
  console.log(`- upload bytes: ${formatBytes(totalBytes)}`);

  if (dryRun) {
    console.log("\nDry-run upload plan:");
    for (const item of uploadPlan) {
      console.log(`- ${item.key} (${formatBytes(fs.statSync(item.filePath).size)})`);
    }
  }
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? ROOT_DIR,
    env: options.env ?? process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}
