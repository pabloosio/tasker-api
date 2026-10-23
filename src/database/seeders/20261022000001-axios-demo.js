'use strict';

/**
 * Datos de simulación: área de Desarrollo de Axios (telefonía).
 *
 * BORRA TODOS LOS DATOS de la base antes de insertar (solo para entornos de prueba).
 * Uso: npm run seed
 */
const { sequelize, User, Workspace, WorkspaceMember, Category, Task, ChecklistItem, ActivityLog } = require('../../models');
const { USER_ROLES, WORKSPACE_ROLES, ACTIVITY_ACTIONS: A } = require('../../config/constants');

const { OWNER, ADMIN, MEMBER, VIEWER } = WORKSPACE_ROLES;

// Fecha relativa a hoy (YYYY-MM-DD) para que el tablero siempre se vea "vivo"
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};
const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const USERS = [
  { key: 'admin',    name: 'Carlos Méndez',    email: 'admin@axios.mx',             password: 'Axios.Admin2026', role: USER_ROLES.ADMIN },
  { key: 'gerente',  name: 'Laura Gómez',      email: 'laura.gomez@axios.mx',       password: 'Axios.Laura2026' },
  { key: 'techlead', name: 'Diego Ramírez',    email: 'diego.ramirez@axios.mx',     password: 'Axios.Diego2026' },
  { key: 'po',       name: 'Fernanda Ruiz',    email: 'fernanda.ruiz@axios.mx',     password: 'Axios.Fer2026' },
  { key: 'frontend', name: 'Sofía Herrera',    email: 'sofia.herrera@axios.mx',     password: 'Axios.Sofia2026' },
  { key: 'backend',  name: 'Andrés Castillo',  email: 'andres.castillo@axios.mx',   password: 'Axios.Andres2026' },
  { key: 'qa',       name: 'Valeria Ortiz',    email: 'valeria.ortiz@axios.mx',     password: 'Axios.Vale2026' },
  { key: 'devops',   name: 'Miguel Torres',    email: 'miguel.torres@axios.mx',     password: 'Axios.Miguel2026' },
  { key: 'director', name: 'Roberto Salinas',  email: 'roberto.salinas@axios.mx',   password: 'Axios.Roberto2026' },
  { key: 'exempleado', name: 'Jorge Nava',     email: 'jorge.nava@axios.mx',        password: 'Axios.Jorge2026', isActive: false }
];

// Tableros compartidos. members: [userKey, rol en el tablero]
const WORKSPACES = [
  {
    key: 'app',
    name: '📱 App Mi Axios',
    description: 'App móvil de clientes: recargas, consumo de datos, pagos y soporte',
    owner: 'gerente',
    wipLimits: { IN_PROGRESS: 3, IN_REVIEW: 2 },
    members: [['techlead', ADMIN], ['po', ADMIN], ['frontend', MEMBER], ['backend', MEMBER], ['qa', MEMBER], ['director', VIEWER], ['admin', VIEWER]],
    categories: [
      { key: 'feat',  name: 'Funcionalidad', description: 'Historias de usuario y nuevas pantallas', color: '#0EA5E9' },
      { key: 'bug',   name: 'Bug',           description: 'Errores reportados en la app',            color: '#EF4444' },
      { key: 'ux',    name: 'UX / Diseño',   description: 'Mejoras de experiencia y diseño',         color: '#A855F7' },
      { key: 'store', name: 'Release',       description: 'Publicación en App Store / Google Play',  color: '#10B981' }
    ],
    tasks: [
      { t: 'Pantalla de consumo de datos en tiempo real', d: 'Mostrar MB consumidos, restantes y fecha de corte del plan.', s: 'IN_PROGRESS', p: 'HIGH', c: 'feat', a: 'frontend', due: 3,
        checklist: [['Diseño aprobado por UX', true], ['Endpoint /consumo integrado', true], ['Gráfica de consumo diario', false], ['Pruebas en Android 10+', false]] },
      { t: 'Recarga de saldo con tarjeta guardada', d: 'Tokenizar tarjeta con la pasarela y permitir recarga en 1 clic.', s: 'IN_REVIEW', p: 'HIGH', c: 'feat', a: 'backend', due: 1,
        checklist: [['Tokenización con pasarela', true], ['Validación 3DS', true], ['Code review', false]] },
      { t: 'Compra de paquetes de datos adicionales', d: 'Catálogo de paquetes 1GB / 3GB / 5GB con cargo a saldo.', s: 'PENDING', p: 'MEDIUM', c: 'feat', a: 'frontend', due: 8 },
      { t: 'Activación de eSIM desde la app', d: 'Generar QR de eSIM y guiar la instalación en iOS/Android.', s: 'BACKLOG', p: 'MEDIUM', c: 'feat' },
      { t: 'Notificaciones push al 80% del consumo', s: 'BACKLOG', p: 'LOW', c: 'feat' },
      { t: 'Login con biometría (huella / Face ID)', s: 'BACKLOG', p: 'LOW', c: 'ux' },
      { t: 'La app se cierra al abrir "Mis facturas" en iOS 17', d: 'Crash reportado por Crashlytics, 312 usuarios afectados.', s: 'IN_PROGRESS', p: 'HIGH', c: 'bug', a: 'frontend', due: 0 },
      { t: 'Saldo no se actualiza después de recargar', d: 'El saldo tarda hasta 10 min en reflejarse; revisar caché.', s: 'IN_REVIEW', p: 'HIGH', c: 'bug', a: 'backend', due: -1, reject: true },
      { t: 'Rediseño del onboarding (3 pantallas)', s: 'PENDING', p: 'MEDIUM', c: 'ux', a: 'po', due: 12 },
      { t: 'Modo oscuro', s: 'BACKLOG', p: 'LOW', c: 'ux' },
      { t: 'Publicar versión 4.2.0 en tiendas', d: 'Incluye consumo en tiempo real y corrección de facturas.', s: 'PENDING', p: 'HIGH', c: 'store', a: 'techlead', due: 7,
        checklist: [['Release notes', false], ['Capturas actualizadas', false], ['Aprobación de QA', false]] },
      { t: 'Pruebas de regresión v4.1.3', s: 'COMPLETED', p: 'MEDIUM', c: 'store', a: 'qa', done: 6 },
      { t: 'Pago de factura con SPEI / OXXO', s: 'COMPLETED', p: 'HIGH', c: 'feat', a: 'backend', done: 9 },
      { t: 'Corregir textos truncados en pantalla de planes', s: 'COMPLETED', p: 'LOW', c: 'bug', a: 'frontend', done: 3 }
    ]
  },
  {
    key: 'apis',
    name: '🔌 APIs e Integraciones BSS/OSS',
    description: 'Servicios backend: facturación, portabilidad, aprovisionamiento de líneas',
    owner: 'gerente',
    wipLimits: { IN_PROGRESS: 1 }, // excedido a propósito (2/1) para la demo
    members: [['techlead', ADMIN], ['backend', MEMBER], ['devops', MEMBER], ['qa', MEMBER], ['po', VIEWER]],
    categories: [
      { key: 'port', name: 'Portabilidad',     description: 'Integración con ABD / IFT para portar números', color: '#F97316' },
      { key: 'bill', name: 'Facturación',      description: 'CFDI, cortes, cargos y conciliación',           color: '#0EA5E9' },
      { key: 'prov', name: 'Aprovisionamiento', description: 'Alta/baja de líneas, SIM, eSIM y planes',      color: '#10B981' },
      { key: 'debt', name: 'Deuda técnica',    description: 'Refactors, actualizaciones y mejoras internas', color: '#6B7280' }
    ],
    tasks: [
      { t: 'API de portabilidad numérica (NIP)', d: 'Validar NIP y enviar solicitud de portabilidad al administrador de base de datos.', s: 'IN_PROGRESS', p: 'HIGH', c: 'port', a: 'backend', due: 5,
        checklist: [['Contrato OpenAPI', true], ['Validación de NIP', true], ['Envío al ABD', false], ['Manejo de rechazos', false]] },
      { t: 'Webhook de estatus de portabilidad', s: 'PENDING', p: 'HIGH', c: 'port', a: 'backend', due: 10 },
      { t: 'Timbrado de CFDI 4.0 para facturas prepago', s: 'IN_REVIEW', p: 'HIGH', c: 'bill', a: 'techlead', due: 2 },
      { t: 'Conciliación diaria de pagos vs. pasarela', s: 'PENDING', p: 'MEDIUM', c: 'bill', a: 'backend', due: 14 },
      { t: 'Endpoint de alta de eSIM con el HLR', s: 'BACKLOG', p: 'MEDIUM', c: 'prov' },
      { t: 'Suspensión automática por falta de pago', s: 'BACKLOG', p: 'MEDIUM', c: 'prov' },
      { t: 'Cambio de plan sin cambio de SIM', s: 'IN_PROGRESS', p: 'MEDIUM', c: 'prov', a: 'techlead', due: 6 },
      { t: 'Migrar servicio de facturación a Node 22', s: 'BACKLOG', p: 'LOW', c: 'debt' },
      { t: 'Agregar trazas distribuidas (OpenTelemetry)', s: 'PENDING', p: 'LOW', c: 'debt', a: 'devops', due: 20 },
      { t: 'Pruebas de carga del endpoint /recargas (5k rps)', s: 'IN_REVIEW', p: 'HIGH', c: 'debt', a: 'qa', due: 1 },
      { t: 'Activación de línea prepago en < 2 min', s: 'COMPLETED', p: 'HIGH', c: 'prov', a: 'backend', done: 12 },
      { t: 'Documentar APIs en Swagger', s: 'COMPLETED', p: 'LOW', c: 'debt', a: 'techlead', done: 4 }
    ]
  },
  {
    key: 'web',
    name: '🌐 Portal Web y Tienda en Línea',
    description: 'axios.mx: venta de planes, chips, eSIM y portal de autogestión',
    owner: 'po',
    members: [['gerente', ADMIN], ['frontend', MEMBER], ['qa', MEMBER], ['director', VIEWER]],
    categories: [
      { key: 'shop', name: 'E-commerce', description: 'Carrito, checkout y envíos de SIM', color: '#F59E0B' },
      { key: 'seo',  name: 'SEO / Marketing', description: 'Landing pages y campañas',     color: '#EC4899' },
      { key: 'bug',  name: 'Bug',        description: 'Errores del portal',                color: '#EF4444' }
    ],
    tasks: [
      { t: 'Checkout de compra de chip con envío a domicilio', s: 'IN_PROGRESS', p: 'HIGH', c: 'shop', a: 'frontend', due: 4,
        checklist: [['Carrito', true], ['Cotización de envío', false], ['Pago con tarjeta', false]] },
      { t: 'Comparador de planes', s: 'IN_REVIEW', p: 'MEDIUM', c: 'shop', a: 'frontend', due: 2 },
      { t: 'Landing "Pórtate a Axios" para campaña Buen Fin', s: 'PENDING', p: 'HIGH', c: 'seo', a: 'po', due: 9 },
      { t: 'Verificador de cobertura por código postal', s: 'BACKLOG', p: 'MEDIUM', c: 'shop' },
      { t: 'Chat de ventas en línea', s: 'BACKLOG', p: 'LOW', c: 'shop' },
      { t: 'El formulario de contacto no envía en Safari', s: 'PENDING', p: 'MEDIUM', c: 'bug', a: 'qa', due: 3 },
      { t: 'Optimizar Core Web Vitals del home', s: 'COMPLETED', p: 'MEDIUM', c: 'seo', a: 'frontend', done: 5 }
    ]
  },
  {
    key: 'devops',
    name: '☁️ DevOps e Infraestructura',
    description: 'Pipelines CI/CD, ambientes, monitoreo y seguridad',
    owner: 'devops',
    members: [['gerente', ADMIN], ['techlead', MEMBER], ['backend', MEMBER]],
    categories: [
      { key: 'ci',   name: 'CI/CD',      description: 'Pipelines y despliegues',        color: '#0EA5E9' },
      { key: 'mon',  name: 'Monitoreo',  description: 'Alertas, logs y dashboards',     color: '#F59E0B' },
      { key: 'sec',  name: 'Seguridad',  description: 'Vulnerabilidades y accesos',     color: '#EF4444' }
    ],
    tasks: [
      { t: 'Pipeline de despliegue a QA para App Mi Axios', s: 'IN_PROGRESS', p: 'HIGH', c: 'ci', a: 'devops', due: 2 },
      { t: 'Alertas de latencia > 800ms en APIs de recarga', s: 'PENDING', p: 'HIGH', c: 'mon', a: 'devops', due: 5 },
      { t: 'Rotar credenciales de base de datos de producción', s: 'IN_REVIEW', p: 'HIGH', c: 'sec', a: 'devops', due: 0 },
      { t: 'Escaneo de dependencias vulnerables (SCA)', s: 'BACKLOG', p: 'MEDIUM', c: 'sec' },
      { t: 'Ambiente de staging idéntico a producción', s: 'BACKLOG', p: 'MEDIUM', c: 'ci' },
      { t: 'Respaldo diario de base de clientes', s: 'COMPLETED', p: 'HIGH', c: 'mon', a: 'devops', done: 15 }
    ]
  },
  {
    key: 'soporte',
    name: '🎫 Incidencias de Producción',
    description: 'Bugs reportados por Atención a Clientes y monitoreo (nivel 2/3)',
    owner: 'techlead',
    members: [['gerente', ADMIN], ['backend', MEMBER], ['frontend', MEMBER], ['qa', MEMBER], ['devops', MEMBER], ['director', VIEWER]],
    categories: [
      { key: 'crit', name: 'Crítico (P1)', description: 'Afecta a todos los clientes o a la facturación', color: '#DC2626' },
      { key: 'high', name: 'Alto (P2)',    description: 'Afecta a un grupo de clientes',                 color: '#F97316' },
      { key: 'low',  name: 'Menor (P3)',   description: 'Cosmético o con solución alterna',              color: '#6B7280' }
    ],
    tasks: [
      { t: 'Clientes con doble cargo en recarga de $100', d: 'Ticket INC-4821. Reportado por Atención a Clientes, 47 casos.', s: 'IN_PROGRESS', p: 'HIGH', c: 'crit', a: 'backend', due: 0, escalated: true,
        checklist: [['Identificar transacciones duplicadas', true], ['Aplicar idempotencia en /recargas', false], ['Reembolsar a clientes', false]] },
      { t: 'SMS de bienvenida no llega a líneas nuevas', s: 'IN_REVIEW', p: 'HIGH', c: 'high', a: 'devops', due: -2 },
      { t: 'Portal muestra fecha de corte incorrecta', s: 'PENDING', p: 'MEDIUM', c: 'high', a: 'frontend', due: 2 },
      { t: 'Ícono roto en correo de factura', s: 'BACKLOG', p: 'LOW', c: 'low' },
      { t: 'Caída de API de saldo (15 min) 18/oct', s: 'COMPLETED', p: 'HIGH', c: 'crit', a: 'devops', done: 4 },
      { t: 'Recargas OXXO no se aplicaban los domingos', s: 'COMPLETED', p: 'HIGH', c: 'crit', a: 'backend', done: 8 }
    ]
  }
];

// Tareas personales de ejemplo (workspace personal de cada usuario)
const PERSONAL_TASKS = {
  gerente:  [['Preparar reporte mensual para Dirección', 'PENDING', 'HIGH', 3], ['1:1 con Diego y Sofía', 'IN_PROGRESS', 'MEDIUM', 1]],
  techlead: [['Revisar PRs pendientes', 'IN_PROGRESS', 'HIGH', 0], ['Curso de arquitectura de microservicios', 'BACKLOG', 'LOW', null]],
  qa:       [['Actualizar matriz de casos de prueba', 'PENDING', 'MEDIUM', 4]],
  frontend: [['Estudiar React Native New Architecture', 'BACKLOG', 'LOW', null]]
};

// ── Historial de actividad de la demo ──────────────────────────────────────────
const FLOW = ['BACKLOG', 'PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
const HOUR = 60 * 60 * 1000;
const daysAfter = (date, days) => new Date(date.getTime() + days * 24 * HOUR);

/**
 * Recorrido de estados desde la creación hasta el estado actual.
 * Con reject: QA la regresa de En revisión a En progreso y luego vuelve a revisión.
 */
const statusPath = (finalStatus, reject) => {
  const initial = finalStatus === 'BACKLOG' ? 'BACKLOG' : 'PENDING';
  const path = FLOW.slice(FLOW.indexOf(initial) + 1, FLOW.indexOf(finalStatus) + 1);
  if (reject) path.push('IN_PROGRESS', 'IN_REVIEW');
  return { initial, path };
};

const TABLES = ['activity_logs', 'checklist_items', 'tasks', 'categories', 'workspace_members', 'workspaces', 'refresh_tokens',
  'password_reset_tokens', 'email_verification_tokens', 'auth_logs', 'users'];

const wipe = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    await sequelize.query(`TRUNCATE TABLE \`${table}\``).catch(() => {});
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    await wipe();

    // Usuarios + sus workspaces personales
    const users = {};
    for (const u of USERS) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role || USER_ROLES.USER,
        isActive: u.isActive !== false,
        emailVerified: true,
        lastLogin: u.isActive === false ? ago(60) : ago(Math.floor(Math.random() * 3))
      });
      const personal = await Workspace.create({
        name: '🧍‍♂️ Personal',
        description: 'Espacio de trabajo personal',
        ownerId: user.id,
        isPersonal: true
      });
      await WorkspaceMember.create({ workspaceId: personal.id, userId: user.id, role: OWNER });
      users[u.key] = { user, personal };
    }

    // Historial que se inserta al final con sus fechas "reales" de la demo
    const events = [];
    const ev = (createdAt, action, actor, workspace, extra = {}) => events.push({
      createdAt, action, actorId: actor.id, workspaceId: workspace?.id ?? null, workspaceName: workspace?.name ?? null, ...extra
    });
    const taskRef = (task) => ({ taskId: task.id, taskNumber: task.number, taskTitle: task.title });

    let appBoard = null;

    // Tableros compartidos
    for (const ws of WORKSPACES) {
      const owner = users[ws.owner].user;
      const workspace = await Workspace.create({
        name: ws.name, description: ws.description, ownerId: owner.id, isPersonal: false, wipLimits: ws.wipLimits || null
      });

      await WorkspaceMember.bulkCreate([
        { workspaceId: workspace.id, userId: owner.id, role: OWNER },
        ...ws.members.map(([key, role]) => ({ workspaceId: workspace.id, userId: users[key].user.id, role }))
      ]);

      ev(ago(30), A.WORKSPACE_CREATED, owner, workspace);
      ws.members.forEach(([key, role], i) => {
        // La PO entró como miembro a App Mi Axios y luego la ascendieron (para la demo)
        const initialRole = ws.key === 'app' && key === 'po' ? MEMBER : role;
        ev(daysAfter(ago(30), 0.1 + i * 0.01), A.MEMBER_ADDED, owner, workspace, { details: { member: users[key].user.name, role: initialRole } });
      });
      if (ws.key === 'app') {
        ev(ago(15), A.MEMBER_ROLE_CHANGED, owner, workspace, {
          changes: [{ field: 'role', from: MEMBER, to: ADMIN }], details: { member: users.po.user.name }
        });
      }
      if (ws.wipLimits) {
        ev(ago(ws.key === 'app' ? 10 : 5), A.WIP_LIMITS_CHANGED, owner, workspace, {
          changes: [{ field: 'wipLimits', from: {}, to: ws.wipLimits }]
        });
      }

      const categories = {};
      for (const c of ws.categories) {
        categories[c.key] = await Category.create({
          name: c.name, description: c.description, color: c.color, userId: owner.id, workspaceId: workspace.id
        });
        ev(daysAfter(ago(30), 0.5), A.CATEGORY_CREATED, owner, workspace, { details: { name: c.name, color: c.color } });
      }

      for (const [position, t] of ws.tasks.entries()) {
        const completed = t.s === 'COMPLETED';
        const task = await Task.create({
          title: t.t,
          description: t.d || null,
          status: t.s,
          priority: t.p,
          dueDate: t.due !== undefined ? day(t.due) : (completed ? day(-t.done) : null),
          completedAt: completed ? ago(t.done) : null,
          // Algunas tarjetas quedan "estancadas" (≥5 días sin moverse) para la demo
          statusUpdatedAt: completed ? ago(t.done) : ago((position * 3) % 9 + 1),
          position,
          userId: owner.id,
          categoryId: categories[t.c].id,
          workspaceId: workspace.id,
          assignedTo: t.a ? users[t.a].user.id : null
        });
        if (t.checklist) {
          await ChecklistItem.bulkCreate(t.checklist.map(([content, isCompleted], position) => ({
            content, isCompleted, position, taskId: task.id, completedAt: isCompleted ? ago(1) : null
          })));
        }

        // ── Historial de la tarea ──
        const createdAt = ago(25 - (position % 8));
        await sequelize.query('UPDATE tasks SET created_at = ? WHERE id = ?', { replacements: [createdAt, task.id] });
        const assignee = t.a ? users[t.a].user : null;
        const { initial, path } = statusPath(t.s, t.reject);

        ev(createdAt, A.TASK_CREATED, owner, workspace, { ...taskRef(task), details: { status: initial, assignee: null } });
        if (t.escalated) {
          ev(daysAfter(createdAt, 0.05), A.TASK_UPDATED, users.techlead.user, workspace, {
            ...taskRef(task), changes: [{ field: 'priority', from: 'MEDIUM', to: 'HIGH' }]
          });
        }
        if (assignee) {
          ev(daysAfter(createdAt, 0.5), A.TASK_ASSIGNED, owner, workspace, {
            ...taskRef(task), changes: [{ field: 'assignee', from: null, to: assignee.name }]
          });
        }

        // Movimientos repartidos entre la creación y la última vez que se movió
        const start = daysAfter(createdAt, 1).getTime();
        const end = Math.max(task.statusUpdatedAt.getTime(), start + HOUR);
        let previous = initial;
        path.forEach((status, i) => {
          const at = new Date(start + ((end - start) * (i + 1)) / path.length);
          const isQaReject = t.reject && previous === 'IN_REVIEW' && status === 'IN_PROGRESS';
          const actor = (isQaReject || status === 'COMPLETED') && ws.members.some(([k]) => k === 'qa')
            ? users.qa.user
            : (assignee || owner);
          ev(at, A.TASK_STATUS_CHANGED, actor, workspace, {
            ...taskRef(task),
            changes: [{ field: 'status', from: previous, to: status }],
            details: isQaReject ? { note: 'Rechazada por QA' } : null
          });
          previous = status;
        });

        (t.checklist || []).filter(([, done]) => done).forEach(([content], i) => {
          ev(new Date(ago(1).getTime() + i * 60000), A.CHECKLIST_ITEM_COMPLETED, assignee || owner, workspace, {
            ...taskRef(task), details: { content, progress: `${i + 1}/${t.checklist.length}` }
          });
        });
      }

      if (ws.key === 'app') appBoard = { workspace, owner, category: categories.feat };

      // Fijar el primer tablero de cada dueño como predeterminado
      if (!owner.pinnedWorkspaceId) {
        await owner.update({ pinnedWorkspaceId: workspace.id });
      }
    }

    for (const [key, tasks] of Object.entries(PERSONAL_TASKS)) {
      const { user, personal } = users[key];
      const created = await Task.bulkCreate(tasks.map(([title, status, priority, due]) => ({
        title, status, priority, dueDate: due === null ? null : day(due), userId: user.id, workspaceId: personal.id
      })));
      const fresh = await Task.findAll({ where: { id: created.map(c => c.id) } }); // con su número asignado
      fresh.forEach(task => ev(ago(4), A.TASK_CREATED, user, personal, { ...taskRef(task), details: { status: task.status, assignee: null } }));
    }

    // Una tarea eliminada, para mostrar que el historial la conserva.
    // Se crea al final para no recorrer la numeración de las demás (#000015 = API de portabilidad).
    const deleted = await Task.create({
      title: 'Prototipo de chatbot de soporte', status: 'BACKLOG', priority: 'LOW',
      userId: users.po.user.id, workspaceId: appBoard.workspace.id, categoryId: appBoard.category.id
    });
    ev(ago(12), A.TASK_CREATED, users.po.user, appBoard.workspace, { ...taskRef(deleted), details: { status: 'BACKLOG', assignee: null } });
    ev(ago(3), A.TASK_DELETED, appBoard.owner, appBoard.workspace, { ...taskRef(deleted), details: { status: 'BACKLOG', priority: 'LOW' } });
    await deleted.destroy();

    await ActivityLog.bulkCreate(events);
  },

  async down() {
    await wipe();
  }
};
