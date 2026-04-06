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

// Acepta userId (web) o email (mobile) — al menos uno es requerido
const inviteMemberSchema = Joi.object({
  userId: Joi.string().uuid().messages({ 'string.guid': 'ID de usuario inválido' }),
  email: Joi.string().email().lowercase().messages({ 'string.email': 'Email inválido' }),
  role: Joi.string()
    .valid(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER)
    .default(WORKSPACE_ROLES.MEMBER)
    .messages({ 'any.only': `El rol debe ser: ${WORKSPACE_ROLES.ADMIN} o ${WORKSPACE_ROLES.MEMBER}` })
}).or('userId', 'email').messages({ 'object.missing': 'Se requiere userId o email' });

const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER)
    .required()
    .messages({
      'any.only': `El rol debe ser: ${WORKSPACE_ROLES.ADMIN} o ${WORKSPACE_ROLES.MEMBER}`
    })
});

module.exports = {
  validateWorkspace: validate(workspaceSchema),
  validateInviteMember: validate(inviteMemberSchema),
  validateUpdateMemberRole: validate(updateMemberRoleSchema)
};
