const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../validators/userValidator');

// POST /api/v1/auth/register - Registrar nuevo usuario
router.post('/register', validateRegister, authController.register);

// POST /api/v1/auth/login - Iniciar sesión
router.post('/login', validateLogin, authController.login);

// POST /api/v1/auth/forgot-password - Solicitar reinicio de contraseña
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// GET /api/v1/auth/validate-reset-token/:token - Validar token de reinicio
router.get('/validate-reset-token/:token', authController.validateResetToken);

// POST /api/v1/auth/reset-password - Reiniciar contraseña
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// POST /api/v1/auth/verify-email/:token - Verificar email
router.post('/verify-email/:token', authController.verifyEmail);

module.exports = router;