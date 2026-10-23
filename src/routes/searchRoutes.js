const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const auth = require('../middlewares/auth');

router.use(auth);

// GET /api/v1/search?q=texto
router.get('/', searchController.search);

module.exports = router;
