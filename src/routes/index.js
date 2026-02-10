const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const categoryRoutes = require('./categoryRoutes');
const exportRoutes = require('./exportRoutes');
const workspaceRoutes = require('./workspaceRoutes');

// Info de la API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tasker API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      tasks: '/api/v1/tasks',
      categories: '/api/v1/categories',
      export: '/api/v1/export',
      workspaces: '/api/v1/workspaces'
    }
  });
});

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/categories', categoryRoutes);
router.use('/export', exportRoutes);
router.use('/workspaces', workspaceRoutes);

module.exports = router;