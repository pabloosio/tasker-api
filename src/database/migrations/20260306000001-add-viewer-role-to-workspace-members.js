'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE workspace_members
      MODIFY COLUMN role ENUM('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') NOT NULL DEFAULT 'MEMBER'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Primero convertir VIEWERs a MEMBER para no perder datos al revertir
    await queryInterface.sequelize.query(`
      UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'VIEWER'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE workspace_members
      MODIFY COLUMN role ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER'
    `);
  }
};
