const documentRepository = require('../repositories/documentRepository');

function createDocument(file, owner) {
  return documentRepository.create({ file, owner });
}

function listDocuments() {
  return documentRepository.findAll();
}

function getDocument(id) {
  return documentRepository.findById(id);
}

module.exports = { createDocument, listDocuments, getDocument };
