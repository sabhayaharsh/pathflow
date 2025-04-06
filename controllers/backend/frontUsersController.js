const ResponseHelper = require('../../helpers/responseHelper');
const frontModel = require('../../models/backend/frontModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
class FrontController {

    getAllUsers = async (req, res) => {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const users = await frontModel.getClientUsers(page, size, parsedFilters, globalFilter, parsedSortings,);
            return ResponseHelper.respond(200, true, {
                users
            }, 'Client users get successfully.', res);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async getDetails(req, res) {
        try {
            const userId = req.params.id;

            const data = await frontModel.GetUserDetailsById(userId);

            if (!data || data.length === 0) {
                return ResponseHelper.respond(404, false, null, 'Data not found!', res);
            }

            const pillarEventDetails = await frontModel.fetchPillarEventCount(userId);
            const pillarTaskDetails = await frontModel.fetchPillarTaskCount(userId);
            const pillarAssessmentDetails = await frontModel.fetchPillarAssessmentCount(userId);

            const userDetails = {
                userDetails: [data],
                ...pillarEventDetails,
                ...pillarTaskDetails,
                ...pillarAssessmentDetails,
            };

            return ResponseHelper.respond(200, true, userDetails, 'Successfully retrieved user data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
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

            const updatedStatus = await frontModel.updateStatus(updateStatusData);

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

    async getAllExperienceById(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const userId = req.params.id;
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const experiences = await frontModel.fetchAllDataByID(page, size, parsedFilters, globalFilter, parsedSortings, userId, 1);

            return ResponseHelper.respond(200, true, {
                experiences
            }, 'Successfully retrieved experiences data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getAllOppertunityById(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const userId = req.params.id;
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const opportunities = await frontModel.fetchAllDataByID(page, size, parsedFilters, globalFilter, parsedSortings, userId, 2);

            return ResponseHelper.respond(200, true, {
                opportunities
            }, 'Successfully retrieved oppertunity data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getAllObservationById(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const userId = req.params.id;
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const observations = await frontModel.fetchAllDataByID(page, size, parsedFilters, globalFilter, parsedSortings, userId, 3);

            return ResponseHelper.respond(200, true, {
                observations
            }, 'Successfully retrieved observation data.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getAllTasksById(req, res) {
        const { start, size, filters, globalFilter, sorting } = req.query; // Extract query parameters
        const userId = req.params.id;
        const page = Math.floor(start / size) + 1; // Calculate page based on start and size
        const parsedFilters = filters ? JSON.parse(filters) : [];
        const parsedSortings = sorting ? JSON.parse(sorting) : [];

        try {
            const tasks = await frontModel.fetchAllTasksByID(page, size, parsedFilters, globalFilter, parsedSortings, userId);

            return ResponseHelper.respond(200, true, {
                tasks
            }, 'Successfully retrieved all task.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
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

    async ChangeUserPassword(req, res) {
        const { newPassword, confirmPassword, userid } = req.body;
        console.log('req', req.body)
        const validationErrors = {};
        if (!userid || userid === "0" || userid < 0) {
            validationErrors.userid = 'The user id field is required.';
        }
        if (!newPassword || !newPassword.trim()) {
            validationErrors.password = 'The new password field is required.';
        } else {
            if (newPassword.length < 8) {
                validationErrors.newPasswordLength = 'Password must be at least 8 characters long.';
            }
            if (!/[A-Z]/.test(newPassword)) {
                validationErrors.newPasswordUppercase = 'Password must contain at least one uppercase letter.';
            }
            if (!/[a-z]/.test(newPassword)) {
                validationErrors.newPasswordLowercase = 'Password must contain at least one lowercase letter.';
            }
            if (!/\d/.test(newPassword)) {
                validationErrors.newPasswordDigit = 'Password must contain at least one numeric digit.';
            }
            if (!/[^a-zA-Z\d]/.test(newPassword)) {
                validationErrors.newPasswordSpecialChar = 'Password must contain at least one special character.';
            }
        }

        if (newPassword !== confirmPassword) {
            validationErrors.confirmPassword = 'Passwords do not match.';
        }
        const history = await frontModel.getPasswordadminHistory(userid);
        console.log('history',history);
            for (const record of history) {
                const isSamePassword = await bcrypt.compare(newPassword, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }
        
        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.respond(400, false, validationErrors, 'Change password failed.', res);
        }

        try {

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            const userData = {
                password: hashedNewPassword,
                userId: userid
            }

            await frontModel.updateUserPassword(userData);

            return ResponseHelper.respond(200, true, '', 'Password updated successfully.', res);
        } catch (error) {
            console.error('Error while changing password:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

}

module.exports = new FrontController();