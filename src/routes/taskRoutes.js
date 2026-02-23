const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');
const { validateTask, validateTaskUpdate } = require('../validators/taskValidator');
const checklistController = require('../controllers/checklistController');
const { validateChecklistItem } = require('../validators/checklistValidator');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/tasks - Listar todas las tareas del usuario
router.get('/', taskController.getAllTasks);

// GET /api/v1/tasks/stats - Estadísticas de tareas
router.get('/stats', taskController.getTaskStats);

// GET /api/v1/tasks/weekly-report - Reporte semanal de productividad
router.get('/weekly-report', taskController.getWeeklyReport);

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

// ========== Checklist ==========
// GET /api/v1/tasks/:taskId/checklist
router.get('/:taskId/checklist', checklistController.getItems);

// POST /api/v1/tasks/:taskId/checklist
router.post('/:taskId/checklist', validateChecklistItem, checklistController.addItem);

// PATCH /api/v1/tasks/:taskId/checklist/:itemId
router.patch('/:taskId/checklist/:itemId', checklistController.toggleItem);

// DELETE /api/v1/tasks/:taskId/checklist/:itemId
router.delete('/:taskId/checklist/:itemId', checklistController.deleteItem);

module.exports = router;