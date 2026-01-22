const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const config = require('./config/env');

const app = express();

// ========== Middlewares de Seguridad ==========
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting - Limitar requests por IP
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs * 60 * 1000,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ========== Parseo de Body ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== Logging ==========
if (config.node_env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ========== Ruta raíz ==========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tasker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// ========== Health Check ==========
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.node_env
  });
});

// ========== Rutas API ==========
app.use('/api/v1', routes);

// ========== Ruta 404 ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `No se puede encontrar ${req.originalUrl} en este servidor`
  });
});

// ========== Manejo de Errores ==========
app.use(errorHandler);

module.exports = app;