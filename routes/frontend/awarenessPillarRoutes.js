const express = require('express');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const awarenessPillarController = require('../../controllers/frontend/awarenessPillarController');

const router = express.Router();

router.get('/dashboard', authenticateToken, awarenessPillarController.getDashboard);
router.post('/get-recent-observations', authenticateToken, awarenessPillarController.getRecentObservations);
router.post('/get-recent-observation-tasks', authenticateToken, awarenessPillarController.getRecentObservationTasks);
router.post('/get-recent-observation-assessments', authenticateToken, awarenessPillarController.getRecentObservationAssessments);
router.post('/createObservation', authenticateToken, awarenessPillarController.createObservation);
router.get('/get-observation/:id', authenticateToken, awarenessPillarController.getObservationIDWise);
router.get('/get-observation-pdf/:id', authenticateToken, awarenessPillarController.getObservationPdfPrint);
router.put('/update-observation/:id', authenticateToken, awarenessPillarController.updateobservation);
router.delete('/delete-observation/:id', authenticateToken, awarenessPillarController.deleteObservation);
router.post('/observation', authenticateToken, awarenessPillarController.getAllObservation);
router.post('/task', authenticateToken, awarenessPillarController.getAllTasks);
router.post('/assessment', authenticateToken, awarenessPillarController.getAllAssessments);
router.get('/task/autocomplete', authenticateToken, awarenessPillarController.getAutocompleteTasks);
router.get('/assessment/autocomplete', authenticateToken, awarenessPillarController.getAutocompleteAssessments);

module.exports = router;
