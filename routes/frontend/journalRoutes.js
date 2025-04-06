const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const journalFileUpload = require('../../helpers/journalFileHelper');
const journalController = require('../../controllers/frontend/journalControllar');


router.post('/createJournal', authenticateToken, journalController.createJournal);
router.post('/create-journal-library-file', authenticateToken, journalFileUpload, (req, res, next) => {
    journalController.createJournalLibraryFile(req, res, next);
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

router.post('/journalFile', authenticateToken, journalFileUpload, (req, res, next) => {
    journalController.journalFile(req, res, next);
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

router.get('/get-journal/:id', authenticateToken, journalController.getJournalUserWise);
router.post('/get-all-journal-images', authenticateToken, journalController.getAllJournalImages);
router.post('/get-journal-images', authenticateToken, journalController.getAllJournalImagesList);
router.post('/get-all-journals', authenticateToken, journalController.getAllJournals);
router.put('/delete-journal/:id', authenticateToken, journalController.deleteJournal);
router.delete('/delete-jrnl-library-images', authenticateToken, journalController.deleteJrnlLibraryImage);
router.put('/update-journal/:id', authenticateToken, journalController.updateJournalUserWise);
router.post('/create-experience/:id', authenticateToken, journalController.createExperience);
router.post('/get-journals-calenderView', authenticateToken, journalController.getJournalsCalanderView);
router.post('/create-journal-calendar-view', authenticateToken, journalController.createJournalCalenderView);
router.get('/get-data-from-global', authenticateToken, journalController.getdatafromglobalsearch);
router.get('/get-data-from-global-byid', authenticateToken, journalController.getdatafromglobalsearchByid);


module.exports = router;
