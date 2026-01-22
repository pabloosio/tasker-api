const { User } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Obtener usuario por ID
 */
exports. getUserById = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return user;
};

/**
 * Actualizar usuario
 */
exports.updateUser = async (userId, userData) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Campos que NO se pueden actualizar
  const { email, role, password, isActive, ... allowedData } = userData;

  // Si se intenta cambiar datos protegidos, lanzar error
  if (email || role || password) {
    throw new BadRequestError(
      'No se puede modificar email, role o password desde este endpoint'
    );
  }

  await user.update(allowedData);

  // Retornar usuario sin contraseña
  const { password:  _, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

/**
 * Desactivar usuario
 */
exports.deactivateUser = async (userId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  await user.update({ isActive: false });
};