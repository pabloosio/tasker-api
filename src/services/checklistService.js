const { Task, ChecklistItem } = require('../models');
const { NotFoundError } = require('../utils/errors');
const { verifyTaskAccess, verifyTaskEditAccess } = require('./taskPermissions');
const activityService = require('./activityService');
const { ACTIVITY_ACTIONS } = require('../config/constants');

// Registrar un cambio de checklist con el avance resultante (ej. 2/4)
const logChecklist = async (userId, task, action, content) => {
  const [total, done] = await Promise.all([
    ChecklistItem.count({ where: { taskId: task.id } }),
    ChecklistItem.count({ where: { taskId: task.id, isCompleted: true } })
  ]);
  await activityService.log({ actorId: userId, action, task, details: { content, progress: `${done}/${total}` } });
};

const getTask = async (userId, taskId, { forWrite = true } = {}) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw new NotFoundError('Tarea no encontrada');
  await (forWrite ? verifyTaskEditAccess : verifyTaskAccess)(userId, task);
  return task;
};

exports.getItems = async (userId, taskId) => {
  await getTask(userId, taskId, { forWrite: false });

  return await ChecklistItem.findAll({
    where: { taskId },
    order: [['position', 'ASC'], ['createdAt', 'ASC']]
  });
};

exports.addItem = async (userId, taskId, content) => {
  const task = await getTask(userId, taskId);

  const maxPos = await ChecklistItem.max('position', { where: { taskId } });

  const item = await ChecklistItem.create({
    taskId,
    content,
    position: (maxPos || 0) + 1
  });

  await logChecklist(userId, task, ACTIVITY_ACTIONS.CHECKLIST_ITEM_ADDED, content);
  return item;
};

exports.toggleItem = async (userId, taskId, itemId) => {
  const task = await getTask(userId, taskId);

  const item = await ChecklistItem.findOne({
    where: { id: itemId, taskId }
  });

  if (!item) throw new NotFoundError('Ítem no encontrado');

  const isCompleted = !item.isCompleted;
  await item.update({
    isCompleted,
    completedAt: isCompleted ? new Date() : null
  });

  await logChecklist(
    userId, task,
    isCompleted ? ACTIVITY_ACTIONS.CHECKLIST_ITEM_COMPLETED : ACTIVITY_ACTIONS.CHECKLIST_ITEM_REOPENED,
    item.content
  );
  return item;
};

exports.deleteItem = async (userId, taskId, itemId) => {
  const task = await getTask(userId, taskId);

  const item = await ChecklistItem.findOne({
    where: { id: itemId, taskId }
  });

  if (!item) throw new NotFoundError('Ítem no encontrado');

  await item.destroy();
  await logChecklist(userId, task, ACTIVITY_ACTIONS.CHECKLIST_ITEM_DELETED, item.content);
};
