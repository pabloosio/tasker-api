const { TASK_STATUS, TASK_PRIORITY } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
      type: DataTypes.ENUM(
        TASK_STATUS.PENDING,
        TASK_STATUS. IN_PROGRESS,
        TASK_STATUS.COMPLETED
      ),
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
      type:  DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'Debe ser una fecha válida' }
      }
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statusUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
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
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields:  ['categoryId'] },
      { fields:  ['dueDate'] }
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
  };

  return Task;
};