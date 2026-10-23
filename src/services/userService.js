const { Op } = require('sequelize');
const { User, Workspace, WorkspaceMember, Task } = require('../models');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { TASK_STATUS } = require('../config/constants');

/**
 * Obtener todos los usuarios activos (para invitaciones)
 */
exports.getActiveUsers = async (excludeUserId) => {
  const { Op } = require('sequelize');
  const where = { isActive: true };
  if (excludeUserId) {
    where.id = { [Op.ne]: excludeUserId };
  }
  return await User.findAll({
    where,
    attributes: ['id', 'name', 'email'],
    order: [['name', 'ASC']]
  });
};

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

  // Si se intenta cambiar datos protegidos, lanzar error
  if (userData.email || userData.role || userData.password) {
    throw new BadRequestError(
      'No se puede modificar email, role o password desde este endpoint'
    );
  }

  // Solo estos campos se pueden editar desde el perfil (evita que alguien se marque
  // emailVerified, isActive, etc. enviando campos extra)
  const allowedData = {};
  if (userData.name !== undefined) allowedData.name = userData.name;
  if (userData.pinnedWorkspaceId !== undefined) {
    if (userData.pinnedWorkspaceId) {
      const membership = await WorkspaceMember.findOne({ where: { userId, workspaceId: userData.pinnedWorkspaceId } });
      if (!membership) throw new ForbiddenError('No perteneces a ese tablero');
    }
    allowedData.pinnedWorkspaceId = userData.pinnedWorkspaceId || null;
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

/**
 * Resumen del perfil: datos de la cuenta, tableros con mi rol y mis números de tareas
 */
exports.getProfileSummary = async (userId) => {
  const user = await exports.getUserById(userId);

  const memberships = await WorkspaceMember.findAll({
    where: { userId },
    include: [{
      model: Workspace,
      as: 'workspace',
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }]
    }],
    order: [['createdAt', 'ASC']]
  });
  const workspaceIds = memberships.map(m => m.workspaceId);

  const [memberCounts, openByWorkspace, overdue, completedThisMonth] = await Promise.all([
    WorkspaceMember.count({ where: { workspaceId: { [Op.in]: workspaceIds } }, group: ['workspaceId'] }),
    Task.count({
      where: { assignedTo: userId, workspaceId: { [Op.in]: workspaceIds }, status: { [Op.ne]: TASK_STATUS.COMPLETED } },
      group: ['workspaceId']
    }),
    Task.count({
      where: {
        assignedTo: userId,
        workspaceId: { [Op.in]: workspaceIds },
        status: { [Op.ne]: TASK_STATUS.COMPLETED },
        dueDate: { [Op.lt]: new Date().toISOString().split('T')[0] }
      }
    }),
    Task.count({
      where: {
        assignedTo: userId,
        workspaceId: { [Op.in]: workspaceIds },
        status: TASK_STATUS.COMPLETED,
        completedAt: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }
    })
  ]);

  const countFor = (rows, workspaceId) => rows.find(r => r.workspaceId === workspaceId)?.count || 0;

  const workspaces = memberships.map(m => ({
    id: m.workspace.id,
    name: m.workspace.name,
    description: m.workspace.description,
    isPersonal: m.workspace.isPersonal,
    owner: m.workspace.owner,
    myRole: m.role,
    joinedAt: m.createdAt,
    memberCount: countFor(memberCounts, m.workspaceId),
    myOpenTasks: countFor(openByWorkspace, m.workspaceId)
  }));

  return {
    user,
    workspaces,
    stats: {
      openTasks: workspaces.reduce((sum, w) => sum + w.myOpenTasks, 0),
      overdue,
      completedThisMonth
    }
  };
};

/**
 * Cambiar la contraseña verificando la actual
 */
exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundError('Usuario no encontrado');

  if (!(await user.comparePassword(currentPassword))) {
    throw new BadRequestError('La contraseña actual no es correcta');
  }
  if (currentPassword === newPassword) {
    throw new BadRequestError('La nueva contraseña debe ser diferente a la actual');
  }

  user.password = newPassword; // el hook beforeUpdate la hashea
  await user.save();
};
