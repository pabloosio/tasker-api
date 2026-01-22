module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes. UUIDV4,
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
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#3B82F6',
      validate: {
        is: {
          args: /^#[0-9A-F]{6}$/i,
          msg: 'El color debe ser un código hexadecimal válido (ej: #3B82F6)'
        }
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model:  'users',
        key:  'id'
      }
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['userId'] },
      {
        unique: true,
        fields: ['userId', 'name'],
        name: 'unique_category_per_user'
      }
    ]
  });

  // Asociaciones
  Category.associate = (models) => {
    Category.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Category.hasMany(models.Task, {
      foreignKey: 'categoryId',
      as: 'tasks',
      onDelete: 'SET NULL'
    });
  };

  return Category;
};