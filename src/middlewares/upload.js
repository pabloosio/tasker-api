const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const storage = require('../config/storage');
const attachmentService = require('../services/attachmentService');
const { AppError, BadRequestError } = require('../utils/errors');

const maxFileMb = Math.round(storage.maxFileBytes / (1024 * 1024));

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storage.maxFileBytes,
    files: storage.maxPerRequest,
    fields: 5
  }
}).array('files', storage.maxPerRequest);

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `El archivo supera el máximo de ${maxFileMb} MB`,
  LIMIT_FILE_COUNT: `Puedes subir hasta ${storage.maxPerRequest} archivos a la vez`,
  LIMIT_UNEXPECTED_FILE: `Puedes subir hasta ${storage.maxPerRequest} archivos a la vez (campo "files")`
};

// Cada subida puede ocupar hasta maxPerRequest × maxFileBytes en memoria; se limita cuántas corren a la vez
const MAX_CONCURRENT_UPLOADS = 6;
let activeUploads = 0;

/**
 * Bloquea rutas de adjuntos (lectura incluida) cuando la funcionalidad está apagada
 */
exports.requireStorage = (req, res, next) => {
  if (!storage.isEnabled) {
    return next(new AppError('Los archivos adjuntos no están habilitados en este servidor', 503));
  }
  next();
};

// Por usuario (la ruta ya pasó por auth)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: storage.uploadsPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res, next) => next(new AppError('Estás subiendo demasiados archivos. Espera un minuto e intenta de nuevo.', 429))
});

/**
 * Carga la tarea y revisa permisos ANTES de leer el cuerpo (la deja en req.task)
 */
const authorizeUpload = async (req, res, next) => {
  try {
    req.task = await attachmentService.getTaskForUpload(req.user.id, req.params.taskId);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Recibe archivos en memoria (campo "files")
 */
const parseFiles = (req, res, next) => {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return next(new AppError('Hay muchas subidas en curso. Intenta de nuevo en unos segundos.', 503));
  }

  activeUploads++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeUploads--;
    }
  };
  res.on('close', release);
  res.on('finish', release);

  parser(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new BadRequestError(MULTER_MESSAGES[err.code] || 'No se pudo procesar el archivo'));
    }
    // Errores del parser (multipart cortado o malformado)
    next(new BadRequestError('No se pudo leer el archivo enviado'));
  });
};

/**
 * Cadena completa para subir: S3 encendido → límite por usuario → permisos → lectura del cuerpo.
 * Si algo falla antes del parser, el cuerpo nunca se carga en memoria.
 */
exports.uploadFiles = [exports.requireStorage, uploadLimiter, authorizeUpload, parseFiles];
