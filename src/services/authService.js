const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');
const config = require('../config/env');

/**
 * Registrar nuevo usuario
 */
exports.register = async (userData) => {
  const { email, password, name } = userData;

  // Verificar si el email ya existe
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('Este email ya está registrado');
  }

  // Crear usuario
  const user = await User.create({
    email,
    password,
    name
  });

  // Generar token
  const token = generateToken(user);

  return {
    user:  {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user. createdAt
    },
    token
  };
};

/**
 * Iniciar sesión
 */
exports.login = async ({ email, password }) => {
  // Buscar usuario por email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Verificar si el usuario está activo
  if (! user.isActive) {
    throw new UnauthorizedError('Esta cuenta está inactiva');
  }

  // Verificar contraseña
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Actualizar último login
  await user.update({ lastLogin: new Date() });

  // Generar token
  const token = generateToken(user);

  return {
    user: {
      id:  user.id,
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