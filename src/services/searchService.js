const { Op } = require('sequelize');
const { Task, Category, Workspace, WorkspaceMember, User } = require('../models');
const { BadRequestError } = require('../utils/errors');
const { parseTaskKey } = require('../utils/taskKey');

const TASK_LIMIT = 20;
const OTHER_LIMIT = 5;

// Escapar comodines de LIKE para que "100%" o "a_b" se busquen literalmente
const likePattern = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Búsqueda global por palabra clave.
 * Solo devuelve resultados de los tableros donde el usuario es miembro
 * (más sus tareas/categorías antiguas sin tablero).
 */
exports.search = async (userId, rawQuery) => {
  const q = (rawQuery || '').trim();
  const number = parseTaskKey(q);
  if (q.length < 2 && !number) {
    throw new BadRequestError('Escribe al menos 2 caracteres para buscar');
  }
  const like = { [Op.like]: likePattern(q) };

  const memberships = await WorkspaceMember.findAll({ where: { userId }, attributes: ['workspaceId'] });
  const workspaceIds = memberships.map(m => m.workspaceId);
  const inMyScope = {
    [Op.or]: [
      { workspaceId: { [Op.in]: workspaceIds } },
      { workspaceId: null, userId }
    ]
  };

  const [tasks, workspaces, categories] = await Promise.all([
    Task.findAll({
      where: {
        [Op.and]: [
          inMyScope,
          // Por texto, por categoría ("bug") o por persona asignada ("andrés")
          {
            [Op.or]: [
              // "142", "#142" o "#000142": la tarea con ese número
              ...(number ? [{ number }] : []),
              { title: like },
              { description: like },
              { '$category.name$': like },
              { '$assignee.name$': like }
            ]
          }
        ]
      },
      include: [
        { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'isPersonal'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
        { model: User, as: 'assignee', attributes: ['id', 'name'] }
      ],
      // Primero la coincidencia exacta por número, luego lo activo y lo que coincide en el título
      order: [
        ...(number ? [[Task.sequelize.literal(`\`Task\`.\`number\` = ${number}`), 'DESC']] : []),
        [Task.sequelize.literal(`status = 'COMPLETED'`), 'ASC'],
        [Task.sequelize.literal(`title LIKE ${Task.sequelize.escape(likePattern(q))}`), 'DESC'],
        ['updatedAt', 'DESC']
      ],
      limit: TASK_LIMIT
    }),
    Workspace.findAll({
      where: { id: { [Op.in]: workspaceIds }, [Op.or]: [{ name: like }, { description: like }] },
      attributes: ['id', 'name', 'description', 'isPersonal'],
      limit: OTHER_LIMIT
    }),
    Category.findAll({
      where: { [Op.and]: [inMyScope, { [Op.or]: [{ name: like }, { description: like }] }] },
      include: [{ model: Workspace, as: 'workspace', attributes: ['id', 'name'] }],
      attributes: ['id', 'name', 'color', 'workspaceId'],
      limit: OTHER_LIMIT
    })
  ]);

  return { query: q, tasks, workspaces, categories };
};
