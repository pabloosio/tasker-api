/**
 * Crea/actualiza las tablas a partir de los modelos.
 * Útil para desarrollo local, ya que las migraciones no cubren todos los modelos.
 *
 * Uso: npm run db:sync
 */
const { sequelize } = require('../models');

// Algunos modelos declaran índices con el nombre del atributo (userId) en lugar
// de la columna (user_id); se traducen para que sync no falle.
const fixIndexFields = (model) => {
  (model.options.indexes || []).forEach((index) => {
    index.fields = index.fields.map((field) =>
      typeof field === 'string' && model.rawAttributes[field]
        ? model.rawAttributes[field].field
        : field
    );
  });
};

(async () => {
  try {
    Object.values(sequelize.models).forEach(fixIndexFields);
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas sincronizadas con los modelos');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando tablas:', error.message);
    process.exit(1);
  }
})();
