const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/userValidator');

// POST /api/v1/auth/register - Registrar nuevo usuario
router.post('/register', validateRegister, authController.register);

// POST /api/v1/auth/login - Iniciar sesión
router.post('/login', validateLogin, authController.login);

module.exports = router;