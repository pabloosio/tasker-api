const taskService = require('../services/taskService');
const { parseTaskKey } = require('../utils/taskKey');
const { BadRequestError } = require('../utils/errors');
const { successResponse } = require('../utils/response');

/**
 * Obtener todas las tareas del usuario
 * GET /api/v1/tasks
 */
exports.getAllTasks = async (req, res, next) => {
  try {
    const result = await taskService.getAllTasks(req.user.id, req.query);
    return successResponse(res, result, 'Tareas obtenidas exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Tareas del tablero Kanban (sin tope de paginación)
 * GET /api/v1/tasks/board?workspaceId=
 */
exports.getBoardTasks = async (req, res, next) => {
  try {
    const result = await taskService.getBoardTasks(req.user.id, req.query);
    return successResponse(res, result, 'Tablero obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Tareas asignadas al usuario en todos sus tableros
 * GET /api/v1/tasks/mine
 */
exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getMyTasks(req.user.id);
    return successResponse(res, tasks, 'Tareas obtenidas exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener tarea por número legible
 * GET /api/v1/tasks/by-number/:number   (acepta 142, #142 o #000142)
 */
exports.getTaskByNumber = async (req, res, next) => {
  try {
    const number = parseTaskKey(req.params.number);
    if (!number) throw new BadRequestError('Número de tarea inválido');
    const task = await taskService.getTaskByNumber(req.user.id, number);
    return successResponse(res, task, 'Tarea obtenida exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas de tareas
 * GET /api/v1/tasks/stats
 */
exports.getTaskStats = async (req, res, next) => {
  try {
    const stats = await taskService.getTaskStats(req.user.id, req.query);
    return successResponse(res, stats, 'Estadísticas obtenidas exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una tarea por ID
 * GET /api/v1/tasks/:id
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.user.id, req.params.id);
    return successResponse(res, task, 'Tarea obtenida exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Crear nueva tarea
 * POST /api/v1/tasks
 */
exports.createTask = async (req, res, next) => {
  try {
    console.log("createTask.req.body", req.body)
    const task = await taskService.createTask(req.user.id, req.body);
    return successResponse(res, task, 'Tarea creada exitosamente', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar tarea
 * PUT /api/v1/tasks/:id
 */
exports.updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(
      req.user.id,
      req.params.id,
      req.body
    );
    return successResponse(res, task, 'Tarea actualizada exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar estado de tarea
 * PATCH /api/v1/tasks/: id/status
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatus(
      req.user.id,
      req.params.id,
      req.body.status,
      req.body.position
    );
    return successResponse(res, task, 'Estado actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener reporte semanal de productividad
 * GET /api/v1/tasks/weekly-report
 */
exports.getWeeklyReport = async (req, res, next) => {
  try {
    const report = await taskService.getWeeklyReport(req.user.id, req.query);
    return successResponse(res, report, 'Reporte semanal obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar tarea
 * DELETE /api/v1/tasks/:id
 */
exports.deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.user.id, req.params.id);
    return successResponse(res, null, 'Tarea eliminada exitosamente');
  } catch (error) {
    next(error);
  }
};