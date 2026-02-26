'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['token_hash']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  }
};
