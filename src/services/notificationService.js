const { Op } = require('sequelize');
const { Notification, User, WorkspaceMember } = require('../models');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const LIST_LIMIT = 30;
// Avisos leídos con más de N días se borran solos al consultar la lista
const KEEP_READ_DAYS = 60;

const excerptOf = (text) => {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
};

/**
 * Crear avisos para varias personas. Nunca lanza: si falla, la acción del usuario ya se hizo.
 * - No avisa a quien hizo la acción.
 * - Solo avisa a quien todavía puede ver la tarea (miembro del tablero).
 *
 * @param {object}   params
 * @param {string[]} params.recipients - Ids de usuario
 * @param {string}   params.actorId
 * @param {string}   params.type       - NOTIFICATION_TYPES.*
 * @param {object}   params.task       - Tarea (id, number, title, workspaceId)
 * @param {string}   [params.text]     - Texto del comentario (se guarda un fragmento)
 */
exports.notify = async ({ recipients, actorId, type, task, text = null }) => {
  try {
    let ids = [...new Set(recipients.filter(Boolean))].filter((id) => id !== actorId);
    if (!ids.length) return [];

    if (task.workspaceId) {
      const members = await WorkspaceMember.findAll({
        where: { workspaceId: task.workspaceId, userId: { [Op.in]: ids } },
        attributes: ['userId']
      });
      const allowed = new Set(members.map((m) => m.userId));
      ids = ids.filter((id) => allowed.has(id));
    }
    if (!ids.length) return [];

    const data = { taskNumber: task.number, taskTitle: task.title, excerpt: excerptOf(text) };
    await Notification.bulkCreate(ids.map((userId) => ({
      userId,
      actorId,
      type,
      taskId: task.id,
      workspaceId: task.workspaceId ?? null,
      data
    })));
    return ids;
  } catch (error) {
    logger.error(`No se pudieron crear avisos ${type}: ${error.message}`);
    return [];
  }
};

/**
 * Borrar los avisos de una tarea (al eliminarla ya no hay a dónde llevar).
 * Nunca lanza.
 */
exports.removeForTask = (taskId) =>
  Notification.destroy({ where: { taskId } })
    .catch((error) => logger.error(`No se pudieron borrar avisos de la tarea ${taskId}: ${error.message}`));

exports.unreadCount = (userId) => Notification.count({ where: { userId, readAt: null } });

/**
 * Últimos avisos de la persona + cuántos tiene sin leer
 */
exports.list = async (userId) => {
  // Limpieza: los leídos viejos ya no sirven
  Notification.destroy({
    where: { userId, readAt: { [Op.lt]: new Date(Date.now() - KEEP_READ_DAYS * 86400000) } }
  }).catch((error) => logger.error(`No se pudieron limpiar avisos: ${error.message}`));

  const [items, unreadCount] = await Promise.all([
    Notification.findAll({
      where: { userId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: LIST_LIMIT
    }),
    exports.unreadCount(userId)
  ]);
  return { items, unreadCount };
};

exports.markRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ where: { id: notificationId, userId } });
  if (!notification) throw new NotFoundError('Aviso no encontrado');
  if (!notification.readAt) await notification.update({ readAt: new Date() });
  return notification;
};

exports.markAllRead = async (userId) => {
  const [updated] = await Notification.update({ readAt: new Date() }, { where: { userId, readAt: null } });
  return updated;
};
