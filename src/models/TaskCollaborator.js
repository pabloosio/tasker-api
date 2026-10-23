/**
 * Colaborador de una tarea: además de la persona asignada (la responsable), otras personas del
 * tablero que trabajan en ella. Tienen los mismos permisos que la persona asignada.
 */
module.exports = (sequelize, DataTypes) => {
  const TaskCollaborator = sequelize.define('TaskCollaborator', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tasks', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    // Quién lo agregó (null si esa persona ya no existe)
    addedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'task_collaborators',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['taskId', 'userId'] },
      { fields: ['userId'] }
    ]
  });

  TaskCollaborator.associate = (models) => {
    TaskCollaborator.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task' });
    TaskCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return TaskCollaborator;
};
