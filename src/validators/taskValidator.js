const Joi = require('joi');
const validate = require('../middlewares/validator');
const { TASK_STATUS, TASK_PRIORITY } = require('../config/constants');

// Schema para crear tarea
const taskSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string. empty': 'El título es requerido',
      'string. min': 'El título debe tener al menos 3 caracteres',
      'string.max':  'El título no puede tener más de 255 caracteres'
    }),
  
  description: Joi.string()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': 'La descripción no puede tener más de 1000 caracteres'
    }),
  
  status: Joi.string()
    .valid(...Object. values(TASK_STATUS))
    .messages({
      'any.only': `El estado debe ser:  ${Object.values(TASK_STATUS).join(', ')}`
    }),
  
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY))
    .messages({
      'any. only': `La prioridad debe ser: ${Object.values(TASK_PRIORITY).join(', ')}`
    }),
  
  dueDate: Joi.date()
    .iso()
    .min('now')
    .allow(null)
    .messages({
      'date.base': 'La fecha debe ser válida',
      'date.format': 'La fecha debe estar en formato ISO',
      'date.min': 'La fecha no puede ser en el pasado'
    }),
  
  categoryId: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'El ID de categoría debe ser un UUID válido'
    })
});

// Schema para actualizar tarea
const taskUpdateSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(255)
    .messages({
      'string.min': 'El título debe tener al menos 3 caracteres',
      'string.max': 'El título no puede tener más de 255 caracteres'
    }),
  
  description: Joi.string()
    .max(1000)
    .allow('', null),
  
  status: Joi.string()
    .valid(...Object.values(TASK_STATUS)),
  
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY)),
  
  dueDate:  Joi.date()
    .iso()
    .allow(null),
  
  categoryId:  Joi.string()
    .uuid()
    .allow(null)
}).min(1).messages({
  'object.min':  'Debe proporcionar al menos un campo para actualizar'
});

module.exports = {
  validateTask: validate(taskSchema),
  validateTaskUpdate: validate(taskUpdateSchema)
};