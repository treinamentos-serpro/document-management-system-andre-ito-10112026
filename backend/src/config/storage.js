const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.DMS_STORAGE_DIR || path.join(__dirname, '../../storage'),
);

module.exports = { storageDirectory };
