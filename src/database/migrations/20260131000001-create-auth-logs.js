'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      event_type: {
        type: Sequelize.ENUM(
          'LOGIN_SUCCESS',
          'LOGIN_FAILED_EMAIL_NOT_FOUND',
          'LOGIN_FAILED_WRONG_PASSWORD',
          'LOGIN_FAILED_INACTIVE_ACCOUNT',
          'REGISTER_SUCCESS',
          'REGISTER_FAILED_EMAIL_EXISTS'
        ),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('auth_logs', ['email']);
    await queryInterface.addIndex('auth_logs', ['event_type']);
    await queryInterface.addIndex('auth_logs', ['user_id']);
    await queryInterface.addIndex('auth_logs', ['ip_address']);
    await queryInterface.addIndex('auth_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auth_logs');
  }
};
