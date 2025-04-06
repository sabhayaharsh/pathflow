const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ResponseHelper = require('../../helpers/responseHelper');
const authUserModel = require('../../models/backend/authUserModel');
const moment = require('moment-timezone');

class AuthController {

    // Login
    login = async (req, res) => {
        const { email, password,rememberme } = req.body;
        const validationErrors = {};

        if (!email && !password) {
            return ResponseHelper.respond(400, false, {
                error: { general: 'Email and password fields are required.' }
            }, null, res);
        }

        if (!email.trim()) {
            validationErrors.email = 'The email field is required.';
        }
        if (!password.trim()) {
            validationErrors.password = 'The password field is required.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            const user = await authUserModel.getUserByEmail(email);
            if (!user) {
                return ResponseHelper.respond(401, false, { error: { email: 'Please enter registered email address' } }, null, res);
            }

            if (user.status=="1" && user.password !== null) {
                   await authUserModel.trackFailedLoginAttempt(email, req.ip);
            }
          

            // Check the number of failed login attempts
            const failedAttempts = await authUserModel.getFailedLoginAttempts(email);
            if (failedAttempts > 5) {
                await authUserModel.updateUserToken(user.id, null);

                // Suspend the account if the maximum attempts are reached
                return ResponseHelper.respond(403, false, {
                    error: { message: 'Your account is suspended due to multiple failed login attempts. Please try again after 1 hour.' }
                }, null, res);
            }

            // if (user.password == null || user.password == "") {
            //     return ResponseHelper.respond(401, false, { error: { password: `Account is not active. Please verify your account first.` } }, null, res);
            // }
            const currentTime = new Date(); // Get the current time as a Date object
            if (user.status !== '1') {
                if (new Date(user.token_expires) >= currentTime && user.status !== '1') {
                    return ResponseHelper.validateAndRespond({ is_verify: false, email: 'Account is not active. Please verify your account first.' }, null, res);
                } else if (user.status == '2') {
                    return ResponseHelper.validateAndRespond({ is_verify: false, email: 'Account is deactive. Please contact the admin to resolve this issue.' }, null, res);
                } else {
                    return ResponseHelper.validateAndRespond({ is_verify: true, email: 'Account is not active. Please verify your account first.' }, null, res);
                }
            }
            
            if (user.password == null || user.password == "") {
                return ResponseHelper.respond(401, false, { error: { password: `You haven't set your password yet, kindly set your password using verification link sent or contact administrator.` } }, null, res);
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return ResponseHelper.respond(401, false, { error: { password: 'Please enter valid password' } }, null, res);
            }

            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                is_super_admin: user.is_super_admin
            };
            const logouttime = rememberme ? "336h" : "8h" ; // when true 24 hours else 1 hours
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: logouttime });
            await authUserModel.updateUserToken(user.id, token);

            return ResponseHelper.respond(200, true, {
                access_token: token,
                user_data: userData
            }, 'You are logged in successfully.', res);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // User Register
    register = async (req, res) => {
        const { name, email, phoneNumber,countryCode} = req.body;
        const validationErrors = {};

        // Validate input
        if (!name || !name.trim()) {
            validationErrors.name = 'The name field is required.';
        }

        if (!email || !email.trim() || !ResponseHelper.validateEmail(email)) {
            validationErrors.email = 'Please provide a valid email address.';
        }

        if (!phoneNumber || !phoneNumber.trim() || !ResponseHelper.validatePhoneNumber(phoneNumber)) {
            validationErrors.phoneNumber = 'Please provide a valid phone number.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            // Check if email is already registered
            const existingEmailUser = await authUserModel.getUserByEmail(email);
            if (existingEmailUser) {
                validationErrors.email = 'Email is already registered.';
            }

            // Check if phone number is already registered
            const existingPhoneNumberUser = await authUserModel.getUserByPhoneNumber(phoneNumber);
            if (existingPhoneNumberUser) {
                validationErrors.phoneNumber = 'Phone number is already registered.';
            }

            if (Object.keys(validationErrors).length > 0) {
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            const newUser = {
                name: name,
                email: email,
                countryCode : countryCode,
                phoneNumber: phoneNumber
            };

            const insertedUserData = await authUserModel.createUser(newUser);

            const token = jwt.sign({ id: insertedUserData.id }, process.env.JWT_SECRET || 3000);
            const token_expires = ResponseHelper.calculateTokenExpiration();

            await authUserModel.updateAdminUserToken(insertedUserData?.id, token, token_expires);
            const verificationLink = `${process.env.FRONTEND_URL}/webadmin/verify/${token}`;

            const replacements = {
                USERNAME: name,
                VERIFICATION_LINK: verificationLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };

            await ResponseHelper.sendEmail(email, 'Account Verification', 'VerifyAccount', replacements);

            return ResponseHelper.respond(200, true, { token, user: insertedUserData, verificationLink: verificationLink }, 'User registered successfully! An email has been sent to your registered email address.', res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    // verify User
    async verifyUser(req, res) {
        const { token } = req.params;
        try {
            // Retrieve user by verification token
            const user = await authUserModel.getUserByVerificationToken(token);

            if (!user) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired verification link.' }, null, res);
            }

            // Check if the verification token is expired
            const currentTime = moment().utc();
            const tokenExpires = moment(user.token_expires).utc();
            if (currentTime > tokenExpires) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired verification link.' }, null, res);
            }

            // Check if the user is already verified
            if (user.status === '1') {
                return ResponseHelper.validateAndRespond({ token: 'You are already verified.', id: token, status: 1 }, null, res);
            }

            // Update user's status to "verified" or perform any other necessary actions
            await authUserModel.updateUserStatus(user.id, '1');

            return ResponseHelper.respond(200, true, null, 'User verified successfully. You can now reset your password.', res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Resend Verification Link
    async resendVerificationEmail(req, res) {
        const { email } = req.body;
        const user = await authUserModel.getUserByEmail(email);
        if (!user) {
            return ResponseHelper.respond(400, false, { error: { details: "User not found!" } }, null, res);
        }
        try {
            const existingUser = await authUserModel.getUserByEmail(email);

            if (!existingUser) {
                return ResponseHelper.respond(400, false, null, 'Invalid or expired token.', res);
            }


            const verificationToken = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET, { expiresIn: '30m' });
            const token_expires = ResponseHelper.calculateTokenExpiration();
            await authUserModel.updateVerificationTokenfrompopup(email, token_expires, verificationToken);

            const verificationLink = `${process.env.FRONTEND_URL}/webadmin/verify/${verificationToken}`;

            const replacements = {
                USERNAME: existingUser.name,
                VERIFICATION_LINK: verificationLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };
            await ResponseHelper.sendEmail(email, 'Resend Verification Email', 'VerifyAccount', replacements);

            return ResponseHelper.respond(200, true, { email: email, verificationLink, verificationToken }, 'Verification email resent successfully.', res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Change Password
    changePassword = async (req, res) => {
        const { newPassword, password, confirmPassword } = req.body;
        const validationErrors = {};
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
            if (password === newPassword) {
                validationErrors.newPassword = 'New password must be different from the current password.';
            }

        }
        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.respond(400, false, { error: validationErrors }, 'Change password failed.', res);
        }
        try {
            const user = await authUserModel.getUserByEmail(req.user.email);
            if (newPassword === user.email) {
                return ResponseHelper.respond(400, false, { error: { password: 'Password cannot match email.' } }, null, res);
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return ResponseHelper.respond(400, false, { error: { password: 'Current password is incorrect.' } }, null, res);
            }
            const history = await authUserModel.getPasswordadminHistory(user.id);
            for (const record of history) {
                const isSamePassword = await bcrypt.compare(newPassword, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await authUserModel.updateUserPassword(user.id, hashedNewPassword);
            await authUserModel.clearResetPasswordToken(user.id);
            return ResponseHelper.respond(200, true, null, 'Password updated successfully.', res);
        } catch (error) {
            console.error('Error while changing password:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }


    };


    changePasswordprofile = async (req, res) => {
        const { newPassword, password, confirmPassword } = req.body;
        const validationErrors = {};
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
            if (password === newPassword) {
                validationErrors.newPassword = 'New password must be different from the current password.';
            }

        }
        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.respond(400, false, { error: validationErrors }, 'Change password failed.', res);
        }
        try {
            const user = await authUserModel.getUserByEmail(req.user.email);
            if (newPassword === user.email) {
                return ResponseHelper.respond(400, false, { error: { password: 'Password cannot match email.' } }, null, res);
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return ResponseHelper.respond(400, false, { error: { password: 'Current password is incorrect.' } }, null, res);
            }
            const history = await authUserModel.getPasswordadminHistory(user.id);
            for (const record of history) {
                const isSamePassword = await bcrypt.compare(newPassword, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await authUserModel.updateUserPasswordprofile(user.id, hashedNewPassword);
            //await authUserModel.clearResetPasswordToken(user.id);
            return ResponseHelper.respond(200, true, null, 'Password updated successfully.', res);
        } catch (error) {
            console.error('Error while changing password:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }


    };



    // sent invitation link
    sentInvitationLink = async (req, res) => {
        const { email, id, pass_change_count } = req.body;
        const validationErrors = {};

        // Validate input
        if (!email || !email.trim()) {
            validationErrors.email = 'The email field is required.';
        }

        // Respond with validation errors if any
        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            // Get user by email
            const user = await authUserModel.getUserByEmail(email);
            if (!user) {
                return ResponseHelper.respond(400, false, {
                    error: { details: "User not found!" }
                }, null, res);
            }

            const data = await this.sendInvitationLink(user, res);

            // Respond with success message
            return ResponseHelper.respond(200, true, data, 'Password reset link sent successfully.', res);
        } catch (error) {
            console.error('Error sending verification email:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error', details: error.toString() });
        }
    }

    sendInvitationLink = async (user, res) => {
        const encryptedId = ResponseHelper.encrypt(user.id.toString());
        const token = jwt.sign({ id: encryptedId }, process.env.JWT_SECRET, { expiresIn: '30m' });
        const verificationLink = `${process.env.FRONTEND_URL}/webadmin/verify/${token}`;
        const token_expires = ResponseHelper.calculateTokenExpiration();

        await authUserModel.updateVerificationToken(user.email, token_expires, token, user.pass_change_count);

        const replacements = {
            USERNAME: `${user.name}`,
            VERIFICATION_LINK: verificationLink,
            COMPANY_NAME: process.env.APPNAME,
            BASE_URL: process.env.BASE_URL
        };
        await ResponseHelper.sendEmail(user.email, 'Reset Password - Pathmaker', 'adminResetPassword', replacements);
        return replacements
    }

    // Get User Profile Detail
    async getUserDetails(req, res) {
        const email = req.user.email;
        try {
            const userData = await authUserModel.getUserByEmail(email);
            if (!userData) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            return ResponseHelper.respond(200, true, { user: userData }, 'User details retrieved successfully.', res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async updateAdminProfile(req, res) {
        console.log("uploadedFile",req.uploadedFile);
        
        const userId = req.user.id;
        const file = req.uploadedFile;
        try {
            if (!file) {
                return res.status(400).json({ success: false, data: { error: 'No file uploaded' } });
            }

            const profileImageUrl = file; // Use S3 file URL instead of local path

            await authUserModel.updateAdminProfile(userId, profileImageUrl);
            return ResponseHelper.respond(200, true, { profileImageUrl }, 'Profile updated successfully.', res);

        } catch (error) {
            console.error('error', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

}

module.exports = new AuthController();