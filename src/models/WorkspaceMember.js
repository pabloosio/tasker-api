const { WORKSPACE_ROLES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const WorkspaceMember = sequelize.define('WorkspaceMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'workspaces',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM(
        WORKSPACE_ROLES.OWNER,
        WORKSPACE_ROLES.ADMIN,
        WORKSPACE_ROLES.MEMBER
      ),
      defaultValue: WORKSPACE_ROLES.MEMBER,
      allowNull: false
    }
  }, {
    tableName: 'workspace_members',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['workspace_id'] },
      { fields: ['user_id'] },
      {
        unique: true,
        fields: ['workspace_id', 'user_id'],
        name: 'unique_workspace_member'
      }
    ]
  });

  WorkspaceMember.associate = (models) => {
    WorkspaceMember.belongsTo(models.Workspace, {
      foreignKey: 'workspaceId',
      as: 'workspace'
    });

    WorkspaceMember.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return WorkspaceMember;
};
