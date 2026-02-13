'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      taskId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'task_id',
        references: {
          model: 'tasks',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      content: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      isCompleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_completed'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'completed_at'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_bin'
    });

    await queryInterface.addIndex('checklist_items', ['task_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('checklist_items');
  }
};
