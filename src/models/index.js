const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

const db = {
  sequelize,
  Sequelize,
  User: require('./User')(sequelize, Sequelize.DataTypes),
  Task: require('./Task')(sequelize, Sequelize.DataTypes),
  Category: require('./Category')(sequelize, Sequelize.DataTypes),
  AuthLog: require('./AuthLog')(sequelize, Sequelize.DataTypes),
  Workspace: require('./Workspace')(sequelize, Sequelize.DataTypes),
  WorkspaceMember: require('./WorkspaceMember')(sequelize, Sequelize.DataTypes),
  PasswordResetToken: require('./PasswordResetToken')(sequelize, Sequelize.DataTypes),
  EmailVerificationToken: require('./EmailVerificationToken')(sequelize, Sequelize.DataTypes)
};

// Configurar asociaciones
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;