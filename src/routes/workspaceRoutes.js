const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const activityController = require('../controllers/activityController');
const auth = require('../middlewares/auth');
const { validateWorkspace, validateInviteMember, validateUpdateMemberRole, validateWipLimits } = require('../validators/workspaceValidator');

router.use(auth);

// Workspace CRUD
router.get('/', workspaceController.getUserWorkspaces);
router.post('/', validateWorkspace, workspaceController.createWorkspace);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', validateWorkspace, workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);
router.patch('/:id/wip-limits', validateWipLimits, workspaceController.updateWipLimits);
router.get('/:id/activity', activityController.getWorkspaceActivity);

// Miembros
router.get('/:id/members', workspaceController.getWorkspaceMembers);
router.post('/:id/members', validateInviteMember, workspaceController.inviteMember);
router.put('/:id/members/:memberId/role', validateUpdateMemberRole, workspaceController.updateMemberRole);
router.delete('/:id/members/:memberId', workspaceController.removeMember);

module.exports = router;
