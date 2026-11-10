const documents = new Map();

function create(document) {
  const { file, owner } = document;
  const metadata = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: owner || 'anonymous',
  };

  documents.set(metadata.id, { metadata, fileName: file.filename });
  return metadata;
}

function findAll() {
  return Array.from(documents.values(), ({ metadata }) => metadata);
}

function findById(id) {
  return documents.get(id) || null;
}

module.exports = { create, findAll, findById };
