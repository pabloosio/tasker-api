/**
 * Respuesta exitosa estandarizada
 */
exports.successResponse = (res, data, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Respuesta de error estandarizada
 */
exports.errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Respuesta de paginación estandarizada
 */
exports.paginatedResponse = (res, data, pagination, message = 'Operación exitosa') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};