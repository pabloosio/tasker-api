require('dotenv').config();

module.exports = {
  // Entorno
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,

  // Base de datos
  db:  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'tasker_dev',
    user: process.env. DB_USER || 'root',
    password: process.env. DB_PASSWORD || ''
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_key_change_in_production',
    expiresIn: process.env. JWT_EXPIRE || '7d'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15, // minutos
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // requests
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};