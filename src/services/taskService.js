const { Task, Category, User, WorkspaceMember } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { PAGINATION, TASK_STATUS, TASK_PRIORITY } = require('../config/constants');
const { Op } = require('sequelize');

/**
 * Verificar acceso a una tarea (por ownership directo o membresía de workspace)
 */
const verifyTaskAccess = async (userId, task) => {
  if (task.userId === userId) return;

  if (task.workspaceId) {
    const membership = await WorkspaceMember.findOne({
      where: { workspaceId: task.workspaceId, userId }
    });
    if (membership) return;
  }

  throw new ForbiddenError('No tienes permiso para acceder a esta tarea');
};

/**
 * Includes comunes para queries de tasks
 */
const taskIncludes = [
  {
    model: Category,
    as: 'category',
    attributes: ['id', 'name', 'color']
  },
  {
    model: User,
    as: 'assignee',
    attributes: ['id', 'name', 'email']
  }
];

/**
 * Obtener todas las tareas del usuario
 */
exports.getAllTasks = async (userId, filters = {}) => {
  const {
    status,
    priority,
    categoryId,
    search,
    workspaceId,
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT
  } = filters;

  const where = {};

  if (workspaceId) {
    // Modo workspace: verificar membresía
    const membership = await WorkspaceMember.findOne({
      where: { workspaceId, userId }
    });
    if (!membership) {
      throw new ForbiddenError('No tienes acceso a este workspace');
    }
    where.workspaceId = workspaceId;
  } else {
    // Modo personal/legacy
    where.userId = userId;
  }

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

  const { count, rows } = await Task.findAndCountAll({
    where,
    include: taskIncludes,
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
      page: parseInt(page),
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit)
    }
  };
};

/**
 * Obtener estadísticas de tareas
 */
exports.getTaskStats = async (userId, filters = {}) => {
  const { workspaceId } = filters;
  const where = {};

  if (workspaceId) {
    const membership = await WorkspaceMember.findOne({
      where: { workspaceId, userId }
    });
    if (!membership) {
      throw new ForbiddenError('No tienes acceso a este workspace');
    }
    where.workspaceId = workspaceId;
  } else {
    where.userId = userId;
  }

  const tasks = await Task.findAll({
    where,
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
    include: taskIncludes
  });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  await verifyTaskAccess(userId, task);

  return task;
};

/**
 * Crear nueva tarea
 */
exports.createTask = async (userId, taskData) => {
  // Si tiene workspaceId, verificar membresía
  if (taskData.workspaceId) {
    const membership = await WorkspaceMember.findOne({
      where: { workspaceId: taskData.workspaceId, userId }
    });
    if (!membership) {
      throw new ForbiddenError('No tienes acceso a este workspace');
    }

    // Si tiene assignedTo, verificar que el asignado sea miembro
    if (taskData.assignedTo) {
      const assigneeMembership = await WorkspaceMember.findOne({
        where: { workspaceId: taskData.workspaceId, userId: taskData.assignedTo }
      });
      if (!assigneeMembership) {
        throw new ForbiddenError('El usuario asignado no es miembro del workspace');
      }
    }
  }

  const task = await Task.create({
    ...taskData,
    userId
  });

  return await Task.findByPk(task.id, {
    include: taskIncludes
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

  await verifyTaskAccess(userId, task);

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

  // Si cambia assignedTo, verificar membresía en workspace
  if (taskData.assignedTo && task.workspaceId) {
    const assigneeMembership = await WorkspaceMember.findOne({
      where: { workspaceId: task.workspaceId, userId: taskData.assignedTo }
    });
    if (!assigneeMembership) {
      throw new ForbiddenError('El usuario asignado no es miembro del workspace');
    }
  }

  await task.update(taskData);

  return await Task.findByPk(task.id, {
    include: taskIncludes
  });
};

/**
 * Actualizar solo el estado de la tarea
 */
exports.updateTaskStatus = async (userId, taskId, status) => {
  return await exports.updateTask(userId, taskId, { status });
};

/**
 * Eliminar tarea
 */
exports.deleteTask = async (userId, taskId) => {
  const task = await Task.findOne({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  await verifyTaskAccess(userId, task);

  await task.destroy();
};
