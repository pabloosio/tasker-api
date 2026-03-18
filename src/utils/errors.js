/**
 * Clase base para errores de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error 400 - Bad Request
 */
class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Error 401 - Unauthorized
 */
class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error 403 - Forbidden
 */
class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error 404 - Not Found
 */
class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error 409 - Conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Error 422 - Unprocessable Entity
 */
class ValidationError extends AppError {
  constructor(message = 'Error de validación', errors = null) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Error 500 - Internal Server Error
 */
class InternalError extends AppError {
  constructor(message = 'Error interno del servidor') {
    super(message, 500);
    this.name = 'InternalError';
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError
};