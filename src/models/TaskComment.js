/**
 * Comentario (nota de seguimiento) en una tarea.
 * La descripción documenta qué hay que hacer; los comentarios registran lo que va pasando.
 */
module.exports = (sequelize, DataTypes) => {
  const TaskComment = sequelize.define('TaskComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    // Si se borra el usuario, el comentario se conserva sin autor
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El comentario no puede estar vacío' },
        len: {
          args: [1, 2000],
          msg: 'El comentario debe tener entre 1 y 2000 caracteres'
        }
      }
    },
    // Fecha de la última edición (null = nunca se editó)
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Con milisegundos: dos comentarios en el mismo segundo deben conservar su orden
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE(3),
      allowNull: false
    }
  }, {
    tableName: 'task_comments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['taskId', 'createdAt'] }
    ]
  });

  TaskComment.associate = (models) => {
    TaskComment.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task'
    });

    TaskComment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });
  };

  return TaskComment;
};
