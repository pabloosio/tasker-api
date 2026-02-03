const jwt = require('jsonwebtoken');
const { User, AuthLog } = require('../models');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Registrar un evento de autenticación
 */
const logAuthEvent = async (eventType, email, { userId = null, ipAddress = null, userAgent = null, metadata = null } = {}) => {
  try {
    await AuthLog.create({ eventType, email, userId, ipAddress, userAgent, metadata });
  } catch (err) {
    logger.error('Error al guardar auth log:', err);
  }
};

/**
 * Registrar nuevo usuario
 */
exports.register = async (userData, reqInfo = {}) => {
  const { email, password, name } = userData;

  // Verificar si el email ya existe
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    await logAuthEvent('REGISTER_FAILED_EMAIL_EXISTS', email, {
      userId: existingUser.id,
      ...reqInfo
    });
    throw new BadRequestError('Este email ya está registrado');
  }

  // Crear usuario
  const user = await User.create({
    email,
    password,
    name
  });

  await logAuthEvent('REGISTER_SUCCESS', email, {
    userId: user.id,
    ...reqInfo
  });

  // Generar token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    token
  };
};

/**
 * Iniciar sesión
 */
exports.login = async ({ email, password }, reqInfo = {}) => {
  // Buscar usuario por email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    await logAuthEvent('LOGIN_FAILED_EMAIL_NOT_FOUND', email, reqInfo);
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Verificar si el usuario está activo
  if (!user.isActive) {
    await logAuthEvent('LOGIN_FAILED_INACTIVE_ACCOUNT', email, {
      userId: user.id,
      ...reqInfo
    });
    throw new UnauthorizedError('Esta cuenta está inactiva');
  }

  // Verificar contraseña
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await logAuthEvent('LOGIN_FAILED_WRONG_PASSWORD', email, {
      userId: user.id,
      ...reqInfo
    });
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Actualizar último login
  await user.update({ lastLogin: new Date() });

  await logAuthEvent('LOGIN_SUCCESS', email, {
    userId: user.id,
    ...reqInfo
  });

  // Generar token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    },
    token
  };
};

/**
 * Generar JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn
    }
  );
};