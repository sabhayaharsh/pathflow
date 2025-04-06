const express = require('express');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const DecisionPillarController = require('../../controllers/frontend/decisionPillarController');

const router = express.Router();

router.get('/dashboard', authenticateToken, DecisionPillarController.getDashboard);
router.post('/get-recent-opportunities', authenticateToken, DecisionPillarController.getRecentOpportunities);
router.post('/get-recent-opportunity-tasks', authenticateToken, DecisionPillarController.getRecentOpportunityTasks);
router.post('/get-recent-opportunity-assessments', authenticateToken, DecisionPillarController.getRecentOpportunityAssessments);
router.post('/createOpportunity', authenticateToken, DecisionPillarController.createOppertunity);
router.get('/get-opportunity/:id', authenticateToken, DecisionPillarController.getOpportunityIDWise);
router.get('/get-opportunity-pdf/:id', authenticateToken, DecisionPillarController.getOpportunityPdfPrint);
router.put('/update-opportunity/:id', authenticateToken, DecisionPillarController.updateOppertunity);
router.delete('/delete-opportunity/:id', authenticateToken, DecisionPillarController.deleteOpportunity);
router.post('/opportunity', authenticateToken, DecisionPillarController.getAllOppertunity);
router.post('/task', authenticateToken, DecisionPillarController.getAllTasks);
router.post('/assessment', authenticateToken, DecisionPillarController.getAllAssessments);
router.get('/task/autocomplete', authenticateToken, DecisionPillarController.getAutocompleteTasks);
router.get('/assessment/autocomplete', authenticateToken, DecisionPillarController.getAutocompleteAssessments);

module.exports = router;
