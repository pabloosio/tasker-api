const { Workspace, WorkspaceMember, User } = require('../models');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { WORKSPACE_ROLES } = require('../config/constants');
const { sendWorkspaceInviteEmail } = require('./emailService');

/**
 * Verificar que el usuario es miembro del workspace
 */
const verifyMembership = async (userId, workspaceId) => {
  const membership = await WorkspaceMember.findOne({
    where: { workspaceId, userId }
  });
  if (!membership) {
    throw new ForbiddenError('No eres miembro de este workspace');
  }
  return membership;
};

/**
 * Verificar que el usuario tiene rol OWNER o ADMIN
 */
const verifyAdminAccess = async (userId, workspaceId) => {
  const membership = await verifyMembership(userId, workspaceId);
  if (membership.role !== WORKSPACE_ROLES.OWNER && membership.role !== WORKSPACE_ROLES.ADMIN) {
    throw new ForbiddenError('No tienes permisos de administrador en este workspace');
  }
  return membership;
};

/**
 * Obtener todos los workspaces del usuario
 */
exports.getUserWorkspaces = async (userId) => {
  const memberships = await WorkspaceMember.findAll({
    where: { userId },
    include: [
      {
        model: Workspace,
        as: 'workspace',
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ],
    order: [[{ model: Workspace, as: 'workspace' }, 'isPersonal', 'DESC'], ['createdAt', 'ASC']]
  });

  return memberships.map(m => ({
    ...m.workspace.toJSON(),
    myRole: m.role
  }));
};

/**
 * Obtener workspace por ID
 */
exports.getWorkspaceById = async (userId, workspaceId) => {
  await verifyMembership(userId, workspaceId);

  const workspace = await Workspace.findByPk(workspaceId, {
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email']
      },
      {
        model: WorkspaceMember,
        as: 'members',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });

  if (!workspace) {
    throw new NotFoundError('Workspace no encontrado');
  }

  return workspace;
};

/**
 * Crear nuevo workspace
 */
exports.createWorkspace = async (userId, workspaceData) => {
  const workspace = await Workspace.create({
    ...workspaceData,
    ownerId: userId,
    isPersonal: false
  });

  // Agregar al creador como OWNER
  await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId,
    role: WORKSPACE_ROLES.OWNER
  });

  return await exports.getWorkspaceById(userId, workspace.id);
};

/**
 * Actualizar workspace
 */
exports.updateWorkspace = async (userId, workspaceId, workspaceData) => {
  await verifyAdminAccess(userId, workspaceId);

  const workspace = await Workspace.findByPk(workspaceId);
  if (!workspace) {
    throw new NotFoundError('Workspace no encontrado');
  }

  if (workspace.isPersonal) {
    throw new BadRequestError('No se puede modificar el workspace personal');
  }

  await workspace.update(workspaceData);
  return await exports.getWorkspaceById(userId, workspaceId);
};

/**
 * Eliminar workspace
 */
exports.deleteWorkspace = async (userId, workspaceId) => {
  const membership = await verifyMembership(userId, workspaceId);

  if (membership.role !== WORKSPACE_ROLES.OWNER) {
    throw new ForbiddenError('Solo el propietario puede eliminar el workspace');
  }

  const workspace = await Workspace.findByPk(workspaceId);
  if (!workspace) {
    throw new NotFoundError('Workspace no encontrado');
  }

  if (workspace.isPersonal) {
    throw new BadRequestError('No se puede eliminar el workspace personal');
  }

  await workspace.destroy();
};

/**
 * Obtener miembros del workspace
 */
exports.getWorkspaceMembers = async (userId, workspaceId) => {
  await verifyMembership(userId, workspaceId);

  const members = await WorkspaceMember.findAll({
    where: { workspaceId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['role', 'ASC'], ['createdAt', 'ASC']]
  });

  return members;
};

/**
 * Invitar miembro — acepta { userId } (web) o { email } (mobile)
 */
exports.inviteMember = async (inviterId, workspaceId, { userId: inviteeUserId, email: inviteeEmail }, role = WORKSPACE_ROLES.MEMBER) => {
  await verifyAdminAccess(inviterId, workspaceId);

  const workspace = await Workspace.findByPk(workspaceId, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }]
  });
  if (!workspace) throw new NotFoundError('Workspace no encontrado');
  if (workspace.isPersonal) throw new BadRequestError('No se pueden invitar miembros al workspace personal');

  // Resolver usuario por userId o email
  let userToInvite;
  if (inviteeUserId) {
    userToInvite = await User.findByPk(inviteeUserId);
  } else {
    userToInvite = await User.findOne({ where: { email: inviteeEmail.toLowerCase() } });
  }

  if (!userToInvite || !userToInvite.isActive) {
    throw new BadRequestError('Usuario no encontrado o inactivo');
  }

  // Verificar que no sea ya miembro
  const existingMember = await WorkspaceMember.findOne({
    where: { workspaceId, userId: userToInvite.id }
  });
  if (existingMember) throw new BadRequestError('Este usuario ya es miembro del workspace');

  const member = await WorkspaceMember.create({
    workspaceId,
    userId: userToInvite.id,
    role
  });

  // Obtener datos del invitador para el email
  const inviter = await User.findByPk(inviterId, { attributes: ['name'] });

  // Enviar correo de notificación (sin await para no bloquear la respuesta)
  sendWorkspaceInviteEmail({
    inviteeEmail: userToInvite.email,
    inviteeName: userToInvite.name,
    inviterName: inviter?.name ?? 'Un compañero',
    workspaceName: workspace.name,
    workspaceDesc: workspace.description,
    role
  });

  return await WorkspaceMember.findByPk(member.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
  });
};

/**
 * Remover miembro del workspace
 */
exports.removeMember = async (userId, workspaceId, memberId) => {
  await verifyAdminAccess(userId, workspaceId);

  const member = await WorkspaceMember.findOne({
    where: { id: memberId, workspaceId }
  });

  if (!member) {
    throw new NotFoundError('Miembro no encontrado');
  }

  if (member.role === WORKSPACE_ROLES.OWNER) {
    throw new BadRequestError('No se puede remover al propietario del workspace');
  }

  await member.destroy();
};

/**
 * Actualizar rol de miembro
 */
exports.updateMemberRole = async (userId, workspaceId, memberId, newRole) => {
  const membership = await verifyMembership(userId, workspaceId);

  if (membership.role !== WORKSPACE_ROLES.OWNER) {
    throw new ForbiddenError('Solo el propietario puede cambiar roles');
  }

  const member = await WorkspaceMember.findOne({
    where: { id: memberId, workspaceId }
  });

  if (!member) {
    throw new NotFoundError('Miembro no encontrado');
  }

  if (member.role === WORKSPACE_ROLES.OWNER) {
    throw new BadRequestError('No se puede cambiar el rol del propietario');
  }

  await member.update({ role: newRole });

  return await WorkspaceMember.findByPk(member.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }
    ]
  });
};

// Exportar helpers para uso en otros servicios
exports.verifyMembership = verifyMembership;
exports.verifyAdminAccess = verifyAdminAccess;
