const { mkdir, access } = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);
const documents = new Map();

async function prepareStorage() {
  await mkdir(storageDirectory, { recursive: true });
  return storageDirectory;
}

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner).reverse();
}

function findById(id) {
  return documents.get(id);
}

async function getFilePath(storedName) {
  if (typeof storedName !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$/i.test(storedName)) {
    throw new Error('Nome de arquivo armazenado invalido.');
  }
  const filePath = path.join(storageDirectory, storedName);
  await access(filePath, constants.R_OK);
  return filePath;
}

module.exports = { prepareStorage, save, findByOwner, findById, getFilePath };