const Joi = require('joi');
const validate = require('../middlewares/validator');

// Schema para crear/actualizar categoría
const categorySchema = Joi.object({
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
    }),
  
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .allow(null)
    .messages({
      'string.pattern.base': 'El color debe ser un código hexadecimal válido (ej: #3B82F6)'
    }),

  workspaceId: Joi.string()
    .uuid()
    .allow(null)
});

module.exports = {
  validateCategory: validate(categorySchema)
};