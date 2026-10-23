const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const { createDemoServer } = require('./demo-content.cjs');

test('demo downloads obey the production size/checksum/paragraph contract', async t => {
  const server = createDemoServer('http://127.0.0.1:8788');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const manifest = await (await fetch(url + '/manifest')).json();
  assert.equal(manifest.codes.length, 1);
  for (const language of Object.values(manifest.codes[0].languages)) {
    const entry = language.versions[0];
    const response = await fetch(url + new URL(entry.download.url).pathname);
    const gzip = Buffer.from(await response.arrayBuffer());
    assert.equal(Number(response.headers.get('content-length')), entry.download.sizeBytes);
    assert.equal(gzip.length, entry.download.sizeBytes);
    assert.equal(createHash('sha256').update(gzip).digest('hex'), entry.download.sha256);
    const json = gunzipSync(gzip);
    assert.equal(json.length, entry.download.uncompressedSizeBytes);
    assert.equal(createHash('sha256').update(json).digest('hex'), entry.download.contentSha256);
    const doc = JSON.parse(json);
    assert.equal(doc.version.authoritative, false);
    assert.equal(doc.version.sourceType, 'synthetic_demo');
    for (const paragraph of doc.paragraphs) {
      const section = doc.sections.find(s => s.sectionId === paragraph.sectionId);
      assert.equal(section.text.slice(paragraph.charStartInSection, paragraph.charEndInSection), paragraph.text);
      assert.ok(section.paragraphIds.includes(paragraph.paragraphId));
    }
    const head = await fetch(url + new URL(entry.download.url).pathname, { method: 'HEAD' });
    assert.equal(Number(head.headers.get('content-length')), gzip.length);
  }
  assert.equal((await fetch(url + '/missing')).status, 404);
  assert.equal((await fetch(url + '/manifest', { method: 'POST' })).status, 405);
});
