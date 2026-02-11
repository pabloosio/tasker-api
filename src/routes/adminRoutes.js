const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const checkRole = require('../middlewares/checkRole');
const adminController = require('../controllers/adminController');
const {
  validateGetUsers,
  validateUpdateEmail,
  validateToggleActive,
  validateUpdateRole
} = require('../validators/adminValidator');

// Todas las rutas de admin requieren autenticación y rol ADMIN
router.use(auth);
router.use(checkRole('ADMIN'));

// GET /api/v1/admin/users - Listar usuarios
router.get('/users', validateGetUsers, adminController.getUsers);

// PATCH /api/v1/admin/users/:userId/email - Cambiar email
router.patch('/users/:userId/email', validateUpdateEmail, adminController.updateUserEmail);

// PATCH /api/v1/admin/users/:userId/active - Activar/desactivar
router.patch('/users/:userId/active', validateToggleActive, adminController.toggleUserActive);

// POST /api/v1/admin/users/:userId/verify-email - Verificar email manualmente
router.post('/users/:userId/verify-email', adminController.verifyUserEmailManually);

// PATCH /api/v1/admin/users/:userId/role - Cambiar rol
router.patch('/users/:userId/role', validateUpdateRole, adminController.updateUserRole);

module.exports = router;
