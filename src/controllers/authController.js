const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

/**
 * Registrar nuevo usuario
 * POST /api/v1/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    console.log(req.body)
    const result = await authService.register(req.body);
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
    const result = await authService.login(req.body);
    return successResponse(res, result, 'Login exitoso');
  } catch (error) {
    next(error);
  }
};