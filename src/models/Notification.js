const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * Aviso dentro de la app para una persona (la campanita).
 * Guarda una copia del número y título de la tarea para mostrarse aunque la tarea cambie o se borre.
 */
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Quién recibe el aviso
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    // Quién lo provocó (null si ya no existe)
    actorId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPES)),
      allowNull: false
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    // { taskNumber, taskTitle, excerpt }
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['userId', 'readAt', 'createdAt'] }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor', constraints: false });
  };

  return Notification;
};
