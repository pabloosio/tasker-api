const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

router.use(auth);

// GET /api/v1/notifications  → { items, unreadCount }
router.get('/', notificationController.list);

// GET /api/v1/notifications/unread-count
router.get('/unread-count', notificationController.unreadCount);

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', notificationController.markAllRead);

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
