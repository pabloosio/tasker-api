const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const categoryRoutes = require('./categoryRoutes');

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
      categories: '/api/v1/categories'
    }
  });
});

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;