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

/**
 * Solicitar reinicio de contraseña
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Validar token de reinicio
 * GET /api/v1/auth/validate-reset-token/:token
 */
exports.validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    await authService.validatePasswordResetToken(token);
    return successResponse(res, {}, 'Token válido');
  } catch (error) {
    next(error);
  }
};

/**
 * Reiniciar contraseña
 * POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar email
 * POST /api/v1/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};