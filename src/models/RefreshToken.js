module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    deviceId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  return RefreshToken;
};
