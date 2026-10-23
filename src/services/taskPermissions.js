const { WorkspaceMember } = require('../models');
const { ForbiddenError } = require('../utils/errors');
const { WORKSPACE_ROLES } = require('../config/constants');

const MANAGER_ROLES = [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN];

const getMembership = (userId, task) => task.workspaceId
  ? WorkspaceMember.findOne({ where: { workspaceId: task.workspaceId, userId } })
  : null;

/**
 * Verificar acceso de lectura a una tarea (por ownership directo o membresía de workspace)
 */
exports.verifyTaskAccess = async (userId, task) => {
  if (task.userId === userId) return;
  if (await getMembership(userId, task)) return;

  throw new ForbiddenError('No tienes permiso para acceder a esta tarea');
};

/**
 * Verificar que el usuario puede modificar una tarea (moverla, editarla, su checklist).
 * Permitido a: quien la creó, la persona asignada y OWNER/ADMIN del tablero.
 * Con allowAssignee=false (ej. borrar) la persona asignada queda excluida.
 */
exports.verifyTaskEditAccess = async (userId, task, { allowAssignee = true } = {}) => {
  await exports.verifyTaskAccess(userId, task);

  const membership = await getMembership(userId, task);
  if (membership?.role === WORKSPACE_ROLES.VIEWER) {
    throw new ForbiddenError('Los observadores no pueden modificar tareas');
  }

  if (!task.workspaceId || task.userId === userId) return;
  if (MANAGER_ROLES.includes(membership?.role)) return;
  if (allowAssignee && task.assignedTo === userId) return;

  throw new ForbiddenError(allowAssignee
    ? 'Solo la persona asignada, quien creó la tarea o un administrador del tablero pueden modificarla'
    : 'Solo quien creó la tarea o un administrador del tablero pueden eliminarla');
};
