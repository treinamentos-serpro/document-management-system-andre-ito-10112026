const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documents.repository');

function toMetadata(document) {
  const { storedName, ...metadata } = document;
  return metadata;
}

function createDocument(file, owner) {
  const document = repository.save({
    id: randomUUID(),
    originalName: file.originalName,
    storedName: file.storedName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  });
  return toMetadata(document);
}

function listDocuments(owner) {
  return repository.findByOwner(owner).map(toMetadata);
}

async function getDownload(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) {
    throw Object.assign(new Error('Documento nao encontrado.'), {
      status: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  }
  const filePath = await repository.getFilePath(document.storedName);
  return { filePath, ...toMetadata(document) };
}

module.exports = {
  prepareStorage: repository.prepareStorage,
  createDocument,
  listDocuments,
  getDownload,
};