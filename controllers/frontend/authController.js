const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../../models/frontend/userModel');
const { invoiceexportpdf } = require('../../public/invoiceexport/invoiceexport');
const ResponseHelper = require('../../helpers/responseHelper');
const moment = require('moment-timezone');
const controller = require('authorizenet').APIControllers;
const APIContracts = require('authorizenet').APIContracts;
require('dotenv').config();

class AuthController {

    // Login
    login = async (req, res) => {
        const { email, password, rememberme } = req.body;
        const validationErrors = {};

        // Check if the request body is empty
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
            // Track failed login attempt

            const user = await userModel.getUserByEmail(email);
            // if (user.status === '0') {
            //     return ResponseHelper.validateAndRespond({ is_verify: true, email: 'Account is not active. Please verify your account first.' }, null, res);
            // }  
            if (!user) {
                return ResponseHelper.respond(401, false, { error: { email: 'Please enter registered email address' } }, null, res);
            }
            if (user.status === '1') {
                await userModel.trackFailedLoginAttempt(email, req.ip);
            }


            // Check the number of failed login attempts
            const failedAttempts = await userModel.getFailedLoginAttempts(email);
            if (failedAttempts > 5) {
                await userModel.updateUserToken(user.id, null);

                // Suspend the account if the maximum attempts are reached
                return ResponseHelper.respond(403, false, {
                    error: { message: 'Your account is suspended due to multiple failed login attempts. Please try again after 1 hour.' }
                }, null, res);
            }

            let passwordMatch;
            if (user.status !== '1') {

                // 3 means when admin account deactivate.
                if (user.status === '3') {
                    return ResponseHelper.validateAndRespond({ is_verify: false, email: 'Account is deactive. Please contact the admin to resolve this issue.' }, null, res);
                }
                if (user.status === '0') {

                    const currentDateTime = new Date();
                    const tokenExpiryDate = new Date(user.token_expires);
                    if (currentDateTime >= tokenExpiryDate) {
                        return ResponseHelper.validateAndRespond({ is_verify: true, email: 'Account  is not active. Please verify your account first.' }, null, res);
                    }
                    else {
                        passwordMatch = await bcrypt.compare(password, user.password);
                        if (!passwordMatch) {
                            return ResponseHelper.validateAndRespond({ is_verify: false, email: 'Account  is not active. Please verify your account first.' }, null, res);
                        }
                        return ResponseHelper.validateAndRespond({ is_verify: false, email: 'Account  is not active. Please verify your account first.' }, null, res);
                    }

                }

            }

            passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return ResponseHelper.respond(400, false, { error: { password: 'Please enter valid password' } }, null, res);
            }
            if (user.two_factor_auth == 1) {
                const userPhoneNumber = `+${user.country_code + user.phone_number.trim()}`; // Update with 
                // correct country code
                const smsCount = await userModel.countSMSInLastHour(`${user.phone_number.trim()}`);
                if (smsCount >= 3) {
                    return ResponseHelper.respond(429, false, {
                        error: { details: "You have reached the limit of 3 SMS per hour. Please try again later." }
                    }, null, res);
                }

                const OTP = ResponseHelper.generateOTP();

                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                const client = require('twilio')(accountSid, authToken);

                const sms = await client.messages.create({
                    body: `${OTP} is your Pathmaker verification OTP`,
                    from: '+19547152687',
                    to: userPhoneNumber
                });
                await userModel.logSMS(user.id, userPhoneNumber, OTP, 'sent');
            }
            const user_sub_details = await userModel.getUserSubscriptionDetails(user.id);

            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                is_completed_profile: user.is_completed_profile,
                twoFactorAuth: user.two_factor_auth,
                user_sub_details: user_sub_details
            };

            const logouttime = rememberme ? "336h" : "8h";
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: logouttime });
            await userModel.updateUserToken(user.id, token);
            await userModel.clearLoginAttempts(email);

            if (user.is_completed_profile === '0') {
                // Update is_completed_profile to 1
                await userModel.updateIsCompletedProfile(user.id);
            }
            // when send sms live that time remove below line
            const lastOtp = await userModel.getLastOtpByPhoneNumber(`${user.phone_number.trim()}`);

            return ResponseHelper.respond(200, true, {
                access_token: token,
                user_data: userData,
                OTP: lastOtp
            }, 'You  are logged in successfully.', res);

        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    checktonvalied = async (req, res) => {
        const { token } = req.params;
        const user = await userModel.getUserByResetPasswordToken(token);
        if (!user) {
            return ResponseHelper.validateAndRespond({ token: 'Reset password link has expired. Please request a new one.' }, null, res);
        }
        // Check if the reset password token is expired
        const currentDateTime = new Date();
        // Convert the token expiration string to a Date object
        const tokenExpiryDate = new Date(user.reset_token_expires);
        if (currentDateTime > tokenExpiryDate) {
            return ResponseHelper.validateAndRespond({ token: 'Reset password link has expired. Please request a new one.' }, null, res);
        }
        else {
            return ResponseHelper.respond(200, false, null, null, res);
        }

    }
    // User Register
    register = async (req, res) => {
        const { name, email, phoneNumber, countryCode, password, confirmPassword } = req.body;
        const validationErrors = {};
        const existingEmailUser = await userModel.getUserByEmail(email);
        if (existingEmailUser) {
            validationErrors.email = 'Email is already registered.';
        }
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

            // Check if password and email match
            if (password === email) {
                validationErrors.password = 'Password cannot match email.';
            }
        }

        if (password !== confirmPassword) {
            validationErrors.confirmPassword = 'Passwords do not match.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            // Check if email is already registered
            // const existingEmailUser = await userModel.getUserByEmail(email);
            // if (existingEmailUser) {
            //     validationErrors.email = 'Email is already registered.';
            // }

            // Check if phone number is already registered
            const existingPhoneNumberUser = await userModel.getUserByPhoneNumber(phoneNumber);
            if (existingPhoneNumberUser) {
                validationErrors.phoneNumber = 'Phone number is already registered.';
            }

            if (Object.keys(validationErrors).length > 0) {
                return ResponseHelper.validateAndRespond(validationErrors, null, res);
            }

            // Generate verification token
            const verificationToken = ResponseHelper.generateVerificationToken();

            // Verification Link
            const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

            // Verification Email Sent
            const replacements = {
                USERNAME: name,
                VERIFICATION_LINK: verificationLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };
            await ResponseHelper.sendEmail(email, 'Welcome to Pathmaker: Verify your account', 'VerifyAccount', replacements);

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = {
                name: name,
                email: email,
                phoneNumber: phoneNumber,
                countryCode: countryCode,
                password: hashedPassword,
                verification_token: verificationToken,
                token_expires: ResponseHelper.calculateTokenExpiration(),
            };

            const insertedUserData = await userModel.createUser(newUser);

            const token = jwt.sign({ id: insertedUserData.id }, process.env.JWT_SECRET || 3000);

            return ResponseHelper.respond(200, true, { token, user: insertedUserData }, 'User registered successfully! An email has been sent to your registered email address.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    // Verify User
    async verifyUser(req, res) {
        const { token } = req.params;

        try {
            // Retrieve user by verification token
            const user = await userModel.getUserByVerificationToken(token);

            if (!user) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired verification link.' }, null, res);
            }

            // Check if the verification token is expired
            const currentTime = moment().utc();
            const tokenExpires = moment(user.token_expires).utc();
            if (currentTime > tokenExpires && user.status !== '1') {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired verification link.' }, null, res);
            }

            // Check if the user is already verified
            if (user.status === '1') {
                return ResponseHelper.validateAndRespond({ token: 'You are already verified.' }, null, res);
            }

            // Update user's status to "verified" or perform any other necessary actions
            await userModel.updateUserStatus(user.id, '1');

            return ResponseHelper.respond(200, true, null, 'User verified successfully. You can now log in.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Resend Verification Link
    async resendVerificationEmail(req, res) {
        const { email } = req.body;
        try {
            // Check if the token is valid and get user information
            const existingUser = await userModel.getUserByEmail(email);

            if (!existingUser) {
                return ResponseHelper.respond(400, false, null, 'Invalid or expired verification link.', res);
            }

            // Generate a new verification token
            const verificationToken = ResponseHelper.generateVerificationToken();
            const token_expires = ResponseHelper.calculateTokenExpiration();

            // Update the verification token in the user model or database
            await userModel.updateVerificationToken(email, token_expires, verificationToken);

            // Verification Link
            const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
            // Resend Verification Email Sent
            const replacements = {
                USERNAME: existingUser.name,
                VERIFICATION_LINK: verificationLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };
            await ResponseHelper.sendEmail(email, 'Welcome to Pathmaker: Verify your account', 'VerifyAccount', replacements);

            return ResponseHelper.respond(200, true, { email: email }, 'Verification email resent successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Forgot password
    async sendResetPasswordEmail(req, res) {
        const { email } = req.body;

        try {
            // Retrieve user by email
            const user = await userModel.getUserByEmail(email);

            if (!user) {
                return ResponseHelper.validateAndRespond({ email: 'No account found with this email address.' }, null, res);
            }

            // Check if the user's account is active
            if (user.status !== '1') {
                return ResponseHelper.validateAndRespond({ email: 'Account is not active. Please verify your account first.' }, null, res);
            }

            const failedAttempts = await userModel.getFailedLoginAttempts(email);
            if (failedAttempts > 5) {

                // Suspend the account if the maximum attempts are reached
                return ResponseHelper.respond(403, false, {
                    error: { message: 'Your account is suspended due to multiple failed login attempts. Please try again after 1 hour.' }
                }, null, res);
            }

            // Generate reset password token and expiration
            const resetToken = ResponseHelper.generateVerificationToken();
            const resetTokenExpires = ResponseHelper.calculateTokenExpiration();

            // Update user's reset token and expiration in the database
            await userModel.updateResetPasswordToken(user.id, resetToken, resetTokenExpires);

            // Reset Password Link
            //const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            const resetPasswordLink = `${process.env.FRONTEND_URL}/verifytoken/${resetToken}`;

            // Reset Password Email Sent
            const replacements = {
                USERNAME: user.name,
                RESET_PASSWORD_LINK: resetPasswordLink,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };
            await ResponseHelper.sendEmail(email, 'Welcome to Pathmaker: Reset Your Password', 'ResetPassword', replacements);

            return ResponseHelper.respond(200, true, { email: email }, 'Reset password instructions sent to your email.', res);
        } catch (error) {
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
        }

        if (newPassword !== confirmPassword) {
            validationErrors.confirmPassword = 'Passwords do not match.';
        } else if (newPassword === password) {
            validationErrors.newPassword = 'New password must be different from the current password.';
        }

        const useremail = await userModel.getUserByEmail(req.user.email);

        if (newPassword === useremail.email) {
            validationErrors.password = 'Password cannot match email.';
        }
        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.respond(400, false, { error: validationErrors }, 'Change password failed.', res);
        }

        try {
            const user = await userModel.getUserByEmail(req.user.email);

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return ResponseHelper.respond(400, false, { error: { password: 'Current password is incorrect.' } }, null, res);
            }

            const history = await userModel.getPasswordHistory(user.id);

            for (const record of history) {
                const isSamePassword = await bcrypt.compare(newPassword, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            await userModel.updateUserPassword(user.id, hashedNewPassword);

            return ResponseHelper.respond(200, true, null, 'Password updated successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    // Reset Password
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

            const useremail = await userModel.getUserByRestToken(token);
            if (!useremail) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired reset password link please visit new link.' }, null, res);
            }

            if (password === useremail.email) {
                validationErrors.password = 'Password cannot match email.';
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            // Retrieve user by reset password token
            const user = await userModel.getUserByResetPasswordToken(token);

            if (!user) {
                return ResponseHelper.validateAndRespond({ token: 'Invalid or expired reset password token.' }, null, res);
            }

            // Check if the reset password token is expired
            if (new Date() > user.reset_token_expires) {
                return ResponseHelper.validateAndRespond({ token: 'Reset password token has expired. Please request a new one.' }, null, res);
            }

            // Check if the new password is the same as the current password
            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                return ResponseHelper.validateAndRespond({ password: 'New password must be different from the current password.' }, null, res);
            }

            const history = await userModel.getPasswordHistory(user.id);

            for (const record of history) {
                const isSamePassword = await bcrypt.compare(password, record.password);
                if (isSamePassword) {
                    return ResponseHelper.respond(400, false, { error: { password: 'New password cannot be the one that was used in the last year' } }, null, res);
                }
            }

            // Update user's password in the database
            const hashedPassword = await bcrypt.hash(password, 10);
            await userModel.updateUserPassword(user.id, hashedPassword);

            // Clear reset password token and expiration in the database
            await userModel.clearResetPasswordToken(user.id);

            return ResponseHelper.respond(200, true, null, 'Password reset successfully. You can now log in with your new password.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }


    // Get User Profile Detail
    async getUserProfileDetails(req, res) {
        const email = req?.user?.email;
        try {
            const userData = await userModel.getUserByEmail(email);

            if (!userData) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            delete userData.token;
            delete userData.password;

            // Fetch user subscription details
            const user_sub_details = await userModel.getUserSubscriptionDetails(userData.id);
            const upcomingPlan = await userModel.getUpcomingPlanDetails(userData.id);


            // Include user subscription details in the user object
            userData.user_sub_details = user_sub_details;
            userData.user_sub_details.upcoming_plan_details = upcomingPlan;

            return ResponseHelper.respond(200, true, { user: userData }, 'User data retrieved successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    async getallexperincetitle(req, res) {
        try {
            const userId = req.user.id;
            const experienceTitles = await userModel.getAllExperinceTitle(userId);
            const journals = await userModel.getAllJournalTitles(userId);
            const experinces = {
                experienceTitles: experienceTitles,
                journals: journals
            }
            return ResponseHelper.respond(200, true, { experinces: experinces }, 'Experince title retrieved successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
    /**
     * Update User Profile
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateUserDetails(req, res) {
        const userId = req.user.id; // Assuming you have user information in the request after authentication
        const { name } = req.body;
        const validationErrors = {};

        // Validate input
        if (!name || !name.trim()) {
            validationErrors.name = 'The name field is required.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            const existingUser = await userModel.getUserById(userId);

            if (!existingUser) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const updatedUserData = {
                id: userId,
                name: name || existingUser.name,
                // Add other fields as needed
            };
            const User = await userModel.updateUserData(updatedUserData);
            if (User.affectedRows > 0) {
                return ResponseHelper.respond(200, true, { User: updatedUserData }, 'Profile updated successfully.', res);
            } else {
                return ResponseHelper.respond(400, false, null, 'Profile updated failed!', res);
            }
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };


    async updateUserProfile(req, res) {
        const userId = req.user.id;
        const file = req.uploadedFile;
        try {
            if (!file) {
                return res.status(400).json({ success: false, data: { error: 'No file uploaded' } });
            }


            const profileImageUrl = file; // Use S3 file URL instead of local path
            await userModel.updateUserProfile(userId, profileImageUrl);

            return ResponseHelper.respond(200, true, { profileImageUrl }, 'Profile updated successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }


    async checkLifeBookStatus(req, res) {
        try {
            // Helper function to group life books by user ID and count types
            function groupLifeBooksByUser(lifeBooks) {
                const grouped = new Map();

                for (const book of lifeBooks) {
                    const key = book.user_id;
                    const count = grouped.get(key)?.counts || { '1': 0, '2': 0, '3': 0 };

                    if (book.type === '1') {
                        count['1'] += 1; // Increment knowledge count
                    } else if (book.type === '2') {
                        count['2'] += 1; // Increment decision count
                    } else if (book.type === '3') {
                        count['3'] += 1; // Increment awareness count
                    }

                    grouped.set(key, { user_id: book.user_id, user_name: book.user_name, user_email: book.user_email, counts: count });
                }

                return Array.from(grouped.values());
            }

            // Query the database for life books with status = 1 and publish_date 2 days before the current date
            const lifeBooks = await userModel.getPendingLifeBooks();

            // Group life books by user ID
            const groupedBooks = groupLifeBooksByUser(lifeBooks);

            // Prepare the response data
            const userData = groupedBooks.map(group => ({
                user_id: group.user_id,
                user_name: group.user_name,
                user_email: group.user_email,
                experience: group.counts['1'] || '0', // Knowledge
                opportunity: group.counts['2'] || '0', // Decision
                observation: group.counts['3'] || '0' // Awareness
            }));

            res.status(200).json({ success: true, data: userData, message: 'data get successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async deleteUserAccount(req, res) {
        const userID = req.user.id;
        try {
            await userModel.archiveUserSubscriptions(userID);

            await userModel.deleteUserSubscriptions(userID);

            const user = await userModel.getUserByID(userID);

            await userModel.archiveUser(user);

            await userModel.deleteUser(userID);

            res.status(200).json({ success: true, message: 'User account deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async verifyPhoneNumber(req, res) {
        try {
            const { phoneNumber, otp, mobilenumber } = req.body;
            const actualphonenumber = mobilenumber.replace(" ", "").replace(")", "").replace("(", "").trim();
            const lastOtp = await userModel.getLastOtpByPhoneNumber(actualphonenumber);
            if (!lastOtp) {
                return ResponseHelper.validateAndRespond({ otp: 'OTP not found.' }, null, res);
            }

            if (lastOtp.otpExpired) {
                return ResponseHelper.validateAndRespond({ otp: 'OTP has expired. Please request a new one.' }, null, res);
            }

            if (lastOtp?.otp != otp) {
                return ResponseHelper.validateAndRespond({ otp: 'Please enter the correct OTP.' }, null, res);
            }

            await userModel.enableTFA(phoneNumber);
            await userModel.deleteUserOtpByPhoneNumber(actualphonenumber);

            return ResponseHelper.respond(200, true, '', 'Two-factor authentication successfully enabled for this account', res);

        } catch (error) {
            return res.status(500).json({ success: false, message: "Internal Server Error", details: error.toString() });
        }
    };

    async sendSMS(req, res) {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return ResponseHelper.validateAndRespond({ phone: "Phone number field is required." }, null, res);
        }

        const user = await userModel.getUserByPhoneNumber(phoneNumber.trim());
        const countrycode = user.country_code;
        if (!user) {
            return ResponseHelper.validateAndRespond({ phone: "User not found with the provided phone number." }, null, res);
        }
        if (user.two_factor_auth === '1') {
            return ResponseHelper.validateAndRespond({ phone: "Two-factor authentication is already enabled for this phone number." }, null, res);
        }

        try {
            let userPhoneNumber = `+1${phoneNumber.trim()}`; // Update with correct country code

            const smsCount = await userModel.countSMSInLastHour(userPhoneNumber);
            if (smsCount >= 3) {
                return ResponseHelper.respond(429, false, {
                    error: { details: "You have reached the limit of 3 SMS per hour. Please try again later." }
                }, null, res);
            }
            const countryphone = `+${countrycode}${phoneNumber}`;
            const OTP = ResponseHelper.generateOTP();

            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);

            const sms = await client.messages.create({
                body: `${OTP} is your Pathmaker verification OTP`,
                from: '+19547152687',
                to: countryphone
            });
            // console.log(`OTP sent successfully: ${sms.sid}`);
            await userModel.logSMS(user.id, countryphone, OTP, 'sent');
            return ResponseHelper.respond(200, true, OTP, 'OTP sent successfully.', res);

        } catch (error) {
            if (error.code === 20003) {  // Twilio's error code for authentication issues
                return res.status(401).json({
                    success: false,
                    error: {
                        message: "Verify that you have sufficient account balance or your account is not suspended."
                    },
                    message: "Authentication Error",
                    details: error.toString()
                });
            }
            //Verify that you have sufficient account balance or your account is not suspended.
            await userModel.logSMS(user.id, user.phone_number, '', 'failed');
            return res.status(500).json({ success: false, message: "Internal Server Error", details: error.toString() });
        }
    }

    // User verify OTP and Register 
    verifyOtpEmail = async (req, res) => {
        const { email, otp } = req.body;
        const validationErrors = {};

        if (!email || !email.trim() || !ResponseHelper.validateEmail(email)) {
            validationErrors.email = 'Please provide a valid email address.';
        }

        if (!otp || !otp.trim()) {
            validationErrors.otp = 'The otp is required.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            const user = await userModel.getUserByEmail(email);
            const userPhoneNumber = `${user.phone_number.trim()}`;

            const userphonewithcountry = `+${user.country_code}` + `${userPhoneNumber}`;
            const lastOtp = await userModel.getLastOtpByPhoneNumber(userphonewithcountry);

            if (!lastOtp) {
                return ResponseHelper.validateAndRespond({ otp: 'OTP not found.' }, null, res);
            }

            if (lastOtp.otpExpired) {
                return ResponseHelper.validateAndRespond({ otp: 'OTP has expired. Please request a new one.' }, null, res);
            }

            if (lastOtp?.otp != otp) {
                return ResponseHelper.validateAndRespond({ otp: 'Please enter the correct OTP.' }, null, res);
            }

            await userModel.deleteUserOtpByPhoneNumber(`${user?.phone_number.trim()}`);
            const user_sub_details = await userModel.getUserSubscriptionDetails(user.id);

            const userData = {
                id: user.id,
                email: email,
                phone_number: user.phone_number,
                is_completed_profile: user.is_completed_profile,
                user_sub_details: user_sub_details,
                access_token: user.token
            };
            return ResponseHelper.respond(200, true, {
                user_data: userData,
            }, 'You are logged in successfully.', res);

        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    // register re-sent OTP
    resentOTPSent = async (req, res) => {
        const { email } = req.body;
        const validationErrors = {};

        if (!email || !email.trim() || !ResponseHelper.validateEmail(email)) {
            validationErrors.email = 'Please provide a valid email address.';
        }

        if (Object.keys(validationErrors).length > 0) {
            return ResponseHelper.validateAndRespond(validationErrors, null, res);
        }

        try {
            const user = await userModel.getUserByEmail(email);
            const countrycode = user.country_code;

            const userPhoneNumber = `+${countrycode}${user.phone_number.trim()}`;
            const smsCount = await userModel.countSMSInLastHour(userPhoneNumber);
            if (smsCount >= 3) {
                return ResponseHelper.respond(429, false, {
                    error: { details: "You have reached the limit of 3 SMS per hour. Please try again later." }
                }, null, res);
            }
            const countryphone = `+${countrycode}${user.phone_number.trim()}`;

            const otp = ResponseHelper.generateOTP();
            const newUser = {
                email: email,
                otp: otp
            };

            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);

            const sms = await client.messages.create({
                body: `${otp} is your Pathmaker verification OTP`,
                from: '+19547152687',
                to: countryphone
            });
            await userModel.logSMS(user.id, countryphone, otp, 'sent');
            // const insertedUserData = await userModel.resentOTP(newUser);

            return ResponseHelper.respond(200, true, newUser, 'Resend OTP sent successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    async updateTFA(req, res) {
        const { id } = req.body;
        try {
            const updateStatusData = {
                id
            };
            const updatedStatus = await userModel.updateTFA(updateStatusData);
            if (updatedStatus.success === false) {
                return ResponseHelper.respond(400, false, updatedStatus, 'Two factor authentication disabled failed!', res);
            } else {
                return ResponseHelper.respond(200, true, updatedStatus, 'Two factor authentication disabled successfully.', res);
            }
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }

    async createCustomerProfile(req, res) {
        try {
            // Step 1: Merchant Authentication
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            // Step 2: Setup Customer Profile without Payment Information
            const customerProfileType = new APIContracts.CustomerProfileType();
            customerProfileType.setEmail(req.body.createCustomerProfileRequest.profile.email);

            // Step 3: Create Profile Request
            const createRequest = new APIContracts.CreateCustomerProfileRequest();
            createRequest.setProfile(customerProfileType);
            createRequest.setMerchantAuthentication(merchantAuthenticationType);


            // Step 4: Execute Request and Handle Response
            const ctrl = new controller.CreateCustomerProfileController(createRequest.getJSON());

            ctrl.execute(function () {
                const apiResponse = ctrl.getResponse();

                if (apiResponse != null) {
                    const response = new APIContracts.CreateCustomerProfileResponse(apiResponse);

                    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                        return res.status(200).json({
                            success: true,
                            customerProfileId: response.getCustomerProfileId(),
                            message: response.getMessages().getMessage()[0].getText()
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            errorCode: response.getMessages().getMessage()[0].getCode(),
                            errorMessage: response.getMessages().getMessage()[0].getText()
                        });
                    }
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Null response received'
                    });
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || 'Unknown error occurred'
            });
        }
    }

    async getCustomerProfile(req, res) {
        try {
            const { customerProfileId } = req.body;

            // Step 1: Merchant Authentication
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            // Step 2: Setup Request
            const getRequest = new APIContracts.GetCustomerProfileRequest();
            getRequest.setCustomerProfileId(customerProfileId);
            getRequest.setMerchantAuthentication(merchantAuthenticationType);

            const ctrl = new controller.GetCustomerProfileController(getRequest.getJSON());

            // Step 3: Execute Request and Handle Response
            ctrl.execute(function () {
                const apiResponse = ctrl.getResponse();

                if (apiResponse) {
                    const response = new APIContracts.GetCustomerProfileResponse(apiResponse);

                    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                        // Successful response
                        return res.status(200).json({
                            success: true,
                            response,
                            customerProfileId: response.getProfile().getCustomerProfileId(),
                            email: response.getProfile().getEmail(),
                            description: response.getProfile().getDescription(),
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            errorCode: response.getMessages().getMessage()[0].getCode(),
                            errorMessage: response.getMessages().getMessage()[0].getText(),
                        });
                    }
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to retrieve customer profile. Null response received.',
                    });
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || 'Unknown error occurred.',
            });
        }
    }

    async checkAuthorizecard(req, res) {
        try {
            const { billingInfo, shippingInfo, createTransactionRequest } = req.body;

            // Set up merchant authentication
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            // Set up opaque data for transaction request
            const opaqueData = new APIContracts.OpaqueDataType();
            opaqueData.setDataDescriptor(createTransactionRequest.transactionRequest.payment.opaqueData.dataDescriptor);
            opaqueData.setDataValue(createTransactionRequest.transactionRequest.payment.opaqueData.dataValue);

            // Set up payment type
            const payment = new APIContracts.PaymentType();
            payment.setOpaqueData(opaqueData);

            // Set up transaction request
            const transactionRequestType = new APIContracts.TransactionRequestType();
            transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
            transactionRequestType.setPayment(payment);
            transactionRequestType.setAmount(createTransactionRequest.transactionRequest.amount);

            // Add other transaction details like billing, shipping, etc.
            const billTo = new APIContracts.CustomerAddressType();
            Object.assign(billTo, billingInfo); // Ensure billingInfo matches API fields

            transactionRequestType.setBillTo(billTo);

            // Create and execute the transaction request
            const createRequest = new APIContracts.CreateTransactionRequest();
            createRequest.setMerchantAuthentication(merchantAuthenticationType);
            createRequest.setTransactionRequest(transactionRequestType);

            const ctrl = new controller.CreateTransactionController(createRequest.getJSON());
            ctrl.execute(async function () {
                const apiResponse = ctrl.getResponse();

                if (apiResponse != null) {
                    const response = new APIContracts.CreateTransactionResponse(apiResponse);

                    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                        const transactionId = response.getTransactionResponse().getTransId();

                        // Step 2: Create customer profile after successful transaction
                        const customerProfile = new APIContracts.CustomerProfileType();
                        customerProfile.setDescription("Profile for " + createTransactionRequest?.transactionRequest?.billTo?.firstName + " " + createTransactionRequest?.transactionRequest?.billTo?.lastName);
                        customerProfile.setMerchantCustomerId("M_" + transactionId); // Custom merchant ID

                        const paymentProfile = new APIContracts.CustomerPaymentProfileType();
                        paymentProfile.setCustomerType(APIContracts.CustomerTypeEnum.INDIVIDUAL);
                        paymentProfile.setPayment(payment);

                        const customerProfileRequest = new APIContracts.CreateCustomerProfileRequest();
                        customerProfileRequest.setMerchantAuthentication(merchantAuthenticationType);
                        customerProfileRequest.setProfile(customerProfile);

                        const profileController = new controller.CreateCustomerProfileController(customerProfileRequest.getJSON());

                        // Wrap profileController.execute in a Promise
                        const profileResponse = await new Promise((resolve, reject) => {
                            profileController.execute(() => {
                                const response = profileController.getResponse();
                                if (response) resolve(response);
                                else reject(new Error('No response from Authorize.net for profile creation'));
                            });
                        });

                        if (profileResponse.messages.resultCode === APIContracts.MessageTypeEnum.OK) {
                            return res.status(200).json({
                                message: 'Transaction and Profile creation successful',
                                transactionId: transactionId,
                                profileId: profileResponse.customerProfileId,
                            });
                        } else {
                            return res.status(500).json({
                                message: 'Transaction successful, but Profile creation failed',
                                error: profileResponse.messages.message[0].text || 'No response'
                            });
                        }
                    } else {
                        // Handle transaction failure
                        const errorResponse = response.getTransactionResponse();
                        return res.status(400).json({
                            message: 'Transaction failed',
                            error: errorResponse && errorResponse.getErrors()
                                ? errorResponse.getErrors().getError()[0].getErrorText()
                                : 'Unknown error'
                        });
                    }
                } else {
                    return res.status(500).json({ message: 'No response from Authorize.net' });
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    async createSubscription(req, res) {
        const userID = req.user.id;
        const email = req.user.email;
        const userLatestSubscription = await userModel.getUserSubscriptionPlanDetails(userID);
        let startDate;
        if (userLatestSubscription && userLatestSubscription?.userPlanDetails.PlanID != 1 || userLatestSubscription?.userPlanDetails?.status == '1') {
            // Last subscription exists and is not a free plan, so start the new plan the day after its end date
            const lastEndDate = new Date(userLatestSubscription.userPlanDetails.EndDate);
            lastEndDate.setUTCDate(lastEndDate.getUTCDate());
            startDate = lastEndDate.toISOString().split('T')[0];
        } else {
            startDate = new Date().toISOString().split('T')[0];
        }
        const intervalLength = req.body.ARBCreateSubscriptionRequest.subscription.paymentSchedule.interval.length;
        const planId = req.body.ARBCreateSubscriptionRequest.subscription.paymentSchedule.interval.unit;
        // const planIdValue = planId === 'DAYS' ? '2' : (planId === 'MONTHS' ? '2' : '3');
        const planIdValue = intervalLength == '7' ? '2' : '3';
        const totalOccurrences = req.body.ARBCreateSubscriptionRequest.subscription.paymentSchedule.totalOccurrences;
        const totalOccurrencesValue = totalOccurrences == 0 ? 1 : 9999;
        const planDetails = await userModel.getSubscriptionPlanDetails(planIdValue);

        let endDate;
        const endDateObject = new Date(startDate);
        if (intervalLength == "7") {
            endDateObject.setUTCDate(endDateObject.getUTCDate() + 6); // Monthly subscription, add 7 days 
        } else if (intervalLength == "10") {
            endDateObject.setUTCDate(endDateObject.getUTCDate() + 9); // Yearly subscription, add 10 days
        }
        endDate = endDateObject.toISOString().split('T')[0];

        var merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
        merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

        var interval = new APIContracts.PaymentScheduleType.Interval();
        interval.setLength(intervalLength);
        interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.DAYS);

        var paymentScheduleType = new APIContracts.PaymentScheduleType();
        paymentScheduleType.setInterval(interval);
        paymentScheduleType.setStartDate(startDate);
        paymentScheduleType.setTotalOccurrences(totalOccurrencesValue);
        paymentScheduleType.setTrialOccurrences(0);

        var opaqueData = new APIContracts.OpaqueDataType();
        opaqueData.setDataDescriptor(req.body.ARBCreateSubscriptionRequest?.subscription?.payment?.opaqueData?.dataDescriptor);
        opaqueData.setDataValue(req.body.ARBCreateSubscriptionRequest?.subscription?.payment?.opaqueData?.dataValue);

        var payment = new APIContracts.PaymentType();
        payment.setOpaqueData(opaqueData);

        var orderType = new APIContracts.OrderType();
        orderType.setInvoiceNumber(ResponseHelper.getRandomString(''));
        orderType.setDescription(ResponseHelper.getRandomString(''));

        var customer = new APIContracts.CustomerType();
        customer.setType(APIContracts.CustomerTypeEnum.INDIVIDUAL);
        customer.setId(process.env.API_LOGIN_KEY);
        customer.setEmail(email);

        var nameAndAddressType = new APIContracts.NameAndAddressType();
        nameAndAddressType.setFirstName(req.body.ARBCreateSubscriptionRequest.subscription.billTo.firstName);
        nameAndAddressType.setLastName(req.body.ARBCreateSubscriptionRequest.subscription.billTo.firstName);

        var arbSubscription = new APIContracts.ARBSubscriptionType();
        arbSubscription.setName(req.body.ARBCreateSubscriptionRequest.subscription.name);
        arbSubscription.setPaymentSchedule(paymentScheduleType);
        arbSubscription.setAmount(planDetails.planDetails.SubscriptionPrice);
        arbSubscription.setTrialAmount(0);
        arbSubscription.setPayment(payment);
        arbSubscription.setOrder(orderType);
        arbSubscription.setCustomer(customer);
        arbSubscription.setBillTo(nameAndAddressType);
        arbSubscription.setShipTo(nameAndAddressType);

        var createRequest = new APIContracts.ARBCreateSubscriptionRequest();
        createRequest.setMerchantAuthentication(merchantAuthenticationType);
        createRequest.setSubscription(arbSubscription);
        var ctrl = new controller.ARBCreateSubscriptionController(createRequest.getJSON());

        ctrl.execute(async function () {
            try {
                var apiResponse = ctrl.getResponse();
                if (apiResponse) {
                    var response = new APIContracts.ARBCreateSubscriptionResponse(apiResponse);
                    if (response.getMessages().getResultCode() == APIContracts.MessageTypeEnum.OK) {
                        const subdetails = await userModel.insertSubscriptionDetails(response, userID, startDate, endDate, planIdValue, totalOccurrences);
                        await userModel.insertInvoiceDetails(response, subdetails.id, userID, orderType?.invoiceNumber, planDetails.planDetails.SubscriptionPrice);
                        await userModel.insertSubPaymentDetails(response, userID);

                        return res.status(200).json({
                            success: true,
                            message: 'Subscription created successfully.',
                        });
                    } else {
                        const errorMessage = response.getMessages().getMessage()[0].getText();
                        if (errorMessage.includes('Invalid OTS Token')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        message: 'The payment session has expired or is invalid. Please try again.',
                                    },
                                    success: false
                                }
                            });
                        }
                        if (errorMessage.includes('The credit card number is invalid')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        messages: 'There was a problem while creating your subscription due to invalid card number, please try again.',
                                    },
                                    success: false,
                                }
                            });
                        }
                        if (errorMessage.includes('The merchant does not accept this type of credit card')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        message: 'The selected credit card type is not supported by the merchant. Please use a different card and try again.',
                                    },
                                    success: false,
                                }
                            });
                        }
                        return res.status(400).json({
                            data: {
                                error: {
                                    message: 'There was a problem while creating your subscription, please try again.'
                                    // message: response.getMessages().getMessage()[0].getText(),
                                },
                                success: false,
                            }
                        });
                    }
                } else {
                    return res.status(400).json({
                        data: {
                            error: {
                                message: 'Null API response',
                            },
                            success: false,
                        }
                    });
                }
            } catch (error) {
                return res.status(500).json({
                    data: {
                        error: {
                            message: 'There was a problem while creating your subscription, please try again.',
                        },
                        success: false
                    }
                });
            }
        });
    } catch(error) {
        return res.status(500).json({
            data: {
                error: {
                    message: 'something went wrong!',
                },
                success: false
            }
        });
    }

    async createSubscriptionFromCustomerProfile(req, res) {
        const userID = req?.user?.id;
        const email = req?.user?.email;
        const userData = await userModel.getUserByEmail(email);

        const user_sub_details = await userModel.getUserSubscriptionDetails(userData.id);
        const upcomingPlan = await userModel.getUpcomingPlanDetails(userData.id);

        // Include user subscription details in the user object
        userData.user_sub_details = user_sub_details;
        userData.user_sub_details.upcoming_plan_details = upcomingPlan;

        const { ARBCreateSubscriptionRequest } = req.body;

        // Step 1: Merchant Authentication
        var merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
        merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

        const userLatestSubscription = await userModel.getUserSubscriptionPlanDetails(userID);

        let startDate;

        // Check the PaymentStatus and adjust startDate accordingly
        if (userData.user_sub_details?.PaymentStatus === 'pending' || userData.user_sub_details?.PaymentStatus === 'failed' || userData.user_sub_details?.PaymentStatus === 'suspended') {
            // If PaymentStatus is 'pending', start from the current date
            startDate = new Date().toISOString().split('T')[0];
        } else if (userLatestSubscription &&
            (userLatestSubscription?.userPlanDetails?.PlanID != 1 ||
                userLatestSubscription?.userPlanDetails?.status == '1')) {
            // If there's a last subscription and it's not free, use the day after its end date
            const lastEndDate = new Date(userLatestSubscription.userPlanDetails.EndDate);
            lastEndDate.setUTCDate(lastEndDate.getUTCDate());
            startDate = lastEndDate.toISOString().split('T')[0];
        } else {
            // Default to the current date if no conditions are met
            startDate = new Date().toISOString().split('T')[0];
        }

        const today = new Date().toISOString().split('T')[0];
        const isActive = startDate === today ? '1' : '0';

        const intervalLength = ARBCreateSubscriptionRequest.subscription.paymentSchedule.interval.length;
        const planId = ARBCreateSubscriptionRequest.subscription.paymentSchedule.interval.unit;
        // const planIdValue = planId === 'DAYS' ? '2' : (planId === 'MONTHS' ? '2' : '3');
        const planIdValue = intervalLength == '7' ? '2' : '3';
        const totalOccurrences = req.body.ARBCreateSubscriptionRequest.subscription.paymentSchedule.totalOccurrences;
        const totalOccurrencesValue = totalOccurrences == 0 ? 1 : 9999;
        const planDetails = await userModel.getSubscriptionPlanDetails(planIdValue);

        let endDate;
        const endDateObject = new Date(startDate);
        if (intervalLength == "7") {
            endDateObject.setUTCDate(endDateObject.getUTCDate() + 6); // Monthly subscription, add 7 days
        } else if (intervalLength == "10") {
            endDateObject.setUTCDate(endDateObject.getUTCDate() + 9); // Yearly subscription, add 10 days
        }
        endDate = endDateObject.toISOString().split('T')[0];

        // Step 2: Configure Payment Schedule
        const interval = new APIContracts.PaymentScheduleType.Interval();
        interval.setLength(intervalLength);
        interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.DAYS);

        const paymentScheduleType = new APIContracts.PaymentScheduleType();
        paymentScheduleType.setInterval(interval);
        paymentScheduleType.setStartDate(startDate);

        paymentScheduleType.setTotalOccurrences(totalOccurrencesValue);
        paymentScheduleType.setTrialOccurrences(0);

        var orderType = new APIContracts.OrderType();
        orderType.setInvoiceNumber(ResponseHelper.getRandomString(''));
        orderType.setDescription(ResponseHelper.getRandomString(''));

        // Step 3: Customer Profile Setup
        const customerProfileIdType = new APIContracts.CustomerProfileIdType();
        customerProfileIdType.setCustomerProfileId(ARBCreateSubscriptionRequest?.subscription?.profile?.customerProfileId);
        customerProfileIdType.setCustomerPaymentProfileId(ARBCreateSubscriptionRequest?.subscription?.profile?.customerPaymentProfileId);
        customerProfileIdType.setCustomerAddressId(ARBCreateSubscriptionRequest?.subscription?.profile?.customerAddressId);

        // Step 4: Configure Subscription
        const arbSubscription = new APIContracts.ARBSubscriptionType();
        arbSubscription.setName(ARBCreateSubscriptionRequest.subscription.name);
        arbSubscription.setPaymentSchedule(paymentScheduleType);
        arbSubscription.setAmount(planDetails?.planDetails?.SubscriptionPrice);
        arbSubscription.setOrder(orderType);
        arbSubscription.setTrialAmount(0);
        arbSubscription.setProfile(customerProfileIdType);

        // Step 5: Create Subscription Request
        const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
        createRequest.setMerchantAuthentication(merchantAuthenticationType);
        createRequest.setSubscription(arbSubscription);

        const ctrl = new controller.ARBCreateSubscriptionController(createRequest.getJSON());

        ctrl.execute(async () => {
            try {
                var apiResponse = ctrl.getResponse();
                if (apiResponse) {
                    var response = new APIContracts.ARBCreateSubscriptionResponse(apiResponse);
                    if (response.getMessages().getResultCode() == APIContracts.MessageTypeEnum.OK) {
                        const subdetails = await userModel.insertPRofileSubscriptionDetaile(response, userID, startDate, endDate, planIdValue, isActive, totalOccurrences);
                        await userModel.insertInvoiceDetails(response, subdetails.id, userID, orderType?.invoiceNumber, planDetails.planDetails.SubscriptionPrice);
                        await userModel.insertSubPaymentDetails(response, userID);

                        return res.status(200).json({
                            success: true,
                            message: 'Subscription upgrade successfully.',
                        });
                    } else {
                        const errorMessage = response.getMessages().getMessage()[0].getText();
                        if (errorMessage.includes('Invalid OTS Token')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        message: 'The payment session has expired or is invalid. Please try again.',
                                    },
                                    success: false
                                }
                            });
                        }
                        if (errorMessage.includes('The credit card number is invalid')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        message: 'There was a problem while creating your subscription due to invalid card number, please try again.',
                                    },
                                    success: false
                                }
                            });
                        }
                        if (errorMessage.includes('The merchant does not accept this type of credit card')) {
                            return res.status(400).json({
                                data: {
                                    error: {
                                        message: 'The selected credit card type is not supported by the merchant. Please use a different card and try again.',
                                    },
                                    success: false
                                }
                            });
                        }
                        return res.status(400).json({
                            data: {
                                error: {
                                    message: 'There was a problem while creating your subscription, please try again.',
                                },
                                success: false
                            }
                        });
                    }
                } else {
                    throw new Error("Null API response");
                }
            } catch (error) {
                return res.status(500).json({
                    data: {
                        error: {
                            message: 'There was a problem while creating your subscription, please try again.',
                        },
                        success: false
                    }
                });
            }
        });
    } catch(error) {
        return res.status(500).json({
            data: {
                error: {
                    message: 'something went wrong!',
                    errorsMsg: error.message || error
                },
                success: false
            }
        });
    }


    async getTransactionDetails(transId) {
        try {
            // const { getTransactionDetailsRequest } = req.body;
            // const { transId } = getTransactionDetailsRequest;

            let merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            let getRequest = new APIContracts.GetTransactionDetailsRequest();
            getRequest.setMerchantAuthentication(merchantAuthenticationType);
            getRequest.setTransId(transId);

            let ctrl = new controller.GetTransactionDetailsController(getRequest.getJSON());

            const executeCtrl = () => {
                return new Promise((resolve, reject) => {
                    ctrl.execute(() => {
                        let apiResponse = ctrl.getResponse();
                        if (apiResponse) {
                            resolve(apiResponse);
                        } else {
                            reject(new Error('Null response received from the API'));
                        }
                    });
                });
            };

            let apiResponse = await executeCtrl();
            let response = new APIContracts.GetTransactionDetailsResponse(apiResponse);

            if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {

                const subscriptionId = response.transaction.subscription.id;

                const userData = await userModel.getSubscriptionDetails(subscriptionId);
                const userDetails = await userModel.getUserByID(userData?.UserID);
                const startDate = new Date(userData.StartDate).toLocaleDateString();
                const endDate = new Date(userData.EndDate).toLocaleDateString();

                const TEMPLATE_HEADER = `We are thrilled to inform you that your payment has been processed successfully! Your Pathmaker subscription is active from ${startDate} to ${endDate}. Kindly check your details by logging into ThePathMakerApp.com.`;
                const replacements = {
                    USERNAME: userDetails.name,
                    PAYMENT_HEADER: 'Thank You for Subscribing! Payment Confirmed',
                    TEMPLATE_HEADER: TEMPLATE_HEADER,
                    TEMPLATE_FOOTER: 'Thank you for choosing Pathmaker. We’re excited to have you onboard!',
                    COMPANY_NAME: process.env.APPNAME,
                    BASE_URL: process.env.BASE_URL
                };
                await ResponseHelper.sendEmail(userDetails.email, 'Payment Successfull!', 'SubscriptionPayment', replacements);

                const data = {
                    transactionId: response.getTransaction().getTransId(),
                    User_Sub_id: userData?.SubscriptionID,
                    UserID: userData?.UserID,
                    subscriptionId: subscriptionId,
                    PaymentDate: new Date(response.transaction.submitTimeUTC).toISOString().split('T')[0],  // Extract the date part
                    InvoiceNumber: response.transaction?.order?.invoiceNumber,
                    TotalAmount: response?.transaction?.authAmount,
                    AmountPaid: response?.transaction?.settleAmount,
                    Status: 'processed',
                    response: JSON.stringify(response)
                }
                await userModel.updatePaymentTransactionDetails(data);
            }
        } catch (error) {
            console.error('Error in getTransactionDetails:', error);
        }
    }

    async getSubscriptionDetails(req, res) {
        try {
            const subscriptionId = req.body.ARBGetSubscriptionRequest.subscriptionId;

            // Step 1: Set up merchant authentication
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            // Step 2: Create request to get subscription status
            const getRequest = new APIContracts.ARBGetSubscriptionRequest();
            getRequest.setMerchantAuthentication(merchantAuthenticationType);
            getRequest.setSubscriptionId(subscriptionId);

            // Step 3: Create and execute controller using Promises (converted to async/await)
            const ctrl = new controller.ARBGetSubscriptionController(getRequest.getJSON());

            const executeCtrl = () => {
                return new Promise((resolve, reject) => {
                    ctrl.execute(() => {
                        const apiResponse = ctrl.getResponse();
                        if (apiResponse) {
                            resolve(apiResponse);
                        } else {
                            reject(new Error('Null response received from the API'));
                        }
                    });
                });
            };

            const apiResponse = await executeCtrl();
            const response = new APIContracts.ARBGetSubscriptionResponse(apiResponse);

            if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                return res.status(200).json({
                    success: true,
                    subscriptionDetails: response.getSubscription(),
                    messageCode: response.getMessages().getMessage()[0].getCode(),
                    messageText: response.getMessages().getMessage()[0].getText(),
                });
            } else {
                return res.status(400).json({
                    success: false,
                    errorCode: response.getMessages().getMessage()[0].getCode(),
                    errorMessage: response.getMessages().getMessage()[0].getText(),
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || 'An unknown error occurred',
            });
        }
    }


    async getSubPlanDetails(req, res) {
        const planId = req.body.id;
        try {

            const data = await userModel.getSubscriptionPlanDetails(planId);

            return ResponseHelper.respond(200, true, data, 'Successfully retrieved subscription plan details.', res);
        } catch (error) {
            console.error(error);
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getUserSubscriptionPlanDetails(req, res) {
        try {
            const userId = req.user.id;

            const data = await userModel.getUserSubscriptionPlanDetails(userId);

            return ResponseHelper.respond(200, true, data, 'Successfully retrieved user subscription plan details.', res);
        } catch (error) {
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async cancelSubscription(req, res) {
        const { subscriptionId, status } = req.body;
        const userID = req.user.id;
        const email = req.user.email;
        const userData = await userModel.getUserByEmail(email);
        const user_sub_details = await userModel.getUserSubscriptionDetails(userID);
        const upcomingPlan = await userModel.getUpcomingPlanDetails(userID);

        // Include user subscription details in the user object
        userData.user_sub_details = user_sub_details;
        userData.user_sub_details.upcoming_plan_details = upcomingPlan;

        const isActive =
            user_sub_details.userSubscriptionID === subscriptionId &&
                user_sub_details.IsActiveSubscription === 1 &&
                user_sub_details.PaymentStatus === 'processed'
                ? "1"
                : "0";
        // const isActive = userData.user_sub_details.PaymentStatus == 'processed' ? "1" : "0";
        try {
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            const cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
            cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
            cancelRequest.setSubscriptionId(subscriptionId);

            const ctrl = new controller.ARBCancelSubscriptionController(cancelRequest.getJSON());

            const response = await new Promise((resolve, reject) => {
                ctrl.execute(function () {
                    const apiResponse = ctrl.getResponse();
                    if (apiResponse) {
                        const arbCancelResponse = new APIContracts.ARBCancelSubscriptionResponse(apiResponse);
                        resolve(arbCancelResponse);
                    } else {
                        reject(ctrl.getError() || 'Null Response');
                    }
                });
            });

            if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                const data = await userModel.cancelCurrentSubscription(subscriptionId, isActive);
                if (status == 1) {
                    const cusProfileDelete = await userModel.deletecustomerProfile(userID);
                }

                if (data.affectedRows > 0) {
                    return ResponseHelper.respond(200, true, { subscriptionId: subscriptionId, message: 'Subscription cancellation successfully.' }, 'Subscription cancellation successfully.', res);
                } else {
                    return ResponseHelper.respond(400, false, { subscriptionId: subscriptionId, message: 'Subscription cancellation failed.' }, 'Subscription cancellation failed!', res);
                }
            } else {
                return res.status(400).json({
                    data: {
                        error: {
                            message: response.getMessages().getMessage()[0].getText(),
                        },
                        success: false
                    }
                });
            }
        } catch (error) {

            return res.status(500).json({
                data: {
                    error: {
                        message: 'Something went wrong!',
                        // errors: error.message,
                    },
                    success: false
                }
            });
        }
    }

    async cancelSubscriptions(req, res) {
        const { subscriptionId } = req.body;

        try {
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            const cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
            cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
            cancelRequest.setSubscriptionId(subscriptionId);

            const ctrl = new controller.ARBCancelSubscriptionController(cancelRequest.getJSON());

            const response = await new Promise((resolve, reject) => {
                ctrl.execute(function () {
                    const apiResponse = ctrl.getResponse();
                    if (apiResponse) {
                        const arbCancelResponse = new APIContracts.ARBCancelSubscriptionResponse(apiResponse);
                        resolve(arbCancelResponse);
                    } else {
                        reject(ctrl.getError() || 'Null Response');
                    }
                });
            });

            if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                const data = await userModel.cancelCurrentSubscriptions(subscriptionId);

                if (data.affectedRows > 0) {
                    return ResponseHelper.respond(200, true, { subscriptionId: subscriptionId, message: 'Subscription cancellation successfully.' }, 'Subscription cancellation successfully.', res);
                } else {
                    return ResponseHelper.respond(400, false, { subscriptionId: subscriptionId, message: 'Subscription cancellation failed.' }, 'Subscription cancellation failed!', res);
                }
            } else {
                return res.status(400).json({
                    data: {
                        error: {
                            message: response.getMessages().getMessage()[0].getText(),
                        },
                        success: false,
                    }
                });
            }
        } catch (error) {
            return res.status(500).json({
                data: {
                    error: {
                        message: 'Something went wrong!',
                    },
                    success: false,
                }
            });
        }
    }

    async insertWabhookData(eventType, payload) {
        try {
            await userModel.insertWebhookData(eventType, payload);
        } catch (error) {
            console.error('Error inserting webhook data:', error);
        }
    }

    async getInvoiceDetails(req, res) {
        try {
            const userId = req.user.id;
            const { start = 0, size = 10 } = req.query;  // Get 'start' and 'size' from the query parameters, with default values
            const { data, totalRowCount } = await userModel.getInvoiceDetails(userId, start, size);
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
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }
    async getInvoiceDetailsprint(req, res) {
        try {
            const userId = req.user.id;
            const PaymentTransactionID = req.params.id;
            const printdata = await userModel.getInvoiceDetailsPrint(userId, PaymentTransactionID);
            const invoiceurl = await invoiceexportpdf(printdata);
            return ResponseHelper.respond(200, true, invoiceurl, 'Successfully retrieved print Invoice details', res);
        } catch (error) {
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getUserHasSubscriptions(req, res) {
        try {
            const userId = req.user.id;
            const subscriptionIds = await userModel.getUserHasSubscriptions(userId);

            return ResponseHelper.respond(200, true, { userSubscriptionIDs: subscriptionIds }, 'Successfully retrieved subscriptions.', res);
        } catch (error) {
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async getPaymentProfiles(req, res) {
        try {
            const userId = req?.user?.id;
            const data = await userModel.getPaymentProfiles(userId);

            return ResponseHelper.respond(200, true, { paymentProfiledetails: data }, 'Successfully retrieved payment profile details.', res);
        } catch (error) {
            return ResponseHelper.respond(500, false, { error: 'Internal Server Error' }, null, res);
        }
    }

    async updateAutoRenew(req, res) {
        try {
            const { subscriptionId, status } = req.body;
            const userId = req.user.id;

            const autorenewStatus = status == '1' || status == "true" ? "1" : "0";

            // Update AutoRenew only if the value is different
            const result = await userModel.updateAutoRenew(subscriptionId, autorenewStatus);
            if (status == 0) {
                const action = 'Auto renew off successfully';
                const details = 'Auto renew off successfully';
                await userModel.subscriptionLog(subscriptionId, userId, action, details);
            } else {
                const action = 'Auto renew on successfully';
                const details = 'Auto renew on successfully';
                await userModel.subscriptionLog(subscriptionId, userId, action, details);
            }

            return res.status(200).json({
                success: true,
                message: "Auto-renew updated successfully.",
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Internal server error. Please try again later.",
            });
        }
    }

    async handleSubSuspension(data) {
        const subscriptionId = data.id;
        const customerPaymentProfileId = data.profile.customerPaymentProfileId;
        const userData = await userModel.getSubscriptionDetails(subscriptionId);
        const userDetails = await userModel.getUserByID(userData?.UserID);

        const action = 'Subscription Suspend';
        const details = 'Subscription has been suspended';
        await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);

        await userModel.updateSubscriptionAndPaymentStatus(subscriptionId, customerPaymentProfileId, '3', 'suspended');

        const replacements = {
            USERNAME: userDetails.name,
            PAYMENT_HEADER: 'Your Pathmaker Subscription Has Been Suspended',
            TEMPLATE_HEADER: 'We regret to inform you that your Pathmaker subscription has been suspended. This could be due to a failed payment or other issues.',
            TEMPLATE_FOOTER: `Please contact our support team or update your payment details to reactivate your Pathmaker subscription.`,

            COMPANY_NAME: process.env.APPNAME,
            BASE_URL: process.env.BASE_URL
        };
        await ResponseHelper.sendEmail(userDetails.email, 'Subscription Suspended', 'SubscriptionPayment', replacements);
    }

    async handleCustomerSubscriptionFailed(data) {
        const subscriptionId = data.id;
        const customerPaymentProfileId = data.profile.customerPaymentProfileId;
        const userData = await userModel.getSubscriptionDetails(subscriptionId);
        const userDetails = await userModel.getUserByID(userData?.UserID);

        const action = 'Subscription Failed';
        const details = 'Subscription Payment Failed';
        await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);

        await userModel.handleCustomerSubscriptionFailed(subscriptionId, customerPaymentProfileId, '2', 'failed');

        const replacements = {
            USERNAME: userDetails.name,
            PAYMENT_HEADER: 'Your Pathmaker Subscription Payment Failed',
            TEMPLATE_HEADER: 'We attempted to process your Pathmaker subscription payment, but unfortunately, the transaction failed.',
            TEMPLATE_FOOTER: `Please check your payment details or try a different payment method to ensure your Pathmaker subscription remains active.`,
            COMPANY_NAME: process.env.APPNAME,
            BASE_URL: process.env.BASE_URL
        };
        await ResponseHelper.sendEmail(userDetails.email, 'Payment Failed', 'SubscriptionPayment', replacements);
    }

    async handleCustomerSubscriptionTermination(data) {
        const subscriptionId = data.id;
        const customerPaymentProfileId = data.profile.customerPaymentProfileId;
        const userData = await userModel.getSubscriptionDetails(subscriptionId);
        const userDetails = await userModel.getUserByID(userData?.UserID);

        const action = 'Subscription Terminate';
        const details = 'Subscription has been terminated';
        await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);

        await userModel.handleCustomerSubscriptionTermination(subscriptionId, customerPaymentProfileId, '4', 'failed');
        const replacements = {
            USERNAME: userDetails.name,
            PAYMENT_HEADER: 'Your Pathmaker Subscription Terminated',
            TEMPLATE_HEADER: 'We regret to inform you that your Pathmaker subscription has been terminated.',
            TEMPLATE_FOOTER: `If you believe this is a mistake or you would like to renew your subscription to continue to enjoy the many benefits of ThePathMakerApp, please contact our support team. We appreciate your time with us and hope to serve you again in the future.`,
            COMPANY_NAME: process.env.APPNAME,
            BASE_URL: process.env.BASE_URL
        };
        await ResponseHelper.sendEmail(userDetails.email, 'Subscription Terminated', 'SubscriptionPayment', replacements);
    }

    async handlePaymentFraudDeclined(payload) {
        try {
            let merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            let getRequest = new APIContracts.GetTransactionDetailsRequest();
            getRequest.setMerchantAuthentication(merchantAuthenticationType);
            getRequest.setTransId(payload.id);

            let ctrl = new controller.GetTransactionDetailsController(getRequest.getJSON());

            const executeCtrl = () => {
                return new Promise((resolve, reject) => {
                    ctrl.execute(() => {
                        let apiResponse = ctrl.getResponse();
                        if (apiResponse) {
                            resolve(apiResponse);
                        } else {
                            reject(new Error('Null response received from the API'));
                        }
                    });
                });
            };

            let apiResponse = await executeCtrl();
            let response = new APIContracts.GetTransactionDetailsResponse(apiResponse);

            if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                const subscriptionId = response.transaction.subscription.id;
                const userData = await userModel.getSubscriptionDetails(subscriptionId);
                const userDetails = await userModel.getUserByID(userData?.UserID);
                const action = 'Subscription Declined';
                const details = 'Subscription payment unsuccessful';
                await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);
                const invoiceNumber = payload.invoiceNumber;

                await userModel.handleCustomerSubscriptionDeclined(subscriptionId, '2', 'failed', invoiceNumber);

                const replacements = {
                    USERNAME: userDetails.name,
                    PAYMENT_HEADER: 'Your Pathmaker Subscription Payment Unsuccessful',
                    TEMPLATE_HEADER: `We regret to inform you that your recent payment attempt was unsuccessful. Kindly check the details by <a href="${process.env.FRONTEND_URL}/login" style="color: blue; text-decoration: underline;">logging in</a> to the PathMaker app.`,
                    TEMPLATE_FOOTER: '',
                    COMPANY_NAME: process.env.APPNAME,
                    BASE_URL: process.env.BASE_URL
                };
                await ResponseHelper.sendEmail(userDetails.email, 'Payment Declined', 'SubscriptionPayment', replacements);

            } else {
                console.error('Error from API:', response.getMessages().getMessage()[0].getText());
            }
        } catch (error) {
            console.error('Error in getTransactionDetails:', error);
        }
    }

    async handleSubPaymentCancellation(subscriptionId) {
        const userData = await userModel.getSubscriptionDetails(subscriptionId);
        const userDetails = await userModel.getUserByID(userData?.UserID);
        // const action = 'Subscription Cancel';
        // const details = 'Subscription cancelled successfully';
        // await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);
        // here if paymen proceeed then dont want to change any thing
        const transactionData = await userModel.getUserHasSubTransaction(subscriptionId);
        const lastTransaction = transactionData.sort((a, b) => b.PaymentTransactionID - a.PaymentTransactionID)[0];
        if (!lastTransaction) { return }

        const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
        const currentDate = formatDate(new Date());

        if (lastTransaction.Status === 'processed') {
            const replacements = {
                USERNAME: userDetails.name,
                PAYMENT_HEADER: 'Your Pathmaker Subscription Has Been Cancelled',
                TEMPLATE_HEADER: `We’re sorry to see you go. Your Pathmaker subscription has been successfully cancelled as of ${currentDate}. You can still enjoy the benefits of your subscription till ${formatDate(userData.EndDate)}.`,
                TEMPLATE_FOOTER: `If you have any questions or would like to reactivate your subscription to enjoy the many benefits of ThePathMakerApp, please don't hesitate to contact us. We hope to see you again soon!`,
                COMPANY_NAME: process.env.APPNAME,
                BASE_URL: process.env.BASE_URL
            };
            await ResponseHelper.sendEmail(userDetails.email, 'Subscription Cancelled', 'SubscriptionPayment', replacements);
            return;
        }
        await userModel.handleCustomerSubscriptionCancele(lastTransaction.SubscriptionID, 'failed');
        // as of [Cancellation Date]
        const replacements = {
            USERNAME: userDetails.name,
            PAYMENT_HEADER: 'Your Pathmaker Subscription Has Been Cancelled',
            TEMPLATE_HEADER: `We’re sorry to see you go. Your Pathmaker subscription has been successfully cancelled as of ${currentDate}.`,
            TEMPLATE_FOOTER: `If you have any questions or would like to reactivate your subscription to enjoy the many benefits of ThePathMakerApp, please don't hesitate to contact us. We hope to see you again soon!`,
            COMPANY_NAME: process.env.APPNAME,
            BASE_URL: process.env.BASE_URL
        };
        await ResponseHelper.sendEmail(userDetails.email, 'Subscription Cancelled', 'SubscriptionPayment', replacements);
    }

    async removeSubCustomerInfo(req, res) {
        const { subscriptionId } = req.body;

        try {
            const data = await userModel.removeSubCustomerInfo(subscriptionId);

            if (data.affectedRows > 0) {
                return ResponseHelper.respond(200, true, { subscriptionId: subscriptionId, message: 'Subscription cancellation successfully.' }, 'Subscription cancellation successfully.', res);
            } else {
                return ResponseHelper.respond(400, false, { subscriptionId: subscriptionId, message: 'Subscription cancellation failed.' }, 'Subscription cancellation failed!', res);
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Something went wrong!', error: error.message });
        }
    }

    checkSubscriptionLog = async (req, res) => {
        const userId = req?.user?.id;

        const { subscription_id, action, details } = req.body;

        try {
            const data = {
                userId: userId,
                subscription_id: subscription_id,
                action: action,
                details: details
            };

            const logDetails = await userModel.checkSubscriptionLog(data);

            return ResponseHelper.respond(200, true, { logData: logDetails }, 'Data recorded successfully.', res);
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };

    // Subscription Logs
    async subscriptionCreateLog(subscriptionId) {
        const userData = await userModel.getSubscriptionDetails(subscriptionId);
        const action = 'Subscription Create';
        const details = 'Subscription created successfully';
        const logDetails = await userModel.subscriptionLog(subscriptionId, userData?.UserID, action, details);
    }

    async getAddPaymentProfileToken(req, res) {
        try {
            const planType = req.body.planType || 'monthly'; // Extract plan type from request body

            if (!["monthly", "yearly"].includes(planType)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid plan type. Must be 'monthly' or 'yearly'."
                });
            }

            // Step 1: Merchant Authentication
            const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(process.env.API_LOGIN_KEY);
            merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

            // Step 2: Transaction Request
            let transactionRequestType = new APIContracts.TransactionRequestType();
            transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
            transactionRequestType.setAmount(1); // Set the actual amount here

            // Customer Data
            let customer = new APIContracts.CustomerDataType();
            customer.setEmail("dollarpatel2@yopmail.com");
            transactionRequestType.setCustomer(customer);

            // Add idempotency key to prevent duplicate transactions
            const idempotencyKey = require('crypto').randomUUID(); // Generate a unique key
            transactionRequestType.setRefTransId(idempotencyKey);

            // Add custom field for plan type
            // Add custom field for plan type
            let userFields = new APIContracts.UserField(); // ✅ Create array wrapper
            let merchantField = new APIContracts.UserField();
            merchantField.setName("planType");
            merchantField.setValue(planType);

            // userFields.setUserField([merchantField]); // ✅ Correct way to add userFields
            // transactionRequestType.setUserFields(userFields); // ✅ Set properly


            // Hosted Payment Page Settings (unchanged)
            var setting1 = new APIContracts.SettingType();
            setting1.setSettingName('hostedPaymentButtonOptions');
            setting1.setSettingValue('{"text": "Pay"}');

            var setting2 = new APIContracts.SettingType();
            setting2.setSettingName('hostedPaymentOrderOptions');
            setting2.setSettingValue('{"show": false}');

            var setting3 = new APIContracts.SettingType();
            setting3.setSettingName('hostedPaymentShippingAddressOptions');
            setting3.setSettingValue('{"show": true, "required": false}');

            var setting4 = new APIContracts.SettingType();
            setting4.setSettingName('hostedPaymentBillingAddressOptions');
            setting4.setSettingValue('{"show": true, "required": false}');

            var setting6 = new APIContracts.SettingType();
            setting6.setSettingName('hostedPaymentReturnOptions');
            setting6.setSettingValue('{"showReceipt": false, "url": "https://stagingapp.thepathmakerapp.com/lifeBookDashboard", "urlText": "Continue", "cancelUrl": "https://stagingapp.thepathmakerapp.com/lifeBookDashboard", "cancelUrlText": "Cancel"}');

            const hostedProfileSettings = new APIContracts.ArrayOfSetting();
            hostedProfileSettings.setSetting([setting1, setting2, setting3, setting6]);

            const requests = new APIContracts.GetHostedPaymentPageRequest();
            requests.setMerchantAuthentication(merchantAuthenticationType);
            requests.setTransactionRequest(transactionRequestType);
            requests.setHostedPaymentSettings(hostedProfileSettings);

            const ctrl = new controller.GetHostedProfilePageController(requests.getJSON());

            ctrl.execute(function () {
                const apiResponse = ctrl.getResponse();

                if (apiResponse) {
                    const response = new APIContracts.GetHostedProfilePageResponse(apiResponse);
                    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                        const formToken = response.getToken();
                        return res.status(200).json({
                            success: true,
                            formToken: formToken,
                            planType: planType, // Include plan type in response
                            idempotencyKey: idempotencyKey, // Include idempotency key for reference
                            message: response.getMessages().getMessage()[0].getText()
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            errorCode: response.getMessages().getMessage()[0].getCode(),
                            errorMessage: response.getMessages().getMessage()[0].getText()
                        });
                    }
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'No response received from the API'
                    });
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || 'An error occurred while processing the request'
            });
        }
    }

}

module.exports = new AuthController();