const { Task, Category, User, WorkspaceMember, ChecklistItem, Workspace } = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { PAGINATION, TASK_STATUS, TASK_PRIORITY, WORKSPACE_ROLES } = require('../config/constants');
const { Op } = require('sequelize');
const { sendTaskAssignmentEmail } = require('./emailService');
const { verifyTaskAccess, verifyTaskEditAccess } = require('./taskPermissions');
const { formatTaskKey } = require('../utils/taskKey');
const activityService = require('./activityService');
const { ACTIVITY_ACTIONS } = require('../config/constants');

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
    taskKey: formatTaskKey(task.number),
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

// Las completadas con más de N días salen del tablero (siguen en reportes y exportación)
const BOARD_ARCHIVE_DAYS = 30;
// "Mis tareas" muestra las completadas de los últimos N días
const MY_TASKS_COMPLETED_DAYS = 7;

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Posición para colocar una tarjeta arriba de su columna
 */
const topPositionOf = async ({ workspaceId, userId, status }) => {
  const where = workspaceId ? { workspaceId, status } : { userId, workspaceId: null, status };
  const min = await Task.min('position', { where });
  return (min ?? 1) - 1;
};

const verifyMembership = async (userId, workspaceId) => {
  const membership = await WorkspaceMember.findOne({ where: { workspaceId, userId } });
  if (!membership) {
    throw new ForbiddenError('No tienes acceso a este workspace');
  }
  return membership;
};

/**
 * Tareas del tablero (Kanban): todas las activas, sin tope de paginación, en su orden manual.
 * Las completadas hace más de BOARD_ARCHIVE_DAYS días se archivan (solo se devuelve el conteo).
 */
exports.getBoardTasks = async (userId, { workspaceId } = {}) => {
  if (!workspaceId) {
    throw new BadRequestError('workspaceId es requerido');
  }
  await verifyMembership(userId, workspaceId);

  const cutoff = daysAgo(BOARD_ARCHIVE_DAYS);
  const [tasks, archivedCount, workspace] = await Promise.all([
    Task.findAll({
      where: {
        workspaceId,
        [Op.or]: [
          { status: { [Op.ne]: TASK_STATUS.COMPLETED } },
          { completedAt: { [Op.gte]: cutoff } },
          { completedAt: null }
        ]
      },
      include: taskIncludes,
      order: [['position', 'ASC'], ['createdAt', 'DESC']]
    }),
    Task.count({
      where: { workspaceId, status: TASK_STATUS.COMPLETED, completedAt: { [Op.lt]: cutoff } }
    }),
    Workspace.findByPk(workspaceId, { attributes: ['wipLimits'] })
  ]);

  return {
    tasks,
    archivedCount,
    archiveDays: BOARD_ARCHIVE_DAYS,
    wipLimits: workspace?.wipLimits || {}
  };
};

/**
 * "Mis tareas": lo asignado al usuario en todos sus tableros, más sus tareas
 * personales sin asignar. Incluye las completadas recientes.
 */
exports.getMyTasks = async (userId) => {
  const memberships = await WorkspaceMember.findAll({ where: { userId }, attributes: ['workspaceId'] });
  const workspaceIds = memberships.map(m => m.workspaceId);

  return await Task.findAll({
    where: {
      workspaceId: { [Op.in]: workspaceIds },
      [Op.and]: [
        {
          [Op.or]: [
            { assignedTo: userId },
            { assignedTo: null, userId, '$workspace.is_personal$': true }
          ]
        },
        {
          [Op.or]: [
            { status: { [Op.ne]: TASK_STATUS.COMPLETED } },
            { completedAt: { [Op.gte]: daysAgo(MY_TASKS_COMPLETED_DAYS) } }
          ]
        }
      ]
    },
    include: [
      ...taskIncludes,
      { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'isPersonal'] }
    ],
    order: [['dueDate', 'ASC'], ['position', 'ASC']]
  });
};

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
      backlog: tasks.filter(t => t.status === TASK_STATUS.BACKLOG).length,
      pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
      in_progress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
      in_review: tasks.filter(t => t.status === TASK_STATUS.IN_REVIEW).length,
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
 * Obtener tarea por su número legible (#000142). Misma regla de acceso que por ID.
 */
exports.getTaskByNumber = async (userId, number) => {
  const task = await Task.findOne({
    where: { number },
    include: [...taskIncludes, { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'isPersonal'] }]
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

  const position = await topPositionOf({
    workspaceId: taskData.workspaceId,
    userId,
    status: taskData.status || TASK_STATUS.PENDING
  });

  const task = await Task.create({
    ...taskData,
    position,
    userId
  });

  const result = await Task.findByPk(task.id, { include: taskIncludes });

  // Notificar al asignado si es alguien distinto al creador
  notifyAssignment(userId, taskData.assignedTo, result);

  await activityService.log({
    actorId: userId,
    action: ACTIVITY_ACTIONS.TASK_CREATED,
    task: result,
    details: { status: result.status, assignee: result.assignee?.name ?? null }
  });

  return result;
};

/**
 * Actualizar tarea
 */
exports.updateTask = async (userId, taskId, taskData) => {
  const task = await Task.findOne({
    where: { id: taskId },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: User, as: 'assignee', attributes: ['id', 'name'] }
    ]
  });

  if (!task) {
    throw new NotFoundError('Tarea no encontrada');
  }

  await verifyTaskEditAccess(userId, task);

  // Una tarea no se mueve de tablero ni cambia de número al editarla
  delete taskData.workspaceId;
  delete taskData.number;

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

    // Sin posición explícita (ej. cambio desde el formulario), va arriba de la nueva columna
    if (taskData.position === undefined) {
      taskData.position = await topPositionOf({ workspaceId: task.workspaceId, userId: task.userId, status: taskData.status });
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
  const before = task.toJSON();
  await task.update(taskData);

  const result = await Task.findByPk(task.id, { include: taskIncludes });

  // Historial: estado, asignación y demás cambios como eventos separados
  const diff = activityService.diffTask(before, result);
  if (diff.status) {
    await activityService.log({ actorId: userId, action: ACTIVITY_ACTIONS.TASK_STATUS_CHANGED, task: result, changes: diff.status });
  }
  if (diff.assignment) {
    await activityService.log({ actorId: userId, action: ACTIVITY_ACTIONS.TASK_ASSIGNED, task: result, changes: diff.assignment });
  }
  if (diff.other.length) {
    await activityService.log({ actorId: userId, action: ACTIVITY_ACTIONS.TASK_UPDATED, task: result, changes: diff.other });
  }

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
exports.updateTaskStatus = async (userId, taskId, status, position) => {
  const changes = { status };
  if (position !== undefined) changes.position = position;
  return await exports.updateTask(userId, taskId, changes);
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

  await verifyTaskEditAccess(userId, task, { allowAssignee: false });

  await task.destroy();

  // El registro conserva número y título aunque la tarea ya no exista
  await activityService.log({
    actorId: userId,
    action: ACTIVITY_ACTIONS.TASK_DELETED,
    task,
    details: { status: task.status, priority: task.priority }
  });
};
