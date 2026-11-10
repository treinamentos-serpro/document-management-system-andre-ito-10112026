const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documents.repository');
const storage = require('./storage.service');

function toMetadata(document) {
  const { id, originalName, mimeType, size, uploadedAt, owner } = document;
  return { id, originalName, mimeType, size, uploadedAt, owner };
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
  const filePath = await storage.getFilePath(document.storedName);
  return { filePath, ...toMetadata(document) };
}

module.exports = {
  prepareStorage: storage.prepareStorage,
  createDocument,
  listDocuments,
  getDownload,
};