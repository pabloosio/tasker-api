const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');
const { validateCategory } = require('../validators/categoryValidator');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/categories - Listar todas las categorías
router.get('/', categoryController.getAllCategories);

// GET /api/v1/categories/:id - Obtener una categoría específica
router.get('/:id', categoryController.getCategoryById);

// POST /api/v1/categories - Crear nueva categoría
router.post('/', validateCategory, categoryController.createCategory);

// PUT /api/v1/categories/:id - Actualizar categoría
router.put('/:id', validateCategory, categoryController.updateCategory);

// DELETE /api/v1/categories/:id - Eliminar categoría
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;