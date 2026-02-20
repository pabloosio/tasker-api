const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, AuthLog, Workspace, WorkspaceMember, Category, PasswordResetToken, EmailVerificationToken } = require('../models');
const { WORKSPACE_ROLES } = require('../config/constants');
const { UnauthorizedError, BadRequestError, NotFoundError } = require('../utils/errors');
const config = require('../config/env');
const logger = require('../utils/logger');
const emailService = require('./emailService');

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

  // Crear usuario INACTIVO hasta que verifique el email
  const user = await User.create({
    email,
    password,
    name,
    isActive: false
  });

  await logAuthEvent('REGISTER_SUCCESS', email, {
    userId: user.id,
    ...reqInfo
  });

  // Crear workspace personal
  const personalWorkspace = await Workspace.create({
    name: '🧍‍♂️ Personal',
    description: 'Espacio de trabajo personal',
    ownerId: user.id,
    isPersonal: true
  });

  await WorkspaceMember.create({
    workspaceId: personalWorkspace.id,
    userId: user.id,
    role: WORKSPACE_ROLES.OWNER
  });

  // Crear workspace de trabajo
  const trabajoWorkspace = await Workspace.create({
    name: '💼 Trabajo',
    description: 'Espacio de trabajo profesional',
    ownerId: user.id,
    isPersonal: false
  });

  await WorkspaceMember.create({
    workspaceId: trabajoWorkspace.id,
    userId: user.id,
    role: WORKSPACE_ROLES.OWNER
  });

  // Categorías predeterminadas para Personal
  await Category.bulkCreate([
    { name: 'Casa',               description: 'Limpieza, organización, reparaciones, compras del hogar', color: '#10B981', userId: user.id, workspaceId: personalWorkspace.id },
    { name: 'Salud',              description: 'Ejercicio, citas médicas, medicamentos, descanso',         color: '#EF4444', userId: user.id, workspaceId: personalWorkspace.id },
    { name: 'Finanzas',           description: 'Pagos, presupuesto, ahorro, revisión de gastos',           color: '#F59E0B', userId: user.id, workspaceId: personalWorkspace.id },
    { name: 'Social',             description: 'Llamadas, reuniones, eventos, celebraciones',              color: '#8B5CF6', userId: user.id, workspaceId: personalWorkspace.id },
    { name: 'Desarrollo Personal',description: 'Lectura, estudio, hábitos, metas personales',             color: '#3B82F6', userId: user.id, workspaceId: personalWorkspace.id }
  ]);

  // Categorías predeterminadas para Trabajo
  await Category.bulkCreate([
    { name: 'Rutina',        description: 'Actividades diarias, correos, seguimiento, pendientes administrativos',       color: '#6366F1', userId: user.id, workspaceId: trabajoWorkspace.id },
    { name: 'Proyectos',     description: 'Avances, entregables, implementación, tareas asignadas',                     color: '#0EA5E9', userId: user.id, workspaceId: trabajoWorkspace.id },
    { name: 'Bugs & QA',     description: 'Errores, incidencias, correcciones, pruebas',                               color: '#F97316', userId: user.id, workspaceId: trabajoWorkspace.id },
    { name: 'Reuniones',     description: 'Juntas, preparación, seguimiento de acuerdos, presentaciones',              color: '#EC4899', userId: user.id, workspaceId: trabajoWorkspace.id },
    { name: 'Planificación', description: 'Prioridades, organización semanal, estimaciones, planificación estratégica', color: '#14B8A6', userId: user.id, workspaceId: trabajoWorkspace.id }
  ]);

  // Enviar email de verificación
  await exports.requestEmailVerification(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: false,
      createdAt: user.createdAt
    },
    message: 'Te hemos enviado un email de verificación. Por favor verifica tu email antes de iniciar sesión. Recuerda revisar la carpeta de spam.',
    requiresEmailVerification: true
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

  // Verificar si el email está verificado
  if (!user.emailVerified) {
    await logAuthEvent('LOGIN_FAILED_EMAIL_NOT_VERIFIED', email, {
      userId: user.id,
      ...reqInfo
    });
    throw new UnauthorizedError('Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada y la carpeta de spam.');
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
    throw new UnauthorizedError('Email o contraseña incorrectos. Por favor verifica tus datos.');
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
      lastLogin: user.lastLogin,
      pinnedWorkspaceId: user.pinnedWorkspaceId || null
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

/**
 * Generar un token único seguro
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Solicitar reinicio de contraseña
 */
exports.requestPasswordReset = async (email) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new NotFoundError('No existe una cuenta con este email');
  }

  // Invalidar tokens anteriores
  await PasswordResetToken.update(
    { used: true },
    { where: { userId: user.id, used: false } }
  );

  // Generar nuevo token
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + config.passwordResetTokenExpiry * 60 * 60 * 1000);

  await PasswordResetToken.create({
    userId: user.id,
    token,
    expiresAt
  });

  // Enviar email
  await emailService.sendPasswordResetEmail(user.email, token, user.name);

  logger.info(`Solicitud de reinicio de contraseña para ${email}`);
  return { message: 'Se ha enviado un email con las instrucciones para reiniciar tu contraseña' };
};

/**
 * Validar token de reinicio de contraseña
 */
exports.validatePasswordResetToken = async (token) => {
  const resetToken = await PasswordResetToken.findOne({
    where: { token },
    include: {
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'name']
    }
  });

  if (!resetToken) {
    throw new BadRequestError('El token de reinicio no es válido');
  }

  if (resetToken.used) {
    throw new BadRequestError('Este token ya ha sido utilizado');
  }

  if (new Date() > resetToken.expiresAt) {
    throw new BadRequestError('El token de reinicio ha expirado');
  }

  return resetToken;
};

/**
 * Reiniciar contraseña
 */
exports.resetPassword = async (token, newPassword) => {
  const resetToken = await exports.validatePasswordResetToken(token);

  // Actualizar contraseña y marcar token como usado
  resetToken.user.password = newPassword;
  await resetToken.user.save();

  resetToken.used = true;
  await resetToken.save();

  logger.info(`Contraseña reiniciada para ${resetToken.user.email}`);
  return { message: 'Tu contraseña ha sido reiniciada exitosamente' };
};

/**
 * Solicitar verificación de email
 */
exports.requestEmailVerification = async (userId, newEmail = null) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const emailToVerify = newEmail || user.email;

  // Invalidar tokens anteriores para este usuario
  await EmailVerificationToken.update(
    { verified: true },
    { where: { userId, verified: false } }
  );

  // Generar nuevo token
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + config.emailTokenExpiry * 60 * 60 * 1000);

  await EmailVerificationToken.create({
    userId,
    email: emailToVerify,
    token,
    expiresAt
  });

  // Enviar email
  await emailService.sendVerificationEmail(emailToVerify, token, user.name);

  logger.info(`Email de verificación enviado a ${emailToVerify}`);
  return { message: 'Se ha enviado un email con el enlace de verificación' };
};

/**
 * Validar token de verificación de email
 */
exports.validateEmailVerificationToken = async (token) => {
  const verificationToken = await EmailVerificationToken.findOne({
    where: { token },
    include: {
      model: User,
      as: 'user'
    }
  });

  if (!verificationToken) {
    throw new BadRequestError('El token de verificación no es válido');
  }

  if (verificationToken.verified) {
    throw new BadRequestError('Este email ya ha sido verificado');
  }

  if (new Date() > verificationToken.expiresAt) {
    throw new BadRequestError('El token de verificación ha expirado');
  }

  return verificationToken;
};

/**
 * Verificar email
 */
exports.verifyEmail = async (token) => {
  const verificationToken = await exports.validateEmailVerificationToken(token);
  const user = verificationToken.user;

  // Actualizar email si es diferente
  if (user.email !== verificationToken.email) {
    user.email = verificationToken.email;
  }

  user.emailVerified = true;
  user.isActive = true;
  user.emailVerificationToken = null;
  await user.save();

  verificationToken.verified = true;
  await verificationToken.save();

  logger.info(`Email verificado para ${user.email}`);
  return { message: 'Tu email ha sido verificado exitosamente' };
};