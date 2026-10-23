const { WorkspaceMember, TaskCollaborator } = require('../models');
const { ForbiddenError } = require('../utils/errors');
const { WORKSPACE_ROLES } = require('../config/constants');

const MANAGER_ROLES = [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN];

const getMembership = (userId, task) => task.workspaceId
  ? WorkspaceMember.findOne({ where: { workspaceId: task.workspaceId, userId } })
  : null;

/**
 * Verificar acceso de lectura a una tarea.
 * Tarea de un tablero: hay que ser miembro actual (quien la creó y luego salió del tablero pierde el acceso).
 * Tarea sin tablero: solo quien la creó.
 */
exports.verifyTaskAccess = async (userId, task) => {
  if (task.workspaceId) {
    if (await getMembership(userId, task)) return;
  } else if (task.userId === userId) {
    return;
  }

  throw new ForbiddenError('No tienes permiso para acceder a esta tarea');
};

/**
 * Verificar que el usuario puede modificar una tarea (moverla, editarla, su checklist).
 * Permitido a: quien la creó, la persona asignada, sus colaboradores y OWNER/ADMIN del tablero.
 * Con allowAssignee=false (ej. borrar) la persona asignada y los colaboradores quedan excluidos.
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
  if (allowAssignee && await TaskCollaborator.findOne({ where: { taskId: task.id, userId }, attributes: ['id'] })) return;

  throw new ForbiddenError(allowAssignee
    ? 'Solo la persona asignada, sus colaboradores, quien creó la tarea o un administrador del tablero pueden modificarla'
    : 'Solo quien creó la tarea o un administrador del tablero pueden eliminarla');
};

/**
 * Verificar que el usuario puede borrar un comentario.
 * Permitido a: quien lo escribió y OWNER/ADMIN del tablero (en tareas sin tablero, quien creó la tarea).
 */
exports.verifyCommentDeleteAccess = async (userId, task, comment) => {
  await exports.verifyTaskAccess(userId, task);
  if (comment.userId === userId) return;
  if (!task.workspaceId && task.userId === userId) return;

  const membership = await getMembership(userId, task);
  if (MANAGER_ROLES.includes(membership?.role)) return;

  throw new ForbiddenError('Solo quien escribió el comentario o un administrador del tablero pueden eliminarlo');
};

/**
 * Verificar que el usuario puede borrar un adjunto.
 * Permitido a: quien lo subió, quien creó la tarea y OWNER/ADMIN del tablero (nunca VIEWER).
 */
exports.verifyAttachmentDeleteAccess = async (userId, task, attachment) => {
  await exports.verifyTaskAccess(userId, task);

  const membership = await getMembership(userId, task);
  if (membership?.role === WORKSPACE_ROLES.VIEWER) {
    throw new ForbiddenError('Los observadores no pueden eliminar archivos');
  }

  if (attachment.uploadedBy === userId || task.userId === userId) return;
  if (MANAGER_ROLES.includes(membership?.role)) return;

  throw new ForbiddenError('Solo quien subió el archivo, quien creó la tarea o un administrador del tablero pueden eliminarlo');
};
