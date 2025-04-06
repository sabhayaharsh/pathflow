const express = require('express');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const dashboardController = require('../../controllers/backend/dashboardController');
const router = express.Router();

router.get('/admin-dashboard', authenticateToken, dashboardController.getAdminDashboard);

module.exports = router;
