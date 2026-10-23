'use strict';

const { ACTIVITY_ACTIONS } = require('../../config/constants');

/**
 * Historial de actividad (auditoría) de tareas y tableros.
 * Sin llaves foráneas a propósito: el registro sobrevive a que se borre la tarea, el tablero o el usuario.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      action: { type: Sequelize.ENUM(...Object.values(ACTIVITY_ACTIONS)), allowNull: false },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      workspace_id: { type: Sequelize.UUID, allowNull: true },
      workspace_name: { type: Sequelize.STRING(100), allowNull: true },
      task_id: { type: Sequelize.UUID, allowNull: true },
      task_number: { type: Sequelize.INTEGER, allowNull: true },
      task_title: { type: Sequelize.STRING(255), allowNull: true },
      changes: { type: Sequelize.JSON, allowNull: true },
      details: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE(3), allowNull: false }
    });
    await queryInterface.addIndex('activity_logs', ['workspace_id', 'created_at']);
    await queryInterface.addIndex('activity_logs', ['task_id', 'created_at']);
    await queryInterface.addIndex('activity_logs', ['actor_id']);
    await queryInterface.addIndex('activity_logs', ['action']);
    await queryInterface.addIndex('activity_logs', ['task_number']);

    // No hay historial previo; se reconstruye al menos la creación de cada tarea
    await queryInterface.sequelize.query(`
      INSERT INTO activity_logs (id, action, actor_id, workspace_id, workspace_name, task_id, task_number, task_title, details, created_at)
      SELECT UUID(), 'TASK_CREATED', t.user_id, t.workspace_id, w.name, t.id, t.number, t.title,
             JSON_OBJECT('reconstructed', true), t.created_at
      FROM tasks t LEFT JOIN workspaces w ON w.id = t.workspace_id
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
  }
};
