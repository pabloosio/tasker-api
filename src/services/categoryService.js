const { Category, Task } = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

/**
 * Obtener todas las categorías del usuario
 */
exports.getAllCategories = async (userId) => {
  const categories = await Category.findAll({
    where: { userId },
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

  if (category.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para acceder a esta categoría');
  }

  return category;
};

/**
 * Crear nueva categoría
 */
exports.createCategory = async (userId, categoryData) => {
  // Verificar si ya existe una categoría con ese nombre
  const existing = await Category.findOne({
    where: {
      userId,
      name: categoryData. name
    }
  });

  if (existing) {
    throw new BadRequestError('Ya tienes una categoría con ese nombre');
  }

  const category = await Category.create({
    ...categoryData,
    userId
  });

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

  if (category.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para modificar esta categoría');
  }

  // Si se cambia el nombre, verificar que no exista otro con ese nombre
  if (categoryData. name && categoryData.name !== category.name) {
    const existing = await Category.findOne({
      where: {
        userId,
        name: categoryData. name,
        id:  { [require('sequelize').Op.ne]: categoryId }
      }
    });

    if (existing) {
      throw new BadRequestError('Ya tienes una categoría con ese nombre');
    }
  }

  await category.update(categoryData);
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

  if (category.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para eliminar esta categoría');
  }

  // Las tareas asociadas tendrán categoryId en NULL automáticamente (onDelete: SET NULL)
  await category.destroy();
};

// exports.deleteCategoryV2 = async (userId, categoryId) => {
//   const taskQuantity = await Task.count({ where: { categoryId: categoryId, userId: userId } });
// }

