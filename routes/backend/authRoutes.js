const express = require('express');
const authController = require('../../controllers/backend/authController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const uploadToS3 = require('../../helpers/uploadHelper');
const multer = require('multer');
const validMimeTypes = ['image/jpg', 'image/jpeg', 'image/png',
'image/heic',
'application/octet-stream',
];
const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify/:token', authController.verifyUser);
router.post('/sent-invitation-link', authenticateToken, authController.sentInvitationLink); 
router.post('/resend-verification-email', authController.resendVerificationEmail);
router.post('/change-password',authenticateToken, authController.changePassword);
router.post('/change-password-profile',authenticateToken, authController.changePasswordprofile);
router.get('/get-user-detail', authenticateToken, authController.getUserDetails);
router.put('/update-profile', authenticateToken, ...uploadToS3({
    validMimeTypes,
    fieldNames: ['image']
}), (req, res, next) => {
    authController.updateAdminProfile(req, res, next);
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
module.exports = router;
