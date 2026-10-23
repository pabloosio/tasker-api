const activityService = require('../services/activityService');
const { successResponse } = require('../utils/response');

/**
 * Historial de una tarea (cualquier miembro con acceso a la tarea)
 * GET /api/v1/tasks/:id/activity
 */
exports.getTaskActivity = async (req, res, next) => {
  try {
    const items = await activityService.getTaskActivity(req.user.id, req.params.id);
    return successResponse(res, items, 'Historial obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Actividad de un tablero (OWNER/ADMIN)
 * GET /api/v1/workspaces/:id/activity?actorId=&group=&from=&to=&task=&page=
 */
exports.getWorkspaceActivity = async (req, res, next) => {
  try {
    const result = await activityService.getWorkspaceActivity(req.user.id, req.params.id, req.query);
    return successResponse(res, result, 'Actividad obtenida exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Auditoría global (administradores de la plataforma)
 * GET /api/v1/admin/activity?workspaceId=&actorId=&group=&from=&to=&task=&page=
 */
exports.getGlobalActivity = async (req, res, next) => {
  try {
    const result = await activityService.getGlobalActivity(req.query);
    return successResponse(res, result, 'Auditoría obtenida exitosamente');
  } catch (error) {
    next(error);
  }
};
