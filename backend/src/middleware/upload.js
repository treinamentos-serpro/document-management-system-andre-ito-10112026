const { randomUUID } = require('node:crypto');
const path = require('node:path');
const multer = require('multer');
const storage = require('../services/storage.service');

const configuredLimit = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);
if (!Number.isSafeInteger(configuredLimit) || configuredLimit <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

module.exports = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      storage.prepareStorage().then(
        (directory) => callback(null, directory),
        (error) => callback(error),
      );
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname);
      const safeExtension = /^\.[a-z0-9]{1,10}$/i.test(extension) ? extension : '';
      callback(null, `${randomUUID()}${safeExtension}`);
    },
  }),
  limits: { fileSize: configuredLimit, fields: 16, fieldSize: 65536, parts: 18 },
}).single('file');