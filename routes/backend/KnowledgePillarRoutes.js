const express = require('express');
const KnowledgePillarController = require('../../controllers/backend/knowledgePillarController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const router = express.Router();

router.get('/get-experience-details/:id', authenticateToken, KnowledgePillarController.getExperienceDetails);
router.get('/get-created-experience-details', authenticateToken, KnowledgePillarController.getCreatedExperienceDetails);
router.get('/get-all-experience-tasks', authenticateToken, KnowledgePillarController.getExperienceAllTasks);

module.exports = router;
