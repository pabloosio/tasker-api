'use strict';

const { User, Workspace, WorkspaceMember, Category, Task } = require('../../models');
const { USER_ROLES, WORKSPACE_ROLES } = require('../../config/constants');

const DEMO_EMAIL = 'admin@tasker.com';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    const existing = await User.findOne({ where: { email: DEMO_EMAIL } });
    if (existing) return;

    // Usuario activo y con email verificado (sin pasar por el flujo de correo)
    const user = await User.create({
      name: 'Admin Tasker',
      email: DEMO_EMAIL,
      password: 'Admin123!',
      role: USER_ROLES.ADMIN,
      isActive: true,
      emailVerified: true
    });

    const personal = await Workspace.create({
      name: '🧍‍♂️ Personal',
      description: 'Espacio de trabajo personal',
      ownerId: user.id,
      isPersonal: true
    });

    const trabajo = await Workspace.create({
      name: '💼 Trabajo',
      description: 'Espacio de trabajo profesional',
      ownerId: user.id,
      isPersonal: false
    });

    await WorkspaceMember.bulkCreate([
      { workspaceId: personal.id, userId: user.id, role: WORKSPACE_ROLES.OWNER },
      { workspaceId: trabajo.id, userId: user.id, role: WORKSPACE_ROLES.OWNER }
    ]);

    const [casa, salud] = await Category.bulkCreate([
      { name: 'Casa',  description: 'Limpieza, organización, reparaciones, compras del hogar', color: '#10B981', userId: user.id, workspaceId: personal.id },
      { name: 'Salud', description: 'Ejercicio, citas médicas, medicamentos, descanso',         color: '#EF4444', userId: user.id, workspaceId: personal.id }
    ]);

    const [proyectos, bugs] = await Category.bulkCreate([
      { name: 'Proyectos', description: 'Avances, entregables, implementación, tareas asignadas', color: '#0EA5E9', userId: user.id, workspaceId: trabajo.id },
      { name: 'Bugs & QA', description: 'Errores, incidencias, correcciones, pruebas',           color: '#F97316', userId: user.id, workspaceId: trabajo.id }
    ]);

    await Task.bulkCreate([
      { title: 'Comprar despensa',        status: 'PENDING',     priority: 'MEDIUM', userId: user.id, workspaceId: personal.id, categoryId: casa.id },
      { title: 'Salir a correr 30 min',   status: 'IN_PROGRESS', priority: 'LOW',    userId: user.id, workspaceId: personal.id, categoryId: salud.id },
      { title: 'Preparar demo del sprint', status: 'PENDING',    priority: 'HIGH',   userId: user.id, workspaceId: trabajo.id,  categoryId: proyectos.id },
      { title: 'Corregir bug de login',   status: 'COMPLETED',   priority: 'HIGH',   userId: user.id, workspaceId: trabajo.id,  categoryId: bugs.id, completedAt: new Date() }
    ]);
  },

  async down() {
    const user = await User.findOne({ where: { email: DEMO_EMAIL } });
    if (!user) return;
    await Task.destroy({ where: { userId: user.id } });
    await Category.destroy({ where: { userId: user.id } });
    await WorkspaceMember.destroy({ where: { userId: user.id } });
    await Workspace.destroy({ where: { ownerId: user.id } });
    await user.destroy();
  }
};
