const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/v1/export/excel - Descargar tareas en Excel
router.get('/excel', exportController.exportExcel);

// GET /api/v1/export/pdf - Descargar tareas en PDF
router.get('/pdf', exportController.exportPdf);

module.exports = router;
