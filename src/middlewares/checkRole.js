const { ForbiddenError } = require('../utils/errors');

/**
 * Middleware para verificar que el usuario tiene uno de los roles permitidos
 * Debe usarse después del middleware de autenticación
 *
 * Uso: router.use(auth, checkRole('ADMIN'))
 *      router.use(auth, checkRole('ADMIN', 'OWNER'))
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario está autenticado (req.user debe existir)
    if (!req.user) {
      return next(new ForbiddenError('No autenticado'));
    }

    // Verificar que el rol del usuario está en la lista de roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `No tienes permisos para acceder a este recurso. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    // Usuario autenticado y con rol permitido
    next();
  };
};

module.exports = checkRole;
