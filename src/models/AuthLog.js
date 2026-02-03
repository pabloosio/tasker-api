const AUTH_EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED_EMAIL_NOT_FOUND',
  'LOGIN_FAILED_WRONG_PASSWORD',
  'LOGIN_FAILED_INACTIVE_ACCOUNT',
  'REGISTER_SUCCESS',
  'REGISTER_FAILED_EMAIL_EXISTS'
];

module.exports = (sequelize, DataTypes) => {
  const AuthLog = sequelize.define('AuthLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventType: {
      type: DataTypes.ENUM(...AUTH_EVENT_TYPES),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'auth_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['event_type'] },
      { fields: ['user_id'] },
      { fields: ['ip_address'] },
      { fields: ['created_at'] }
    ]
  });

  AuthLog.associate = (models) => {
    AuthLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return AuthLog;
};
