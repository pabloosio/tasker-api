'use strict';

/**
 * Colaboradores de una tarea (además de la persona asignada).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_collaborators', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      added_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('task_collaborators', ['task_id', 'user_id'], { unique: true });
    await queryInterface.addIndex('task_collaborators', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('task_collaborators');
  }
};
