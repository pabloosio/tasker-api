const notificationService = require('../services/notificationService');
const { successResponse } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const result = await notificationService.list(req.user.id);
    successResponse(res, result, 'Avisos obtenidos exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const unreadCount = await notificationService.unreadCount(req.user.id);
    successResponse(res, { unreadCount }, 'Contador obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await notificationService.markRead(req.user.id, req.params.id);
    successResponse(res, null, 'Aviso marcado como leído');
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markAllRead(req.user.id);
    successResponse(res, { updated }, 'Avisos marcados como leídos');
  } catch (error) {
    next(error);
  }
};
