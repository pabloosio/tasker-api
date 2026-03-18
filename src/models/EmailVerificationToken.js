module.exports = (sequelize, DataTypes) => {
  const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: { msg: 'Debe ser un email válido' }
      }
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'Este token ya existe'
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'email_verification_tokens',
    timestamps: true,
    underscored: true
  });

  // Asociaciones
  EmailVerificationToken.associate = (models) => {
    EmailVerificationToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  return EmailVerificationToken;
};
