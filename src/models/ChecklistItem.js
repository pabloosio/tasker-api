module.exports = (sequelize, DataTypes) => {
  const ChecklistItem = sequelize.define('ChecklistItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El contenido no puede estar vacío' },
        len: {
          args: [1, 500],
          msg: 'El contenido debe tener entre 1 y 500 caracteres'
        }
      }
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      }
    }
  }, {
    tableName: 'checklist_items',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['taskId'] }
    ]
  });

  ChecklistItem.associate = (models) => {
    ChecklistItem.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task'
    });
  };

  return ChecklistItem;
};
