const categoryService = require('../services/categoryService');
const { successResponse } = require('../utils/response');

/**
 * Obtener todas las categorías
 * GET /api/v1/categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories(req.user.id, req.query);
    return successResponse(res, categories, 'Categorías obtenidas exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener categoría por ID
 * GET /api/v1/categories/:id
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(
      req.user.id,
      req.params.id
    );
    return successResponse(res, category, 'Categoría obtenida exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Crear nueva categoría
 * POST /api/v1/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.user.id, req.body);
    return successResponse(res, category, 'Categoría creada exitosamente', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar categoría
 * PUT /api/v1/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.user.id,
      req.params.id,
      req.body
    );
    return successResponse(res, category, 'Categoría actualizada exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar categoría
 * DELETE /api/v1/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.user.id, req.params.id);
    return successResponse(res, null, 'Categoría eliminada exitosamente');
  } catch (error) {
    next(error);
  }
};