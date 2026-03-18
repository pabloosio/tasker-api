const Joi = require('joi');
const validate = require('../middlewares/validator');

// Schema para registro
const registerSchema = Joi. object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre es requerido',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'Debe ser un email válido'
    }),
  
  password: Joi.string()
    .min(6)
    .max(255)
    .required()
    .messages({
      'string. empty': 'La contraseña es requerida',
      'string.min': 'La contraseña debe tener al menos 6 caracteres'
    })
});

// Schema para login
const loginSchema = Joi.object({
  email: Joi. string()
    .email()
    .required()
    .messages({
      'string.empty':  'El email es requerido',
      'string.email':  'Debe ser un email válido'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'La contraseña es requerida'
    })
});

// Schema para forgot password
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'Debe ser un email válido'
    })
});

// Schema para reset password
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'El token es requerido'
    }),

  newPassword: Joi.string()
    .min(6)
    .max(255)
    .required()
    .messages({
      'string.empty': 'La contraseña es requerida',
      'string.min': 'La contraseña debe tener al menos 6 caracteres'
    })
});

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateForgotPassword: validate(forgotPasswordSchema),
  validateResetPassword: validate(resetPasswordSchema)
};