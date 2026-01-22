const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/users/profile - Obtener perfil del usuario autenticado
router.get('/profile', userController.getProfile);

// PUT /api/v1/users/profile - Actualizar perfil del usuario autenticado
router.put('/profile', userController.updateProfile);

// DELETE /api/v1/users/profile - Desactivar cuenta
router.delete('/profile', userController.deactivateAccount);

module.exports = router;