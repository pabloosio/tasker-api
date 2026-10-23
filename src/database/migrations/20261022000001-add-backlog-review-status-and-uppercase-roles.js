'use strict';

/**
 * - Agrega los estados BACKLOG e IN_REVIEW al flujo de tareas (5 estados).
 * - Normaliza users.role a mayúsculas (USER/ADMIN), que es lo que esperan
 *   checkRole('ADMIN') y el cliente.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      MODIFY COLUMN status ENUM('BACKLOG', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED') NOT NULL DEFAULT 'PENDING'
    `);
    // La collation es case-insensitive: 'admin' se mapea a 'ADMIN' al modificar el ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`UPDATE tasks SET status = 'PENDING' WHERE status = 'BACKLOG'`);
    await queryInterface.sequelize.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE status = 'IN_REVIEW'`);
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      MODIFY COLUMN status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING'
    `);
  }
};
