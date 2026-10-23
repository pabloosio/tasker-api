'use strict';

/**
 * - tasks.position: orden manual de las tarjetas dentro de cada columna.
 * - workspaces.wip_limits: límite de tareas por columna (Kanban WIP).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tasks', 'position', {
      type: Sequelize.DOUBLE,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('workspaces', 'wip_limits', {
      type: Sequelize.JSON,
      allowNull: true
    });

    // Respetar el orden que se veía antes: prioridad, fecha y más recientes primero
    await queryInterface.sequelize.query(`
      UPDATE tasks t
      JOIN (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY COALESCE(workspace_id, user_id), status
          ORDER BY FIELD(priority, 'HIGH', 'MEDIUM', 'LOW'), due_date IS NULL, due_date, created_at DESC
        ) AS rn
        FROM tasks
      ) ranked ON ranked.id = t.id
      SET t.position = ranked.rn
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tasks', 'position');
    await queryInterface.removeColumn('workspaces', 'wip_limits');
  }
};
