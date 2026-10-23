'use strict';

const { NOTIFICATION_TYPES } = require('../../config/constants');

/**
 * Avisos dentro de la app (campanita): menciones, asignaciones, colaboradores y comentarios.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      type: { type: Sequelize.ENUM(...Object.values(NOTIFICATION_TYPES)), allowNull: false },
      task_id: { type: Sequelize.UUID, allowNull: true },
      workspace_id: { type: Sequelize.UUID, allowNull: true },
      data: { type: Sequelize.JSON, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE(3), allowNull: false }
    });
    // Lista y contador de no leídas por persona
    await queryInterface.addIndex('notifications', ['user_id', 'read_at', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  }
};
