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
  
  dueDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (value < todayStr) {
        return helpers.error('date.min');
      }
      return value;
    })
    .allow(null)
    .messages({
      'string.pattern.base': 'La fecha debe tener formato YYYY-MM-DD',
      'date.min': 'La fecha no puede ser en el pasado'
    }),
  
  categoryId: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'El ID de categoría debe ser un UUID válido'
    }),

  workspaceId: Joi.string()
    .uuid()
    .allow(null),

  assignedTo: Joi.string()
    .uuid()
    .allow(null)
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
  
  dueDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(null)
    .messages({
      'string.pattern.base': 'La fecha debe tener formato YYYY-MM-DD'
    }),
  
  categoryId: Joi.string()
    .uuid()
    .allow(null),

  workspaceId: Joi.string()
    .uuid()
    .allow(null),

  assignedTo: Joi.string()
    .uuid()
    .allow(null)
}).min(1).messages({
  'object.min':  'Debe proporcionar al menos un campo para actualizar'
});

module.exports = {
  validateTask: validate(taskSchema),
  validateTaskUpdate: validate(taskUpdateSchema)
};