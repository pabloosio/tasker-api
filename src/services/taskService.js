const { Task, Category, User, WorkspaceMember, ChecklistItem, Workspace } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { PAGINATION, TASK_STATUS, TASK_PRIORITY, WORKSPACE_ROLES } = require('../config/constants');
const { Op } = require('sequelize');
const { sendTaskAssignmentEmail } = require('./emailService');

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
 * Verificar que el usuario puede escribir en el workspace de una tarea
 */
const verifyTaskWriteAccess = async (userId, task) => {
  await verifyTaskAccess(userId, task);

  if (task.workspaceId) {
    const membership = await WorkspaceMember.findOne({
      where: { workspaceId: task.workspaceId, userId }
    });
    if (membership?.role === WORKSPACE_ROLES.VIEWER) {
      throw new ForbiddenError('Los observadores no pueden modificar tareas');
    }
  }
};

/**
 * Disparar email de asignación sin bloquear la respuesta.
 * Solo envía si el asignado es diferente al que asigna.
 */
const notifyAssignment = async (assignerId, assigneeId, task) => {
  if (!assigneeId) return;

  const [assigner, assignee, workspace] = await Promise.all([
    User.findByPk(assignerId, { attributes: ['name'] }),
    User.findByPk(assigneeId, { attributes: ['name', 'email'] }),
    task.workspaceId ? Workspace.findByPk(task.workspaceId, { attributes: ['name'] }) : null,
  ]);

  if (!assignee?.email) return;

  sendTaskAssignmentEmail({
    assigneeEmail: assignee.email,
    assigneeName: assignee.name,
    assignerName: assigner?.name ?? 'Un compañero',
    taskTitle: task.title,
    taskDescription: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    workspaceName: workspace?.name ?? null,
  });
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
  },
  {
    model: ChecklistItem,
    as: 'checklistItems',
    attributes: ['id', 'content', 'isCompleted', 'completedAt', 'position'],
    order: [['position', 'ASC'], ['createdAt', 'ASC']]
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
    dueDateFrom,
    dueDateTo,
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

  // Filtro por rango de fecha programada (dueDate)
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate[Op.gte] = dueDateFrom;
    if (dueDateTo)   where.dueDate[Op.lte] = dueDateTo;
  }

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
    if (membership.role === WORKSPACE_ROLES.VIEWER) {
      throw new ForbiddenError('Los observadores no pueden crear tareas');
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

  const result = await Task.findByPk(task.id, { include: taskIncludes });

  // Notificar al asignado si es alguien distinto al creador
  notifyAssignment(userId, taskData.assignedTo, result);

  return result;
};

/**
 * Actualizar tarea
 */
exports.updateTask = async (userId, taskId, taskData) => {
  const task = await Task.findOne({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  await verifyTaskWriteAccess(userId, task);

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

  const previousAssignee = task.assignedTo;
  await task.update(taskData);

  const result = await Task.findByPk(task.id, { include: taskIncludes });

  // Notificar solo si el asignado cambió y es alguien distinto al editor
  const newAssignee = taskData.assignedTo;
  if (newAssignee && newAssignee !== previousAssignee) {
    notifyAssignment(userId, newAssignee, result);
  }

  return result;
};

/**
 * Actualizar solo el estado de la tarea
 */
exports.updateTaskStatus = async (userId, taskId, status) => {
  return await exports.updateTask(userId, taskId, { status });
};

/**
 * Obtener reporte semanal de productividad
 *
 * @param {string} userId - ID del usuario
 * @param {object} filters - Filtros opcionales (workspaceId, weekOffset)
 * @param {number} filters.weekOffset - Desplazamiento de semanas (0=actual, -1=pasada, etc.)
 * @param {string} filters.workspaceId - Filtrar por workspace
 * @returns {object} Reporte semanal con tareas completadas y creadas
 */
exports.getWeeklyReport = async (userId, filters = {}) => {
  const { workspaceId, weekOffset = 0 } = filters;
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

  // Calcular lunes y domingo de la semana objetivo
  const now = new Date();
  const daysFromMonday = (now.getDay() + 6) % 7; // 0=lunes, ..., 6=domingo

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday + parseInt(weekOffset) * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Tareas completadas en la semana (usando completedAt)
  const completedTasks = await Task.findAll({
    where: {
      ...where,
      completedAt: { [Op.between]: [monday, sunday] }
    },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }],
    attributes: ['id', 'title', 'priority', 'completedAt', 'categoryId']
  });

  // Total de tareas creadas en la semana
  const createdCount = await Task.count({
    where: {
      ...where,
      createdAt: { [Op.between]: [monday, sunday] }
    }
  });

  // Agrupar completadas por prioridad
  const byPriority = {
    [TASK_PRIORITY.HIGH]: completedTasks.filter(t => t.priority === TASK_PRIORITY.HIGH).length,
    [TASK_PRIORITY.MEDIUM]: completedTasks.filter(t => t.priority === TASK_PRIORITY.MEDIUM).length,
    [TASK_PRIORITY.LOW]: completedTasks.filter(t => t.priority === TASK_PRIORITY.LOW).length
  };

  // Agrupar completadas por categoría
  const categoryMap = {};
  completedTasks.forEach(task => {
    if (task.category) {
      const key = task.category.id;
      if (!categoryMap[key]) {
        categoryMap[key] = { id: key, name: task.category.name, color: task.category.color, count: 0 };
      }
      categoryMap[key].count++;
    }
  });

  const byCategory = Object.values(categoryMap).sort((a, b) => b.count - a.count);
  const uncategorizedCount = completedTasks.filter(t => !t.categoryId).length;
  if (uncategorizedCount > 0) {
    byCategory.push({ id: null, name: 'Sin categoría', color: '#6c757d', count: uncategorizedCount });
  }

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
    weekOffset: parseInt(weekOffset),
    completed: {
      total: completedTasks.length,
      byPriority,
      byCategory
    },
    created: {
      total: createdCount
    }
  };
};

/**
 * Eliminar tarea
 */
exports.deleteTask = async (userId, taskId) => {
  const task = await Task.findOne({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  await verifyTaskWriteAccess(userId, task);

  await task.destroy();
};
