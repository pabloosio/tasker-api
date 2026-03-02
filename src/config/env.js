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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60,    // minutos (default: 1 hora)
    max: parseInt(process.env.RATE_LIMIT_MAX) || 50000           // requests por ventana
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // AWS SES
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sesRegion: process.env.AWS_SES_REGION || 'us-east-1',
    sesFromEmail: process.env.SES_FROM_EMAIL || 'noreply@tasker.com'
  },

  // Email Tokens
  emailTokenExpiry: parseInt(process.env.EMAIL_TOKEN_EXPIRY) || 24, // horas
  passwordResetTokenExpiry: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY) || 1 // horas
};