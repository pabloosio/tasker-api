const { ACTIVITY_ACTIONS } = require('../config/constants');

/**
 * Historial de actividad (auditoría). Registros inmutables: la app nunca los edita ni borra.
 * Guarda una copia del ID/título de la tarea y del nombre del tablero para que el registro
 * siga siendo legible aunque la tarea o el tablero se eliminen o renombren.
 */
module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action: {
      type: DataTypes.ENUM(...Object.values(ACTIVITY_ACTIONS)),
      allowNull: false
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    workspaceName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    taskNumber: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    taskTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // [{ field, from, to }] con valores legibles (nombres, no IDs)
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Datos extra del evento (ej. contenido del ítem de checklist, miembro afectado)
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Con milisegundos: varios eventos de una misma acción deben conservar su orden
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['workspace_id', 'created_at'] },
      { fields: ['task_id', 'created_at'] },
      { fields: ['actor_id'] },
      { fields: ['action'] },
      { fields: ['task_number'] }
    ]
  });

  ActivityLog.associate = (models) => {
    // Sin FK reales: el registro debe sobrevivir a que se borre la tarea, el tablero o el usuario
    ActivityLog.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor', constraints: false });
    ActivityLog.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace', constraints: false });
  };

  return ActivityLog;
};
