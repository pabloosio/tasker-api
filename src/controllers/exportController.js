const exportService = require('../services/exportService');

/**
 * Exportar tareas a Excel
 * GET /api/v1/export/excel
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.generateExcel(req.user.id);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tareas.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Exportar tareas a PDF
 * GET /api/v1/export/pdf
 */
exports.exportPdf = async (req, res, next) => {
  try {
    const buffer = await exportService.generatePdf(req.user.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tareas.pdf');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
