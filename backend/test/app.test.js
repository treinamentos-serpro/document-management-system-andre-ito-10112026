const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtemp, readdir, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('backend de documentos', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'dms-test-'));
  const storageDirectory = path.join(temporaryDirectory, 'storage');
  const previousStorage = process.env.STORAGE_DIR;
  const previousLimit = process.env.MAX_FILE_SIZE_BYTES;
  process.env.STORAGE_DIR = storageDirectory;
  process.env.MAX_FILE_SIZE_BYTES = '128';
  const app = require('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (previousStorage === undefined) delete process.env.STORAGE_DIR;
    else process.env.STORAGE_DIR = previousStorage;
    if (previousLimit === undefined) delete process.env.MAX_FILE_SIZE_BYTES;
    else process.env.MAX_FILE_SIZE_BYTES = previousLimit;
  });

  function uploadFile(owner, content = 'conteudo do documento', field = 'file') {
    const body = new FormData();
    body.append(field, new Blob([content], { type: 'text/plain' }), 'documento.txt');
    return fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: owner === undefined ? {} : { 'X-User-Id': owner },
      body,
    });
  }

  let firstDocument;

  await context.test('preserva a rota de saude e exporta o app', async () => {
    assert.strictEqual(typeof app, 'function');
    const response = await fetch(`${baseUrl}/health`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { status: 'ok' });
  });

  await context.test('rejeita usuario ausente ou vazio antes de gravar arquivos', async () => {
    for (const endpoint of ['/upload', '/documents', '/documents/inexistente/download']) {
      for (const owner of [undefined, '   ']) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: endpoint === '/upload' ? 'POST' : 'GET',
          headers: owner === undefined ? {} : { 'X-User-Id': owner },
        });
        assert.strictEqual(response.status, 400);
        assert.strictEqual((await response.json()).error.code, 'MISSING_USER');
      }
    }
    assert.deepStrictEqual(await readdir(temporaryDirectory), []);
  });

  await context.test('lista vazia e upload sem arquivo', async () => {
    const list = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'ana' } });
    assert.deepStrictEqual(await list.json(), { items: [] });
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers: { 'X-User-Id': 'ana' },
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'MISSING_FILE');
  });

  await context.test('upload persiste arquivo local e retorna somente metadados publicos', async () => {
    const response = await uploadFile('ana');
    assert.strictEqual(response.status, 201);
    firstDocument = await response.json();
    assert.deepStrictEqual(Object.keys(firstDocument).sort(),
      ['id', 'originalName', 'mimeType', 'size', 'uploadedAt', 'owner'].sort());
    assert.match(firstDocument.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(firstDocument.originalName, 'documento.txt');
    assert.strictEqual(firstDocument.mimeType, 'text/plain');
    assert.strictEqual(firstDocument.owner, 'ana');
    assert.strictEqual(firstDocument.size, Buffer.byteLength('conteudo do documento'));
    assert.ok(Number.isFinite(Date.parse(firstDocument.uploadedAt)));
    const files = await readdir(storageDirectory);
    assert.strictEqual(files.length, 1);
    assert.notStrictEqual(files[0], 'documento.txt');
    assert.strictEqual(await readFile(path.join(storageDirectory, files[0]), 'utf8'), 'conteudo do documento');
  });

  await context.test('lista somente documentos do dono, mais recentes primeiro', async () => {
    const secondResponse = await uploadFile('ana', 'segundo');
    const secondDocument = await secondResponse.json();
    const otherResponse = await uploadFile('bruno', 'privado');
    const otherDocument = await otherResponse.json();
    const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'ana' } });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { items: [secondDocument, firstDocument] });
    const otherList = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'bruno' } });
    assert.deepStrictEqual(await otherList.json(), { items: [otherDocument] });
  });

  await context.test('download entrega o conteudo e os cabecalhos corretos', async () => {
    const response = await fetch(`${baseUrl}/documents/${firstDocument.id}/download`, {
      headers: { 'X-User-Id': 'ana' },
    });
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/plain/);
    assert.strictEqual(response.headers.get('content-length'), String(firstDocument.size));
    assert.match(response.headers.get('content-disposition'), /attachment; filename="documento.txt"/);
    assert.strictEqual(await response.text(), 'conteudo do documento');
  });

  await context.test('oculta documentos de outros donos e ids inexistentes', async () => {
    for (const id of [firstDocument.id, 'inexistente']) {
      const response = await fetch(`${baseUrl}/documents/${id}/download`, {
        headers: { 'X-User-Id': 'bruno' },
      });
      assert.strictEqual(response.status, 404);
      assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
    }
  });

  await context.test('rejeita excesso de tamanho e campo incorreto sem deixar arquivos', async () => {
    const filesBefore = await readdir(storageDirectory);
    const oversized = await uploadFile('ana', 'a'.repeat(129));
    assert.strictEqual(oversized.status, 413);
    assert.strictEqual((await oversized.json()).error.code, 'FILE_TOO_LARGE');
    const unexpected = await uploadFile('ana', 'arquivo', 'unexpected');
    assert.strictEqual(unexpected.status, 400);
    assert.strictEqual((await unexpected.json()).error.code, 'INVALID_UPLOAD');
    assert.deepStrictEqual(await readdir(storageDirectory), filesBefore);
  });

  await context.test('limita campos multipart e corpos JSON excessivos', async () => {
    const allowedBody = new FormData();
    for (let index = 0; index < 16; index += 1) allowedBody.append(`campo${index}`, 'valor');
    allowedBody.append('file', new Blob(['conteudo']), 'documento.txt');
    const allowed = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers: { 'X-User-Id': 'ana' }, body: allowedBody,
    });
    assert.strictEqual(allowed.status, 201);

    const body = new FormData();
    for (let index = 0; index < 17; index += 1) body.append(`campo${index}`, 'valor');
    const multipart = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers: { 'X-User-Id': 'ana' }, body,
    });
    assert.strictEqual(multipart.status, 400);
    assert.strictEqual((await multipart.json()).error.code, 'INVALID_UPLOAD');

    const json = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'ana', 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'a'.repeat(110000) }),
    });
    assert.strictEqual(json.status, 413);
    assert.strictEqual((await json.json()).error.code, 'REQUEST_TOO_LARGE');
  });

  await context.test('rejeita nomes internos que tentam escapar do storage', async () => {
    const repository = require('../src/repositories/documents.repository');
    for (const name of ['../arquivo.txt', '/tmp/arquivo.txt', 'arquivo.txt']) {
      await assert.rejects(repository.getFilePath(name), /Nome de arquivo armazenado invalido/);
    }
  });

  await context.test('falhas de leitura e escrita retornam erro interno sem expor caminhos', async () => {
    const loggedErrors = [];
    context.mock.method(console, 'error', (...args) => loggedErrors.push(args));
    await rm(storageDirectory, { recursive: true });
    const missingFile = await fetch(`${baseUrl}/documents/${firstDocument.id}/download`, {
      headers: { 'X-User-Id': 'ana' },
    });
    assert.strictEqual(missingFile.status, 500);
    assert.deepStrictEqual(await missingFile.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
    });
    const { writeFile } = require('node:fs/promises');
    await writeFile(storageDirectory, 'bloqueia a criacao da pasta');
    const writeFailure = await uploadFile('ana');
    assert.strictEqual(writeFailure.status, 500);
    assert.strictEqual((await writeFailure.json()).error.code, 'INTERNAL_ERROR');
    assert.strictEqual(loggedErrors.length, 2);
  });
});
