/**
 * Middleware genérico de validación usando Joi
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Mostrar todos los errores
      stripUnknown: true // Remover campos no definidos en el schema
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail. path. join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors
      });
    }

    // Reemplazar req.body con los datos validados
    req.body = value;
    next();
  };
};

module.exports = validate;