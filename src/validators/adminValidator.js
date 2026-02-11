const Joi = require('joi');
const validate = require('../middlewares/validator');

// Schema para obtener usuarios con filtros
const getUsersQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('USER', 'ADMIN').optional(),
  isActive: Joi.boolean().optional(),
  emailVerified: Joi.boolean().optional()
}).unknown(true);

// Schema para actualizar email
const updateEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'Debe ser un email válido'
    })
});

// Schema para toggle activo
const toggleActiveSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'any.required': 'El campo isActive es requerido',
      'boolean.base': 'isActive debe ser true o false'
    })
});

// Schema para actualizar rol
const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid('USER', 'ADMIN')
    .required()
    .messages({
      'any.required': 'El rol es requerido',
      'any.only': 'El rol debe ser USER o ADMIN'
    })
});

module.exports = {
  validateGetUsers: validate(getUsersQuerySchema, { presence: 'optional' }),
  validateUpdateEmail: validate(updateEmailSchema),
  validateToggleActive: validate(toggleActiveSchema),
  validateUpdateRole: validate(updateRoleSchema)
};
