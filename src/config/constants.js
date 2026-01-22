module.exports = {
  // Estados de tareas
  TASK_STATUS:  {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
  },

  // Prioridades de tareas
  TASK_PRIORITY: {
    LOW: 'low',
    MEDIUM:  'medium',
    HIGH:  'high'
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