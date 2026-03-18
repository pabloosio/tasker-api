const logger = require('../utils/logger');

/**
 * Middleware para manejo centralizado de errores
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors = null;

  // Log del error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // ========== Errores de Sequelize ==========
  
  // Errores de validación
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Error de validación';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Errores de unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Ya existe un registro con esos datos';
    errors = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} ya está en uso`
    }));
  }

  // Errores de foreign key
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referencia inválida a otro registro';
  }

  // Errores de conexión a BD
  if (err.name === 'SequelizeConnectionError') {
    statusCode = 503;
    message = 'Error de conexión a la base de datos';
  }

  // ========== Errores de JWT ==========
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // ========== Respuesta ==========
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;