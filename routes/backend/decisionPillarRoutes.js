const express = require('express');
const decisionPillarController = require('../../controllers/backend/decisionPillarController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const router = express.Router();

router.get('/get-opportunity-details/:id', authenticateToken, decisionPillarController.getOpportunityIDWise);
router.get('/get-created-opportunity-details', authenticateToken, decisionPillarController.getCreatedOpportunityDetails);
router.get('/get-all-opportunity-tasks', authenticateToken, decisionPillarController.getOpportunityAllTasks);

module.exports = router;
