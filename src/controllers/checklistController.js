const checklistService = require('../services/checklistService');
const { successResponse } = require('../utils/response');

exports.getItems = async (req, res, next) => {
  try {
    const items = await checklistService.getItems(req.user.id, req.params.taskId);
    successResponse(res, items, 'Checklist obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    const item = await checklistService.addItem(req.user.id, req.params.taskId, req.body.content);
    successResponse(res, item, 'Ítem agregado exitosamente', 201);
  } catch (error) {
    next(error);
  }
};

exports.toggleItem = async (req, res, next) => {
  try {
    const item = await checklistService.toggleItem(req.user.id, req.params.taskId, req.params.itemId);
    successResponse(res, item, 'Ítem actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    await checklistService.deleteItem(req.user.id, req.params.taskId, req.params.itemId);
    successResponse(res, null, 'Ítem eliminado exitosamente');
  } catch (error) {
    next(error);
  }
};
