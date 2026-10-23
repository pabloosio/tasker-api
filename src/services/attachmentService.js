const { randomUUID } = require('crypto');
const { Task, Attachment, User, sequelize } = require('../models');
const { AppError, NotFoundError, BadRequestError } = require('../utils/errors');
const { verifyTaskAccess, verifyTaskEditAccess, verifyAttachmentDeleteAccess } = require('./taskPermissions');
const { cleanFileName, validateFile } = require('../utils/fileValidation');
const storageService = require('./storageService');
const imageService = require('./imageService');
const activityService = require('./activityService');
const storage = require('../config/storage');
const { ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../utils/logger');

// Orden estable: varios archivos de un mismo envío comparten createdAt
const ATTACHMENT_ORDER = [['createdAt', 'ASC'], ['id', 'ASC']];
const byUploadOrder = (a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) || a.id.localeCompare(b.id);

const uploaderInclude = { model: User, as: 'uploader', attributes: ['id', 'name'] };

const getTask = async (userId, taskId, { forWrite = true } = {}) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new NotFoundError('Tarea no encontrada');
  await (forWrite ? verifyTaskEditAccess : verifyTaskAccess)(userId, task);
  return task;
};

/**
 * Tarea con permiso de escritura, para revisar ANTES de recibir los archivos (middleware de subida)
 */
exports.getTaskForUpload = (userId, taskId) => getTask(userId, taskId);

const limitMessage = (current) => {
  const left = Math.max(storage.maxPerTask - current, 0);
  return left
    ? `Esta tarea ya tiene ${current} archivos; solo puedes agregar ${left} más (máximo ${storage.maxPerTask})`
    : `Esta tarea ya llegó al máximo de ${storage.maxPerTask} archivos`;
};

const findAttachment = async (taskId, attachmentId) => {
  const attachment = await Attachment.findOne({ where: { id: attachmentId, taskId }, include: [uploaderInclude] });
  if (!attachment) throw new NotFoundError('Archivo no encontrado');
  return attachment;
};

const thumbUrlOf = (attachment) => attachment.thumbKey
  ? storageService.getSignedUrl(attachment.thumbKey, { expiresIn: storage.thumbUrlTtl })
  : null;

/**
 * Forma pública de un adjunto: nunca expone las keys de S3
 */
const serialize = async (attachment) => ({
  id: attachment.id,
  taskId: attachment.taskId,
  originalName: attachment.originalName,
  mimeType: attachment.mimeType,
  kind: attachment.kind,
  sizeBytes: attachment.sizeBytes,
  width: attachment.width,
  height: attachment.height,
  createdAt: attachment.createdAt,
  uploader: attachment.uploader ? { id: attachment.uploader.id, name: attachment.uploader.name } : null,
  thumbUrl: await thumbUrlOf(attachment)
});

/**
 * Datos públicos de la configuración para el cliente
 */
exports.getPublicConfig = () => ({
  enabled: storage.isEnabled,
  maxFileMb: Math.round(storage.maxFileBytes / (1024 * 1024)),
  maxPerTask: storage.maxPerTask,
  maxPerRequest: storage.maxPerRequest,
  extensions: storage.ALLOWED_EXTENSIONS
});

exports.list = async (userId, taskId) => {
  await getTask(userId, taskId, { forWrite: false });

  const attachments = await Attachment.findAll({
    where: { taskId },
    include: [uploaderInclude],
    order: ATTACHMENT_ORDER
  });
  return await Promise.all(attachments.map(serialize));
};

/**
 * Subir uno o varios archivos a una tarea (ya cargada y con permisos revisados: getTaskForUpload).
 * Todo o nada: primero se validan todos, luego se suben a S3 y al final se guardan en BD.
 * Si la BD falla o se supera el límite, se borra de S3 lo que ya se había subido.
 */
exports.upload = async (userId, task, files = []) => {
  const taskId = task.id;

  if (!files.length) throw new BadRequestError('No se recibió ningún archivo');

  // Rechazo rápido; el chequeo definitivo va con la tarea bloqueada al guardar
  const current = await Attachment.count({ where: { taskId } });
  if (current + files.length > storage.maxPerTask) {
    throw new BadRequestError(limitMessage(current));
  }

  // 1) Validar y preparar todo antes de subir nada
  const prepared = [];
  for (const file of files) {
    const { ext, mime, kind, fileName: originalName } = await validateFile(cleanFileName(file.originalname), file.buffer);

    const id = randomUUID();
    const folder = storageService.attachmentFolder(taskId, id);
    let body = file.buffer;
    let thumb = null;
    let width = null;
    let height = null;

    if (kind === 'IMAGE') {
      ({ buffer: body, thumb, width, height } = await imageService.processImage(file.buffer, ext));
    }

    prepared.push({
      record: {
        id,
        taskId,
        uploadedBy: userId,
        originalName,
        mimeType: mime,
        kind,
        sizeBytes: body.length,
        storageKey: `${folder}/original.${ext}`,
        thumbKey: thumb ? `${folder}/thumb.webp` : null,
        width,
        height
      },
      body,
      thumb
    });
  }

  // 2) Subir a S3
  const uploadedKeys = [];
  try {
    for (const { record, body, thumb } of prepared) {
      await storageService.putObject(record.storageKey, body, record.mimeType);
      uploadedKeys.push(record.storageKey);
      if (thumb) {
        await storageService.putObject(record.thumbKey, thumb, 'image/webp');
        uploadedKeys.push(record.thumbKey);
      }
    }
  } catch (error) {
    logger.error(`S3: error al subir archivos de la tarea ${taskId}: ${error.message}`);
    await storageService.deleteObjects(uploadedKeys);
    throw new AppError('No se pudo guardar el archivo en el almacenamiento. Intenta de nuevo en unos minutos.', 503);
  }

  // 3) Guardar en BD. La tarea queda bloqueada para que envíos simultáneos no superen el límite.
  try {
    await sequelize.transaction(async (transaction) => {
      await Task.findByPk(taskId, { attributes: ['id'], lock: transaction.LOCK.UPDATE, transaction });
      const count = await Attachment.count({ where: { taskId }, transaction });
      if (count + prepared.length > storage.maxPerTask) {
        throw new BadRequestError(limitMessage(count));
      }
      await Attachment.bulkCreate(prepared.map((p) => p.record), { transaction });
    });
  } catch (error) {
    await storageService.deleteObjects(uploadedKeys);
    throw error;
  }

  for (const { record } of prepared) {
    await activityService.log({
      actorId: userId,
      action: ACTIVITY_ACTIONS.ATTACHMENT_ADDED,
      task,
      details: { fileName: record.originalName, sizeBytes: record.sizeBytes, kind: record.kind }
    });
  }

  const created = await Attachment.findAll({
    where: { id: prepared.map((p) => p.record.id) },
    include: [uploaderInclude],
    order: ATTACHMENT_ORDER
  });
  return await Promise.all(created.map(serialize));
};

// Solo imágenes y PDF se abren en el navegador; el resto siempre se descarga
const canOpenInline = (attachment) => attachment.kind === 'IMAGE' || attachment.mimeType === 'application/pdf';

/**
 * URL temporal para ver (inline) o descargar un archivo con su nombre original
 */
exports.getDownloadUrl = async (userId, taskId, attachmentId, { inline = false } = {}) => {
  await getTask(userId, taskId, { forWrite: false });
  const attachment = await findAttachment(taskId, attachmentId);

  const url = await storageService.getSignedUrl(attachment.storageKey, {
    fileName: attachment.originalName,
    contentType: attachment.mimeType,
    inline: inline && canOpenInline(attachment)
  });
  return { url, expiresIn: storage.downloadUrlTtl };
};

exports.remove = async (userId, taskId, attachmentId) => {
  const task = await getTask(userId, taskId, { forWrite: false });
  const attachment = await findAttachment(taskId, attachmentId);
  await verifyAttachmentDeleteAccess(userId, task, attachment);

  await attachment.destroy();
  await storageService.deleteObjects([attachment.storageKey, attachment.thumbKey]);

  await activityService.log({
    actorId: userId,
    action: ACTIVITY_ACTIONS.ATTACHMENT_DELETED,
    task,
    details: { fileName: attachment.originalName, sizeBytes: attachment.sizeBytes, kind: attachment.kind }
  });
};

/**
 * Keys de S3 de todos los adjuntos de unas tareas.
 * Se toman ANTES de borrar las tareas (el CASCADE de la BD borra los registros).
 */
exports.collectKeys = async (taskWhere) => {
  if (!storage.isEnabled) return [];
  const attachments = await Attachment.findAll({
    attributes: ['storageKey', 'thumbKey'],
    include: [{ model: Task, as: 'task', attributes: [], where: taskWhere, required: true }]
  });
  return attachments.flatMap((a) => [a.storageKey, a.thumbKey]);
};

/**
 * Borrado de archivos en S3 después de borrar tareas. No bloquea ni lanza.
 */
exports.purgeKeys = (keys) => {
  if (keys.length) storageService.deleteObjects(keys);
};

/**
 * Include para las consultas de tareas: solo lo necesario para el resumen.
 * null si la funcionalidad está apagada (las tarjetas no muestran nada).
 */
exports.summaryInclude = storage.isEnabled
  ? { model: Attachment, as: 'attachments', attributes: ['id', 'kind', 'thumbKey', 'createdAt'] }
  : null;

/**
 * Reemplaza la lista de adjuntos de cada tarea por un resumen ligero:
 * attachmentCount y cover (miniatura firmada de la primera imagen).
 * Acepta una tarea, un arreglo de tareas o null.
 */
exports.withSummary = async (tasks) => {
  if (!storage.isEnabled || !tasks) return tasks;

  const list = Array.isArray(tasks) ? tasks : [tasks];
  await Promise.all(list.map(async (task) => {
    const attachments = task.attachments || [];
    const firstImage = attachments
      .filter((a) => a.thumbKey)
      .sort(byUploadOrder)[0];

    task.setDataValue('attachmentCount', attachments.length);
    task.setDataValue('cover', firstImage ? await thumbUrlOf(firstImage) : null);
    delete task.dataValues.attachments;
  }));
  return tasks;
};
