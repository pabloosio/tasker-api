const Joi = require('joi');
const validate = require('../middlewares/validator');
const { WORKSPACE_ROLES } = require('../config/constants');

const workspaceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre es requerido',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres'
    }),

  description: Joi.string()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'La descripción no puede tener más de 255 caracteres'
    })
});

const inviteMemberSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'El usuario es requerido',
      'string.guid': 'ID de usuario inválido'
    }),

  role: Joi.string()
    .valid(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.VIEWER)
    .default(WORKSPACE_ROLES.MEMBER)
    .messages({
      'any.only': `El rol debe ser: ${WORKSPACE_ROLES.ADMIN}, ${WORKSPACE_ROLES.MEMBER} o ${WORKSPACE_ROLES.VIEWER}`
    })
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.VIEWER)
    .required()
    .messages({
      'any.only': `El rol debe ser: ${WORKSPACE_ROLES.ADMIN}, ${WORKSPACE_ROLES.MEMBER} o ${WORKSPACE_ROLES.VIEWER}`
    })
});

module.exports = {
  validateWorkspace: validate(workspaceSchema),
  validateInviteMember: validate(inviteMemberSchema),
  validateUpdateMemberRole: validate(updateMemberRoleSchema)
};
