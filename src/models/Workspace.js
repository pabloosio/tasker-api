module.exports = (sequelize, DataTypes) => {
  const Workspace = sequelize.define('Workspace', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: {
          args: [2, 100],
          msg: 'El nombre debe tener entre 2 y 100 caracteres'
        }
      }
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isPersonal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'workspaces',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['owner_id'] }
    ]
  });

  Workspace.associate = (models) => {
    Workspace.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner'
    });

    Workspace.hasMany(models.WorkspaceMember, {
      foreignKey: 'workspaceId',
      as: 'members',
      onDelete: 'CASCADE'
    });

    Workspace.hasMany(models.Task, {
      foreignKey: 'workspaceId',
      as: 'tasks',
      onDelete: 'SET NULL'
    });

    Workspace.hasMany(models.Category, {
      foreignKey: 'workspaceId',
      as: 'categories',
      onDelete: 'SET NULL'
    });
  };

  return Workspace;
};
