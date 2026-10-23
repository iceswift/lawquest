const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");

function createAsyncStorageMock(initialValues = {}) {
  const store = new Map(Object.entries(initialValues));

  return {
    store,
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, String(value));
    },
    async removeItem(key) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    },
  };
}

function createFileSystemMock(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles));

  class Directory {
    constructor(...parts) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri))
        .filter(Boolean)
        .join("/");
    }

    get exists() {
      return files.has(`${this.uri}/.directory`);
    }

    create() {}

    delete() {
      [...files.keys()].forEach((uri) => {
        if (uri === `${this.uri}/.directory` || uri.startsWith(`${this.uri}/`)) {
          files.delete(uri);
        }
      });
    }
  }

  class File {
    constructor(...parts) {
      if (parts.length === 1 && typeof parts[0] === "string") {
        this.uri = parts[0];
      } else {
        const fileName = parts.pop();
        const directory = parts
          .map((part) => (typeof part === "string" ? part : part.uri))
          .filter(Boolean)
          .join("/");
        this.uri = `${directory}/${fileName}`;
      }
    }

    get exists() {
      return files.has(this.uri);
    }

    get size() {
      const value = files.get(this.uri);
      return value ? Buffer.byteLength(value) : 0;
    }

    async bytes() {
      return Buffer.from(files.get(this.uri) ?? "");
    }

    delete() {
      files.delete(this.uri);
    }
  }

  return {
    files,
    expoFileSystem: {
      Directory,
      File,
      Paths: {
        document: "file://document",
      },
    },
    legacyFileSystem: {
      async makeDirectoryAsync(uri) {
        files.set(`${uri}/.directory`, "");
      },
      async readAsStringAsync(uri) {
        if (!files.has(uri)) {
          throw new Error(`Missing mocked file: ${uri}`);
        }

        return files.get(uri);
      },
      async writeAsStringAsync(uri, value) {
        files.set(uri, String(value));
      },
      createDownloadResumable() {
        throw new Error("Downloads are not available in service tests");
      },
    },
  };
}

function createServiceLoader({
  asyncStorage = createAsyncStorageMock(),
  fileSystem = createFileSystemMock(),
  legalContentMock,
} = {}) {
  const cache = new Map();

  function resolveAlias(request) {
    if (request.startsWith("@/")) {
      return path.join(projectRoot, request.slice(2));
    }

    return null;
  }

  function loadTsModule(filePath) {
    const resolvedFilePath = path.resolve(filePath);

    if (cache.has(resolvedFilePath)) {
      return cache.get(resolvedFilePath).exports;
    }

    const source = require("node:fs").readFileSync(resolvedFilePath, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: resolvedFilePath,
    }).outputText;
    const serviceModule = {
      exports: {},
    };

    cache.set(resolvedFilePath, serviceModule);

    const localRequire = (request) => {
      if (request === "@react-native-async-storage/async-storage") {
        return asyncStorage;
      }

      if (request === "expo-file-system") {
        return fileSystem.expoFileSystem;
      }

      if (request === "expo-file-system/legacy") {
        return fileSystem.legacyFileSystem;
      }

      if (request === "@/services/legalContent" && legalContentMock) {
        return legalContentMock;
      }

      const aliasPath = resolveAlias(request);

      if (aliasPath) {
        if (aliasPath.endsWith(".json")) {
          return require(aliasPath);
        }

        return loadTsModule(`${aliasPath}.ts`);
      }

      return Module.createRequire(resolvedFilePath)(request);
    };

    const runner = new Function(
      "require",
      "module",
      "exports",
      "__filename",
      "__dirname",
      output,
    );

    runner(
      localRequire,
      serviceModule,
      serviceModule.exports,
      resolvedFilePath,
      path.dirname(resolvedFilePath),
    );

    return serviceModule.exports;
  }

  return {
    asyncStorage,
    fileSystem,
    loadService(name) {
      return loadTsModule(path.join(projectRoot, "services", `${name}.ts`));
    },
  };
}

async function testSavedItemsMigration() {
  const asyncStorage = createAsyncStorageMock({
    "lawquest.savedSections.v1": JSON.stringify([
      {
        codeId: "thai-criminal-code",
        language: "en",
        sectionId: "section-288",
        sectionNo: "288",
        title: "Section 288",
        excerpt: "   A   person who kills another person   ",
        savedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        codeId: "thai-criminal-code",
        language: "th",
        sectionId: "",
        sectionNo: "289",
        title: "Invalid",
      },
    ]),
  });
  const { loadService } = createServiceLoader({
    asyncStorage,
    legalContentMock: {
      getManifestCode(codeId) {
        return codeId === "thai-criminal-code"
          ? { title: "Criminal Code" }
          : null;
      },
    },
  });
  const savedItems = loadService("savedItems");
  const items = await savedItems.readSavedSectionItems();

  assert.equal(items.length, 1);
  assert.equal(items[0].id, "section:thai-criminal-code:en:section-288");
  assert.equal(items[0].display.codeTitle, "Criminal Code");
  assert.equal(items[0].display.excerpt, "A person who kills another person");
  assert.deepEqual(items[0].source, {
    authoritative: false,
    reviewStatus: "needs_legal_review",
  });

  const savedKeys = await savedItems.readSavedSectionKeys();
  assert.equal(savedKeys.has("thai-criminal-code:en:section-288"), true);

  const stored = JSON.parse(
    asyncStorage.store.get("lawquest.savedItems.v2"),
  );
  assert.equal(stored.schemaVersion, 2);
  assert.equal(stored.items.length, 1);

  await savedItems.saveSectionItem({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-289",
    sectionNo: "289",
    title: "Section 289",
    authoritative: true,
    sourceType: "ocs",
    translationStatus: "official",
  });

  const savedBeforeOrganizationUpdate = await savedItems.readSavedSectionItems();
  const section289BeforeUpdate = savedBeforeOrganizationUpdate.find(
    (item) => item.target.sectionId === "section-289",
  );
  assert.ok(section289BeforeUpdate);

  await savedItems.updateSavedItemOrganization(section289BeforeUpdate.id, {
    folderId: "  Exam  ",
    tags: [" criminal ", "criminal", "", "homicide"],
    isPinned: true,
  });

  const updated = await savedItems.readSavedSectionItems();
  const section289 = updated.find(
    (item) =>
      item.target.sectionId === "section-289" &&
      item.target.versionId === "th-ocs-2026-04-28",
  );
  assert.ok(section289);
  assert.equal(section289.target.versionId, "th-ocs-2026-04-28");
  assert.equal(section289.organization.folderId, "Exam");
  assert.deepEqual(section289.organization.tags, ["criminal", "homicide"]);
  assert.equal(section289.organization.isPinned, true);

  await savedItems.saveSectionItem({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2027-01-01",
    sectionId: "section-289",
    sectionNo: "289",
    title: "Section 289 future",
  });
  assert.equal(
    (await savedItems.readSavedSectionItems()).filter(
      (item) => item.target.sectionId === "section-289",
    ).length,
    2,
  );
  await savedItems.removeSavedSection({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-289",
  });
  const afterVersionedRemove = await savedItems.readSavedSectionItems();
  assert.equal(
    afterVersionedRemove.some(
      (item) => item.target.versionId === "th-ocs-2026-04-28",
    ),
    false,
  );
  assert.equal(
    afterVersionedRemove.some(
      (item) => item.target.versionId === "th-ocs-2027-01-01",
    ),
    true,
  );
}

async function testNotesMigration() {
  const asyncStorage = createAsyncStorageMock({
    "@lawquest_canvas_cards": JSON.stringify([
      {
        id: "card-1",
        article: "Section 288 memo",
        law: "Criminal Law",
        analysis: "Main analysis",
        quote: "Quote text",
        issue: "Issue text",
        rule: "Rule text",
        conclusion: "Conclusion text",
        tags: ["exam", "criminal"],
        isPinned: true,
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]),
  });
  const { loadService } = createServiceLoader({
    asyncStorage,
  });
  const notes = loadService("notes");
  const migrated = await notes.readNotes();

  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].id, "card-1");
  assert.equal(migrated[0].title, "Section 288 memo");
  assert.equal(migrated[0].folder, "Criminal Law");
  assert.equal(migrated[0].isPinned, true);
  assert.equal(migrated[0].blocks[0].type, "paragraph");
  assert.match(migrated[0].body, /Main analysis/);
  assert.match(migrated[0].body, /Tags: exam, criminal/);

  const stored = JSON.parse(asyncStorage.store.get("@lawquest_notes_v2"));
  assert.equal(stored.schemaVersion, 3);
  assert.equal(stored.notes.length, 1);

  const normalizedLinks = notes.normalizeLinkedSections(
    [
      {
        codeId: "thai-criminal-code",
        language: "th",
        versionId: "th-ocs-2026-04-28",
        sectionId: "section-288",
        sectionNo: "288",
        title: "Murder",
      },
      {
        codeId: "thai-criminal-code",
        language: "th",
        sectionId: "section-288",
        sectionNo: "288",
        title: "Murder updated",
      },
      {
        codeId: "thai-criminal-code",
        language: "th",
        versionId: "th-ocs-2027-01-01",
        sectionId: "section-288",
        sectionNo: "288",
        title: "Murder future version",
      },
    ],
    ["legacy-only"],
  );

  assert.equal(normalizedLinks.length, 4);
  const section288 = normalizedLinks.find(
    (section) =>
      section.sectionId === "section-288" &&
      section.versionId === "th-ocs-2026-04-28",
  );
  assert.ok(section288);
  assert.equal(section288.versionId, "th-ocs-2026-04-28");
  assert.equal(section288.title, "Murder");
  assert.ok(
    normalizedLinks.find(
      (section) =>
        section.sectionId === "section-288" &&
        !section.versionId &&
        section.title === "Murder updated",
    ),
  );
  assert.ok(
    normalizedLinks.find(
      (section) =>
        section.sectionId === "section-288" &&
        section.versionId === "th-ocs-2027-01-01",
    ),
  );
  assert.equal(
    notes.formatLinkedSection(section288),
    "\u0E21\u0E32\u0E15\u0E23\u0E32 288 - Murder",
  );

  const versionedNotes = [
    {
      ...notes.createEmptyNote(),
      id: "note-version-a",
      title: "Version A",
      linkedSectionIds: ["section-288"],
      linkedSections: [
        {
          codeId: "thai-criminal-code",
          language: "th",
          versionId: "th-ocs-2026-04-28",
          sectionId: "section-288",
        },
      ],
    },
    {
      ...notes.createEmptyNote(),
      id: "note-version-b",
      title: "Version B",
      linkedSectionIds: ["section-288"],
      linkedSections: [
        {
          codeId: "thai-criminal-code",
          language: "th",
          versionId: "th-ocs-2027-01-01",
          sectionId: "section-288",
        },
      ],
    },
  ];
  await notes.saveNotes(versionedNotes);

  const versionANotes = await notes.readNotesForSection({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-288",
  });
  assert.equal(versionANotes.length, 1);
  assert.equal(versionANotes[0].id, "note-version-a");
  assert.equal(await notes.readNoteCountForSection("section-288"), 2);
}

async function testHighlightsStorageModel() {
  const asyncStorage = createAsyncStorageMock({
    "lawquest.highlights.v1": JSON.stringify({
      schemaVersion: 1,
      highlights: [
        {
          id: "invalid-range",
          target: {
            codeId: "thai-criminal-code",
            language: "th",
            versionId: "th-ocs-2026-04-28",
            sectionId: "section-288",
            paragraphId: "section-288-p-1",
            startOffset: 12,
            endOffset: 12,
          },
          selectedText: "invalid",
          color: "yellow",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  });
  const { loadService } = createServiceLoader({
    asyncStorage,
  });
  const highlights = loadService("highlights");

  assert.equal((await highlights.readHighlights()).length, 0);

  await highlights.saveHighlight({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-288",
    paragraphId: "section-288-p-1",
    startOffset: 14,
    endOffset: 24,
    selectedText: "\u0E06\u0E48\u0E32\u0E1C\u0E39\u0E49\u0E2D\u0E37\u0E48\u0E19",
    color: "yellow",
    sectionNo: "288",
    title: "Murder",
  });
  await highlights.saveHighlight({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2027-01-01",
    sectionId: "section-288",
    paragraphId: "section-288-p-1",
    startOffset: 14,
    endOffset: 24,
    selectedText: "future text",
    color: "blue",
    sectionNo: "288",
    title: "Future murder",
  });

  const versionA = await highlights.readHighlightsForSection({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-288",
  });
  const versionB = await highlights.readHighlightsForSection({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2027-01-01",
    sectionId: "section-288",
  });

  assert.equal(versionA.length, 1);
  assert.equal(versionA[0].target.versionId, "th-ocs-2026-04-28");
  assert.equal(versionB.length, 1);
  assert.equal(versionB[0].target.versionId, "th-ocs-2027-01-01");

  await highlights.saveHighlight({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-288",
    paragraphId: "section-288-p-1",
    startOffset: 14,
    endOffset: 24,
    selectedText: "\u0E06\u0E48\u0E32\u0E1C\u0E39\u0E49\u0E2D\u0E37\u0E48\u0E19",
    color: "green",
    sectionNo: "288",
    title: "Murder updated",
  });

  const afterUpdate = await highlights.readHighlights();
  const updatedVersionA = afterUpdate.find(
    (highlight) => highlight.target.versionId === "th-ocs-2026-04-28",
  );

  assert.equal(afterUpdate.length, 2);
  assert.equal(updatedVersionA.color, "green");
  assert.equal(updatedVersionA.target.title, "Murder updated");

  const paragraphHighlights = await highlights.readHighlightsForParagraph({
    codeId: "thai-criminal-code",
    language: "th",
    versionId: "th-ocs-2026-04-28",
    sectionId: "section-288",
    paragraphId: "section-288-p-1",
  });

  assert.equal(paragraphHighlights.length, 1);

  const stored = JSON.parse(asyncStorage.store.get("lawquest.highlights.v1"));
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.highlights.length, 2);
}

async function testLegalPackageRegistryRepair() {
  const { sha256 } = require("@noble/hashes/sha2.js");
  const { bytesToHex } = require("@noble/hashes/utils.js");
  const validPackageText = JSON.stringify({
    schemaVersion: 3,
    packageId: "thai-criminal-code-th-test",
    code: {
      codeId: "thai-criminal-code",
      title: "Criminal Code",
    },
    language: "th",
    version: {
      versionId: "th-ocs-2026-04-28",
      basedOnVersionId: null,
      reviewStatus: null,
      disclaimer: null,
    },
    sectionCount: 0,
    sections: [],
  });
  const validContentSha = bytesToHex(
    sha256(new TextEncoder().encode(validPackageText)),
  );
  const asyncStorage = createAsyncStorageMock({
    "lawquest.installedLegalPackages.v1": JSON.stringify({
      "thai-criminal-code": {
        codeId: "thai-criminal-code",
        installedAt: "2026-03-01T00:00:00.000Z",
        packages: {
          th: {
            packageId: "thai-criminal-code-th-test",
            versionId: "th-ocs-2026-04-28",
            sha256: "compressed-sha",
            contentSha256: validContentSha,
            sizeBytes: Buffer.byteLength(validPackageText),
            sourceUrl: "https://example.com/th.json.gz",
            localUri: "file://valid-package.json",
            cacheStatus: "downloaded",
            storageFormat: "json",
            checksumStatus: "verified",
          },
          en: {
            packageId: "thai-criminal-code-en-test",
            versionId: "en-ai-draft-2026-04-29",
            sha256: "missing-sha",
            sizeBytes: 10,
            sourceUrl: "https://example.com/en.json.gz",
            localUri: "file://missing-package.json",
            cacheStatus: "downloaded",
            storageFormat: "json",
            checksumStatus: "verified",
          },
          draft: {
            packageId: "thai-criminal-code-draft-test",
            versionId: "draft",
            sha256: "bad-sha",
            sizeBytes: 10,
            sourceUrl: "https://example.com/draft.json.gz",
            localUri: "file://bad-package.json",
            cacheStatus: "downloaded",
            storageFormat: "json",
            checksumStatus: "verified",
          },
        },
      },
    }),
  });
  const fileSystem = createFileSystemMock({
    "file://valid-package.json": validPackageText,
    "file://bad-package.json": "{ bad json",
  });
  const { loadService } = createServiceLoader({
    asyncStorage,
    fileSystem,
  });
  const legalContent = loadService("legalContent");
  const result = await legalContent.repairPackageCache("thai-criminal-code");

  assert.equal(result.repaired, true);
  assert.deepEqual(
    result.removedLanguages.map((entry) => [
      entry.language,
      entry.reason,
    ]),
    [
      ["en", "missing_file"],
      ["draft", "invalid_json"],
    ],
  );
  assert.equal(fileSystem.files.has("file://bad-package.json"), false);

  const repairedRegistry = JSON.parse(
    asyncStorage.store.get("lawquest.installedLegalPackages.v1"),
  );
  assert.deepEqual(
    Object.keys(repairedRegistry["thai-criminal-code"].packages),
    ["th"],
  );
}

async function testLegalPackageRegistryNormalization() {
  const asyncStorage = createAsyncStorageMock({
    "lawquest.installedLegalPackages.v1": JSON.stringify({
      "thai-criminal-code": {
        codeId: "thai-criminal-code",
        installedAt: "2026-03-01T00:00:00.000Z",
        packages: {
          th: {
            packageId: "thai-criminal-code-th-test",
            versionId: "th-ocs-2026-04-28",
            sha256: "compressed-sha",
            sizeBytes: 123,
            sourceUrl: "https://example.com/th.json.gz",
            localUri: "file://thai-criminal-code.json",
            cacheStatus: "downloaded",
          },
          en: {
            packageId: "thai-criminal-code-en-test",
            versionId: "en-ai-draft-2026-04-29",
            sha256: "compressed-sha-en",
            sizeBytes: 456,
            sourceUrl: "https://example.com/en.json.gz",
            localUri: "file://thai-criminal-code-en.json.gz",
            cacheStatus: "downloaded",
          },
        },
      },
    }),
  });
  const fileSystem = createFileSystemMock({});
  const { loadService } = createServiceLoader({
    asyncStorage,
    fileSystem,
  });
  const legalContent = loadService("legalContent");
  const registry = await legalContent.getInstalledPackageRegistry();

  assert.equal(
    registry["thai-criminal-code"].packages.th.storageFormat,
    "json",
  );
  assert.equal(
    registry["thai-criminal-code"].packages.en.storageFormat,
    "gzip",
  );
  assert.equal(
    registry["thai-criminal-code"].packages.th.checksumStatus,
    "verified",
  );
  assert.equal(
    JSON.parse(
      asyncStorage.store.get("lawquest.installedLegalPackages.v1"),
    )["thai-criminal-code"].packages.th.storageFormat,
    "json",
  );
}

async function testReaderPackageSidecar() {
  const { sha256 } = require("@noble/hashes/sha2.js");
  const { bytesToHex } = require("@noble/hashes/utils.js");
  const packageText = JSON.stringify({
    schemaVersion: 3,
    packageId: "thai-criminal-code-th-test",
    code: {
      codeId: "thai-criminal-code",
      title: "Criminal Code",
    },
    language: "th",
    version: {
      versionId: "th-ocs-2026-04-28",
      basedOnVersionId: null,
      reviewStatus: null,
      disclaimer: null,
    },
    structure: {
      nodes: [],
    },
    sectionMetadata: {
      sections: [],
      structurePathEnabled: false,
      structurePathVersion: null,
    },
    sectionCount: 1,
    paragraphCount: 1,
    sections: [
      {
        sectionId: "section-1",
        sectionNo: "1",
        text: "Section 1 text",
        paragraphIds: ["section-1-p-1"],
      },
    ],
    paragraphs: [
      {
        paragraphId: "section-1-p-1",
        codeId: "thai-criminal-code",
        versionId: "th-ocs-2026-04-28",
        sectionId: "section-1",
        sectionNo: "1",
        paragraphIndex: 0,
        text: "Section 1 text",
        charStartInSection: 0,
        charEndInSection: 14,
      },
    ],
    chunking: {
      schemaVersion: 1,
      strategy: "fixed_section_window",
      chunkSizeSections: 50,
      chunkCount: 1,
      chunks: [
        {
          chunkId: "thai-criminal-code:th:th-ocs-2026-04-28:chunk-1",
          chunkIndex: 0,
          sectionIds: ["section-1"],
          paragraphIds: ["section-1-p-1"],
          fromSectionId: "section-1",
          fromSectionNo: "1",
          toSectionId: "section-1",
          toSectionNo: "1",
        },
      ],
    },
  });
  const asyncStorage = createAsyncStorageMock({
    "lawquest.installedLegalPackages.v1": JSON.stringify({
      "thai-criminal-code": {
        codeId: "thai-criminal-code",
        installedAt: "2026-03-01T00:00:00.000Z",
        packages: {
          th: {
            packageId: "thai-criminal-code-th-test",
            versionId: "th-ocs-2026-04-28",
            sha256: "compressed-sha",
            contentSha256: bytesToHex(
              sha256(new TextEncoder().encode(packageText)),
            ),
            sizeBytes: Buffer.byteLength(packageText),
            sourceUrl: "https://example.com/th.json.gz",
            localUri: "file://reader-source.json",
            cacheStatus: "downloaded",
            storageFormat: "json",
            checksumStatus: "verified",
          },
        },
      },
    }),
  });
  const fileSystem = createFileSystemMock({
    "file://reader-source.json": packageText,
  });
  const firstLoader = createServiceLoader({
    asyncStorage,
    fileSystem,
  });
  const firstLegalContent = firstLoader.loadService("legalContent");
  const firstRead = await firstLegalContent.readReaderPackageForReader(
    "thai-criminal-code",
    "th",
  );

  assert.ok(firstRead);
  assert.equal(firstRead.sections.length, 1);
  assert.equal(firstRead.paragraphs, undefined);
  assert.equal(firstRead.chunking, undefined);
  assert.equal(fileSystem.files.has("file://reader-source.reader-index.json"), true);
  assert.equal(
    fileSystem.files.has("file://reader-source.reader-chunks/chunk-1.json"),
    true,
  );
  const indexOnlyRead = await firstLegalContent.readReaderPackageIndexForReader(
    "thai-criminal-code",
    "th",
  );
  const hydratedSections =
    await firstLegalContent.readReaderPackageSectionsForReader(
      "thai-criminal-code",
      "th",
      ["section-1"],
    );
  const hydratedParagraphs =
    await firstLegalContent.readReaderPackageParagraphsForReader(
      "thai-criminal-code",
      "th",
      ["section-1"],
    );

  assert.ok(indexOnlyRead);
  assert.equal(indexOnlyRead.sections[0].text, "");
  assert.equal(hydratedSections.length, 1);
  assert.equal(hydratedSections[0].text, "Section 1 text");
  assert.equal(hydratedParagraphs.length, 1);
  assert.equal(hydratedParagraphs[0].paragraphId, "section-1-p-1");
  assert.equal(hydratedParagraphs[0].text, "Section 1 text");

  fileSystem.files.set("file://reader-source.json", "{ invalid full package");

  const secondLoader = createServiceLoader({
    asyncStorage,
    fileSystem,
  });
  const secondRead = await secondLoader
    .loadService("legalContent")
    .readReaderPackageForReader("thai-criminal-code", "th");

  assert.ok(secondRead);
  assert.equal(secondRead.sections[0].text, "Section 1 text");

  fileSystem.files.delete("file://reader-source.reader-index.json");
  fileSystem.files.delete("file://reader-source.reader-chunks/chunk-1.json");
  fileSystem.files.set("file://reader-source.json", packageText);

  const repairLoader = createServiceLoader({
    asyncStorage,
    fileSystem,
  });
  const repairResult = await repairLoader
    .loadService("legalContent")
    .repairPackageCache("thai-criminal-code");

  assert.deepEqual(repairResult.rebuiltReaderSidecars, [
    {
      codeId: "thai-criminal-code",
      language: "th",
    },
  ]);
  assert.equal(fileSystem.files.has("file://reader-source.reader-index.json"), true);
}

async function testLegalReaderSearchBehavior() {
  const { loadService } = createServiceLoader();
  const selectors = loadService("legalReaderSelectors");
  const legalPackage = {
    code: {
      codeId: "thai-criminal-code",
      title: "Criminal Code",
    },
    language: "th",
    version: {
      versionId: "th-ocs-2026-04-28",
      basedOnVersionId: null,
      reviewStatus: null,
      disclaimer: null,
    },
    sections: [
      {
        sectionId: "section-287",
        sectionNo: "287",
        text: "\u0E21\u0E32\u0E15\u0E23\u0E32 287 \u0E1C\u0E39\u0E49\u0E43\u0E14\u0E0A\u0E48\u0E27\u0E22\u0E0B\u0E48\u0E2D\u0E19\u0E40\u0E23\u0E49\u0E19",
      },
      {
        sectionId: "section-288",
        sectionNo: "288",
        text: "\u0E21\u0E32\u0E15\u0E23\u0E32 288 \u0E1C\u0E39\u0E49\u0E43\u0E14\u0E06\u0E48\u0E32\u0E1C\u0E39\u0E49\u0E2D\u0E37\u0E48\u0E19",
      },
      {
        sectionId: "section-tax",
        sectionNo: "100",
        text: "\u0E20\u0E32\u0E29\u0E35 appeal \u0E19\u0E34\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21",
      },
    ],
  };
  const derivedPackage = selectors.getLegalReaderDerivedPackage(
    legalPackage,
    "th",
  );

  const sectionIntent = selectors.parseLegalReaderSearchIntent("288");
  const sectionResults = selectors.selectLegalReaderSections({
    derivedPackage,
    searchIntent: sectionIntent,
    searchScope: "all",
    selectedStructureNodeId: null,
  });
  assert.equal(sectionResults[0].sectionId, "section-288");

  ["\u0E06\u0E48\u0E32", "\u0E19\u0E34\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21", "\u0E20\u0E32\u0E29\u0E35", "appeal"].forEach(
    (query) => {
      const intent = selectors.parseLegalReaderSearchIntent(query);
      const results = selectors.selectLegalReaderSections({
        derivedPackage,
        searchIntent: intent,
        searchScope: "all",
        selectedStructureNodeId: null,
      });

      assert.ok(results.length > 0, `Expected search results for ${query}`);
    },
  );
}

async function testLegalReaderSearchBaselineFixtures() {
  const { loadService } = createServiceLoader();
  const selectors = loadService("legalReaderSelectors");
  const fixturesRoot = path.join(
    projectRoot,
    "scripts",
    "fixtures",
    "legal-search",
  );
  const fixtures = new Map();
  const loadFixture = (relativePath) => {
    if (!fixtures.has(relativePath)) {
      fixtures.set(relativePath, require(path.join(fixturesRoot, relativePath)));
    }

    return fixtures.get(relativePath);
  };
  const baselineCases = [
    {
      label: "Criminal exact section number",
      packagePath: path.join(
        "thai-criminal-code",
        "th",
        "th-ocs-2026-04-28.json",
      ),
      query: "288",
      expectedFirstSectionNo: "288",
    },
    {
      label: "Criminal Thai homicide term",
      packagePath: path.join(
        "thai-criminal-code",
        "th",
        "th-ocs-2026-04-28.json",
      ),
      query: "\u0E06\u0E48\u0E32",
      expectedSectionId: "thai-criminal-code-section-288",
    },
    {
      label: "Civil juristic act term",
      packagePath: path.join(
        "thai-civil-commercial-code",
        "th",
        "th-ocs-2026-04-28.json",
      ),
      query: "\u0E19\u0E34\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21",
      expectedSectionId: "thai-civil-commercial-code-section-149",
    },
    {
      label: "Revenue tax term",
      packagePath: path.join(
        "thai-revenue-code",
        "th",
        "th-ocs-2026-04-28.json",
      ),
      query: "\u0E20\u0E32\u0E29\u0E35",
      minimumResults: 2,
    },
    {
      label: "English appeal term",
      packagePath: path.join(
        "thai-criminal-code",
        "en",
        "en-ai-draft-2026-04-29.json",
      ),
      query: "appeal",
      expectedSectionId: "thai-criminal-code-section-54",
    },
  ];

  baselineCases.forEach((baseline) => {
    const legalPackage = loadFixture(baseline.packagePath);
    const derivedPackage = selectors.getLegalReaderDerivedPackage(
      legalPackage,
      legalPackage.language,
    );
    const results = selectors.selectLegalReaderSections({
      derivedPackage,
      searchIntent: selectors.parseLegalReaderSearchIntent(baseline.query),
      searchScope: "all",
      selectedStructureNodeId: null,
    });

    assert.ok(
      results.length > 0,
      `Expected baseline search results for ${baseline.label}`,
    );

    if (baseline.expectedFirstSectionNo) {
      assert.equal(
        results[0].sectionNo,
        baseline.expectedFirstSectionNo,
        `Expected first result for ${baseline.label}`,
      );
    }

    if (baseline.expectedSectionId) {
      assert.ok(
        results.some(
          (section) => section.sectionId === baseline.expectedSectionId,
        ),
        `Expected ${baseline.expectedSectionId} in ${baseline.label}`,
      );
    }

    if (baseline.minimumResults) {
      assert.ok(
        results.length >= baseline.minimumResults,
        `Expected at least ${baseline.minimumResults} results for ${baseline.label}`,
      );
    }
  });
}

const tests = [
  ["Saved items migration", testSavedItemsMigration],
  ["Notes migration", testNotesMigration],
  ["Highlights storage model", testHighlightsStorageModel],
  ["Legal package registry repair", testLegalPackageRegistryRepair],
  ["Legal package registry normalization", testLegalPackageRegistryNormalization],
  ["Reader package sidecar", testReaderPackageSidecar],
  ["Legal reader search behavior", testLegalReaderSearchBehavior],
  ["Legal reader search baseline fixtures", testLegalReaderSearchBaselineFixtures],
];

(async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`ok - ${name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
