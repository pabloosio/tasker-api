const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Task, Category } = require('../models');

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada'
};

const PRIORITY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta'
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Obtener tareas del usuario con categoría
 */
const getUserTasks = async (userId) => {
  return await Task.findAll({
    where: { userId },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['name']
    }],
    order: [
      ['status', 'ASC'],
      ['priority', 'DESC'],
      ['createdAt', 'DESC']
    ]
  });
};

/**
 * Generar archivo Excel
 */
exports.generateExcel = async (userId) => {
  const tasks = await getUserTasks(userId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tasker';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Tareas', {
    headerFooter: {
      firstHeader: 'Tasker - Mis Tareas'
    }
  });

  // Definir columnas
  worksheet.columns = [
    { header: 'Título', key: 'title', width: 35 },
    { header: 'Descripción', key: 'description', width: 45 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Prioridad', key: 'priority', width: 12 },
    { header: 'Categoría', key: 'category', width: 18 },
    { header: 'Fecha Vencimiento', key: 'dueDate', width: 18 },
    { header: 'Completada', key: 'completedAt', width: 18 },
    { header: 'Creada', key: 'createdAt', width: 18 }
  ];

  // Estilo del header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B9FD4' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 25;

  // Agregar datos
  tasks.forEach((task, index) => {
    const row = worksheet.addRow({
      title: task.title,
      description: task.description || '-',
      status: STATUS_LABELS[task.status] || task.status,
      priority: PRIORITY_LABELS[task.priority] || task.priority,
      category: task.category?.name || 'Sin categoría',
      dueDate: formatDate(task.dueDate),
      completedAt: formatDate(task.completedAt),
      createdAt: formatDate(task.createdAt)
    });

    // Alternar colores de filas
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F8FB' }
      };
    }

    // Color según estado
    const statusCell = row.getCell('status');
    if (task.status === 'COMPLETED') {
      statusCell.font = { color: { argb: 'FF22C55E' } };
    } else if (task.status === 'IN_PROGRESS') {
      statusCell.font = { color: { argb: 'FF0EA5E9' } };
    } else {
      statusCell.font = { color: { argb: 'FFF59E0B' } };
    }

    // Color según prioridad
    const priorityCell = row.getCell('priority');
    if (task.priority === 'HIGH') {
      priorityCell.font = { color: { argb: 'FFEF4444' }, bold: true };
    } else if (task.priority === 'MEDIUM') {
      priorityCell.font = { color: { argb: 'FFF59E0B' } };
    }
  });

  // Bordes
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDCE3EA' } },
        left: { style: 'thin', color: { argb: 'FFDCE3EA' } },
        bottom: { style: 'thin', color: { argb: 'FFDCE3EA' } },
        right: { style: 'thin', color: { argb: 'FFDCE3EA' } }
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Generar archivo PDF
 */
exports.generatePdf = async (userId) => {
  const tasks = await getUserTasks(userId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Tasker - Mis Tareas',
        Author: 'Tasker App'
      }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#6B9FD4').text('Tasker', { align: 'center' });
    doc.fontSize(12).fillColor('#6B7685').text('Reporte de Tareas', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generado: ${formatDate(new Date())}`, { align: 'center' });
    doc.moveDown(1.5);

    // Línea separadora
    doc.strokeColor('#DCE3EA').lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(1);

    // Resumen
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;

    doc.fontSize(11).fillColor('#2D3540').text('Resumen:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#4A5462');
    doc.text(`Total de tareas: ${tasks.length}`);
    doc.text(`Pendientes: ${pending}  |  En Progreso: ${inProgress}  |  Completadas: ${completed}`);
    doc.moveDown(1.5);

    // Agrupar por estado
    const groups = [
      { status: 'PENDING', label: 'Pendientes', color: '#F59E0B' },
      { status: 'IN_PROGRESS', label: 'En Progreso', color: '#0EA5E9' },
      { status: 'COMPLETED', label: 'Completadas', color: '#22C55E' }
    ];

    groups.forEach(group => {
      const groupTasks = tasks.filter(t => t.status === group.status);
      if (groupTasks.length === 0) return;

      // Título del grupo
      doc.fontSize(13).fillColor(group.color).text(group.label, { underline: true });
      doc.moveDown(0.5);

      groupTasks.forEach((task, i) => {
        // Verificar si necesita nueva página
        if (doc.y > 700) {
          doc.addPage();
        }

        // Tarea
        doc.fontSize(11).fillColor('#2D3540').text(`${i + 1}. ${task.title}`, {
          continued: false
        });

        // Detalles
        doc.fontSize(9).fillColor('#6B7685');

        const priority = PRIORITY_LABELS[task.priority] || task.priority;
        const category = task.category?.name || 'Sin categoría';
        doc.text(`   Prioridad: ${priority}  |  Categoría: ${category}`);

        if (task.description) {
          const desc = task.description.length > 100
            ? task.description.substring(0, 100) + '...'
            : task.description;
          doc.text(`   ${desc}`);
        }

        if (task.dueDate) {
          doc.text(`   Vence: ${formatDate(task.dueDate)}`);
        }

        if (task.completedAt) {
          doc.fillColor('#22C55E').text(`   Completada: ${formatDate(task.completedAt)}`);
        }

        doc.moveDown(0.7);
      });

      doc.moveDown(0.5);
    });

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#8994A2')
        .text(`Página ${i + 1} de ${pages.count}`, 50, 780, { align: 'center' });
    }

    doc.end();
  });
};
