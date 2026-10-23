const { Op } = require('sequelize');
const { ActivityLog, User, Task, WorkspaceMember } = require('../models');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const { WORKSPACE_ROLES, ACTIVITY_ACTIONS: A, PAGINATION } = require('../config/constants');
const { parseTaskKey } = require('../utils/taskKey');
const { verifyTaskAccess } = require('./taskPermissions');
const logger = require('../utils/logger');

// Grupos para filtrar la actividad desde la UI
const ACTION_GROUPS = {
  status: [A.TASK_STATUS_CHANGED],
  assignment: [A.TASK_ASSIGNED, A.COLLABORATOR_ADDED, A.COLLABORATOR_REMOVED],
  edit: [A.TASK_CREATED, A.TASK_UPDATED],
  checklist: [A.CHECKLIST_ITEM_ADDED, A.CHECKLIST_ITEM_COMPLETED, A.CHECKLIST_ITEM_REOPENED, A.CHECKLIST_ITEM_DELETED],
  attachments: [A.ATTACHMENT_ADDED, A.ATTACHMENT_DELETED],
  comments: [A.COMMENT_ADDED, A.COMMENT_DELETED],
  deleted: [A.TASK_DELETED],
  board: [
    A.CATEGORY_CREATED, A.CATEGORY_UPDATED, A.CATEGORY_DELETED,
    A.MEMBER_ADDED, A.MEMBER_REMOVED, A.MEMBER_ROLE_CHANGED,
    A.WIP_LIMITS_CHANGED, A.WORKSPACE_CREATED, A.WORKSPACE_UPDATED, A.WORKSPACE_DELETED
  ]
};

const actorInclude = { model: User, as: 'actor', attributes: ['id', 'name'] };

/**
 * Registrar un evento. Nunca lanza: si falla, la operación del usuario ya se hizo
 * y el error queda en el log del servidor.
 *
 * @param {object} entry
 * @param {string} entry.actorId     - Quién hizo el cambio
 * @param {string} entry.action      - ACTIVITY_ACTIONS.*
 * @param {object} [entry.task]      - Tarea afectada (se copia ID, número y título)
 * @param {object} [entry.workspace] - Tablero ({ id, name }); si no, se toma de la tarea
 * @param {Array}  [entry.changes]   - [{ field, from, to }]
 * @param {object} [entry.details]   - Datos extra
 */
exports.log = async ({ actorId, action, task = null, workspace = null, changes = null, details = null }) => {
  try {
    let workspaceId = workspace?.id ?? task?.workspaceId ?? null;
    let workspaceName = workspace?.name ?? task?.workspace?.name ?? null;
    if (workspaceId && !workspaceName) {
      const ws = await ActivityLog.sequelize.models.Workspace.findByPk(workspaceId, { attributes: ['name'] });
      workspaceName = ws?.name ?? null;
    }

    await ActivityLog.create({
      action,
      actorId,
      workspaceId,
      workspaceName,
      taskId: task?.id ?? null,
      taskNumber: task?.number ?? null,
      taskTitle: task?.title ?? null,
      changes: changes?.length ? changes : null,
      details
    });
  } catch (error) {
    logger.error(`No se pudo registrar actividad ${action}: ${error.message}`);
  }
};

/**
 * Cambios entre dos versiones de una tarea, con valores legibles.
 * Devuelve { status, assignment, other } para registrarlos como eventos separados.
 */
exports.diffTask = (before, after) => {
  const changes = { status: null, assignment: null, other: [] };

  if (before.status !== after.status) {
    changes.status = [{ field: 'status', from: before.status, to: after.status }];
  }
  if ((before.assignedTo || null) !== (after.assignedTo || null)) {
    changes.assignment = [{ field: 'assignee', from: before.assignee?.name ?? null, to: after.assignee?.name ?? null }];
  }

  const simple = [
    ['title', before.title, after.title],
    ['description', before.description || null, after.description || null],
    ['priority', before.priority, after.priority],
    ['dueDate', before.dueDate || null, after.dueDate || null],
    ['category', before.category?.name ?? null, after.category?.name ?? null]
  ];
  simple.forEach(([field, from, to]) => {
    if (from !== to) changes.other.push({ field, from, to });
  });

  return changes;
};

/**
 * Historial de una tarea: lo ve cualquiera que tenga acceso a la tarea.
 */
exports.getTaskActivity = async (userId, taskId) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new NotFoundError('Tarea no encontrada');
  await verifyTaskAccess(userId, task);

  return await ActivityLog.findAll({
    where: { taskId },
    include: [actorInclude],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Filtros comunes (persona, tipo, fechas, ID de tarea) + paginación
 */
const queryActivity = async (where, filters = {}) => {
  const { actorId, group, from, to, task, workspaceId } = filters;
  const page = Math.max(parseInt(filters.page) || 1, 1);
  const limit = Math.min(parseInt(filters.limit) || 30, PAGINATION.MAX_LIMIT);

  if (actorId) where.actorId = actorId;
  if (workspaceId && !where.workspaceId) where.workspaceId = workspaceId;
  if (group && ACTION_GROUPS[group]) where.action = { [Op.in]: ACTION_GROUPS[group] };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00`);
    if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59.999`);
  }
  if (task) {
    const number = parseTaskKey(task);
    // Número inexistente (-1) = sin resultados, en vez de ignorar el filtro
    where.taskNumber = number || -1;
  }

  const { count, rows } = await ActivityLog.findAndCountAll({
    where,
    include: [actorInclude],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit
  });

  return { items: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

/**
 * Actividad de un tablero: solo OWNER/ADMIN del tablero.
 */
exports.getWorkspaceActivity = async (userId, workspaceId, filters) => {
  const membership = await WorkspaceMember.findOne({ where: { workspaceId, userId } });
  if (!membership || ![WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN].includes(membership.role)) {
    throw new ForbiddenError('Solo el propietario o los administradores del tablero pueden ver su actividad');
  }
  return await queryActivity({ workspaceId }, filters);
};

/**
 * Auditoría global: solo administradores de la plataforma (lo valida la ruta /admin).
 */
exports.getGlobalActivity = async (filters) => await queryActivity({}, filters);
