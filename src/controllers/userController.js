const userService = require('../services/userService');
const { successResponse } = require('../utils/response');

/**
 * Obtener perfil del usuario autenticado
 * GET /api/v1/users/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return successResponse(res, user, 'Perfil obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar perfil del usuario
 * PUT /api/v1/users/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    return successResponse(res, user, 'Perfil actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Desactivar cuenta
 * DELETE /api/v1/users/profile
 */
exports.deactivateAccount = async (req, res, next) => {
  try {
    await userService.deactivateUser(req.user. id);
    return successResponse(res, null, 'Cuenta desactivada exitosamente');
  } catch (error) {
    next(error);
  }
};