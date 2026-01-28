module.exports = {
  // Estados de tareas
  TASK_STATUS: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
  },

  // Prioridades de tareas
  TASK_PRIORITY: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
  },

  // Roles de usuario
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin'
  },

  // Paginación
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Mensajes de error comunes
  ERROR_MESSAGES:  {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'Recurso no encontrado',
    VALIDATION_ERROR: 'Error de validación',
    INTERNAL_ERROR: 'Error interno del servidor'
  }
};