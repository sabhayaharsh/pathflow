const express = require('express');
const authController = require('../../controllers/frontend/authController');
const authenticateToken = require('../../middleware/frontend/authenticateToken');
const uploadToS3 = require('../../helpers/uploadHelper');
const multer = require('multer');
const router = express.Router();
const validMimeTypes = ['image/jpg', 'image/jpeg', 'image/png',
'image/heic',
'application/octet-stream',
];

router.post('/register', authController.register);
router.get('/verify/:token', authController.verifyUser);
router.post('/resend-verification-email', authController.resendVerificationEmail);
router.post('/login', authController.login);
router.post('/reset-password', authController.sendResetPasswordEmail);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/check-token/:token', authController.checktonvalied);
router.post('/change-password', authenticateToken, authController.changePassword);
router.get('/get-user-detail', authenticateToken, authController.getUserProfileDetails);
router.put('/update-user', authenticateToken, authController.updateUserDetails);
router.post('/check-life-books', authenticateToken, authController.checkLifeBookStatus);
router.post('/delete-account', authenticateToken, authController.deleteUserAccount);
router.put('/update-profile', authenticateToken, ...uploadToS3({
  validMimeTypes,
  fieldNames: ['image']
}), (req, res, next) => {
  authController.updateUserProfile(req, res, next);
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
router.post('/verify-phone-number', authenticateToken, authController.verifyPhoneNumber);
router.post('/send-sms', authenticateToken, authController.sendSMS);
router.post('/verify-otp-email', authController.verifyOtpEmail);
router.post('/resend-otp-email', authController.resentOTPSent);
router.put('/update-twofactorauth', authenticateToken, authController.updateTFA);
router.get('/get-all-experince', authenticateToken, authController.getallexperincetitle);
router.post('/checkCreditAuthorizecard', authenticateToken, authController.checkAuthorizecard);
router.get('/createCustomerProfile', authController.createCustomerProfile);
router.get('/getCustomerProfile', authController.getCustomerProfile);

router.post('/createProfileSubscription', authenticateToken, authController.createSubscriptionFromCustomerProfile);
router.post('/createSubscription', authenticateToken, authController.createSubscription);
router.post('/getTransactionDetails', authController.getTransactionDetails);
router.post('/get-subscription-details', authController.getSubscriptionDetails);
router.post('/get-subscription-plan-details', authenticateToken, authController.getSubPlanDetails);
router.get('/get-user-subscription-details', authenticateToken, authController.getUserSubscriptionPlanDetails);
router.post('/cancel-subscription', authenticateToken, authController.cancelSubscription);
router.get('/get-invoice-detaile', authenticateToken, authController.getInvoiceDetails);
router.get('/get-invoice-print/:id', authenticateToken, authController.getInvoiceDetailsprint);
router.get('/get-user-has-subscription', authenticateToken, authController.getUserHasSubscriptions);
router.get('/get-payment-profiles', authenticateToken, authController.getPaymentProfiles);
router.put('/update-auto-renew', authenticateToken, authController.updateAutoRenew);
router.post('/remove-sub-customer-info', authenticateToken, authController.removeSubCustomerInfo);
router.post('/cancel-subscriptions', authenticateToken, authController.cancelSubscriptions);
router.post('/subscription-log', authenticateToken, authController.checkSubscriptionLog);

router.get('/getPaymentProfileToken', authController.getAddPaymentProfileToken);


module.exports = router;
