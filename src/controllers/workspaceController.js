const workspaceService = require('../services/workspaceService');
const { successResponse } = require('../utils/response');

exports.getUserWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user.id);
    return successResponse(res, workspaces, 'Workspaces obtenidos exitosamente');
  } catch (error) { next(error); }
};

exports.getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.user.id, req.params.id);
    return successResponse(res, workspace, 'Workspace obtenido exitosamente');
  } catch (error) { next(error); }
};

exports.createWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.createWorkspace(req.user.id, req.body);
    return successResponse(res, workspace, 'Workspace creado exitosamente', 201);
  } catch (error) { next(error); }
};

exports.updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.updateWorkspace(req.user.id, req.params.id, req.body);
    return successResponse(res, workspace, 'Workspace actualizado exitosamente');
  } catch (error) { next(error); }
};

exports.deleteWorkspace = async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.user.id, req.params.id);
    return successResponse(res, null, 'Workspace eliminado exitosamente');
  } catch (error) { next(error); }
};

exports.getWorkspaceMembers = async (req, res, next) => {
  try {
    const members = await workspaceService.getWorkspaceMembers(req.user.id, req.params.id);
    return successResponse(res, members, 'Miembros obtenidos exitosamente');
  } catch (error) { next(error); }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const member = await workspaceService.inviteMember(
      req.user.id,
      req.params.id,
      { userId: req.body.userId, email: req.body.email },
      req.body.role
    );
    return successResponse(res, member, 'Miembro invitado exitosamente', 201);
  } catch (error) { next(error); }
};

exports.removeMember = async (req, res, next) => {
  try {
    await workspaceService.removeMember(req.user.id, req.params.id, req.params.memberId);
    return successResponse(res, null, 'Miembro removido exitosamente');
  } catch (error) { next(error); }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const member = await workspaceService.updateMemberRole(
      req.user.id,
      req.params.id,
      req.params.memberId,
      req.body.role
    );
    return successResponse(res, member, 'Rol actualizado exitosamente');
  } catch (error) { next(error); }
};
