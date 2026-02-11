const adminService = require('../services/adminService');
const { successResponse } = require('../utils/response');

/**
 * Obtener lista de usuarios con filtros y paginación
 * GET /api/v1/admin/users
 * Query params: page, limit, email, role, isActive, emailVerified
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, email, role, isActive, emailVerified } = req.query;

    const filters = {};
    if (email) filters.email = email;
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive;
    if (emailVerified !== undefined) filters.emailVerified = emailVerified;

    const result = await adminService.getAllUsers(filters, parseInt(page), parseInt(limit));

    return successResponse(res, result, 'Usuarios obtenidos exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar email de un usuario
 * PATCH /api/v1/admin/users/:userId/email
 */
exports.updateUserEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email } = req.body;

    const user = await adminService.updateUserEmail(userId, email, req.user.id);

    return successResponse(
      res,
      { user },
      'Email actualizado exitosamente'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Activar o desactivar usuario
 * PATCH /api/v1/admin/users/:userId/active
 */
exports.toggleUserActive = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await adminService.toggleUserActive(userId, isActive, req.user.id);

    return successResponse(
      res,
      { user },
      `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar email manualmente
 * POST /api/v1/admin/users/:userId/verify-email
 */
exports.verifyUserEmailManually = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await adminService.verifyUserEmailManually(userId, req.user.id);

    return successResponse(
      res,
      { user },
      'Email verificado manualmente exitosamente'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar rol de usuario
 * PATCH /api/v1/admin/users/:userId/role
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await adminService.updateUserRole(userId, role, req.user.id);

    return successResponse(
      res,
      { user },
      'Rol actualizado exitosamente'
    );
  } catch (error) {
    next(error);
  }
};
