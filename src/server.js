const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const config = require('./config/env');

const PORT = config.port;

// ========== Debug: Verificar ENV ==========
if (config.node_env === 'development') {
  logger.info('📋 Configuración cargada:');
  logger.info(`  NODE_ENV: ${config.node_env}`);
  logger.info(`  PORT: ${config.port}`);
  logger.info(`  DB_HOST: ${config.db.host}`);
  logger.info(`  DB_NAME: ${config.db.name}`);
  logger.info(`  JWT_EXPIRE: ${config.jwt.expiresIn}`);
  logger.info(`  CORS_ORIGIN: ${config.corsOrigin}`);
}

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a base de datos establecida correctamente');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📍 Entorno: ${config.node_env}`);
      logger.info(`🔗 URL: http://localhost:${PORT}`);
      logger.info(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Apagando servidor...');
  logger.error(err.name, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Apagando servidor...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM recibido.  Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT recibido. Cerrando servidor gracefully...');
  process.exit(0);
});

// Iniciar servidor
startServer();