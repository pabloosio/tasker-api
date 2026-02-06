const { Task, Category, User } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { PAGINATION, TASK_STATUS, TASK_PRIORITY } = require('../config/constants');
const { Op } = require('sequelize');

/**
 * Obtener todas las tareas del usuario
 */
exports.getAllTasks = async (userId, filters = {}) => {
  const {
    status,
    priority,
    categoryId,
    search,
    page = PAGINATION. DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT
  } = filters;

  const where = { userId };

  // Aplicar filtros
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;

  // Búsqueda por texto
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const parsedLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

  const { count, rows } = await Task. findAndCountAll({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }
    ],
    limit: parsedLimit,
    offset,
    order: [
      ['status', 'ASC'],
      ['priority', 'DESC'],
      ['dueDate', 'ASC'],
      ['createdAt', 'DESC']
    ]
  });

  return {
    tasks: rows,
    pagination: {
      total: count,
      page:  parseInt(page),
      limit: parsedLimit,
      totalPages:  Math.ceil(count / parsedLimit)
    }
  };
};

/**
 * Obtener estadísticas de tareas
 */
exports.getTaskStats = async (userId) => {
  const tasks = await Task.findAll({
    where: { userId },
    attributes: ['status', 'priority']
  });
  const stats = {
    total: tasks.length,
    byStatus: {
      pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
      in_progress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length
    },
    byPriority: {
      low: tasks.filter(t => t.priority === TASK_PRIORITY.LOW).length,
      medium: tasks.filter(t => t.priority === TASK_PRIORITY.MEDIUM).length,
      high: tasks.filter(t => t.priority === TASK_PRIORITY.HIGH).length
    }
  };

  return stats;
};

/**
 * Obtener tarea por ID
 */
exports.getTaskById = async (userId, taskId) => {
  const task = await Task.findOne({
    where: { id: taskId },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }
    ]
  });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  // Verificar que la tarea pertenece al usuario
  if (task.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para acceder a esta tarea');
  }

  return task;
};

/**
 * Crear nueva tarea
 */
exports. createTask = async (userId, taskData) => {
  const task = await Task.create({
    ... taskData,
    userId
  });

  return await Task.findByPk(task. id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }
    ]
  });
};

/**
 * Actualizar tarea
 */
exports.updateTask = async (userId, taskId, taskData) => {
  const task = await Task.findOne({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  if (task.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para modificar esta tarea');
  }

  // Si cambió el status, actualizar statusUpdatedAt
  if (taskData.status && taskData.status !== task.status) {
    taskData.statusUpdatedAt = new Date();

    // Si se marca como completada, agregar fecha
    if (taskData.status === TASK_STATUS.COMPLETED) {
      taskData.completedAt = new Date();
    }

    // Si se desmarca como completada, remover fecha
    if (taskData.status !== TASK_STATUS.COMPLETED && task.completedAt) {
      taskData.completedAt = null;
    }
  }

  await task.update(taskData);

  return await Task.findByPk(task.id, {
    include: [
      {
        model:  Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }
    ]
  });
};

/**
 * Actualizar solo el estado de la tarea
 */
exports.updateTaskStatus = async (userId, taskId, status) => {
  return await this.updateTask(userId, taskId, { status });
};

/**
 * Eliminar tarea
 */
exports.deleteTask = async (userId, taskId) => {
  const task = await Task. findOne({ where: { id:  taskId } });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  if (task.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para eliminar esta tarea');
  }

  await task.destroy();
};