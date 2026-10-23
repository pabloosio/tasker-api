const commentService = require('../services/commentService');
const { successResponse } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const comments = await commentService.list(req.user.id, req.params.taskId);
    successResponse(res, comments, 'Comentarios obtenidos exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const comment = await commentService.create(req.user.id, req.params.taskId, req.body.content);
    successResponse(res, comment, 'Comentario agregado exitosamente', 201);
  } catch (error) {
    next(error);
  }
};

exports.mentionable = async (req, res, next) => {
  try {
    const result = await commentService.mentionable(req.user.id, req.params.taskId);
    successResponse(res, result, 'Miembros obtenidos exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const comment = await commentService.update(req.user.id, req.params.taskId, req.params.commentId, req.body.content);
    successResponse(res, comment, 'Comentario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await commentService.remove(req.user.id, req.params.taskId, req.params.commentId);
    successResponse(res, null, 'Comentario eliminado exitosamente');
  } catch (error) {
    next(error);
  }
};
