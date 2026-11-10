const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.DMS_STORAGE_DIR = storageDirectory;

const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento', async (t) => {
  const server = app.listen(0);
  t.after(() => {
    server.close();
    rmSync(storageDirectory, { recursive: true, force: true });
    delete process.env.DMS_STORAGE_DIR;
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const content = 'conteúdo do documento';
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'documento.txt');
  form.append('owner', 'usuario-teste');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'documento.txt');
  assert.strictEqual(uploadedDocument.size, Buffer.byteLength(content));
  assert.strictEqual(uploadedDocument.owner, 'usuario-teste');
  assert.ok(uploadedDocument.id);
  assert.ok(uploadedDocument.uploadedAt);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual(await listResponse.json(), [uploadedDocument]);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), content);

  const missingDocumentResponse = await fetch(
    `${baseUrl}/documents/documento-inexistente/download`,
  );
  assert.strictEqual(missingDocumentResponse.status, 404);
});
