'use strict';

/**
 * Comentarios (notas de seguimiento) en las tareas.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_comments', {
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
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      edited_at: { type: Sequelize.DATE, allowNull: true },
      // Con milisegundos: dos comentarios en el mismo segundo deben conservar su orden
      created_at: { type: Sequelize.DATE(3), allowNull: false },
      updated_at: { type: Sequelize.DATE(3), allowNull: false }
    });
    await queryInterface.addIndex('task_comments', ['task_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('task_comments');
  }
};
