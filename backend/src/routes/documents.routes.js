const { Router } = require('express');
const controller = require('../controllers/documents.controller');

const router = Router();

router.post('/upload', controller.requireUser, controller.receiveFile, controller.upload);
router.get('/documents', controller.requireUser, controller.list);
router.get('/documents/:id/download', controller.requireUser, controller.download);

module.exports = router;