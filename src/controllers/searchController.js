const searchService = require('../services/searchService');
const { successResponse } = require('../utils/response');

/**
 * Búsqueda global (tareas, tableros y categorías a los que tengo acceso)
 * GET /api/v1/search?q=
 */
exports.search = async (req, res, next) => {
  try {
    const results = await searchService.search(req.user.id, req.query.q);
    return successResponse(res, results, 'Búsqueda realizada exitosamente');
  } catch (error) {
    next(error);
  }
};
