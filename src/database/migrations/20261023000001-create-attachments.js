'use strict';

/**
 * Archivos adjuntos de tareas (el archivo vive en S3, aquí solo sus datos).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attachments', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      original_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: { type: Sequelize.STRING(150), allowNull: false },
      kind: { type: Sequelize.ENUM('IMAGE', 'DOCUMENT', 'OTHER'), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER, allowNull: false },
      storage_key: { type: Sequelize.STRING(500), allowNull: false },
      thumb_key: { type: Sequelize.STRING(500), allowNull: true },
      width: { type: Sequelize.INTEGER, allowNull: true },
      height: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('attachments', ['task_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attachments');
  }
};
