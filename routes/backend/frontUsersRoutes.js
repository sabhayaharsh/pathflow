const express = require('express');
const frontController = require('../../controllers/backend/frontUsersController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const router = express.Router();

router.get('/get-all-users', authenticateToken, frontController.getAllUsers);
router.get('/get-user-details/:id', authenticateToken, frontController.getDetails);
router.put('/user-status/:id', authenticateToken, frontController.updateUser);
router.get('/get-user-all-experience/:id', authenticateToken, frontController.getAllExperienceById);
router.get('/get-user-all-opportunity/:id', authenticateToken, frontController.getAllOppertunityById);
router.get('/get-user-all-observation/:id', authenticateToken, frontController.getAllObservationById);
router.get('/get-user-all-tasks/:id', authenticateToken, frontController.getAllTasksById);
router.post('/send-email-brodcaste',authenticateToken,frontController.sendEmailBroadcaste);
router.put('/change-user-password',authenticateToken, frontController.ChangeUserPassword);
module.exports = router;
