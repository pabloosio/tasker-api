const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');
const { validateTask, validateTaskUpdate, validateTaskMove } = require('../validators/taskValidator');
const checklistController = require('../controllers/checklistController');
const activityController = require('../controllers/activityController');
const { validateChecklistItem } = require('../validators/checklistValidator');
const attachmentController = require('../controllers/attachmentController');
const commentController = require('../controllers/commentController');
const { validateComment } = require('../validators/commentValidator');
const { uploadFiles, requireStorage } = require('../middlewares/upload');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/v1/tasks - Listar todas las tareas del usuario
router.get('/', taskController.getAllTasks);

// GET /api/v1/tasks/stats - Estadísticas de tareas
router.get('/board', taskController.getBoardTasks);
router.get('/mine', taskController.getMyTasks);
router.get('/by-number/:number', taskController.getTaskByNumber);
router.get('/stats', taskController.getTaskStats);

// GET /api/v1/tasks/weekly-report - Reporte semanal de productividad
router.get('/weekly-report', taskController.getWeeklyReport);

// POST /api/v1/tasks - Crear nueva tarea
router.post('/', validateTask, taskController.createTask);

// GET /api/v1/tasks/:id - Obtener una tarea específica
router.get('/:id', taskController.getTaskById);
router.get('/:id/activity', activityController.getTaskActivity);

// PUT /api/v1/tasks/:id - Actualizar tarea
router.put('/:id', validateTaskUpdate, taskController.updateTask);

// PATCH /api/v1/tasks/:id/status - Actualizar solo el estado
router.patch('/:id/status', validateTaskMove, taskController.updateTaskStatus);

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

// ========== Comentarios ==========
// GET /api/v1/tasks/:taskId/comments
router.get('/:taskId/comments', commentController.list);

// GET /api/v1/tasks/:taskId/mentionable  (miembros del tablero para @mencionar)
router.get('/:taskId/mentionable', commentController.mentionable);

// POST /api/v1/tasks/:taskId/comments
router.post('/:taskId/comments', validateComment, commentController.create);

// PATCH /api/v1/tasks/:taskId/comments/:commentId  (solo el autor)
router.patch('/:taskId/comments/:commentId', validateComment, commentController.update);

// DELETE /api/v1/tasks/:taskId/comments/:commentId
router.delete('/:taskId/comments/:commentId', commentController.remove);

// ========== Archivos adjuntos (responden 503 si S3 no está configurado) ==========
// GET /api/v1/tasks/:taskId/attachments
router.get('/:taskId/attachments', requireStorage, attachmentController.list);

// POST /api/v1/tasks/:taskId/attachments  (multipart, campo "files")
router.post('/:taskId/attachments', uploadFiles, attachmentController.upload);

// GET /api/v1/tasks/:taskId/attachments/:attachmentId/download?inline=1
router.get('/:taskId/attachments/:attachmentId/download', requireStorage, attachmentController.getDownloadUrl);

// DELETE /api/v1/tasks/:taskId/attachments/:attachmentId
router.delete('/:taskId/attachments/:attachmentId', requireStorage, attachmentController.remove);

module.exports = router;