'use strict';

/**
 * tasks.number: identificador consecutivo y legible de la tarea (se muestra como #000142).
 * Es global (no por tablero), nunca cambia y no se reutiliza aunque se borren tareas.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE tasks ADD COLUMN number INT NULL`);

    // Numerar las tareas existentes en orden de creación
    await queryInterface.sequelize.query(`
      UPDATE tasks t
      JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM tasks) ranked
        ON ranked.id = t.id
      SET t.number = ranked.rn
    `);

    // A partir de aquí la base de datos asigna el siguiente número sola
    await queryInterface.sequelize.query(`ALTER TABLE tasks ADD UNIQUE INDEX tasks_number_unique (number)`);
    await queryInterface.sequelize.query(`ALTER TABLE tasks MODIFY COLUMN number INT NOT NULL AUTO_INCREMENT`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE tasks MODIFY COLUMN number INT NULL`);
    await queryInterface.sequelize.query(`ALTER TABLE tasks DROP INDEX tasks_number_unique`);
    await queryInterface.sequelize.query(`ALTER TABLE tasks DROP COLUMN number`);
  }
};
