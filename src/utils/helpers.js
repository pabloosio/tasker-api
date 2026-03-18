/**
 * Sanitizar usuario (remover contraseña)
 */
exports.sanitizeUser = (user) => {
  if (!user) return null;
  
  const userData = user.toJSON ?  user.toJSON() : user;
  const { password, ...sanitized } = userData;
  return sanitized;
};

/**
 * Generar slug desde texto
 */
exports.generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/[\s_-]+/g, '-') // Reemplazar espacios con guiones
    .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final
};

/**
 * Formatear fecha a ISO string
 */
exports.formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Verificar si una fecha ya pasó
 */
exports. isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Generar código aleatorio
 */
exports.generateRandomCode = (length = 6) => {
  return Math.random()
    .toString(36)
    .substring(2, length + 2)
    .toUpperCase();
};

/**
 * Delay/sleep function
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Paginar array
 */
exports.paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    data: array.slice(offset, offset + limit),
    pagination: {
      total: array.length,
      page,
      limit,
      totalPages: Math.ceil(array. length / limit)
    }
  };
};