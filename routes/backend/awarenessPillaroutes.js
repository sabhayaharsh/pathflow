const express = require('express');
const awarenessPillarController = require('../../controllers/backend/awarenessPillarController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const router = express.Router();

router.get('/get-observation-details/:id', authenticateToken, awarenessPillarController.getObservationIDWise);
router.get('/get-created-observation-details', authenticateToken, awarenessPillarController.getCreatedObservationDetails);
router.get('/get-all-observation-tasks', authenticateToken, awarenessPillarController.getObservationAllTasks);

module.exports = router;
