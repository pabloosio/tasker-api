const { Op } = require('sequelize');
const { Category, Task, WorkspaceMember } = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { WORKSPACE_ROLES, ACTIVITY_ACTIONS } = require('../config/constants');
const activityService = require('./activityService');

/**
 * Las categorías son configuración del tablero: solo OWNER/ADMIN pueden crearlas,
 * editarlas o eliminarlas. Las categorías sin tablero (legado) solo las gestiona su creador.
 */
const verifyCategoryManager = async (userId, workspaceId, category = null) => {
  if (!workspaceId) {
    if (category && category.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para modificar esta categoría');
    }
    return;
  }

  const membership = await WorkspaceMember.findOne({ where: { workspaceId, userId } });
  if (!membership) {
    throw new ForbiddenError('No tienes acceso a este tablero');
  }
  if (![WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN].includes(membership.role)) {
    throw new ForbiddenError('Solo el propietario o los administradores del tablero pueden gestionar sus categorías');
  }
};

/**
 * Evitar nombres repetidos dentro del mismo tablero (o entre las categorías sin tablero del usuario)
 */
const verifyUniqueName = async (userId, workspaceId, name, excludeId = null) => {
  const where = workspaceId ? { workspaceId, name } : { userId, workspaceId: null, name };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  if (await Category.findOne({ where })) {
    throw new BadRequestError('Ya existe una categoría con ese nombre en este tablero');
  }
};

/**
 * Obtener todas las categorías del usuario (o del workspace)
 */
exports.getAllCategories = async (userId, filters = {}) => {
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

  const categories = await Category.findAll({
    where,
    include: [
      {
        model: Task,
        as: 'tasks',
        attributes: ['id'],
        required: false
      }
    ],
    order: [['name', 'ASC']]
  });

  // Agregar conteo de tareas
  return categories.map(category => {
    const categoryJSON = category.toJSON();
    return {
      ...categoryJSON,
      taskCount: categoryJSON.tasks ?  categoryJSON.tasks.length : 0,
      tasks: undefined // Remover array de tasks, solo queremos el conteo
    };
  });
};

/**
 * Obtener categoría por ID
 */
exports.getCategoryById = async (userId, categoryId) => {
  const category = await Category.findOne({
    where: { id: categoryId },
    include: [
      {
        model: Task,
        as: 'tasks',
        attributes: ['id', 'title', 'status', 'priority']
      }
    ]
  });

  if (!category) {
    throw new NotFoundError('Categoría no encontrada');
  }

  if (category.workspaceId) {
    const membership = await WorkspaceMember.findOne({ where: { workspaceId: category.workspaceId, userId } });
    if (!membership) {
      throw new ForbiddenError('No tienes permiso para acceder a esta categoría');
    }
  } else if (category.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para acceder a esta categoría');
  }

  return category;
};

/**
 * Crear nueva categoría
 */
exports.createCategory = async (userId, categoryData) => {
  const workspaceId = categoryData.workspaceId || null;
  await verifyCategoryManager(userId, workspaceId);
  await verifyUniqueName(userId, workspaceId, categoryData.name);

  const category = await Category.create({
    ...categoryData,
    userId
  });

  if (category.workspaceId) {
    await activityService.log({
      actorId: userId,
      action: ACTIVITY_ACTIONS.CATEGORY_CREATED,
      workspace: { id: category.workspaceId },
      details: { name: category.name, color: category.color }
    });
  }

  return category;
};

/**
 * Actualizar categoría
 */
exports.updateCategory = async (userId, categoryId, categoryData) => {
  const category = await Category.findOne({ where: { id: categoryId } });

  if (!category) {
    throw new NotFoundError('Categoría no encontrada');
  }

  await verifyCategoryManager(userId, category.workspaceId, category);

  // Si se cambia el nombre, verificar que no exista otro con ese nombre en el tablero
  if (categoryData.name && categoryData.name !== category.name) {
    await verifyUniqueName(category.userId, category.workspaceId, categoryData.name, categoryId);
  }

  // Una categoría no se mueve de tablero
  const { workspaceId, ...changes } = categoryData;
  const before = { name: category.name, color: category.color, description: category.description || null };
  await category.update(changes);

  if (category.workspaceId) {
    const diff = ['name', 'color', 'description']
      .map(field => ({ field, from: before[field], to: category[field] || null }))
      .filter(c => c.from !== c.to);
    if (diff.length) {
      await activityService.log({
        actorId: userId,
        action: ACTIVITY_ACTIONS.CATEGORY_UPDATED,
        workspace: { id: category.workspaceId },
        changes: diff,
        details: { name: category.name }
      });
    }
  }
  return category;
};

/**
 * Eliminar categoría
 */
exports.deleteCategory = async (userId, categoryId) => {
  const category = await Category.findOne({ where: { id: categoryId } });

  if (!category) {
    throw new NotFoundError('Categoría no encontrada');
  }

  await verifyCategoryManager(userId, category.workspaceId, category);

  // Las tareas asociadas tendrán categoryId en NULL automáticamente (onDelete: SET NULL)
  const taskCount = await Task.count({ where: { categoryId } });
  await category.destroy();

  if (category.workspaceId) {
    await activityService.log({
      actorId: userId,
      action: ACTIVITY_ACTIONS.CATEGORY_DELETED,
      workspace: { id: category.workspaceId },
      details: { name: category.name, taskCount }
    });
  }
};

// exports.deleteCategoryV2 = async (userId, categoryId) => {
//   const taskQuantity = await Task.count({ where: { categoryId: categoryId, userId: userId } });
// }

