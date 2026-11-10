const multer = require('multer');
const service = require('../services/documents.service');

function requireUser(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: { code: 'MISSING_USER', message: 'Informe o usuario no cabecalho X-User-Id.' },
    });
  }
  res.locals.owner = owner;
  next();
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'MISSING_FILE', message: 'Envie um arquivo no campo file.' },
    });
  }
  const metadata = service.createDocument({
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  }, res.locals.owner);
  res.status(201).json(metadata);
}

function list(req, res) {
  res.json({ items: service.listDocuments(res.locals.owner) });
}

async function download(req, res, next) {
  const document = await service.getDownload(req.params.id, res.locals.owner);
  res.download(document.filePath, document.originalName, {
    headers: {
      'Content-Type': document.mimeType,
      'Content-Length': document.size,
    },
  }, (error) => {
    if (error) next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Nao foi possivel concluir a operacao.';

  if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = status === 413 ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
    message = status === 413 ? 'O arquivo excede o tamanho permitido.' : 'Envio de arquivo invalido.';
  } else if (error.code === 'DOCUMENT_NOT_FOUND') {
    status = 404;
    code = error.code;
    message = error.message;
  } else if (error.type === 'entity.too.large') {
    status = 413;
    code = 'REQUEST_TOO_LARGE';
    message = 'O corpo da requisicao excede o tamanho permitido.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_REQUEST';
    message = 'O corpo da requisicao e invalido.';
  }

  if (status === 500) console.error('Falha ao processar documento:', error);
  res.status(status).json({ error: { code, message } });
}

module.exports = { requireUser, upload, list, download, handleError };