const express = require('express');
const administratorController = require('../../controllers/backend/administratorController');
const authenticateToken = require('../../middleware/backend/authenticateToken');
const router = express.Router();

router.get('/get-all-adminuser', authenticateToken, administratorController.getAllUsers);
router.get('/get-dashboard',authenticateToken,administratorController.getdashboard);
router.get('/get-all-adminlist',authenticateToken,administratorController.getAdminlist);
router.post('/add-New-admin',authenticateToken,administratorController.addAdmin);
router.put('/user-status/:id', authenticateToken, administratorController.updateUser);
router.post('/reset-password/:token', administratorController.resetPassword);
router.delete('/delete-admin-user', authenticateToken, administratorController.deleteAdminAccount);
router.get('/get-admin-byid/:id',authenticateToken,administratorController.getAdminById);
router.put('/update-User-Admin/:id', authenticateToken, administratorController.updateUserAdmin);
router.post('/verify-account', administratorController.verifyAccount);
router.post('/send-email-brodcaste',authenticateToken,administratorController.sendEmailBroadcaste);
router.get('/get-invoice-detaile/:id', authenticateToken, administratorController.getInvoiceDetails);
router.get('/get-invoice-print/:id', authenticateToken, administratorController.getInvoiceDetailsprint);
router.get('/get-current-subscription-detailes/:id', authenticateToken, administratorController.getCurrentSubscriptionDetails);


module.exports = router;
