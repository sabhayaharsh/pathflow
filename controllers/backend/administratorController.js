const ResponseHelper = require('../../helpers/responseHelper');
const administratorModel = require('../../models/backend/administratorModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { invoiceexportpdf } = require('../../public/invoiceexport/invoiceexport'); 

class AdministratorController {

    getAllUsers = async (req, res) => {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const users = await administratorModel.getAllUsers(page, size, parsedFilters, globalFilter, parsedSortings);
            return ResponseHelper.respond(200, true, {
                users
            }, 'Admin users get successfully.', res);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // async getdashboard(req,res){    
    //     const { id } = req.params;
    //     try {

    //     } catch (error) {
    //         console.error(error);
    //         return res.status(500).json({ success: false, error: 'Internal Server Error' });
    //     }
    // }

    async getdashboard(req, res) {
        try {
            const dashboarddata = await administratorModel.GetDashboardData();
            return ResponseHelper.respond(200, true, dashboarddata, 'Dashboard data retrieved successfully.', res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
    async getAdminlist(req, res) {
        try {

            const globalfilter = [req.query];
            const { page = 1, limit = 10 } = req.query;
            const { adminlist, totalRecords } = await administratorModel.GetAdminList(parseInt(page, 10), parseInt(limit, 10), globalfilter);
            const totalPages = Math.ceil(totalRecords / limit);
            const nextPage = page < totalPages ? parseInt(page, 10) + 1 : null;
            const prevPage = page > 1 ? parseInt(page, 10) - 1 : null;

            return ResponseHelper.respond(200, true, {
                adminlist,
                totalRecords,
                currentPage: parseInt(page, 10),
                totalPages,
                nextPage,
                prevPage
            }, 'Successfully retrieved admin list.', res);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
    async addAdmin(req, res) {
        try {

            const requestData = req.body;
            const validationErrors = {};
            if (!requestData.name.trim()) {
                validationErrors.name = 'Full name is required.';
            }
            if (!requestData.email.trim()) {
                validationErrors.email = 'Email is required.';
            }
            if (!requestData.phone_number.trim()) {
                validationErrors.phone_number = 'Phone number is required.';
            }
            const existingEmailUser = await administratorModel.getUserByEmail(requestData.email);
            if (existingEmailUser) {
                validationErrors.email = 'Email is already registered.';
            }

            // Check if phone number is already registered
            const existingPhoneNumberUser = await administratorModel.getUserByPhoneNumber(requestData.phoneNumber);
            if (existingPhoneNumberUser) {
                validationErrors.phoneNumber = 'Phone number is already registered.';
            }
            if (Object.keys(validationErrors).length > 0) {
                return ResponseHelper.respond(400, false, validationErrors, 'Validation errors', res);
            }

            const verificationToken = ResponseHelper.generateVerificationToken();

            // Verification Link
            const verificationLink = `${process.env.FRONTEND_URL}/v1/administrator/reset-password/${verificationToken}`;

            const replacements = {
                USERNAME: requestData.name,
                VERIFICATION_LINK: verificationLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };

            await ResponseHelper.sendEmail(requestData.email, 'Welcome to Pathmaker', 'PasswordSetup', replacements);

            const newadmin = {
                name: requestData.name,
                email: requestData.email,
                phone_number: requestData.phone_number,
                verification_token: verificationToken,
                token_expires: ResponseHelper.calculateTokenExpiration(),
            };
            const data = await administratorModel.addNewAdmin(newadmin);
            if (!data || (Array.isArray(data) && data.length === 0)) {
                return ResponseHelper.respond(400, false, data, 'admin creation failed.', res);
            } else {
                return ResponseHelper.respond(200, true, data, 'admin added successfully.', res);
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                details: error.toString()
            });
        }
    }
    async updateUser(req, res) {
        const { id } = req.params;
        const { status } = req.body;

        try {
            const updateStatusData = {
                id,
                status,
            };

            const updatedStatus = await administratorModel.updateStatus(updateStatusData);

            if (updatedStatus.success === false) {
                return ResponseHelper.respond(400, false, updatedStatus, 'Status updated failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedStatus, 'Status updated successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async resetPassword(req, res) {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        const validationErrors = {};

        // Validate input
        if (!password || !password.trim()) {
            validationErrors.password = 'The password field is required.';
        } else {
            // Password validation
            if (password.length < 8) {
                validationErrors.password_8 = 'Password must be at least 8 characters long.';
            }
            if (!/[A-Z]/.test(password)) {
                validationErrors.password_up = 'Password must contain at least one uppercase letter.';
            }
            if (!/[a-z]/.test(password)) {
                validationErrors.password_low = 'Password must contain at least one lowercase letter.';
            }
            if (!/\d/.test(password)) {
                validationErrors.password_dig = 'Password must contain at least one numeric digit.';
            }
            if (!/[^a-zA-Z\d]/.test(password)) {
                validationErrors.password_sc = 'Password must contain at least one special character.';
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                validationErrors.confirmPassword = 'Passwords do not match.';
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }
        try {
            const user = await administratorModel.getAdminByResetPasswordToken(token);

            if (!user) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired reset password token.' }, null, res);
            }

            // Check if the reset password token is expired
            if (new Date() > user.reset_token_expires) {
                return ResponseHelper.validateAndRespond({ token: 'Reset password token has expired. Please request a new one.' }, null, res);
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await administratorModel.setAdminPassword(hashedPassword, user.id);
            return ResponseHelper.respond(200, true, result, 'password change successfully.', res);
        } catch (error) {
            console.error('Error while changing password:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async deleteAdminAccount(req, res) {
        const { id } = req.body;
        try {
            const deleteUserID = {
                id
            };

            const deleteUserData = await administratorModel.deleteAdminUser(deleteUserID);

            if (deleteUserData.success === false) {
                return ResponseHelper.respond(400, false, deleteUserData, 'User deleted failed!', res);
            } else {
                return ResponseHelper.respond(200, true, deleteUserData, 'User deleted successfully', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }


    async updateUserAdmin(req, res) {
        const { id } = req.params;
        const { name } = req.body;
        const validationErrors = {};
        if (!name) {
            validationErrors.name = 'name is required.';
        }

        try {
            const updateStatusData = {
                id,
                name,
            };
            if (Object.keys(validationErrors).length > 0) {
                return ResponseHelper.respond(400, false, validationErrors, 'Validation errors', res);
            }
            const updatedStatus = await administratorModel.updateUserAdmin(updateStatusData);

            if (updatedStatus.success === false) {
                return ResponseHelper.respond(400, false, updatedStatus, 'User details updated failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedStatus, 'User details updated successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async getAdminById(req, res) {
        const { id } = req.params;
        try {
            const getadminbyid = await administratorModel.getAdminByid(id);
            if (getadminbyid.success === false) {
                return ResponseHelper.respond(400, false, null, getadminbyid.message || 'Get admin failed!', res);
            } else {
                return ResponseHelper.respond(200, true, getadminbyid.data, 'Get admin successfully.', res);
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    //verify admin account
    async verifyAccount(req, res) {
        try {
            const { token, password } = req.body;
            const validationErrors = {};

            if (!token || !token.trim()) {
                validationErrors.token = 'The password field is required.';
            }

            if (!password || !password.trim()) {
                validationErrors.password = 'The password field is required.';
            } else {
                if (password.length < 8) {
                    validationErrors.password_8 = 'Password must be at least 8 characters long.';
                }
                if (!/[A-Z]/.test(password)) {
                    validationErrors.password_up = 'Password must contain at least one uppercase letter.';
                }
                if (!/[a-z]/.test(password)) {
                    validationErrors.password_low = 'Password must contain at least one lowercase letter.';
                }
                if (!/\d/.test(password)) {
                    validationErrors.password_dig = 'Password must contain at least one numeric digit.';
                }
                if (!/[^a-zA-Z\d]/.test(password)) {
                    validationErrors.password_sc = 'Password must contain at least one special character.';
                }

            }

            // const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // const decryptedId = ResponseHelper.decrypt(decoded.id);

            const user = await administratorModel.getAdminByToken(token);
            // const user = await userModel.getUserByVerificationToken(token);
            //const useremail = await userModel.getUserByEmail(req.user.email);
            if (!user.success) {
                return ResponseHelper.respond(400, false, { error: { details: "Invalid or expired verification link." } }, null, res);
            }
            if (password === user.data.email) {
                validationErrors.password = 'Password cannot match email.';
            }
            if (Object.keys(validationErrors).length > 0) {
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }
            // const isVerified = user.data.email_verified_at !== null;
            // if (isVerified) {
            //     return ResponseHelper.respond(400, false, { error: { message: 'Your account has been already verified.' } }, null, res);
            // }

            const history = await administratorModel.getPasswordadminHistory(user.data.id);
            for (const record of history) {
                const isSamePassword = await bcrypt.compare(password, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const encryptedId = ResponseHelper.encrypt(user?.data?.id.toString());
            const newToken = jwt.sign({ id: encryptedId }, process.env.JWT_SECRET, { expiresIn: '30m' });

            await administratorModel.updateUserPassword(user?.data?.id, hashedPassword, newToken);
            await administratorModel.updateVerifyUsers(user?.data?.id);

            return ResponseHelper.respond(200, true, [], 'Password set successfully.', res);
        } catch (error) {
            console.log(error)
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async sendEmailBroadcaste(req, res) {
        const userId = req.params.id;
        const emaillist = req.body.users;
        const emailtitle = req.body.emailDetails.title;
        const messege = req.body.emailDetails.description;

        const validationErrors = {};

        // Validate email title
        if (!emailtitle || !emailtitle.trim()) {
            validationErrors.title = 'Email title is required.';
        }

        // Validate email list
        if (!emaillist || !Array.isArray(emaillist) || emaillist.length === 0) {
            validationErrors.email = 'Email list is required and cannot be empty.';
        }

        // Validate message
        if (!messege || !messege.trim()) {
            validationErrors.description = 'Message is required.';
        }

        // Check if there are any validation errors
        if (Object.keys(validationErrors).length > 0) {
            console.log("Validation Errors:", validationErrors);
            return ResponseHelper.respond(400, false, validationErrors, 'Validation failed.', res);
        }

        console.log("emaillist", emaillist);
        console.log("emailtitle", emailtitle);
        console.log("messege", messege);

        try {
            for (let i = 0; i < emaillist.length; i++) {
                console.log(`Name: ${emaillist[i].name}, Email: ${emaillist[i].email}`);
                const email = emaillist[i].email;
                const replacements = {
                    USERNAME: emaillist[i].name,
                    EMAILMESSEGE: messege,
                    COMPANY_NAME: process.env.APPNAME,
                    TITLE: emailtitle,
                    BASE_URL: process.env.BASE_URL
                };
                await ResponseHelper.sendEmail(email, emailtitle, 'Brodcastemail', replacements);
            }

            // Simulate email sending (Replace with actual email sending logic)
            // await ResponseHelper.sendEmail(requestData.email, 'Welcome to Pathmaker', 'PasswordSetup', replacements);

            return ResponseHelper.respond(200, true, {
                emaillist
            }, 'Successfully processed the email broadcast.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getInvoiceDetails(req, res) {

        try {
            const userId = req.params.id;
            const { start = 0, size = 10 } = req.query;  // Get 'start' and 'size' from the query parameters, with default values
            const { data, totalRowCount } = await administratorModel.getInvoiceDetails(userId, start, size);
            function formatDate(date) {
                const d = new Date(date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
                const year = String(d.getFullYear()).slice(2); // Get last two digits of the year
                return `${day}-${month}-${year}`;
            }
            // Flatten the response structure to match the desired format
            const responseData = {
                data: data.map(invoice => ({
                    id: invoice.PaymentTransactionID,
                    UserID: invoice.UserID,
                    SubscriptionID: invoice.SubscriptionID,
                    PaymentDate: formatDate(invoice.PaymentDate),
                    InvoiceDate: formatDate(invoice.InvoiceDate),
                    InvoiceNumber: invoice.InvoiceNumber,
                    TotalAmount: invoice.TotalAmount.toFixed(2),
                    AmountPaid: invoice.AmountPaid.toFixed(2),
                    Status: invoice.Status,
                    created_at: invoice.created_at,
                })),
                meta: {
                    totalRowCount: totalRowCount
                },
            };

            return ResponseHelper.respond(200, true, responseData, 'Successfully retrieved Invoice details', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getInvoiceDetailsprint(req,res){
        try {
            const userId = req.user.id;
            const PaymentTransactionID = req.params.id;
            const printdata = await administratorModel.getInvoiceDetailsPrint(userId,PaymentTransactionID);
            const invoiceurl = await invoiceexportpdf(printdata);
        return ResponseHelper.respond(200, true, invoiceurl, 'Successfully retrieved print Invoice details', res);
    } catch (error) {
        console.error(error);
        return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
    }
    }
    async getCurrentSubscriptionDetails(req, res) {
        const userId = req.params.id;
        try {
            const userSubscriptionData = await administratorModel.getCurrentSubscriptionDetails(userId);

            return ResponseHelper.respond(200, true, { user: userSubscriptionData }, 'User subscription details retrieved successfully.', res);
        } catch (error) {
            console.error('error',error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

}

module.exports = new AdministratorController();