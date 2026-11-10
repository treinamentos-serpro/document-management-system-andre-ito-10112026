const { test } = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../src/repositories/documents.repository');
const storage = require('../src/services/storage.service');
const service = require('../src/services/documents.service');

function documentFixture() {
  return {
    id: 'document-id',
    originalName: 'documento.txt',
    storedName: 'internal.txt',
    mimeType: 'text/plain',
    size: 10,
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'ana',
    privateField: 'interno',
  };
}

test('cria documento com metadados publicos e persiste nome interno', (context) => {
  const save = context.mock.method(repository, 'save', (document) => ({
    ...document, privateField: 'interno',
  }));
  const file = { originalName: 'documento.txt', storedName: 'internal.txt', mimeType: 'text/plain', size: 10 };

  const result = service.createDocument(file, 'ana');

  assert.match(result.id, /^[0-9a-f-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(result.uploadedAt)));
  assert.equal(result.owner, 'ana');
  assert.equal(save.mock.calls[0].arguments[0].storedName, 'internal.txt');
  assert.deepEqual(Object.keys(result).sort(), ['id', 'originalName', 'mimeType', 'size', 'uploadedAt', 'owner'].sort());
});

test('lista metadados publicos sem alterar ordem ou expor campos internos', (context) => {
  const first = documentFixture();
  const second = { ...documentFixture(), id: 'second-id' };
  const find = context.mock.method(repository, 'findByOwner', () => [first, second]);

  const result = service.listDocuments('ana');

  assert.deepEqual(find.mock.calls[0].arguments, ['ana']);
  assert.deepEqual(result.map((document) => document.id), ['document-id', 'second-id']);
  assert.deepEqual(Object.keys(result[0]).sort(), ['id', 'originalName', 'mimeType', 'size', 'uploadedAt', 'owner'].sort());
});

test('download verifica dono antes de acessar o armazenamento', async (context) => {
  const document = documentFixture();
  context.mock.method(repository, 'findById', () => document);
  const getFilePath = context.mock.method(storage, 'getFilePath', async () => '/storage/documento');

  await assert.rejects(service.getDownload(document.id, 'bruno'), { code: 'DOCUMENT_NOT_FOUND', status: 404 });
  assert.equal(getFilePath.mock.calls.length, 0);
  const result = await service.getDownload(document.id, 'ana');
  assert.deepEqual(getFilePath.mock.calls[0].arguments, ['internal.txt']);
  assert.equal(result.filePath, '/storage/documento');
  assert.equal(result.originalName, 'documento.txt');
  assert.equal('storedName' in result, false);
  assert.equal('privateField' in result, false);
});

test('download trata documento ausente e propaga falha do armazenamento', async (context) => {
  const find = context.mock.method(repository, 'findById', () => undefined);
  const failure = new Error('falha de leitura');
  const getFilePath = context.mock.method(storage, 'getFilePath', async () => { throw failure; });

  await assert.rejects(service.getDownload('missing', 'ana'), { code: 'DOCUMENT_NOT_FOUND', status: 404 });
  assert.equal(getFilePath.mock.calls.length, 0);
  find.mock.mockImplementation(() => documentFixture());
  await assert.rejects(service.getDownload('document-id', 'ana'), (error) => error === failure);
});