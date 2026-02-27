const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Task, Category, User, ChecklistItem } = require('../models');

const STATUS_LABELS   = { PENDING: 'Pendiente', IN_PROGRESS: 'En Progreso', COMPLETED: 'Completada' };
const PRIORITY_LABELS = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };

const fmtDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Obtener tareas filtradas con toda la información para el reporte
 */
const getFilteredTasks = async (userId, { startDate, endDate, workspaceId, categoryIds } = {}) => {
  const where = { userId };

  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
    where[Op.or] = [
      { createdAt:   { [Op.between]: [start, end] } },
      { completedAt: { [Op.between]: [start, end] } }
    ];
  }

  if (workspaceId) where.workspaceId = workspaceId;

  const includeCategory = {
    model: Category, as: 'category',
    attributes: ['id', 'name', 'color'],
    required: false
  };

  if (categoryIds && categoryIds.length > 0) {
    includeCategory.where    = { id: { [Op.in]: categoryIds } };
    includeCategory.required = true;
  }

  return Task.findAll({
    where,
    include: [
      includeCategory,
      { model: User, as: 'user',     attributes: ['id', 'name', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
      { model: ChecklistItem, as: 'checklistItems', attributes: ['id', 'isCompleted'] }
    ],
    order: [['createdAt', 'ASC']]
  });
};

/**
 * Agrupar tareas por categoría. Sin categoría siempre al final.
 */
const groupByCategory = (tasks) => {
  const map = new Map();
  tasks.forEach(task => {
    const key   = task.category?.id    || '__none__';
    const name  = task.category?.name  || 'Sin categoría';
    const color = task.category?.color || '#6B7685';
    if (!map.has(key)) map.set(key, { name, color, tasks: [] });
    map.get(key).tasks.push(task);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.name === 'Sin categoría') return 1;
    if (b.name === 'Sin categoría') return -1;
    return a.name.localeCompare(b.name, 'es');
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXCEL
// ─────────────────────────────────────────────────────────────────────────────

exports.generateExcel = async (userId, filters = {}, userName = '') => {
  const tasks  = await getFilteredTasks(userId, filters);
  const groups = groupByCategory(tasks);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tasker';
  wb.created = new Date();

  const ws = wb.addWorksheet('Reporte', { properties: { tabColor: { argb: 'FF6B9FD4' } } });

  ws.columns = [
    { key: 'num',         width: 5  },
    { key: 'title',       width: 30 },
    { key: 'description', width: 38 },
    { key: 'status',      width: 14 },
    { key: 'priority',    width: 11 },
    { key: 'creator',     width: 20 },
    { key: 'assignee',    width: 20 },
    { key: 'checklist',   width: 12 },
    { key: 'dueDate',     width: 13 },
    { key: 'completedAt', width: 13 },
    { key: 'createdAt',   width: 13 }
  ];

  // ── Fila 1: Título ─────────────────────────────────────────────────────────
  ws.getRow(1).height = 32;
  ws.mergeCells('A1:K1');
  const r1 = ws.getCell('A1');
  r1.value     = 'TASKER – REPORTE DE TAREAS';
  r1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  r1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B9FD4' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Fila 2: Período / usuario / fecha ──────────────────────────────────────
  const periodLabel = filters.startDate && filters.endDate
    ? `${fmtDate(filters.startDate)} – ${fmtDate(filters.endDate)}`
    : 'Todas las fechas';
  ws.getRow(2).height = 18;
  ws.mergeCells('A2:K2');
  const r2 = ws.getCell('A2');
  r2.value     = `Período: ${periodLabel}   |   Usuario: ${userName}   |   Generado: ${fmtDateTime(new Date())}`;
  r2.font      = { size: 9, color: { argb: 'FF4A5462' } };
  r2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Fila 3: Resumen ────────────────────────────────────────────────────────
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProg    = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const pending   = tasks.filter(t => t.status === 'PENDING').length;
  ws.getRow(3).height = 20;
  ws.mergeCells('A3:K3');
  const r3 = ws.getCell('A3');
  r3.value     = `Total: ${tasks.length}  |  Completadas: ${completed}  |  En progreso: ${inProg}  |  Pendientes: ${pending}`;
  r3.font      = { bold: true, size: 10, color: { argb: 'FF2D3540' } };
  r3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Fila 4: Encabezados de columnas ───────────────────────────────────────
  const hRow = ws.addRow(['#', 'Título', 'Descripción', 'Estado', 'Prioridad', 'Creador', 'Asignado a', 'Checklist', 'Vence', 'Completada', 'Creada']);
  hRow.height    = 22;
  hRow.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
  hRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3540' } };
  hRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  hRow.eachCell(cell => { cell.border = { bottom: { style: 'medium', color: { argb: 'FF1A2029' } } }; });

  // ── Datos ──────────────────────────────────────────────────────────────────
  let altIdx = 0;
  groups.forEach(group => {
    const argb = `FF${group.color.replace('#', '').toUpperCase()}`;

    // Cabecera de categoría
    const cRow = ws.addRow([`■  ${group.name.toUpperCase()}`, '', '', '', '', '', '', '', '', '', `${group.tasks.length} tarea${group.tasks.length !== 1 ? 's' : ''}`]);
    ws.mergeCells(`A${cRow.number}:J${cRow.number}`);
    cRow.height = 20;
    cRow.font   = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; });
    cRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

    group.tasks.forEach((task, idx) => {
      altIdx++;
      const total     = task.checklistItems?.length || 0;
      const done      = task.checklistItems?.filter(i => i.isCompleted).length || 0;
      const checklist = total > 0 ? `${done}/${total}` : '-';

      const dRow = ws.addRow([
        idx + 1,
        task.title,
        task.description || '-',
        STATUS_LABELS[task.status]     || task.status,
        PRIORITY_LABELS[task.priority] || task.priority,
        task.user?.name     || '-',
        task.assignee?.name || '-',
        checklist,
        fmtDate(task.dueDate),
        fmtDate(task.completedAt),
        fmtDate(task.createdAt)
      ]);

      dRow.height    = 16;
      dRow.font      = { size: 9 };
      dRow.alignment = { vertical: 'top', wrapText: true };

      const bg = altIdx % 2 === 0 ? 'FFFAFBFC' : 'FFFFFFFF';
      dRow.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDCE3EA' } } };
      });

      // Color estado
      const sColor = task.status === 'COMPLETED' ? 'FF22C55E' : task.status === 'IN_PROGRESS' ? 'FF0EA5E9' : 'FFF59E0B';
      dRow.getCell(4).font = { size: 9, color: { argb: sColor }, bold: task.status === 'COMPLETED' };

      // Color prioridad
      if      (task.priority === 'HIGH') dRow.getCell(5).font = { size: 9, color: { argb: 'FFEF4444' }, bold: true };
      else if (task.priority === 'LOW')  dRow.getCell(5).font = { size: 9, color: { argb: 'FF6B7685' } };
    });

    ws.addRow([]); // separador entre grupos
  });

  return wb.xlsx.writeBuffer();
};

// ─────────────────────────────────────────────────────────────────────────────
//  PDF
// ─────────────────────────────────────────────────────────────────────────────

exports.generatePdf = async (userId, filters = {}, userName = '') => {
  const tasks  = await getFilteredTasks(userId, filters);
  const groups = groupByCategory(tasks);

  const periodLabel = filters.startDate && filters.endDate
    ? `${fmtDate(filters.startDate)} al ${fmtDate(filters.endDate)}`
    : 'Todas las fechas';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50;        // margen izquierdo
    const R = 545;       // margen derecho (595 - 50)
    const W = R - L;     // ancho de contenido

    const drawLine = (y = doc.y, color = '#DCE3EA', lw = 0.5) => {
      doc.strokeColor(color).lineWidth(lw).moveTo(L, y).lineTo(R, y).stroke();
    };

    const ensureSpace = (needed = 80) => {
      if (doc.y + needed > 770) doc.addPage();
    };

    // ── HEADER ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 88).fill('#6B9FD4');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22)
       .text('TASKER', L, 18, { align: 'center', width: W });
    doc.font('Helvetica').fontSize(11)
       .text('REPORTE DE TAREAS', L, 44, { align: 'center', width: W });
    doc.fontSize(9)
       .text(`Período: ${periodLabel}`, L, 64, { align: 'center', width: W });
    doc.y = 100;

    // ── META ─────────────────────────────────────────────────────────────────
    doc.fillColor('#4A5462').font('Helvetica').fontSize(9)
       .text(`Usuario: ${userName}`, L, doc.y);
    doc.text(`Generado: ${fmtDateTime(new Date())}`, L, doc.y - 11, { align: 'right', width: W });
    doc.moveDown(0.6);
    drawLine();
    doc.moveDown(0.6);

    // ── RESUMEN ──────────────────────────────────────────────────────────────
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProg    = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pending   = tasks.filter(t => t.status === 'PENDING').length;
    const sumY = doc.y;
    doc.roundedRect(L, sumY, W, 38, 4).fill('#F0F4F8');
    doc.fillColor('#2D3540').font('Helvetica-Bold').fontSize(9)
       .text('RESUMEN', L + 10, sumY + 7);
    doc.fillColor('#4A5462').font('Helvetica').fontSize(9)
       .text(
         `Total: ${tasks.length}  •  Completadas: ${completed}  •  En progreso: ${inProg}  •  Pendientes: ${pending}`,
         L + 10, sumY + 20, { width: W - 20 }
       );
    doc.y = sumY + 50;

    // ── GRUPOS POR CATEGORÍA ─────────────────────────────────────────────────
    groups.forEach(group => {
      ensureSpace(60);
      doc.moveDown(0.5);

      // Barra de categoría
      const catY = doc.y;
      doc.rect(L, catY, W, 24).fill(group.color);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10)
         .text(`  ${group.name.toUpperCase()}`, L + 8, catY + 7, { width: W - 100 });
      const countStr = `${group.tasks.length} tarea${group.tasks.length !== 1 ? 's' : ''}`;
      doc.font('Helvetica').fontSize(9)
         .text(countStr, R - 72, catY + 9, { width: 70, align: 'right' });
      doc.y = catY + 30;
      drawLine(doc.y, group.color, 0.5);
      doc.moveDown(0.5);

      // ── Tareas ──────────────────────────────────────────────────────────
      group.tasks.forEach((task, idx) => {
        const total     = task.checklistItems?.length || 0;
        const done      = task.checklistItems?.filter(i => i.isCompleted).length || 0;
        const descLines = task.description ? Math.ceil(task.description.length / 88) : 0;
        ensureSpace(44 + descLines * 11);

        const taskY = doc.y;

        // Círculo numerador
        doc.circle(L + 6, taskY + 5, 5.5).fill(group.color);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7)
           .text(String(idx + 1), L + 2, taskY + 2, { width: 9, align: 'center' });

        // Título
        const statusColor = task.status === 'COMPLETED' ? '#22C55E'
          : task.status === 'IN_PROGRESS' ? '#0EA5E9' : '#F59E0B';
        doc.fillColor('#2D3540').font('Helvetica-Bold').fontSize(10)
           .text(task.title, L + 16, taskY, { width: W - 90 });

        // Badge estado (derecha)
        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8)
           .text(`[${STATUS_LABELS[task.status]}]`, R - 80, taskY, { width: 80, align: 'right' });

        doc.moveDown(0.15);

        // Descripción
        if (task.description) {
          doc.fillColor('#4A5462').font('Helvetica').fontSize(9)
             .text(task.description, L + 16, doc.y, { width: W - 20 });
          doc.moveDown(0.2);
        }

            // Barra azul: Creador
        const creator  = task.user?.name     || '-';
        const assignee = task.assignee?.name;
        const barY = doc.y;
        doc.rect(L + 14, barY, W - 14, 15).fill('#EFF6FF');
        doc.fillColor('#1D4ED8').font('Helvetica-Bold').fontSize(9)
           .text(`✎  Creador: ${creator}`, L + 19, barY + 3, { width: W - 26 });
        doc.y = barY + 18;

        // Barra verde: Asignado (solo si existe y es distinto)
        if (assignee && assignee !== creator) {
          const aBarY = doc.y;
          doc.rect(L + 14, aBarY, W - 14, 15).fill('#F0FDF4');
          doc.fillColor('#15803D').font('Helvetica-Bold').fontSize(9)
             .text(`→  Asignado a: ${assignee}`, L + 19, aBarY + 3, { width: W - 26 });
          doc.y = aBarY + 18;
        }
        doc.moveDown(0.2);

        // Línea de detalles: prioridad, checklist
        let d1 = `Prioridad: ${PRIORITY_LABELS[task.priority]}`;
        if (total > 0) d1 += `   Checklist: ${done}/${total} ítems`;

        doc.fillColor('#6B7685').font('Helvetica').fontSize(8)
           .text(d1, L + 16, doc.y, { width: W - 20 });
        doc.moveDown(0.15);

        // Fechas
        let d2 = `Creada: ${fmtDate(task.createdAt)}`;
        if (task.dueDate)     d2 += `   Vence: ${fmtDate(task.dueDate)}`;
        if (task.completedAt) d2 += `   ✓ Completada: ${fmtDate(task.completedAt)}`;

        doc.fillColor(task.completedAt ? '#22C55E' : '#6B7685').font('Helvetica').fontSize(8)
           .text(d2, L + 16, doc.y, { width: W - 20 });

        doc.moveDown(0.6);
        drawLine(doc.y, '#EBEBEB', 0.5);
        doc.moveDown(0.4);
      });
    });

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#8994A2').font('Helvetica').fontSize(8)
         .text(`Tasker  •  Página ${i - pages.start + 1} de ${pages.count}`, L, 780, { align: 'center', width: W });
    }

    doc.end();
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  REPORTE JSON (para preview HTML en el frontend)
// ─────────────────────────────────────────────────────────────────────────────

exports.getReportData = async (userId, filters = {}, userName = '') => {
  const tasks  = await getFilteredTasks(userId, filters);
  const groups = groupByCategory(tasks);

  return {
    period:   { startDate: filters.startDate || null, endDate: filters.endDate || null },
    userName,
    summary: {
      total:      tasks.length,
      completed:  tasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      pending:    tasks.filter(t => t.status === 'PENDING').length
    },
    groups: groups.map(g => ({
      name:  g.name,
      color: g.color,
      tasks: g.tasks.map(t => ({
        id:             t.id,
        title:          t.title,
        description:    t.description || null,
        status:         t.status,
        priority:       t.priority,
        creator:        t.user?.name     || null,
        assignee:       t.assignee?.name || null,
        checklistTotal: t.checklistItems?.length || 0,
        checklistDone:  t.checklistItems?.filter(i => i.isCompleted).length || 0,
        dueDate:        t.dueDate        || null,
        completedAt:    t.completedAt    || null,
        createdAt:      t.createdAt
      }))
    }))
  };
};
