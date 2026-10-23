import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { gunzipSync, strFromU8 } from "fflate";

import manifest from "@/data/legal-v3/packages/manifest.json";

const INSTALLED_PACKAGES_KEY = "lawquest.installedLegalPackages.v1";
const PENDING_PACKAGE_CLEANUP_KEY = "lawquest.pendingPackageCleanup.v1";
const PACKAGE_MANIFEST_CACHE_KEY = "lawquest.packageManifestCache.v1";
const REMOTE_MANIFEST_URL =
  "https://lawquest-content-api.contacticev1.workers.dev/manifest";

export type PackageLanguage = "th" | "en" | string;

export interface PackageVersion {
  packageId: string;
  language: PackageLanguage;
  versionId: string;
  basedOnVersionId: string | null;
  sourceType?: string | null;
  authoritative?: boolean;
  translationStatus?: string | null;
  reviewStatus?: string | null;
  sectionCount: number;
  paragraphCount?: number;
  chunkCount?: number;
  download: {
    sizeBytes: number;
    uncompressedSizeBytes: number;
    sha256: string;
    contentSha256: string;
    url: string;
  };
  paths: {
    json: string;
    gzip: string;
    readerChunks?: string[];
    readerIndex?: string;
  };
}

export interface ManifestCode {
  codeId: string;
  title: string;
  defaultLanguage: string;
  languages: Record<
    string,
    {
      currentVersionId: string;
      versions: PackageVersion[];
    }
  >;
  packageCount: number;
}

export interface PackageManifest {
  schemaVersion: number;
  generatedAt?: string;
  baseUrl?: string;
  codes: ManifestCode[];
}

interface PackageManifestCache {
  manifest: PackageManifest;
  syncedAt: string;
}

export interface InstalledPackageRecord {
  codeId: string;
  installedAt: string;
  packages: Record<
    string,
    {
      packageId: string;
      versionId: string;
      sha256: string;
      contentSha256?: string;
      sizeBytes: number;
      sourceUrl: string;
      localUri: string | null;
      cacheStatus: "downloaded" | "manifest_only";
      storageFormat?: "json" | "gzip";
      checksumStatus: "verified" | "size_verified" | "skipped_local_manifest";
    }
  >;
}

export type InstalledPackageRegistry = Record<string, InstalledPackageRecord>;

export type InstallProgressCallback = (progress: {
  codeId: string;
  bytesWritten: number;
  totalBytes: number;
  progress: number;
}) => void;

export type PackageCacheRepairResult = {
  codeId?: string;
  rebuiltReaderSidecars: Array<{
    codeId: string;
    language: string;
  }>;
  removedCodes: string[];
  removedLanguages: Array<{
    codeId: string;
    language: string;
    reason: string;
  }>;
  repaired: boolean;
};

export type PackageStorageCleanupResult = {
  deleted: number;
  remaining: number;
};

type PendingPackageCleanupRecord = {
  codeId: string;
  id: string;
  language: string;
  localUri: string;
  packageId: string;
  queuedAt: string;
  versionId: string;
};

let activePackageManifest = manifest as unknown as PackageManifest;
const MAX_READER_PACKAGE_CACHE_ENTRIES = 3;
let packageMutationQueue: Promise<void> = Promise.resolve();
const readerPackageCache = new Map<string, LegalPackageDocument>();
const readerPackagePreloadPromises = new Map<
  string,
  Promise<LegalPackageDocument | null>
>();
const readerPackageSidecarCache = new Map<string, LegalPackageDocument>();

export interface LegalPackageDocument {
  schemaVersion: number;
  packageId: string;
  code: {
    codeId: string;
    title: string;
  };
  language: string;
  version: {
    versionId: string;
    basedOnVersionId: string | null;
    sourceType?: string | null;
    authoritative?: boolean;
    translationStatus?: string | null;
    reviewStatus: string | null;
    disclaimer: string | null;
  };
  structure?: {
    schemaVersion?: number;
    levels?: Array<{
      kind: string;
      labelTh: string;
      rank: number;
    }>;
    nodeCount?: number;
    nodes?: Array<{
      id: string;
      kind: string;
      rank: number;
      label: string;
      labels?: Record<string, string>;
      parentId: string | null;
      path: string[];
      pathLabels: string[];
      sectionIds: string[];
      sectionRange?: {
        fromSectionNo: string;
        toSectionNo: string;
        sectionCount: number;
      };
    }>;
  };
  sectionMetadata?: {
    structurePathEnabled: boolean;
    structurePathVersion: number | null;
    sections: Array<{
      id: string;
      sectionNo: string;
      heading?: string;
      structurePath?: string[];
    }>;
  };
  sectionCount: number;
  paragraphCount?: number;
  sections: Array<{
    sectionId: string;
    sectionNo: string;
    sectionLabel?: string;
    headingFootnoteRefs?: string[];
    text: string;
    bodyFootnoteRefs?: string[];
    status?: string;
    paragraphIds?: string[];
    needsReview?: boolean;
    reviewNotes?: string[];
  }>;
  appendices?: Array<{
    appendixId: string;
    label: string;
    headingFootnoteRefs?: string[];
    text: string;
    bodyFootnoteRefs?: string[];
    translationStatus?: string;
    reviewStatus?: string;
    needsReview?: boolean;
    reviewNotes?: string[];
  }>;
  paragraphs?: Array<{
    paragraphId: string;
    codeId: string;
    versionId: string;
    sectionId: string;
    sectionNo: string;
    paragraphIndex: number;
    text: string;
    charStartInSection: number;
    charEndInSection: number;
  }>;
  chunking?: {
    schemaVersion: number;
    strategy: string;
    chunkSizeSections: number;
    chunkCount: number;
    chunks: Array<{
      chunkId: string;
      chunkIndex: number;
      sectionIds: string[];
      paragraphIds: string[];
      fromSectionId: string | null;
      fromSectionNo: string | null;
      toSectionId: string | null;
      toSectionNo: string | null;
    }>;
  };
}

type ReaderPackageIndexDocument = {
  schemaVersion: number;
  packageId: string;
  packageSchemaVersion: number;
  packageType: "legal-reader-index";
  code: LegalPackageDocument["code"];
  language: string;
  version: LegalPackageDocument["version"];
  structure?: LegalPackageDocument["structure"];
  sectionMetadata?: LegalPackageDocument["sectionMetadata"];
  appendices?: LegalPackageDocument["appendices"];
  sectionCount: number;
  paragraphCount?: number;
  chunking: {
    schemaVersion: number;
    strategy: string;
    chunkSizeSections: number;
    chunkCount: number;
    chunks: Array<{
      chunkId: string;
      chunkIndex: number;
      fromSectionId: string | null;
      fromSectionNo: string | null;
      path: string;
      sectionIds: string[];
      sha256: string;
      sizeBytes: number;
      toSectionId: string | null;
      toSectionNo: string | null;
    }>;
  };
  sections: Array<{
    sectionId: string;
    sectionNo: string;
    sectionLabel?: string;
    headingFootnoteRefs?: string[];
    bodyFootnoteRefs?: string[];
    status?: string;
    paragraphIds: string[];
    needsReview: boolean;
    reviewNotes: string[];
  }>;
};

type ReaderPackageChunkDocument = {
  schemaVersion: number;
  packageId: string;
  packageType: "legal-reader-chunk";
  codeId: string;
  language: string;
  versionId: string;
  chunkId: string;
  chunkIndex: number;
  sectionIds: string[];
  paragraphIds: string[];
  fromSectionId: string | null;
  fromSectionNo: string | null;
  toSectionId: string | null;
  toSectionNo: string | null;
  sections: LegalPackageDocument["sections"];
  paragraphs?: NonNullable<LegalPackageDocument["paragraphs"]>;
};

export function getPackageManifest() {
  return activePackageManifest;
}

export function getManifestCode(codeId: string): ManifestCode | null {
  return (
    getPackageManifest().codes.find((code) => code.codeId === codeId) ?? null
  );
}

export async function loadCachedPackageManifest(): Promise<PackageManifest> {
  const raw = await AsyncStorage.getItem(PACKAGE_MANIFEST_CACHE_KEY);

  if (!raw) {
    activePackageManifest = manifest as unknown as PackageManifest;
    return activePackageManifest;
  }

  try {
    const cache = JSON.parse(raw) as PackageManifestCache;
    activePackageManifest = validatePackageManifest(cache.manifest);
    return activePackageManifest;
  } catch {
    activePackageManifest = manifest as unknown as PackageManifest;
    return activePackageManifest;
  }
}

export async function syncPackageManifest(): Promise<PackageManifest> {
  const response = await fetch(REMOTE_MANIFEST_URL, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Manifest sync failed: ${response.status}`);
  }

  const remoteManifest = validatePackageManifest(await response.json());
  activePackageManifest = remoteManifest;

  await AsyncStorage.setItem(
    PACKAGE_MANIFEST_CACHE_KEY,
    JSON.stringify({
      manifest: remoteManifest,
      syncedAt: new Date().toISOString(),
    } satisfies PackageManifestCache),
  );

  return remoteManifest;
}

export async function refreshPackageManifest(): Promise<PackageManifest> {
  await loadCachedPackageManifest();

  try {
    return await syncPackageManifest();
  } catch (error) {
    console.warn("Using cached or bundled package manifest", error);
    return activePackageManifest;
  }
}

export function getCurrentLanguagePackages(
  code: ManifestCode,
  languages?: string[],
) {
  const languageSet = languages ? new Set(languages) : null;

  return Object.entries(code.languages)
    .filter(([language]) => !languageSet || languageSet.has(language))
    .map(([language, languageEntry]) => {
      const current =
        languageEntry.versions.find(
          (version) => version.versionId === languageEntry.currentVersionId,
        ) ?? languageEntry.versions[0];

      return current ? ([language, current] as const) : null;
    })
    .filter(
      (entry): entry is readonly [string, PackageVersion] => entry !== null,
    );
}

export async function getInstalledPackageRegistry(): Promise<InstalledPackageRegistry> {
  const raw = await AsyncStorage.getItem(INSTALLED_PACKAGES_KEY);

  if (!raw) {
    return {};
  }

  try {
    const registry = normalizeInstalledPackageRegistry(
      JSON.parse(raw) as InstalledPackageRegistry,
    );
    await persistNormalizedPackageRegistryIfNeeded(raw, registry);
    return registry;
  } catch {
    return {};
  }
}

function normalizeInstalledPackageRegistry(
  value: InstalledPackageRegistry,
): InstalledPackageRegistry {
  if (!value || typeof value !== "object") {
    return {};
  }

  const registry: InstalledPackageRegistry = {};

  Object.entries(value).forEach(([codeId, record]) => {
    if (!record || typeof record !== "object") {
      return;
    }

    const packages = Object.entries(record.packages ?? {}).reduce<
      InstalledPackageRecord["packages"]
    >((nextPackages, [language, packageRecord]) => {
      if (!packageRecord || typeof packageRecord !== "object") {
        return nextPackages;
      }

      const localUri =
        typeof packageRecord.localUri === "string"
          ? packageRecord.localUri
          : null;
      const storageFormat =
        packageRecord.storageFormat === "json" ||
        packageRecord.storageFormat === "gzip"
          ? packageRecord.storageFormat
          : inferPackageStorageFormat(localUri);
      const cacheStatus =
        packageRecord.cacheStatus === "manifest_only" || !localUri
          ? "manifest_only"
          : "downloaded";

      nextPackages[language] = {
        packageId: String(packageRecord.packageId ?? ""),
        versionId: String(packageRecord.versionId ?? ""),
        sha256: String(packageRecord.sha256 ?? ""),
        ...(packageRecord.contentSha256
          ? { contentSha256: String(packageRecord.contentSha256) }
          : {}),
        sizeBytes:
          typeof packageRecord.sizeBytes === "number"
            ? packageRecord.sizeBytes
            : 0,
        sourceUrl: String(packageRecord.sourceUrl ?? ""),
        localUri,
        cacheStatus,
        storageFormat,
        checksumStatus: normalizeChecksumStatus(
          packageRecord.checksumStatus,
          cacheStatus,
        ),
      };

      return nextPackages;
    }, {});

    if (Object.keys(packages).length === 0) {
      return;
    }

    registry[codeId] = {
      codeId: record.codeId || codeId,
      installedAt:
        typeof record.installedAt === "string"
          ? record.installedAt
          : new Date().toISOString(),
      packages,
    };
  });

  return registry;
}

async function persistNormalizedPackageRegistryIfNeeded(
  raw: string,
  registry: InstalledPackageRegistry,
) {
  const normalizedRaw = JSON.stringify(registry);

  if (normalizedRaw !== raw) {
    await AsyncStorage.setItem(INSTALLED_PACKAGES_KEY, normalizedRaw);
  }
}

function inferPackageStorageFormat(localUri: string | null): "json" | "gzip" {
  if (localUri?.toLowerCase().endsWith(".json")) {
    return "json";
  }

  return "gzip";
}

function normalizeChecksumStatus(
  value: unknown,
  cacheStatus: "downloaded" | "manifest_only",
): InstalledPackageRecord["packages"][string]["checksumStatus"] {
  if (
    value === "verified" ||
    value === "size_verified" ||
    value === "skipped_local_manifest"
  ) {
    return value;
  }

  return cacheStatus === "manifest_only" ? "skipped_local_manifest" : "verified";
}

export async function installCodePackages(
  codeId: string,
  languages?: string[],
  onProgress?: InstallProgressCallback,
) {
  return enqueuePackageMutation(() =>
    installCodePackagesNow(codeId, languages, onProgress),
  );
}

async function installCodePackagesNow(
  codeId: string,
  languages?: string[],
  onProgress?: InstallProgressCallback,
) {
  const code = getManifestCode(codeId);

  if (!code) {
    throw new Error(`Legal code not found in manifest: ${codeId}`);
  }

  const registry = await getInstalledPackageRegistry();
  const packageEntries = getCurrentLanguagePackages(code, languages);
  const totalBytes = packageEntries.reduce(
    (total, [, packageVersion]) => total + packageVersion.download.sizeBytes,
    0,
  );
  const installedEntries: Array<
    readonly [string, InstalledPackageRecord["packages"][string]]
  > = [];
  let completedBytes = 0;

  for (const [language, packageVersion] of packageEntries) {
    const previousRecord = registry[codeId]?.packages[language];
    const record = await cachePackageFileWithRetry(
      codeId,
      packageVersion,
      (packageBytesWritten) => {
        const bytesWritten = completedBytes + packageBytesWritten;

        onProgress?.({
          codeId,
          bytesWritten,
          totalBytes,
          progress: totalBytes > 0 ? bytesWritten / totalBytes : 0,
        });
      },
    );

    try {
      await deletePackageFile(previousRecord, record.localUri);
    } catch (error) {
      console.warn("Failed to clean previous legal package file", error);
    }
    installedEntries.push([language, record] as const);
    completedBytes += packageVersion.download.sizeBytes;
  }

  const packages = {
    ...(registry[codeId]?.packages ?? {}),
    ...Object.fromEntries(installedEntries),
  };

  registry[codeId] = {
    codeId,
    installedAt: new Date().toISOString(),
    packages,
  };

  clearReaderPackageCache(codeId);
  await AsyncStorage.setItem(INSTALLED_PACKAGES_KEY, JSON.stringify(registry));
  onProgress?.({
    codeId,
    bytesWritten: totalBytes,
    totalBytes,
    progress: 1,
  });
  return registry[codeId];
}

export async function removeCodePackages(codeId: string) {
  return enqueuePackageMutation(() => removeCodePackagesNow(codeId));
}

async function removeCodePackagesNow(codeId: string) {
  const registry = await getInstalledPackageRegistry();
  const record = registry[codeId];

  if (record) {
    await enqueuePendingPackageCleanup(
      Object.entries(record.packages)
        .map(([language, packageRecord]) =>
          packageRecord.localUri
            ? {
                codeId,
                language,
                localUri: packageRecord.localUri,
                packageId: packageRecord.packageId,
                versionId: packageRecord.versionId,
              }
            : null,
        )
        .filter(
          (item): item is Omit<PendingPackageCleanupRecord, "id" | "queuedAt"> =>
            item !== null,
        ),
    );
  }

  delete registry[codeId];
  clearReaderPackageCache(codeId);
  await AsyncStorage.setItem(INSTALLED_PACKAGES_KEY, JSON.stringify(registry));
}

export async function getPendingPackageCleanupSummary() {
  const records = await readPendingPackageCleanupRecords();
  return {
    count: records.length,
    sizeBytes: records.reduce((total, record) => {
      try {
        const file = new File(record.localUri);
        return total + (file.exists ? file.size : 0);
      } catch {
        return total;
      }
    }, 0),
  };
}

export async function cleanupPendingPackageStorage({
  codeId,
  limit = 4,
}: {
  codeId?: string;
  limit?: number;
} = {}): Promise<PackageStorageCleanupResult> {
  return enqueuePackageMutation(async () => {
    const records = await readPendingPackageCleanupRecords();
    const pendingRecords = codeId
      ? records.filter((record) => record.codeId === codeId)
      : records;
    const recordsToDelete = pendingRecords.slice(0, Math.max(0, limit));

    for (const record of recordsToDelete) {
      await safeDeletePackageArtifacts(record.localUri);
      await delay(80);
    }

    if (recordsToDelete.length === 0) {
      return {
        deleted: 0,
        remaining: pendingRecords.length,
      };
    }

    const deletedIds = new Set(recordsToDelete.map((record) => record.id));
    const nextRecords = records.filter((record) => !deletedIds.has(record.id));
    await writePendingPackageCleanupRecords(nextRecords);

    return {
      deleted: recordsToDelete.length,
      remaining: codeId
        ? nextRecords.filter((record) => record.codeId === codeId).length
        : nextRecords.length,
    };
  });
}

export async function repairPackageCache(
  codeId?: string,
): Promise<PackageCacheRepairResult> {
  return enqueuePackageMutation(() => repairPackageCacheNow(codeId));
}

async function repairPackageCacheNow(
  codeId?: string,
): Promise<PackageCacheRepairResult> {
  const registry = await getInstalledPackageRegistry();
  const rebuiltReaderSidecars: PackageCacheRepairResult["rebuiltReaderSidecars"] =
    [];
  const removedCodes: string[] = [];
  const removedLanguages: PackageCacheRepairResult["removedLanguages"] = [];
  const codeIds = codeId ? [codeId] : Object.keys(registry);

  for (const currentCodeId of codeIds) {
    const record = registry[currentCodeId];

    if (!record) {
      continue;
    }

    for (const [language, packageRecord] of Object.entries(record.packages)) {
      const validation = await validatePackageRecordForRepair(
        currentCodeId,
        language,
        packageRecord,
      );

      if (validation.valid) {
        if (validation.rebuildReaderSidecar) {
          try {
            const rebuilt = await rebuildReaderPackageSidecars(packageRecord);
            if (rebuilt) {
              rebuiltReaderSidecars.push({
                codeId: currentCodeId,
                language,
              });
            }
          } catch (error) {
            console.warn("Failed to rebuild reader package sidecars", error);
            try {
              await deletePackageFile(packageRecord);
            } catch (deleteError) {
              console.warn("Failed to delete package after sidecar rebuild failure", deleteError);
            }

            delete record.packages[language];
            removedLanguages.push({
              codeId: currentCodeId,
              language,
              reason: "reader_sidecar_rebuild_failed",
            });
            continue;
          }
        }
      }

      if (validation.valid) {
        continue;
      }

      try {
        await deletePackageFile(packageRecord);
      } catch (error) {
        console.warn("Failed to delete invalid legal package file", error);
      }

      delete record.packages[language];
      removedLanguages.push({
        codeId: currentCodeId,
        language,
        reason: validation.reason,
      });
    }

    if (Object.keys(record.packages).length === 0) {
      delete registry[currentCodeId];
      removedCodes.push(currentCodeId);
    }
  }

  if (removedLanguages.length > 0 || removedCodes.length > 0) {
    if (codeId) {
      clearReaderPackageCache(codeId);
    } else {
      readerPackageCache.clear();
      readerPackagePreloadPromises.clear();
      readerPackageSidecarCache.clear();
    }

    await AsyncStorage.setItem(INSTALLED_PACKAGES_KEY, JSON.stringify(registry));
  }

  return {
    codeId,
    rebuiltReaderSidecars,
    removedCodes,
    removedLanguages,
    repaired:
      removedLanguages.length > 0 ||
      removedCodes.length > 0 ||
      rebuiltReaderSidecars.length > 0,
  };
}

function enqueuePackageMutation<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = packageMutationQueue.then(task, task);
  packageMutationQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
}

async function enqueuePendingPackageCleanup(
  records: Array<Omit<PendingPackageCleanupRecord, "id" | "queuedAt">>,
) {
  if (records.length === 0) {
    return;
  }

  const queuedAt = new Date().toISOString();
  const currentRecords = await readPendingPackageCleanupRecords();
  const existingUris = new Set(currentRecords.map((record) => record.localUri));
  const nextRecords = [...currentRecords];

  records.forEach((record) => {
    if (existingUris.has(record.localUri)) {
      return;
    }

    existingUris.add(record.localUri);
    nextRecords.push({
      ...record,
      id: `${record.codeId}:${record.language}:${record.versionId}:${record.localUri}`,
      queuedAt,
    });
  });

  await writePendingPackageCleanupRecords(nextRecords);
}

async function readPendingPackageCleanupRecords() {
  const raw = await AsyncStorage.getItem(PENDING_PACKAGE_CLEANUP_KEY);

  if (!raw) {
    return [];
  }

  try {
    const records = JSON.parse(raw) as PendingPackageCleanupRecord[];
    return records.filter(
      (record) =>
        record &&
        typeof record.codeId === "string" &&
        typeof record.language === "string" &&
        typeof record.localUri === "string",
    );
  } catch {
    return [];
  }
}

async function writePendingPackageCleanupRecords(
  records: PendingPackageCleanupRecord[],
) {
  if (records.length === 0) {
    await AsyncStorage.removeItem(PENDING_PACKAGE_CLEANUP_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_PACKAGE_CLEANUP_KEY, JSON.stringify(records));
}

async function cachePackageFile(
  codeId: string,
  packageVersion: PackageVersion,
  onProgress?: (bytesWritten: number) => void,
) {
  const sourceUrl = packageVersion.download.url;

  if (!isRemoteUrl(sourceUrl)) {
    return {
      packageId: packageVersion.packageId,
      versionId: packageVersion.versionId,
      sha256: packageVersion.download.sha256,
      contentSha256: packageVersion.download.contentSha256,
      sizeBytes: packageVersion.download.sizeBytes,
      sourceUrl,
      localUri: null,
      cacheStatus: "manifest_only" as const,
      storageFormat: "gzip" as const,
      checksumStatus: "skipped_local_manifest" as const,
    };
  }

  const directory = getPackageDirectory(codeId, packageVersion.language);
  directory.create({ intermediates: true, idempotent: true });

  const stagingId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const stagingGzip = new File(
    directory,
    `${packageVersion.versionId}.${stagingId}.download.json.gz`,
  );
  const packageFile = new File(
    directory,
    `${packageVersion.versionId}.${stagingId}.json`,
  );
  await deleteFileIfExists(stagingGzip.uri);
  await deleteFileIfExists(packageFile.uri);

  const download = LegacyFileSystem.createDownloadResumable(
    sourceUrl,
    stagingGzip.uri,
    {},
    (progress) => {
      onProgress?.(progress.totalBytesWritten);
    },
  );
  const downloadResult = await download.downloadAsync();

  if (!downloadResult) {
    await deleteFileIfExists(stagingGzip.uri);
    throw new Error(`Download cancelled for ${packageVersion.packageId}`);
  }

  const downloadedFile = new File(downloadResult.uri);

  if (downloadedFile.size !== packageVersion.download.sizeBytes) {
    await deleteFileIfExists(downloadedFile.uri);
    throw new Error(
      `Downloaded package size mismatch for ${packageVersion.packageId}: expected ${packageVersion.download.sizeBytes}, got ${downloadedFile.size}`,
    );
  }

  const compressedBytes = await downloadedFile.bytes();
  const downloadedSha256 = bytesToHex(sha256(compressedBytes));

  if (downloadedSha256 !== packageVersion.download.sha256) {
    await deleteFileIfExists(downloadedFile.uri);
    throw new Error(
      `Downloaded package checksum mismatch for ${packageVersion.packageId}`,
    );
  }

  const uncompressedBytes = gunzipSync(compressedBytes);
  const contentSha256 = bytesToHex(sha256(uncompressedBytes));

  if (contentSha256 !== packageVersion.download.contentSha256) {
    await deleteFileIfExists(downloadedFile.uri);
    throw new Error(
      `Downloaded package content checksum mismatch for ${packageVersion.packageId}`,
    );
  }

  const jsonText = strFromU8(uncompressedBytes);
  await LegacyFileSystem.writeAsStringAsync(packageFile.uri, jsonText);
  await writeReaderPackageChunkSidecarsFromJsonText(
    packageFile.uri,
    jsonText,
  );
  await deleteFileIfExists(downloadedFile.uri);

  return {
    packageId: packageVersion.packageId,
    versionId: packageVersion.versionId,
    sha256: packageVersion.download.sha256,
    contentSha256: packageVersion.download.contentSha256,
    sizeBytes: packageVersion.download.uncompressedSizeBytes,
    sourceUrl,
    localUri: packageFile.uri,
    cacheStatus: "downloaded" as const,
    storageFormat: "json" as const,
    checksumStatus: "verified" as const,
  };
}

async function cachePackageFileWithRetry(
  codeId: string,
  packageVersion: PackageVersion,
  onProgress?: (bytesWritten: number) => void,
  maxAttempts = 2,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      onProgress?.(0);
      return await cachePackageFile(codeId, packageVersion, onProgress);
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await delay(500);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to download ${packageVersion.packageId}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPackageDirectory(codeId: string, language: string) {
  return new Directory(
    Paths.document,
    "lawquest",
    "legal-packages",
    codeId,
    language,
  );
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function getCodePackageSizeBytes(codeId: string, languages?: string[]) {
  const code = getManifestCode(codeId);

  if (!code) {
    return 0;
  }

  return getCurrentLanguagePackages(code, languages).reduce(
    (total, [, packageVersion]) => total + packageVersion.download.sizeBytes,
    0,
  );
}

export function getCodeLanguages(codeId: string) {
  const code = getManifestCode(codeId);

  if (!code) {
    return [];
  }

  return getCurrentLanguagePackages(code).map(([language]) =>
    language.toUpperCase(),
  );
}

export function getInstalledCurrentLanguagesForCode(
  codeId: string,
  record?: InstalledPackageRecord,
) {
  const code = getManifestCode(codeId);

  if (!code || !record) {
    return [];
  }

  return getCurrentLanguagePackages(code)
    .filter(([language, packageVersion]) => {
      const installed = record.packages[language];
      return isPackageRecordCurrent(installed, packageVersion);
    })
    .map(([language]) => language);
}

export async function getInstalledCurrentPackageLanguages(codeId: string) {
  const registry = await getInstalledPackageRegistry();
  return getInstalledCurrentLanguagesForCode(codeId, registry[codeId]);
}

export function isInstalledCurrent(
  codeId: string,
  record?: InstalledPackageRecord,
  languages?: string[],
) {
  const code = getManifestCode(codeId);

  if (!code || !record) {
    return false;
  }

  return getCurrentLanguagePackages(code, languages).every(
    ([language, packageVersion]) => {
      const installed = record.packages[language];
      return isPackageRecordCurrent(installed, packageVersion);
    },
  );
}

export function hasPackageUpdateAvailable(
  codeId: string,
  record?: InstalledPackageRecord,
  languages?: string[],
) {
  if (!record) {
    return false;
  }

  const code = getManifestCode(codeId);

  if (!code) {
    return false;
  }

  return getCurrentLanguagePackages(code, languages).some(
    ([language, packageVersion]) => {
      const installed = record.packages[language];
      return !isPackageRecordCurrent(installed, packageVersion);
    },
  );
}

function isPackageRecordCurrent(
  installed: InstalledPackageRecord["packages"][string] | undefined,
  packageVersion: PackageVersion,
) {
  if (!installed) {
    return false;
  }

  const format = installed.storageFormat ?? "gzip";
  const supportedFormat = format === "gzip" || format === "json";
  const sizeMatches =
    format === "json"
      ? installed.sizeBytes === packageVersion.download.uncompressedSizeBytes
      : installed.sizeBytes === packageVersion.download.sizeBytes;
  const contentMatches =
    format === "gzip" ||
    !installed.contentSha256 ||
    installed.contentSha256 === packageVersion.download.contentSha256;

  return (
    supportedFormat &&
    installed.versionId === packageVersion.versionId &&
    installed.sha256 === packageVersion.download.sha256 &&
    sizeMatches &&
    contentMatches
  );
}

function clearReaderPackageCache(codeId: string) {
  [...readerPackageCache.keys()].forEach((cacheKey) => {
    if (cacheKey.startsWith(`${codeId}:`)) {
      readerPackageCache.delete(cacheKey);
    }
  });
  [...readerPackagePreloadPromises.keys()].forEach((cacheKey) => {
    if (cacheKey.startsWith(`${codeId}:`)) {
      readerPackagePreloadPromises.delete(cacheKey);
    }
  });
  [...readerPackageSidecarCache.keys()].forEach((cacheKey) => {
    if (cacheKey.startsWith(`${codeId}:`)) {
      readerPackageSidecarCache.delete(cacheKey);
    }
  });
}

export function releaseReaderPackageCache(codeId: string) {
  clearReaderPackageCache(codeId);
}

function cacheReaderPackage(
  cacheKey: string,
  legalPackage: LegalPackageDocument,
) {
  readerPackageCache.delete(cacheKey);
  readerPackageCache.set(cacheKey, legalPackage);

  while (readerPackageCache.size > MAX_READER_PACKAGE_CACHE_ENTRIES) {
    const oldestCacheKey = readerPackageCache.keys().next().value;

    if (!oldestCacheKey) {
      return;
    }

    readerPackageCache.delete(oldestCacheKey);
  }
}

async function deletePackageFile(
  packageRecord?: InstalledPackageRecord["packages"][string],
  keepUri?: string | null,
) {
  if (!packageRecord?.localUri || packageRecord.localUri === keepUri) {
    return;
  }

  await safeDeletePackageArtifacts(packageRecord.localUri);
}

async function safeDeletePackageArtifacts(localUri: string) {
  await deleteFileIfExists(localUri);

  await deleteReaderPackageChunkSidecars(localUri);
  await deleteReaderPackageSidecar(localUri);
}

async function deleteFileIfExists(uri: string) {
  try {
    if (typeof LegacyFileSystem.deleteAsync === "function") {
      await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
      return;
    }

    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn("Failed to delete file", error);
  }
}

async function validatePackageRecordForRepair(
  codeId: string,
  language: string,
  packageRecord: InstalledPackageRecord["packages"][string],
): Promise<
  | { reason: string; valid: false }
  | { rebuildReaderSidecar?: boolean; valid: true }
> {
  const packageVersion = getCurrentPackageVersion(codeId, language);

  if (packageRecord.cacheStatus === "manifest_only" || !packageRecord.localUri) {
    return { valid: true };
  }

  try {
    const file = new File(packageRecord.localUri);

    if (!file.exists) {
      return { reason: "missing_file", valid: false };
    }

    const storageFormat = packageRecord.storageFormat ?? "gzip";

    if (storageFormat === "json") {
      const jsonText = await LegacyFileSystem.readAsStringAsync(
        packageRecord.localUri,
      );

      try {
        JSON.parse(jsonText);
      } catch {
        return { reason: "invalid_json", valid: false };
      }

      if (packageRecord.contentSha256 || packageVersion) {
        const contentSha256 = bytesToHex(
          sha256(new TextEncoder().encode(jsonText)),
        );
        const expectedContentSha =
          packageRecord.contentSha256 ??
          packageVersion?.download.contentSha256;

        if (expectedContentSha && contentSha256 !== expectedContentSha) {
          return { reason: "content_checksum_mismatch", valid: false };
        }
      }

      return {
        rebuildReaderSidecar:
          !hasReaderPackageChunkSidecars(packageRecord.localUri),
        valid: true,
      };
    }

    if (storageFormat === "gzip") {
      const compressedBytes = await file.bytes();
      const expectedSha = packageVersion?.download.sha256 ?? packageRecord.sha256;

      if (expectedSha && bytesToHex(sha256(compressedBytes)) !== expectedSha) {
        return { reason: "gzip_checksum_mismatch", valid: false };
      }

      try {
        gunzipSync(compressedBytes);
      } catch {
        return { reason: "invalid_gzip", valid: false };
      }

      return { valid: true };
    }

    return { reason: "unsupported_storage_format", valid: false };
  } catch (error) {
    console.warn("Failed to validate legal package cache", error);
    return { reason: "validation_failed", valid: false };
  }
}

export function formatPackageSize(bytes: number) {
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

export async function readPackageFromBundle(
  codeId: string,
  language: string,
): Promise<LegalPackageDocument | null> {
  void codeId;
  void language;
  return null;
}

export async function readPackageForReader(
  codeId: string,
  language: string,
): Promise<LegalPackageDocument | null> {
  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const packageVersion = getCurrentPackageVersion(codeId, language);
  const cacheKey = `${codeId}:${language}:${installed?.versionId ?? packageVersion?.versionId ?? "bundle"}`;
  const cachedPackage = readerPackageCache.get(cacheKey);

  if (cachedPackage) {
    cacheReaderPackage(cacheKey, cachedPackage);
    return cachedPackage;
  }

  const pendingPackage = readerPackagePreloadPromises.get(cacheKey);
  if (pendingPackage) {
    return pendingPackage;
  }

  const packageLoad = readPackageForReaderFromStorage(
    codeId,
    language,
    registry,
    installed,
    packageVersion,
    cacheKey,
  ).finally(() => {
    readerPackagePreloadPromises.delete(cacheKey);
  });

  readerPackagePreloadPromises.set(cacheKey, packageLoad);
  return packageLoad;
}

export async function readReaderPackageForReader(
  codeId: string,
  language: string,
): Promise<LegalPackageDocument | null> {
  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const packageVersion = getCurrentPackageVersion(codeId, language);
  const cacheKey = `${codeId}:${language}:${installed?.versionId ?? packageVersion?.versionId ?? "bundle"}`;
  const cachedPackage = readerPackageSidecarCache.get(cacheKey);

  if (cachedPackage) {
    return cachedPackage;
  }

  const sidecarPackage =
    (await readReaderPackageChunkSidecars(installed?.localUri)) ??
    (await readReaderPackageSidecar(installed?.localUri));

  if (sidecarPackage) {
    cacheReaderPackageSidecar(cacheKey, sidecarPackage);
    return sidecarPackage;
  }

  const legalPackage = await readPackageForReader(codeId, language);

  if (!legalPackage) {
    return null;
  }

  const readerPackage = createReaderPackageSnapshot(legalPackage);

  if (installed?.localUri && (installed.storageFormat ?? "gzip") === "json") {
    await writeReaderPackageChunkSidecars(installed.localUri, legalPackage);
  }

  cacheReaderPackageSidecar(cacheKey, readerPackage);
  return readerPackage;
}

export async function readReaderPackageIndexForReader(
  codeId: string,
  language: string,
): Promise<LegalPackageDocument | null> {
  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const indexDocument = await readReaderPackageIndexSidecar(installed?.localUri);

  if (indexDocument) {
    return createReaderPackageFromIndex(indexDocument);
  }

  const legalPackage = await readPackageForReader(codeId, language);

  if (!legalPackage) {
    return null;
  }

  if (installed?.localUri && (installed.storageFormat ?? "gzip") === "json") {
    await writeReaderPackageChunkSidecars(installed.localUri, legalPackage);
  }

  return createReaderPackageSnapshot(legalPackage);
}

export async function readReaderPackageSectionsForReader(
  codeId: string,
  language: string,
  sectionIds: string[],
): Promise<LegalPackageDocument["sections"]> {
  const uniqueSectionIds = Array.from(new Set(sectionIds)).filter(Boolean);

  if (uniqueSectionIds.length === 0) {
    return [];
  }

  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const localUri = installed?.localUri;
  const indexDocument = await readReaderPackageIndexSidecar(localUri);

  if (localUri && indexDocument) {
    try {
      return await readReaderPackageSectionsFromChunks(
        localUri,
        indexDocument,
        uniqueSectionIds,
      );
    } catch (error) {
      console.warn("Failed to read reader package sections from chunks", error);
      await deleteReaderPackageChunkSidecars(localUri);
    }
  }

  const legalPackage = await readPackageForReader(codeId, language);
  return legalPackage?.sections.filter((section) =>
    uniqueSectionIds.includes(section.sectionId),
  ) ?? [];
}

export async function readReaderPackageParagraphsForReader(
  codeId: string,
  language: string,
  sectionIds: string[],
): Promise<NonNullable<LegalPackageDocument["paragraphs"]>> {
  const uniqueSectionIds = Array.from(new Set(sectionIds)).filter(Boolean);

  if (uniqueSectionIds.length === 0) {
    return [];
  }

  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const localUri = installed?.localUri;
  const indexDocument = await readReaderPackageIndexSidecar(localUri);

  if (localUri && indexDocument) {
    try {
      const paragraphs = await readReaderPackageParagraphsFromChunks(
        localUri,
        indexDocument,
        uniqueSectionIds,
      );

      if (paragraphs.length > 0) {
        return paragraphs;
      }
    } catch (error) {
      console.warn("Failed to read reader package paragraphs from chunks", error);
    }
  }

  const legalPackage = await readPackageForReader(codeId, language);
  const sectionIdSet = new Set(uniqueSectionIds);

  return sortReaderParagraphs(
    (legalPackage?.paragraphs ?? []).filter((paragraph) =>
      sectionIdSet.has(paragraph.sectionId),
    ),
  );
}

export async function readReaderPackageSectionWindowForReader(
  codeId: string,
  language: string,
  {
    after = 30,
    before = 30,
    sectionId,
  }: {
    after?: number;
    before?: number;
    sectionId?: string | null;
  },
): Promise<LegalPackageDocument["sections"]> {
  const registry = await getInstalledPackageRegistry();
  const installed = registry[codeId]?.packages[language];
  const localUri = installed?.localUri;
  const indexDocument = await readReaderPackageIndexSidecar(localUri);

  if (localUri && indexDocument) {
    const targetIndex = sectionId
      ? indexDocument.sections.findIndex((section) => section.sectionId === sectionId)
      : -1;
    const centerIndex = targetIndex >= 0 ? targetIndex : 0;
    const startIndex = Math.max(0, centerIndex - before);
    const endIndex = Math.min(
      indexDocument.sections.length,
      centerIndex + after + 1,
    );

    return readReaderPackageSectionsFromChunks(
      localUri,
      indexDocument,
      indexDocument.sections
        .slice(startIndex, endIndex)
        .map((section) => section.sectionId),
    );
  }

  const legalPackage = await readPackageForReader(codeId, language);

  if (!legalPackage) {
    return [];
  }

  const targetIndex = sectionId
    ? legalPackage.sections.findIndex((section) => section.sectionId === sectionId)
    : -1;
  const centerIndex = targetIndex >= 0 ? targetIndex : 0;
  const startIndex = Math.max(0, centerIndex - before);
  const endIndex = Math.min(legalPackage.sections.length, centerIndex + after + 1);

  return legalPackage.sections.slice(startIndex, endIndex);
}

async function readPackageForReaderFromStorage(
  codeId: string,
  language: string,
  registry: InstalledPackageRegistry,
  installed: InstalledPackageRecord["packages"][string] | undefined,
  packageVersion: PackageVersion | null,
  cacheKey: string,
): Promise<LegalPackageDocument | null> {
  if (installed?.localUri && (installed.storageFormat ?? "gzip") === "json") {
    try {
      const file = new File(installed.localUri);

      if (file.exists) {
        const jsonText = await LegacyFileSystem.readAsStringAsync(
          installed.localUri,
        );
        const legalPackage = asLegalPackage(JSON.parse(jsonText));
        cacheReaderPackage(cacheKey, legalPackage);
        return legalPackage;
      }
    } catch (error) {
      console.error("Failed to read local legal package", error);
    }
  }

  if (installed?.localUri && (installed.storageFormat ?? "gzip") === "gzip") {
    try {
      const file = new File(installed.localUri);

      if (file.exists) {
        const migrated = await migrateGzipPackageToJson(
          codeId,
          language,
          file,
          installed,
          packageVersion,
          registry,
        );
        cacheReaderPackage(cacheKey, migrated);
        return migrated;
      }
    } catch (error) {
      console.error("Failed to read local legal package", error);
    }
  }

  const bundledPackage = await readPackageFromBundle(codeId, language);

  if (bundledPackage) {
    cacheReaderPackage(cacheKey, bundledPackage);
  }

  return bundledPackage;
}

export async function prefetchPackageForReader(
  codeId: string,
  language: string,
) {
  try {
    return await readPackageForReader(codeId, language);
  } catch (error) {
    console.warn("Failed to prefetch legal package", error);
    return null;
  }
}

function getCurrentPackageVersion(codeId: string, language: string) {
  const code = getManifestCode(codeId);
  const languageEntry = code?.languages[language];

  return (
    languageEntry?.versions.find(
      (version) => version.versionId === languageEntry.currentVersionId,
    ) ??
    languageEntry?.versions[0] ??
    null
  );
}

async function migrateGzipPackageToJson(
  codeId: string,
  language: string,
  gzipFile: File,
  installed: InstalledPackageRecord["packages"][string],
  packageVersion: PackageVersion | null,
  registry: InstalledPackageRegistry,
) {
  const compressedBytes = await gzipFile.bytes();
  const uncompressedBytes = gunzipSync(compressedBytes);
  const contentSha256 = bytesToHex(sha256(uncompressedBytes));

  if (
    packageVersion &&
    contentSha256 !== packageVersion.download.contentSha256
  ) {
    throw new Error(
      `Local package content checksum mismatch for ${installed.packageId}`,
    );
  }

  const jsonText = strFromU8(uncompressedBytes);
  const legalPackage = asLegalPackage(JSON.parse(jsonText));
  const directory = getPackageDirectory(codeId, language);
  directory.create({ intermediates: true, idempotent: true });

  const jsonFile = new File(directory, `${installed.versionId}.json`);
  if (jsonFile.exists) {
    jsonFile.delete();
  }

  await LegacyFileSystem.writeAsStringAsync(jsonFile.uri, jsonText);
  await writeReaderPackageChunkSidecars(jsonFile.uri, legalPackage);
  gzipFile.delete();

  registry[codeId] = {
    ...(registry[codeId] ?? {
      codeId,
      installedAt: new Date().toISOString(),
      packages: {},
    }),
    packages: {
      ...(registry[codeId]?.packages ?? {}),
      [language]: {
        ...installed,
        contentSha256,
        checksumStatus: "verified",
        localUri: jsonFile.uri,
        sizeBytes:
          packageVersion?.download.uncompressedSizeBytes ??
          uncompressedBytes.length,
        storageFormat: "json",
      },
    },
  };
  await AsyncStorage.setItem(INSTALLED_PACKAGES_KEY, JSON.stringify(registry));

  return legalPackage;
}

function asLegalPackage(value: unknown) {
  return value as LegalPackageDocument;
}

function cacheReaderPackageSidecar(
  cacheKey: string,
  legalPackage: LegalPackageDocument,
) {
  readerPackageSidecarCache.delete(cacheKey);
  readerPackageSidecarCache.set(cacheKey, legalPackage);

  while (readerPackageSidecarCache.size > MAX_READER_PACKAGE_CACHE_ENTRIES) {
    const oldestCacheKey = readerPackageSidecarCache.keys().next().value;

    if (!oldestCacheKey) {
      return;
    }

    readerPackageSidecarCache.delete(oldestCacheKey);
  }
}

function createReaderPackageSnapshot(
  legalPackage: LegalPackageDocument,
): LegalPackageDocument {
  return {
    schemaVersion: legalPackage.schemaVersion,
    packageId: legalPackage.packageId,
    code: legalPackage.code,
    language: legalPackage.language,
    version: legalPackage.version,
    structure: legalPackage.structure,
    sectionMetadata: legalPackage.sectionMetadata,
    sectionCount: legalPackage.sectionCount,
    paragraphCount: legalPackage.paragraphCount,
    sections: legalPackage.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
      ...(section.headingFootnoteRefs
        ? { headingFootnoteRefs: section.headingFootnoteRefs }
        : {}),
      text: section.text,
      ...(section.bodyFootnoteRefs
        ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
        : {}),
      ...(section.status ? { status: section.status } : {}),
      ...(section.paragraphIds ? { paragraphIds: section.paragraphIds } : {}),
      ...(section.needsReview !== undefined
        ? { needsReview: section.needsReview }
        : {}),
      ...(section.reviewNotes ? { reviewNotes: section.reviewNotes } : {}),
    })),
    ...(legalPackage.appendices ? { appendices: legalPackage.appendices } : {}),
  };
}

async function readReaderPackageChunkSidecars(
  localUri: string | null | undefined,
) {
  const indexDocument = await readReaderPackageIndexSidecar(localUri);

  if (!indexDocument || !localUri) {
    return null;
  }

  try {
    const chunkSections: LegalPackageDocument["sections"] = [];
    const chunkParagraphs: NonNullable<LegalPackageDocument["paragraphs"]> = [];
    for (const chunk of indexDocument.chunking.chunks) {
      const chunkText = await LegacyFileSystem.readAsStringAsync(
        getReaderPackageChunkUri(localUri, chunk.chunkIndex),
      );
      const chunkDocument = JSON.parse(
        chunkText,
      ) as ReaderPackageChunkDocument;

      chunkSections.push(...chunkDocument.sections);
      chunkParagraphs.push(...(chunkDocument.paragraphs ?? []));
    }

    return asLegalPackage({
      schemaVersion: indexDocument.packageSchemaVersion,
      packageId: indexDocument.packageId,
      code: indexDocument.code,
      language: indexDocument.language,
      version: indexDocument.version,
      structure: indexDocument.structure,
      sectionMetadata: indexDocument.sectionMetadata,
      appendices: indexDocument.appendices,
      sectionCount: indexDocument.sectionCount,
      paragraphCount: indexDocument.paragraphCount,
      sections: sortReaderSectionsByIndex(indexDocument, chunkSections),
      paragraphs: sortReaderParagraphs(chunkParagraphs),
    });
  } catch (error) {
    console.warn("Failed to read reader package chunk sidecars", error);
    await deleteReaderPackageChunkSidecars(localUri);
    return null;
  }
}

async function readReaderPackageIndexSidecar(
  localUri: string | null | undefined,
) {
  if (!localUri) {
    return null;
  }

  const indexUri = getReaderPackageIndexUri(localUri);
  const indexFile = new File(indexUri);

  if (!indexFile.exists) {
    return null;
  }

  try {
    return JSON.parse(
      await LegacyFileSystem.readAsStringAsync(indexUri),
    ) as ReaderPackageIndexDocument;
  } catch (error) {
    console.warn("Failed to read reader package index sidecar", error);
    await deleteReaderPackageChunkSidecars(localUri);
    return null;
  }
}

async function readReaderPackageSectionsFromChunks(
  localUri: string,
  indexDocument: ReaderPackageIndexDocument,
  sectionIds: string[],
) {
  const sectionIdSet = new Set(sectionIds);
  const chunkIndexes = indexDocument.chunking.chunks
    .filter((chunk) =>
      chunk.sectionIds.some((sectionId) => sectionIdSet.has(sectionId)),
    )
    .map((chunk) => chunk.chunkIndex);
  const sections: LegalPackageDocument["sections"] = [];

  for (const chunkIndex of chunkIndexes) {
    const chunkText = await LegacyFileSystem.readAsStringAsync(
      getReaderPackageChunkUri(localUri, chunkIndex),
    );
    const chunkDocument = JSON.parse(chunkText) as ReaderPackageChunkDocument;

    sections.push(
      ...chunkDocument.sections.filter((section) =>
        sectionIdSet.has(section.sectionId),
      ),
    );
  }

  return sortReaderSectionsByIndex(indexDocument, sections);
}

async function readReaderPackageParagraphsFromChunks(
  localUri: string,
  indexDocument: ReaderPackageIndexDocument,
  sectionIds: string[],
) {
  const sectionIdSet = new Set(sectionIds);
  const chunkIndexes = indexDocument.chunking.chunks
    .filter((chunk) =>
      chunk.sectionIds.some((sectionId) => sectionIdSet.has(sectionId)),
    )
    .map((chunk) => chunk.chunkIndex);
  const paragraphs: NonNullable<LegalPackageDocument["paragraphs"]> = [];

  for (const chunkIndex of chunkIndexes) {
    const chunkText = await LegacyFileSystem.readAsStringAsync(
      getReaderPackageChunkUri(localUri, chunkIndex),
    );
    const chunkDocument = JSON.parse(chunkText) as ReaderPackageChunkDocument;

    paragraphs.push(
      ...(chunkDocument.paragraphs ?? []).filter((paragraph) =>
        sectionIdSet.has(paragraph.sectionId),
      ),
    );
  }

  return sortReaderParagraphs(paragraphs);
}

async function readReaderPackageSidecar(localUri: string | null | undefined) {
  if (!localUri) {
    return null;
  }

  const sidecarUri = getReaderPackageSidecarUri(localUri);
  const sidecarFile = new File(sidecarUri);

  if (!sidecarFile.exists) {
    return null;
  }

  try {
    return asLegalPackage(
      JSON.parse(await LegacyFileSystem.readAsStringAsync(sidecarUri)),
    );
  } catch (error) {
    console.warn("Failed to read reader package sidecar", error);
    await deleteReaderPackageSidecar(localUri);
    return null;
  }
}

async function writeReaderPackageChunkSidecarsFromJsonText(
  localUri: string,
  jsonText: string,
) {
  try {
    await writeReaderPackageChunkSidecars(
      localUri,
      asLegalPackage(JSON.parse(jsonText)),
    );
  } catch (error) {
    console.warn("Failed to create reader package chunk sidecars", error);
  }
}

async function writeReaderPackageChunkSidecars(
  localUri: string,
  legalPackage: LegalPackageDocument,
) {
  const chunkDirectoryUri = getReaderPackageChunkDirectoryUri(localUri);
  const chunks = legalPackage.chunking?.chunks ?? buildFallbackReaderChunks(legalPackage);
  const readerChunks: ReaderPackageIndexDocument["chunking"]["chunks"] = [];

  await LegacyFileSystem.makeDirectoryAsync(chunkDirectoryUri, {
    intermediates: true,
  });

  for (const chunk of chunks) {
    const sectionIds = chunk.sectionIds;
    const sectionIdSet = new Set(sectionIds);
    const chunkDocument: ReaderPackageChunkDocument = {
      schemaVersion: 1,
      packageId: legalPackage.packageId,
      packageType: "legal-reader-chunk",
      codeId: legalPackage.code.codeId,
      language: legalPackage.language,
      versionId: legalPackage.version.versionId,
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      sectionIds,
      paragraphIds: chunk.paragraphIds,
      fromSectionId: chunk.fromSectionId,
      fromSectionNo: chunk.fromSectionNo,
      toSectionId: chunk.toSectionId,
      toSectionNo: chunk.toSectionNo,
      sections: legalPackage.sections
        .filter((section) => sectionIdSet.has(section.sectionId))
          .map((section) => ({
            sectionId: section.sectionId,
            sectionNo: section.sectionNo,
            ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
            ...(section.headingFootnoteRefs
              ? { headingFootnoteRefs: section.headingFootnoteRefs }
              : {}),
            text: section.text,
            ...(section.bodyFootnoteRefs
              ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
              : {}),
            ...(section.status ? { status: section.status } : {}),
            ...(section.paragraphIds ? { paragraphIds: section.paragraphIds } : {}),
            ...(section.needsReview !== undefined
              ? { needsReview: section.needsReview }
              : {}),
          ...(section.reviewNotes ? { reviewNotes: section.reviewNotes } : {}),
        })),
      paragraphs: (legalPackage.paragraphs ?? []).filter((paragraph) =>
        sectionIdSet.has(paragraph.sectionId),
      ),
    };
    const chunkText = JSON.stringify(chunkDocument);

    await LegacyFileSystem.writeAsStringAsync(
      getReaderPackageChunkUri(localUri, chunk.chunkIndex),
      chunkText,
    );
    readerChunks.push({
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      fromSectionId: chunk.fromSectionId,
      fromSectionNo: chunk.fromSectionNo,
      path: getReaderPackageChunkUri(localUri, chunk.chunkIndex),
      sectionIds,
      sha256: bytesToHex(sha256(new TextEncoder().encode(chunkText))),
      sizeBytes: new TextEncoder().encode(chunkText).length,
      toSectionId: chunk.toSectionId,
      toSectionNo: chunk.toSectionNo,
    });
  }

  const indexDocument: ReaderPackageIndexDocument = {
    schemaVersion: 1,
    packageId: legalPackage.packageId,
    packageSchemaVersion: legalPackage.schemaVersion,
    packageType: "legal-reader-index",
    code: legalPackage.code,
    language: legalPackage.language,
    version: legalPackage.version,
    structure: legalPackage.structure,
    sectionMetadata: legalPackage.sectionMetadata,
    appendices: legalPackage.appendices,
    sectionCount: legalPackage.sectionCount,
    paragraphCount: legalPackage.paragraphCount,
    chunking: {
      schemaVersion: legalPackage.chunking?.schemaVersion ?? 1,
      strategy: legalPackage.chunking?.strategy ?? "fixed_section_window",
      chunkSizeSections: legalPackage.chunking?.chunkSizeSections ?? 50,
      chunkCount: readerChunks.length,
      chunks: readerChunks,
    },
    sections: legalPackage.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
      ...(section.headingFootnoteRefs
        ? { headingFootnoteRefs: section.headingFootnoteRefs }
        : {}),
      ...(section.bodyFootnoteRefs
        ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
        : {}),
      ...(section.status ? { status: section.status } : {}),
      paragraphIds: section.paragraphIds ?? [],
      needsReview: section.needsReview ?? false,
      reviewNotes: section.reviewNotes ?? [],
    })),
  };

  await LegacyFileSystem.writeAsStringAsync(
    getReaderPackageIndexUri(localUri),
    JSON.stringify(indexDocument),
  );
}

async function rebuildReaderPackageSidecars(
  packageRecord: InstalledPackageRecord["packages"][string],
) {
  if (!packageRecord.localUri || (packageRecord.storageFormat ?? "gzip") !== "json") {
    return false;
  }

  const jsonText = await LegacyFileSystem.readAsStringAsync(packageRecord.localUri);
  await writeReaderPackageChunkSidecars(
    packageRecord.localUri,
    asLegalPackage(JSON.parse(jsonText)),
  );
  return true;
}

async function deleteReaderPackageSidecar(localUri: string) {
  await deleteFileIfExists(getReaderPackageSidecarUri(localUri));
}

async function deleteReaderPackageChunkSidecars(localUri: string) {
  await deleteFileIfExists(getReaderPackageIndexUri(localUri));

  try {
    const chunkDirectoryUri = getReaderPackageChunkDirectoryUri(localUri);
    if (typeof LegacyFileSystem.deleteAsync === "function") {
      await LegacyFileSystem.deleteAsync(chunkDirectoryUri, {
        idempotent: true,
      });
      return;
    }

    const chunkDirectory = new Directory(chunkDirectoryUri);
    if (chunkDirectory.exists) {
      chunkDirectory.delete();
    }
  } catch (error) {
    console.warn("Failed to delete reader package chunk sidecars", error);
  }
}

function hasReaderPackageChunkSidecars(localUri: string) {
  if (!new File(getReaderPackageIndexUri(localUri)).exists) {
    return false;
  }

  const chunkDirectory = new Directory(getReaderPackageChunkDirectoryUri(localUri));

  if (!chunkDirectory.exists) {
    return false;
  }

  return new File(getReaderPackageChunkUri(localUri, 0)).exists;
}

function getReaderPackageSidecarUri(localUri: string) {
  return localUri.replace(/\.json(?:\.gz)?$/i, ".reader.json");
}

function getReaderPackageIndexUri(localUri: string) {
  return localUri.replace(/\.json(?:\.gz)?$/i, ".reader-index.json");
}

function getReaderPackageChunkDirectoryUri(localUri: string) {
  return localUri.replace(/\.json(?:\.gz)?$/i, ".reader-chunks");
}

function getReaderPackageChunkUri(localUri: string, chunkIndex: number) {
  return `${getReaderPackageChunkDirectoryUri(localUri)}/chunk-${chunkIndex + 1}.json`;
}

function sortReaderSectionsByIndex(
  indexDocument: ReaderPackageIndexDocument,
  sections: LegalPackageDocument["sections"],
) {
  const orderBySectionId = new Map(
    indexDocument.sections.map((section, index) => [section.sectionId, index]),
  );

  return sections.sort(
    (left, right) =>
      (orderBySectionId.get(left.sectionId) ?? Number.MAX_SAFE_INTEGER) -
      (orderBySectionId.get(right.sectionId) ?? Number.MAX_SAFE_INTEGER),
  );
}

function sortReaderParagraphs(
  paragraphs: NonNullable<LegalPackageDocument["paragraphs"]>,
) {
  return paragraphs.sort(
    (left, right) =>
      left.sectionId.localeCompare(right.sectionId) ||
      left.paragraphIndex - right.paragraphIndex,
  );
}

function createReaderPackageFromIndex(
  indexDocument: ReaderPackageIndexDocument,
): LegalPackageDocument {
  return {
    schemaVersion: indexDocument.packageSchemaVersion,
    packageId: indexDocument.packageId,
    code: indexDocument.code,
    language: indexDocument.language,
    version: indexDocument.version,
    structure: indexDocument.structure,
    sectionMetadata: indexDocument.sectionMetadata,
    appendices: indexDocument.appendices,
    sectionCount: indexDocument.sectionCount,
    paragraphCount: indexDocument.paragraphCount,
    sections: indexDocument.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      ...(section.sectionLabel ? { sectionLabel: section.sectionLabel } : {}),
      ...(section.headingFootnoteRefs
        ? { headingFootnoteRefs: section.headingFootnoteRefs }
        : {}),
      ...(section.bodyFootnoteRefs
        ? { bodyFootnoteRefs: section.bodyFootnoteRefs }
        : {}),
      ...(section.status ? { status: section.status } : {}),
      text: "",
      paragraphIds: section.paragraphIds,
      ...(section.needsReview ? { needsReview: section.needsReview } : {}),
      ...(section.reviewNotes.length
        ? { reviewNotes: section.reviewNotes }
        : {}),
    })),
  };
}

function buildFallbackReaderChunks(legalPackage: LegalPackageDocument) {
  const chunkSizeSections = 50;
  const chunks: NonNullable<LegalPackageDocument["chunking"]>["chunks"] = [];

  for (let index = 0; index < legalPackage.sections.length; index += chunkSizeSections) {
    const sections = legalPackage.sections.slice(index, index + chunkSizeSections);
    const chunkIndex = chunks.length;

    chunks.push({
      chunkId: `${legalPackage.code.codeId}:${legalPackage.language}:${legalPackage.version.versionId}:chunk-${chunkIndex + 1}`,
      chunkIndex,
      sectionIds: sections.map((section) => section.sectionId),
      paragraphIds: sections.flatMap((section) => section.paragraphIds ?? []),
      fromSectionId: sections[0]?.sectionId ?? null,
      fromSectionNo: sections[0]?.sectionNo ?? null,
      toSectionId: sections.at(-1)?.sectionId ?? null,
      toSectionNo: sections.at(-1)?.sectionNo ?? null,
    });
  }

  return chunks;
}

function validatePackageManifest(value: unknown): PackageManifest {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid package manifest");
  }

  const candidate = value as PackageManifest;

  if (!Array.isArray(candidate.codes)) {
    throw new Error("Invalid package manifest: missing codes");
  }

  return candidate;
}
