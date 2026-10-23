const { Task, TaskComment, TaskCollaborator, User, WorkspaceMember } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { verifyTaskAccess, verifyCommentDeleteAccess } = require('./taskPermissions');
const activityService = require('./activityService');
const notificationService = require('./notificationService');
const { parseMentions, mentionsToText } = require('../utils/mentions');
const { ACTIVITY_ACTIONS, NOTIFICATION_TYPES, WORKSPACE_ROLES } = require('../config/constants');

const authorInclude = { model: User, as: 'author', attributes: ['id', 'name'] };

// Para el historial basta un fragmento del comentario (con las menciones como "@Nombre")
const excerpt = (content) => {
  const text = mentionsToText(content);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

/**
 * Avisos de un comentario nuevo:
 * - MENTION a quien mencionaron con @ (si es miembro del tablero).
 * - COMMENT a quienes participan en la tarea (quien la creó, la persona asignada y colaboradores),
 *   salvo que ya los hayan mencionado.
 */
const notifyComment = async (userId, task, content) => {
  const text = mentionsToText(content);
  const mentioned = await notificationService.notify({
    recipients: parseMentions(content),
    actorId: userId,
    type: NOTIFICATION_TYPES.MENTION,
    task,
    text
  });

  const collaborators = await TaskCollaborator.findAll({ where: { taskId: task.id }, attributes: ['userId'] });
  const participants = [task.userId, task.assignedTo, ...collaborators.map((c) => c.userId)]
    .filter((id) => id && !mentioned.includes(id));
  await notificationService.notify({
    recipients: participants,
    actorId: userId,
    type: NOTIFICATION_TYPES.COMMENT,
    task,
    text
  });
};

/**
 * Comentar no modifica la tarea: puede hacerlo cualquiera que pueda verla (incluidos observadores)
 */
const getTask = async (userId, taskId) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new NotFoundError('Tarea no encontrada');
  await verifyTaskAccess(userId, task);
  return task;
};

const findComment = async (taskId, commentId) => {
  const comment = await TaskComment.findOne({ where: { id: commentId, taskId }, include: [authorInclude] });
  if (!comment) throw new NotFoundError('Comentario no encontrado');
  return comment;
};

exports.list = async (userId, taskId) => {
  await getTask(userId, taskId);
  return await TaskComment.findAll({
    where: { taskId },
    include: [authorInclude],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });
};

exports.create = async (userId, taskId, content) => {
  const task = await getTask(userId, taskId);
  const comment = await TaskComment.create({ taskId, userId, content: content.trim() });

  await activityService.log({
    actorId: userId,
    action: ACTIVITY_ACTIONS.COMMENT_ADDED,
    task,
    details: { content: excerpt(comment.content) }
  });
  await notifyComment(userId, task, comment.content);
  return await findComment(taskId, comment.id);
};

/**
 * Solo el autor puede editar su comentario (no queda en el historial; se marca como editado)
 */
exports.update = async (userId, taskId, commentId, content) => {
  const task = await getTask(userId, taskId);
  const comment = await findComment(taskId, commentId);
  if (comment.userId !== userId) {
    throw new ForbiddenError('Solo puedes editar tus propios comentarios');
  }

  const before = new Set(parseMentions(comment.content));
  await comment.update({ content: content.trim(), editedAt: new Date() });

  // Solo se avisa a quien se mencionó por primera vez en esta edición
  const added = parseMentions(comment.content).filter((id) => !before.has(id));
  if (added.length) {
    await notificationService.notify({
      recipients: added,
      actorId: userId,
      type: NOTIFICATION_TYPES.MENTION,
      task,
      text: mentionsToText(comment.content)
    });
  }
  return comment;
};

/**
 * Personas que se pueden mencionar en la tarea: los miembros de su tablero.
 * canInvite indica si quien pregunta puede invitar a más gente (OWNER/ADMIN).
 */
exports.mentionable = async (userId, taskId) => {
  const task = await getTask(userId, taskId);
  if (!task.workspaceId) return { workspaceId: null, canInvite: false, members: [] };

  const members = await WorkspaceMember.findAll({
    where: { workspaceId: task.workspaceId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'], where: { isActive: true } }]
  });
  const me = members.find((m) => m.userId === userId);
  return {
    workspaceId: task.workspaceId,
    canInvite: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN].includes(me?.role),
    members: members
      .map((m) => ({ id: m.user.id, name: m.user.name, role: m.role }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  };
};

exports.remove = async (userId, taskId, commentId) => {
  const task = await getTask(userId, taskId);
  const comment = await findComment(taskId, commentId);
  await verifyCommentDeleteAccess(userId, task, comment);

  await comment.destroy();
  await activityService.log({
    actorId: userId,
    action: ACTIVITY_ACTIONS.COMMENT_DELETED,
    task,
    details: { content: excerpt(comment.content), author: comment.author?.name ?? null }
  });
};
