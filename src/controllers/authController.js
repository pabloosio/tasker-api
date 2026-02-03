const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

const getRequestInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('User-Agent') || null
});

/**
 * Registrar nuevo usuario
 * POST /api/v1/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body, getRequestInfo(req));
    return successResponse(
      res,
      result,
      'Usuario registrado exitosamente',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Iniciar sesión
 * POST /api/v1/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, getRequestInfo(req));
    return successResponse(res, result, 'Login exitoso');
  } catch (error) {
    next(error);
  }
};