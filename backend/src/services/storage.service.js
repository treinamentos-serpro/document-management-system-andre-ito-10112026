const repository = require('../repositories/documents.repository');

module.exports = {
  prepareStorage: repository.prepareStorage,
  getFilePath: repository.getFilePath,
};