const Joi = require('joi');
const validate = require('../middlewares/validator');

const checklistItemSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'El contenido es requerido',
      'string.min': 'El contenido debe tener al menos 1 carácter',
      'string.max': 'El contenido no puede tener más de 500 caracteres'
    })
});

module.exports = {
  validateChecklistItem: validate(checklistItemSchema)
};
