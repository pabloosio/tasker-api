const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
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
          msg:  'El nombre debe tener entre 2 y 100 caracteres'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'Este email ya está registrado'
      },
      validate: {
        isEmail: { msg: 'Debe ser un email válido' },
        notEmpty: { msg:  'El email no puede estar vacío' }
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'La contraseña no puede estar vacía' },
        len: {
          args: [6, 255],
          msg:  'La contraseña debe tener al menos 6 caracteres'
        }
      }
    },
    role: {
      type: DataTypes.ENUM(USER_ROLES.USER, USER_ROLES.ADMIN),
      defaultValue: USER_ROLES.USER,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Método de instancia para comparar contraseñas
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Método para ocultar contraseña al serializar
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  // Asociaciones
  User.associate = (models) => {
    User.hasMany(models.Task, {
      foreignKey: 'userId',
      as: 'tasks',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.Category, {
      foreignKey: 'userId',
      as: 'categories',
      onDelete: 'CASCADE'
    });
  };

  return User;
};