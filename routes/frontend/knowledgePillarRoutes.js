const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const handleFileUpload = require('../../helpers/uploadToS3'); // Update with the actual path
const KnowledgePillarController = require('../../controllers/frontend/KnowledgePillarController');


router.get('/dashboard', authenticateToken, KnowledgePillarController.getDashboard);
router.post('/get-recent-experience', authenticateToken, KnowledgePillarController.getRecentExperiences);
router.post('/get-recent-active-tasks', authenticateToken, KnowledgePillarController.getRecentActiveTasks);
router.post('/get-recent-assessments', authenticateToken, KnowledgePillarController.getRecentAssessments);


router.post('/experience', authenticateToken, KnowledgePillarController.getAllExperience);
router.post('/createExperience', authenticateToken, KnowledgePillarController.createExperience);
router.post('/experienceFile', authenticateToken, handleFileUpload, (req, res, next) => {
    KnowledgePillarController.experienceFile(req, res, next);
}, (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(500).json({ success: false, message: "Something went wrong!", data: { error: { details: error.message } } });
    } else if (error.code == 'ENOTFOUND') {
        return res.status(500).json({ success: false, message: "Something went wrong!", data: { error: { details: 'Something went wrong!' } } });
    } else if (error) {
        return res.status(500).json({ success: false, message: "Something went wrong!", data: { error: { details: error.message } } });
    }
    next();
});

router.post('/task', authenticateToken, KnowledgePillarController.getAllTasks);
router.post('/assessment', authenticateToken, KnowledgePillarController.getAllAssessments);
router.get('/get-experience/:id', authenticateToken, KnowledgePillarController.getExperienceUserWise);
router.get('/get-experience-pdf/:id', authenticateToken, KnowledgePillarController.getExperienceUserWisePDF);
router.put('/update-experience/:id', authenticateToken, KnowledgePillarController.updateExperienceUserWise);
router.put('/task-status/:id', authenticateToken, KnowledgePillarController.updateTaskStatus);
router.delete('/delete-experience/:id', authenticateToken, KnowledgePillarController.deleteExperience);
router.delete('/delete-task/:id', authenticateToken, KnowledgePillarController.deleteTask);
router.get('/task/autocomplete', authenticateToken, KnowledgePillarController.getAutocompleteTasks);
router.get('/assessment/autocomplete', authenticateToken, KnowledgePillarController.getAutocompleteAssessments);

module.exports = router;
