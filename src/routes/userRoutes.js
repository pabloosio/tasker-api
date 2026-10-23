const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { validateProfileUpdate, validateChangePassword } = require('../validators/userValidator');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/users/active - Obtener usuarios activos para invitaciones
router.get('/active', userController.getActiveUsers);

// GET /api/v1/users/profile - Obtener perfil del usuario autenticado
router.get('/profile', userController.getProfile);
router.get('/profile/summary', userController.getProfileSummary);
router.put('/profile/password', validateChangePassword, userController.changePassword);

// PUT /api/v1/users/profile - Actualizar perfil del usuario autenticado
router.put('/profile', validateProfileUpdate, userController.updateProfile);

// DELETE /api/v1/users/profile - Desactivar cuenta
router.delete('/profile', userController.deactivateAccount);

module.exports = router;