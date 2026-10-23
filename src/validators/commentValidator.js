const Joi = require('joi');
const validate = require('../middlewares/validator');

const commentSchema = Joi.object({
  content: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Escribe un comentario',
      'any.required': 'Escribe un comentario',
      'string.max': 'El comentario no puede tener más de 2000 caracteres'
    })
});

module.exports = {
  validateComment: validate(commentSchema)
};
