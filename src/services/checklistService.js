const { Task, ChecklistItem, WorkspaceMember } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

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

const getTask = async (userId, taskId) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new NotFoundError('Tarea no encontrada');
  await verifyTaskAccess(userId, task);
  return task;
};

exports.getItems = async (userId, taskId) => {
  await getTask(userId, taskId);

  return await ChecklistItem.findAll({
    where: { taskId },
    order: [['position', 'ASC'], ['createdAt', 'ASC']]
  });
};

exports.addItem = async (userId, taskId, content) => {
  await getTask(userId, taskId);

  const maxPos = await ChecklistItem.max('position', { where: { taskId } });

  return await ChecklistItem.create({
    taskId,
    content,
    position: (maxPos || 0) + 1
  });
};

exports.toggleItem = async (userId, taskId, itemId) => {
  await getTask(userId, taskId);

  const item = await ChecklistItem.findOne({
    where: { id: itemId, taskId }
  });

  if (!item) throw new NotFoundError('Ítem no encontrado');

  const isCompleted = !item.isCompleted;
  await item.update({
    isCompleted,
    completedAt: isCompleted ? new Date() : null
  });

  return item;
};

exports.deleteItem = async (userId, taskId, itemId) => {
  await getTask(userId, taskId);

  const item = await ChecklistItem.findOne({
    where: { id: itemId, taskId }
  });

  if (!item) throw new NotFoundError('Ítem no encontrado');

  await item.destroy();
};
