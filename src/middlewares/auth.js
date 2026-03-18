const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { UnauthorizedError } = require('../utils/errors');
const config = require('../config/env');

/**
 * Middleware de autenticación
 * Verifica el token JWT y adjunta el usuario al request
 */
module.exports = async (req, res, next) => {
  try {
    // 1. Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token no proporcionado.  Por favor inicia sesión');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Token no válido');
    }

    // 2. Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Tu sesión ha expirado.  Por favor inicia sesión nuevamente');
      }
      throw new UnauthorizedError('Token inválido');
    }

    // 3. Verificar que el usuario exista y esté activo
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'isActive']
    });

    if (!user) {
      throw new UnauthorizedError('El usuario ya no existe');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Tu cuenta ha sido desactivada');
    }

    // 4. Adjuntar usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    next(error);
  }
};