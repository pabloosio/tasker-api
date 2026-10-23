'use strict';

const { ACTIVITY_ACTIONS } = require('../../config/constants');

/**
 * Agrega COLLABORATOR_ADDED y COLLABORATOR_REMOVED al historial de actividad.
 */
const enumOf = (actions) => actions.map((a) => `'${a}'`).join(', ');

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE activity_logs
      MODIFY COLUMN action ENUM(${enumOf(Object.values(ACTIVITY_ACTIONS))}) NOT NULL
    `);
  },

  async down(queryInterface) {
    const removed = ['COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED'];
    await queryInterface.sequelize.query(
      `DELETE FROM activity_logs WHERE action IN (${enumOf(removed)})`
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE activity_logs
      MODIFY COLUMN action ENUM(${enumOf(Object.values(ACTIVITY_ACTIONS).filter((a) => !removed.includes(a)))}) NOT NULL
    `);
  }
};
