const exportService = require('../services/exportService');
const { successResponse } = require('../utils/response');

/**
 * GET /api/v1/export/excel
 * Query params: startDate, endDate, workspaceId, categoryIds (CSV)
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, workspaceId, categoryIds } = req.query;
    const filters = {
      startDate,
      endDate,
      workspaceId,
      categoryIds: categoryIds ? categoryIds.split(',').filter(Boolean) : []
    };

    const buffer   = await exportService.generateExcel(req.user.id, filters, req.user.name);
    const fileName = startDate && endDate
      ? `reporte_${startDate}_${endDate}.xlsx`
      : 'reporte_tareas.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/export/report
 * Devuelve los datos del reporte como JSON para el preview HTML
 */
exports.getReport = async (req, res, next) => {
  try {
    const { startDate, endDate, workspaceId, categoryIds } = req.query;
    const filters = {
      startDate,
      endDate,
      workspaceId,
      categoryIds: categoryIds ? categoryIds.split(',').filter(Boolean) : []
    };
    const data = await exportService.getReportData(req.user.id, filters, req.user.name);
    return successResponse(res, data, 'Reporte generado');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/export/pdf
 * Query params: startDate, endDate, workspaceId, categoryIds (CSV)
 */
exports.exportPdf = async (req, res, next) => {
  try {
    const { startDate, endDate, workspaceId, categoryIds } = req.query;
    const filters = {
      startDate,
      endDate,
      workspaceId,
      categoryIds: categoryIds ? categoryIds.split(',').filter(Boolean) : []
    };

    const buffer   = await exportService.generatePdf(req.user.id, filters, req.user.name);
    const fileName = startDate && endDate
      ? `reporte_${startDate}_${endDate}.pdf`
      : 'reporte_tareas.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
