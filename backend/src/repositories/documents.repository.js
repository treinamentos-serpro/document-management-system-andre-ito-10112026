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
  const filePath = path.join(storageDirectory, storedName);
  await access(filePath, constants.R_OK);
  return filePath;
}

module.exports = { prepareStorage, save, findByOwner, findById, getFilePath };