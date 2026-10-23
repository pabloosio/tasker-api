const attachmentService = require('../services/attachmentService');
const { successResponse } = require('../utils/response');

exports.getConfig = (req, res) => {
  successResponse(res, { attachments: attachmentService.getPublicConfig() }, 'Configuración obtenida exitosamente');
};

exports.list = async (req, res, next) => {
  try {
    const attachments = await attachmentService.list(req.user.id, req.params.taskId);
    successResponse(res, attachments, 'Archivos obtenidos exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.upload = async (req, res, next) => {
  try {
    const attachments = await attachmentService.upload(req.user.id, req.task, req.files);
    successResponse(res, attachments, attachments.length === 1 ? 'Archivo subido exitosamente' : 'Archivos subidos exitosamente', 201);
  } catch (error) {
    next(error);
  }
};

exports.getDownloadUrl = async (req, res, next) => {
  try {
    const result = await attachmentService.getDownloadUrl(req.user.id, req.params.taskId, req.params.attachmentId, {
      inline: req.query.inline === '1' || req.query.inline === 'true'
    });
    successResponse(res, result, 'Enlace generado exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await attachmentService.remove(req.user.id, req.params.taskId, req.params.attachmentId);
    successResponse(res, null, 'Archivo eliminado exitosamente');
  } catch (error) {
    next(error);
  }
};
