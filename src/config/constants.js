module.exports = {
  TASK_STATUS: { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' },
  TASK_PRIORITY: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  USER_ROLES: { USER: 'user', ADMIN: 'admin' },
  WORKSPACE_ROLES: { OWNER: 'OWNER', ADMIN: 'ADMIN', MEMBER: 'MEMBER', VIEWER: 'VIEWER' },
  PAGINATION: { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10, MAX_LIMIT: 100 },
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'Recurso no encontrado',
    VALIDATION_ERROR: 'Error de validación',
    INTERNAL_ERROR: 'Error interno del servidor'
  }
};
