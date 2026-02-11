const { User, EmailVerificationToken } = require('../models');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const logAdminEvent = async (eventType, adminUserId, targetUserId, metadata = {}) => {
  try {
    const targetUser = await User.findByPk(targetUserId);
    logger.info(`[ADMIN] ${eventType}`, {
      adminUserId,
      targetUserId,
      targetEmail: targetUser?.email,
      ...metadata
    });
  } catch (error) {
    logger.error(`Error logging admin event: ${eventType}`, error);
  }
};

/**
 * Obtener todos los usuarios con filtros y paginación
 */
const getAllUsers = async (filters = {}, page = 1, limit = 10) => {
  const {
    email,
    role,
    isActive,
    emailVerified
  } = filters;

  const where = {};

  if (email) {
    where.email = { [require('sequelize').Op.like]: `%${email}%` };
  }

  if (role) {
    where.role = role.toUpperCase();
  }

  if (isActive !== undefined && isActive !== null) {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (emailVerified !== undefined && emailVerified !== null) {
    where.emailVerified = emailVerified === 'true' || emailVerified === true;
  }

  const offset = (page - 1) * limit;

  const { count, rows: users } = await User.findAndCountAll({
    where,
    offset,
    limit,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['password'] }
  });

  return {
    users,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    }
  };
};

/**
 * Actualizar email de un usuario
 */
const updateUserEmail = async (userId, newEmail, adminUserId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Validar que el nuevo email no esté en uso
  if (newEmail !== user.email) {
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser) {
      throw new BadRequestError('Este email ya está en uso');
    }
  }

  const oldEmail = user.email;

  // Actualizar email
  user.email = newEmail;
  user.emailVerified = false;
  user.emailVerificationToken = null;
  await user.save();

  // Invalidar tokens de verificación antiguos
  await EmailVerificationToken.update(
    { verified: true },
    { where: { userId, verified: false } }
  );

  // Loguear cambio
  await logAdminEvent('ADMIN_USER_EMAIL_CHANGED', adminUserId, userId, {
    oldEmail,
    newEmail
  });

  logger.warn(`Admin cambió email de usuario ${oldEmail} a ${newEmail}`);

  return user;
};

/**
 * Activar o desactivar usuario
 */
const toggleUserActive = async (userId, isActive, adminUserId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Prevenir desactivar al usuario admin que hace el cambio (si es posible detectar)
  if (!isActive && user.role === 'ADMIN') {
    // Verificar que haya al menos otro admin
    const adminCount = await User.count({ where: { role: 'ADMIN', isActive: true } });
    if (adminCount <= 1) {
      throw new BadRequestError('No puedes desactivar el último admin del sistema');
    }
  }

  const oldStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  // Loguear cambio
  const eventType = isActive ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED';
  await logAdminEvent(eventType, adminUserId, userId, {
    oldStatus,
    newStatus: isActive
  });

  logger.info(`Admin cambió estado de usuario ${user.email} a ${isActive ? 'activo' : 'inactivo'}`);

  return user;
};

/**
 * Verificar email manualmente
 */
const verifyUserEmailManually = async (userId, adminUserId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;

  // Activar el usuario si está inactivo
  if (!user.isActive) {
    user.isActive = true;
  }

  await user.save();

  // Invalidar tokens de verificación pendientes
  await EmailVerificationToken.update(
    { verified: true },
    { where: { userId, verified: false } }
  );

  // Loguear cambio
  await logAdminEvent('ADMIN_USER_EMAIL_VERIFIED', adminUserId, userId, {
    emailVerified: true,
    accountActivated: !user.isActive
  });

  logger.info(`Admin verificó manualmente el email de ${user.email}`);

  return user;
};

/**
 * Cambiar rol de usuario
 */
const updateUserRole = async (userId, newRole, adminUserId) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Validar que el nuevo rol sea válido
  if (!['USER', 'ADMIN'].includes(newRole.toUpperCase())) {
    throw new BadRequestError('Rol inválido. Debe ser USER o ADMIN');
  }

  // Prevenir degradar al último admin
  if (user.role === 'ADMIN' && newRole.toUpperCase() !== 'ADMIN') {
    const adminCount = await User.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      throw new BadRequestError('No puedes degradar el último admin del sistema');
    }
  }

  const oldRole = user.role;
  user.role = newRole.toUpperCase();
  await user.save();

  // Loguear cambio
  await logAdminEvent('ADMIN_USER_ROLE_CHANGED', adminUserId, userId, {
    oldRole,
    newRole: newRole.toUpperCase()
  });

  logger.info(`Admin cambió rol de usuario ${user.email} de ${oldRole} a ${newRole.toUpperCase()}`);

  return user;
};

module.exports = {
  getAllUsers,
  updateUserEmail,
  toggleUserActive,
  verifyUserEmailManually,
  updateUserRole
};
