const { Router } = require('express');
const controller = require('../controllers/documents.controller');
const receiveFile = require('../middleware/upload');

const router = Router();

router.post('/upload', controller.requireUser, receiveFile, controller.upload);
router.get('/documents', controller.requireUser, controller.list);
router.get('/documents/:id/download', controller.requireUser, controller.download);

module.exports = router;