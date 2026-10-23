const { TASK_STATUS, TASK_PRIORITY } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Identificador legible y consecutivo (#000142). Lo asigna la base de datos.
    number: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: 'tasks_number_unique'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate:  {
        notEmpty: { msg: 'El título no puede estar vacío' },
        len:  {
          args: [3, 255],
          msg:  'El título debe tener entre 3 y 255 caracteres'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TASK_STATUS)),
      defaultValue: TASK_STATUS.PENDING,
      allowNull: false
    },
    priority: {
      type:  DataTypes.ENUM(
        TASK_PRIORITY.LOW,
        TASK_PRIORITY. MEDIUM,
        TASK_PRIORITY.HIGH
      ),
      defaultValue: TASK_PRIORITY.MEDIUM,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statusUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Orden dentro de la columna (fraccional: al soltar entre dos tarjetas se usa el punto medio)
    position: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'workspaces',
        key: 'id'
      }
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['categoryId'] },
      { fields: ['dueDate'] },
      { fields: ['workspaceId'] },
      { fields: ['assignedTo'] }
    ]
  });

  // Asociaciones
  Task.associate = (models) => {
    Task.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Task.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    Task.belongsTo(models.Workspace, {
      foreignKey: 'workspaceId',
      as: 'workspace'
    });

    Task.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });

    Task.hasMany(models.ChecklistItem, {
      foreignKey: 'taskId',
      as: 'checklistItems',
      onDelete: 'CASCADE'
    });

    Task.hasMany(models.Attachment, {
      foreignKey: 'taskId',
      as: 'attachments',
      onDelete: 'CASCADE'
    });

    Task.hasMany(models.TaskComment, {
      foreignKey: 'taskId',
      as: 'comments',
      onDelete: 'CASCADE'
    });

    Task.belongsToMany(models.User, {
      through: models.TaskCollaborator,
      foreignKey: 'taskId',
      otherKey: 'userId',
      as: 'collaborators'
    });
  };

  return Task;
};