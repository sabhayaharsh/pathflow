const express = require('express');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const lifeBookDashboardController = require('../../controllers/frontend/lifeBookDashboardController');

const router = express.Router();

router.get('/dashboard', authenticateToken, lifeBookDashboardController.getLifeBookDashboard);
router.get('/search', authenticateToken, lifeBookDashboardController.getGlobalData);

router.get('/searchbyid',authenticateToken,lifeBookDashboardController.getGlobalDataById);

module.exports = router;
