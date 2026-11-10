const documentService = require('../services/documentService');

function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo é obrigatório.' });
  }

  const document = documentService.createDocument(req.file, req.body.owner);
  return res.status(201).json(document);
}

function listDocuments(req, res) {
  return res.json(documentService.listDocuments());
}

function downloadDocument(req, res) {
  const document = documentService.getDocument(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  return res.download(document.filePath, document.metadata.originalName, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: 'Documento não encontrado.' });
    }
  });
}

module.exports = { uploadDocument, listDocuments, downloadDocument };
