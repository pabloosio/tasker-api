/**
 * Archivo adjunto a una tarea. El archivo vive en S3; aquí solo se guardan sus datos y su key.
 */
module.exports = (sequelize, DataTypes) => {
  const Attachment = sequelize.define('Attachment', {
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
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    kind: {
      type: DataTypes.ENUM('IMAGE', 'DOCUMENT', 'OTHER'),
      allowNull: false
    },
    // Tamaño final guardado (las imágenes ya comprimidas)
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbKey: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'attachments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['taskId', 'createdAt'] }
    ]
  });

  Attachment.associate = (models) => {
    Attachment.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task'
    });

    Attachment.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
  };

  return Attachment;
};
