const http = require('node:http');
const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const { spawn } = require('node:child_process');
const path = require('node:path');

const codeId = 'lawquest-demo-library';
const versionId = 'demo-v1';
const disclaimer = 'Fictional library rules for software demonstration. Not Thai law or legal advice.';
const samples = {
  en: [
    'Demo content. These fictional library rules are for testing LawQuest only. They are not Thai law.',
    'A visitor may borrow one demonstration book at a time.\n\nReturn the book to the sample shelf after reading.',
    'Keep the reading room quiet. You can highlight this sentence and attach a study note.',
  ],
  th: [
    'ข้อมูลสาธิต กติกาห้องสมุดนี้เป็นเรื่องสมมติเพื่อทดสอบ LawQuest เท่านั้น ไม่ใช่กฎหมายไทย',
    'ผู้เยี่ยมชมยืมหนังสือสาธิตได้ครั้งละหนึ่งเล่ม\n\nเมื่ออ่านเสร็จให้นำหนังสือคืนชั้นตัวอย่าง',
    'โปรดรักษาความเงียบในห้องอ่านหนังสือ คุณสามารถไฮไลต์ประโยคนี้และเพิ่มโน้ตได้',
  ],
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function buildDemo(baseUrl) {
  const objects = new Map();
  const languages = {};
  for (const [language, texts] of Object.entries(samples)) {
    const sections = texts.map((text, index) => ({
      sectionId: `${codeId}-section-${index + 1}`,
      sectionNo: String(index + 1),
      sectionLabel: language === 'th' ? `มาตรา ${index + 1}` : `Section ${index + 1}`,
      headingFootnoteRefs: [], bodyFootnoteRefs: [], status: 'demo_only', text,
      paragraphIds: text.split('\n\n').map((_, p) => `${codeId}-section-${index + 1}-p-${p + 1}`),
    }));
    const paragraphs = sections.flatMap(section => {
      let offset = 0;
      return section.text.split('\n\n').map((text, paragraphIndex) => {
        const start = offset;
        offset += text.length + 2;
        return { paragraphId: section.paragraphIds[paragraphIndex], codeId, versionId,
          sectionId: section.sectionId, sectionNo: section.sectionNo, paragraphIndex,
          text, charStartInSection: start, charEndInSection: start + text.length };
      });
    });
    const title = 'DEMO - Fictional Library Rules';
    const node = { id: 'demo-chapter', kind: 'chapter', rank: 1, label: 'กติกาสมมติ',
      labels: { th: 'กติกาสมมติ', en: 'Fictional rules' }, parentId: null,
      path: ['demo-chapter'], pathLabels: ['กติกาสมมติ'], sectionIds: sections.map(s => s.sectionId) };
    const document = {
      schemaVersion: 3, packageId: `${codeId}:${language}:${versionId}`,
      code: { codeId, title }, language,
      version: { versionId, basedOnVersionId: null, sourceType: 'synthetic_demo',
        authoritative: false, reviewStatus: 'demo_only', disclaimer },
      structure: { schemaVersion: 1, nodeCount: 1, nodes: [node] },
      sectionMetadata: { structurePathEnabled: true, structurePathVersion: 1,
        sections: sections.map(s => ({ id: s.sectionId, sectionNo: s.sectionNo, structurePath: [node.id] })) },
      sectionCount: sections.length, paragraphCount: paragraphs.length, sections, paragraphs, appendices: [],
    };
    const json = Buffer.from(JSON.stringify(document) + '\n');
    const gzip = gzipSync(json);
    const key = `objects/${codeId}/${language}/${versionId}.json`;
    objects.set('/' + key, { bytes: json, type: 'application/json' });
    objects.set('/' + key + '.gz', { bytes: gzip, type: 'application/gzip' });
    languages[language] = { currentVersionId: versionId, versions: [{
      packageId: document.packageId, language, versionId, basedOnVersionId: null,
      sourceType: 'synthetic_demo', authoritative: false, reviewStatus: 'demo_only',
      sectionCount: sections.length, paragraphCount: paragraphs.length,
      download: { sizeBytes: gzip.length, uncompressedSizeBytes: json.length,
        sha256: hash(gzip), contentSha256: hash(json), url: `${baseUrl}/${key}.gz` },
      paths: { json: key, gzip: key + '.gz' },
    }] };
  }
  const manifest = { schemaVersion: 1, baseUrl, summary: { codeCount: 1, packageCount: 2 },
    codes: [{ codeId, title: 'DEMO - Fictional Library Rules', defaultLanguage: 'en', languages, packageCount: 2 }] };
  return { manifest, objects };
}

function createDemoServer(baseUrl) {
  const { manifest, objects } = buildDemo(baseUrl);
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const object = pathname === '/manifest'
      ? { bytes: Buffer.from(JSON.stringify(manifest)), type: 'application/json' }
      : objects.get(pathname);
    if (!object) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': object.type, 'Content-Length': object.bytes.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : object.bytes);
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const readArg = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const port = Number(readArg('--content-port') || 8788);
  // Android Emulator reaches the host through 10.0.2.2; a phone needs a LAN URL.
  const baseUrl = (readArg('--public-url') || `http://10.0.2.2:${port}`).replace(/\/$/, '');
  const host = readArg('--host') || '127.0.0.1';
  const server = createDemoServer(baseUrl);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log(`Demo content: http://${host}:${port}/manifest`);
    console.log(`Device manifest: ${baseUrl}/manifest (fictional data only)`);
    if (!args.includes('--expo')) return;
    const expoArgs = [require.resolve('expo/bin/cli'), 'start', '--port', readArg('--expo-port') || '8085'];
    if (args.includes('--android')) expoArgs.push('--android');
    const child = spawn(process.execPath, expoArgs, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
      env: { ...process.env, EXPO_PUBLIC_DEMO_MODE: 'true', EXPO_PUBLIC_LEGAL_MANIFEST_URL: `${baseUrl}/manifest`,
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'demo-placeholder' } });
    child.on('error', error => { console.error(error.message); server.close(); process.exitCode = 1; });
    child.on('exit', code => { server.close(); process.exitCode = code || 0; });
    process.on('SIGINT', () => { child.kill(); server.close(); });
    process.on('SIGTERM', () => { child.kill(); server.close(); });
  });
}

module.exports = { buildDemo, createDemoServer };
