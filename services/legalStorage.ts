import {
  getInstalledCurrentPackageLanguages,
  LegalPackageDocument,
  prefetchPackageForReader,
  readPackageForReader,
  readReaderPackageIndexForReader,
  readReaderPackageForReader,
  readReaderPackageParagraphsForReader,
  readReaderPackageSectionWindowForReader,
  readReaderPackageSectionsForReader,
} from "@/services/legalContent";
import {
  LegalContentQuery,
  LegalSectionLocation,
  normalizeLanguage,
} from "@/services/legalLocations";

export type { LegalPackageDocument } from "@/services/legalContent";
export type { LegalContentQuery, LegalSectionLocation } from "@/services/legalLocations";
export type LegalSectionRecord = LegalPackageDocument["sections"][number];
export type LegalParagraphRecord = NonNullable<
  LegalPackageDocument["paragraphs"]
>[number];
export type LegalSectionMetadataRecord = NonNullable<
  LegalPackageDocument["sectionMetadata"]
>["sections"][number];
export type LegalStructureNodeRecord = NonNullable<
  NonNullable<LegalPackageDocument["structure"]>["nodes"]
>[number];

export async function readLegalPackage({
  codeId,
  language,
}: LegalContentQuery): Promise<LegalPackageDocument | null> {
  return readPackageForReader(codeId, normalizeLanguage(language));
}

export async function readLegalReaderPackage({
  codeId,
  language,
}: LegalContentQuery): Promise<LegalPackageDocument | null> {
  return readReaderPackageForReader(codeId, normalizeLanguage(language));
}

export async function readLegalReaderIndexPackage({
  codeId,
  language,
}: LegalContentQuery): Promise<LegalPackageDocument | null> {
  return readReaderPackageIndexForReader(codeId, normalizeLanguage(language));
}

export async function readLegalReaderSections({
  codeId,
  language,
  sectionIds,
}: LegalContentQuery & {
  sectionIds: string[];
}): Promise<LegalSectionRecord[]> {
  return readReaderPackageSectionsForReader(
    codeId,
    normalizeLanguage(language),
    sectionIds,
  );
}

export async function readLegalReaderParagraphs({
  codeId,
  language,
  sectionIds,
}: LegalContentQuery & {
  sectionIds: string[];
}): Promise<LegalParagraphRecord[]> {
  return readReaderPackageParagraphsForReader(
    codeId,
    normalizeLanguage(language),
    sectionIds,
  );
}

export async function readLegalReaderSectionWindow({
  after,
  before,
  codeId,
  language,
  sectionId,
}: LegalContentQuery & {
  after?: number;
  before?: number;
  sectionId?: string | null;
}): Promise<LegalSectionRecord[]> {
  return readReaderPackageSectionWindowForReader(
    codeId,
    normalizeLanguage(language),
    {
      after,
      before,
      sectionId,
    },
  );
}

export async function prefetchLegalPackage({
  codeId,
  language,
}: LegalContentQuery): Promise<LegalPackageDocument | null> {
  return prefetchPackageForReader(codeId, normalizeLanguage(language));
}

export async function readInstalledLegalPackageLanguages(codeId: string) {
  return getInstalledCurrentPackageLanguages(codeId);
}

export async function removeLegalCodeFromStorage(codeId: string) {
  return;
}

export async function readLegalSection({
  codeId,
  language,
  sectionId,
}: LegalSectionLocation): Promise<{
  legalPackage: LegalPackageDocument;
  section: LegalSectionRecord;
  metadata: LegalSectionMetadataRecord | null;
} | null> {
  const legalPackage = await readLegalPackage({ codeId, language });
  const section =
    legalPackage?.sections.find((item) => item.sectionId === sectionId) ??
    null;

  if (!legalPackage || !section) {
    return null;
  }

  const metadata =
    legalPackage.sectionMetadata?.sections.find(
      (item) => item.id === sectionId,
    ) ?? null;

  return {
    legalPackage,
    metadata,
    section,
  };
}

export function getLegalParagraphsForSection(
  legalPackage: LegalPackageDocument | null,
  sectionId: string,
) {
  if (!legalPackage?.paragraphs) {
    return [];
  }

  return legalPackage.paragraphs
    .filter((paragraph) => paragraph.sectionId === sectionId)
    .sort((left, right) => left.paragraphIndex - right.paragraphIndex);
}

export function getLegalChunkForSection(
  legalPackage: LegalPackageDocument | null,
  sectionId: string,
) {
  return (
    legalPackage?.chunking?.chunks.find((chunk) =>
      chunk.sectionIds.includes(sectionId),
    ) ?? null
  );
}

export function getLegalStructureNodes(
  legalPackage: LegalPackageDocument | null,
) {
  return legalPackage?.structure?.nodes ?? [];
}
