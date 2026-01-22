const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');
const { validateTask, validateTaskUpdate } = require('../validators/taskValidator');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/tasks - Listar todas las tareas del usuario
router.get('/', taskController.getAllTasks);

// GET /api/v1/tasks/stats - Estadísticas de tareas
router.get('/stats', taskController.getTaskStats);

// POST /api/v1/tasks - Crear nueva tarea
router.post('/', validateTask, taskController.createTask);

// GET /api/v1/tasks/:id - Obtener una tarea específica
router.get('/:id', taskController.getTaskById);

// PUT /api/v1/tasks/:id - Actualizar tarea
router.put('/:id', validateTaskUpdate, taskController.updateTask);

// PATCH /api/v1/tasks/:id/status - Actualizar solo el estado
router.patch('/:id/status', taskController.updateTaskStatus);

// DELETE /api/v1/tasks/:id - Eliminar tarea
router.delete('/:id', taskController.deleteTask);

module.exports = router;