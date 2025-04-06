const db = require('../../config/database');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
class UserModel {

    // New method to retrieve the number of failed login attempts for a given email
    getFailedLoginAttempts(email) {
        return new Promise((resolve, reject) => {
            // Calculate the timestamp one hour ago
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const query = 'SELECT COUNT(*) AS count FROM login_attempts WHERE email = ? AND timestamp >= ?';
            db.query(query, [email, oneHourAgo], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].count);
            });
        });
    }

    sentOTP = (user) => {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO user_has_email_otp (email, otp) VALUES (?, ?)';
            const values = [user.email, user.otp];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                const insertedUserData = {
                    id: result.insertId
                };
                resolve(insertedUserData);
            });
        });
    };

    resentOTP = (user) => {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO user_has_email_otp (email, otp) VALUES (?, ?)';
            const values = [user.email, user.otp];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                const insertedUserData = {
                    id: result.insertId
                };
                resolve(insertedUserData);
            });
        });
    };

    // Method to track failed login attempts
    trackFailedLoginAttempt(email, ip) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO login_attempts (email, ip) VALUES (?, ?)';
            db.query(query, [email, ip], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    // Method to clear login attempts for a given email
    clearLoginAttempts(email) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM login_attempts WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id, name, email, phone_number, password,country_code, token,token_expires, profile_image, status, two_factor_auth, is_completed_profile FROM users WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getUserByID(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT name, email, status FROM users WHERE id = ?';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getUserByPhoneNumber(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE phone_number = ?';
            db.query(query, [phoneNumber], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getLastOtpByPhoneNumber(phoneNumber) {
        console.log(phoneNumber);
        return new Promise((resolve, reject) => {
            const query = 'SELECT otp, create_date FROM user_sms_logs WHERE phone_number = ? ORDER BY id DESC LIMIT 1';
            db.query(query, [phoneNumber], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    // No OTP found for the user
                    resolve(null);
                } else {
                    const otpData = results[0];
                    const otpCreateTime = new Date(otpData.create_date);
                    const currentTime = new Date();

                    // Calculate the time difference in minutes
                    const timeDifference = Math.abs((currentTime - otpCreateTime) / 1000 / 60); // difference in minutes

                    if (timeDifference > 10) {
                        // If the OTP is older than 10 minutes
                        resolve({ otpExpired: true });
                    } else {
                        // OTP is still valid
                        resolve({ otp: otpData.otp, create_date: otpData.create_date });
                    }
                }
            });
        });
    }


    getLastOtpByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT otp, create_date FROM user_sms_logs WHERE email = ? ORDER BY id DESC LIMIT 1';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve(null);
                } else {
                    const data = {
                        otp: results[0].otp,
                        create_date: results[0].create_date
                    }
                    resolve(data);
                }
            });
        });
    }

    /**
     * Count the number of SMS messages sent to a phone number in the last hour.
     * @param {string} phoneNumber - The phone number to check.
     * @returns {Promise<number>} The count of SMS messages sent in the last hour.
     */
    async countSMSInLastHour(phoneNumber) {
        return new Promise((resolve, reject) => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const query = 'SELECT COUNT(*) AS smsCount FROM user_sms_logs WHERE phone_number = ? AND TIMESTAMP > ?';
            db.query(query, [phoneNumber, oneHourAgo], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].smsCount);
            });
        });
    }

    /**
     * Log an SMS sent by the user.
     * @param {number} userId - The ID of the user.
     * @param {string} phoneNumber - The phone number to which the SMS was sent.
     * @returns {Promise<Object>} The result of the insert query.
     */
    async logSMS(userId, phoneNumber, OTP, status) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO user_sms_logs (user_id, phone_number, otp, TIMESTAMP, status) VALUES (?, ?, ?, ?, ?)';
            const timestamp = new Date();
            db.query(query, [userId, phoneNumber, OTP, timestamp, status], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    enableTFA(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET two_factor_auth = ? WHERE phone_number = ?';
            db.query(query, ['1', phoneNumber], (err, result) => {
                if (err) {
                    console.error('Error updating two_factor_auth:', err);
                    return reject(err);
                }
                resolve(result);
            })
        });
    }

    deleteUserOtpByPhoneNumber(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM user_sms_logs WHERE phone_number = ?';
            db.query(query, [phoneNumber], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    deleteUserOtpByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM user_has_email_otp WHERE email = ?';
            db.query(query, [email], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    createUser(user) {
        console.log("user", user);
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO users (name, email, phone_number,country_code, password, verification_token, token_expires) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const values = [user.name, user.email, user.phoneNumber, user.countryCode, user.password, user.verification_token, user.token_expires];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                const query = 'INSERT INTO password_history (password, user_id) VALUES (?, ?)';
                db.query(query, [user.password, result.insertId], (err, results) => {
                    if (err) return reject(err);
                    resolve();
                });

                const insertedUserData = {
                    id: result.insertId,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                };

                resolve(insertedUserData);
            });
        });
    }

    getUserByVerificationToken(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE verification_token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getUserByRestToken(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE reset_token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    updateUserStatus(userId, Status) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET status = ?, email_verified_at = CURRENT_TIMESTAMP WHERE id = ?';
            db.query(query, [Status, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    isTokenBlacklisted(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT token FROM token_blacklist WHERE token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results.length > 0);
            });
        });
    }

    updateResetPasswordToken(userId, resetToken, resetTokenExpires) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?';
            db.query(query, [resetToken, resetTokenExpires, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    getUserByResetPasswordToken(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE reset_token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    updateUserPassword(userId, password) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET password = ?, token = NULL WHERE id = ?';
            db.query(query, [password, userId], (err, result) => {
                if (err) return reject(err);
                const query = 'INSERT INTO password_history (password, user_id) VALUES (?, ?)';
                db.query(query, [password, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve();
                });
                resolve(result);
            });
        });
    }

    getPasswordHistory(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM password_history WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    clearResetPasswordToken(userId) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
            db.query(query, [userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    updateUserToken(userId, newToken) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?';
            db.query(query, [newToken, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    // Add this function to userModel to update is_completed_profile
    updateIsCompletedProfile(userId) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET is_completed_profile = ? WHERE id = ?';
            db.query(query, ['1', userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    updateVerificationToken(email, token_expires, verificationToken) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET verification_token = ?, token_expires = ? WHERE email = ?';
            const values = [verificationToken, token_expires, email];
            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    getUserSubscriptionDetails(userId) {
        return new Promise((resolve, reject) => {
            // Construct the SQL query
            const query = `
                SELECT 
                    COALESCE(sub.SubscriptionID, 0) AS SubscriptionID,
                    COALESCE(sub.userSubscriptionID, 0) AS userSubscriptionID,
                    COALESCE(sub.IsAutoRenew, 1) AS IsAutoRenew,
                    COALESCE(sub.status, 0) AS status,
                    COALESCE(sub.PlanID, 0) AS PlanID, 
                    COALESCE(sub.PlanName, 'No Subscription') AS PlanName, 
                    COALESCE(sub.StartDate, '1900-01-01') AS StartDate, 
                    COALESCE(sub.EndDate, '1900-01-01') AS EndDate,
                    COALESCE(sub.IsActiveSubscription, 0) AS IsActiveSubscription,
                    pt.Status AS PaymentStatus
                FROM (
                    SELECT 1 AS dummy
                ) AS dummy
                LEFT JOIN (
                    SELECT 
                        us.SubscriptionID,
                        us.userSubscriptionID,
                        IsAutoRenew,
                        status,
                        us.PlanID, 
                        p.PlanName, 
                        us.StartDate, 
                        us.EndDate,
                        CASE 
                            WHEN us.EndDate >= CURDATE() THEN 1
                            ELSE 0
                        END AS IsActiveSubscription
                    FROM user_has_subscriptions us
                    JOIN subscription_plans p ON us.PlanID = p.PlanID
                    WHERE us.UserID = ? 
                    AND us.IsActive = TRUE
                    ORDER BY us.StartDate DESC
                    LIMIT 1
                ) AS sub ON dummy.dummy = 1
                LEFT JOIN payment_transactions pt ON pt.User_Sub_id = sub.SubscriptionID
            ORDER BY pt.PaymentDate DESC
            LIMIT 1`;

            // Execute the query
            db.query(query, [userId], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0]);
                }
            });
        });
    }

    getUpcomingPlanDetails(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    us.SubscriptionID,
                    us.userSubscriptionID,
                    IsAutoRenew,
                    us.status,
                    us.PlanID,
                    p.PlanName,
                    DATE_FORMAT(us.StartDate, '%Y-%m-%d') AS StartDate,
                    DATE_FORMAT(us.EndDate, '%Y-%m-%d') AS EndDate,
                    CASE 
                        WHEN us.StartDate > CURDATE() THEN 1
                        ELSE 0
                    END AS IsUpcomingPlan,
                    pt.Status AS PaymentStatus
                FROM user_has_subscriptions us
                JOIN subscription_plans p ON us.PlanID = p.PlanID
                LEFT JOIN payment_transactions pt ON pt.User_Sub_id = us.SubscriptionID
                WHERE us.UserID = ? 
                AND us.IsActive = 0
                AND us.status = 1
                AND us.StartDate > CURDATE()
                ORDER BY us.StartDate DESC
                LIMIT 1;
            `;

            // Execute the query
            db.query(query, [userId], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0] || null); // Return null if no upcoming plan exists
                }
            });
        });
    }


    getUserById(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id, name, email, phone_number, password, token, status FROM users WHERE id = ?';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    updateUserData(user) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET name = ? WHERE id = ?';
            db.query(query, [user.name, user.id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    async updateUserProfile(userId, profileImageUrl) {
        return new Promise((resolve, reject) => {
            const updateQuery = `UPDATE users SET profile_image = ? WHERE id = ?`;
            db.query(updateQuery, [profileImageUrl, userId], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result.changedRows > 0) {
                        const validProfileImageUrl = profileImageUrl.replace(/\\/g, '/');
                        resolve(validProfileImageUrl);
                    } else {
                        reject(new Error('User profile update failed'));
                    }
                }
            });
        });
    }

    async getUserProfile(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT profile_image FROM users WHERE id = ?`;
            db.query(query, [userId], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result.length > 0) {
                        resolve(result[0]);
                    } else {
                        reject(new Error('User not found'));
                    }
                }
            });
        });
    }

    async getPendingLifeBooks() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT lb.id, lb.title AS experienceTitle, lb.status, lb.type, lb.created_at,lb.user_id, u.name AS user_name, u.email AS user_email
                FROM life_books lb
                JOIN users u ON lb.user_id = u.id
                WHERE lb.status = '1' AND DATE(lb.created_at) <= DATE_SUB(NOW(), INTERVAL 2 DAY)`;

            db.query(query, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    getUserByID(userID) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id = ?';
            db.query(query, [userID], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result.length === 0) {
                        reject('User not found');
                    } else {
                        resolve(result[0]);
                    }
                }
            });
        });
    }

    archiveUser(user) {
        return new Promise((resolve, reject) => {
            const query = `
            INSERT INTO user_arch (id, CurrentPlanID, name, email, phone_number, profile_image, password, email_verified_at, token, verification_token, token_expires, reset_token, reset_token_expires, last_login, is_completed_profile, status, AutoRenew, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                user.id,
                user.CurrentPlanID,
                user.name,
                user.email,
                user.phone_number,
                user.profile_image,
                user.password,
                user.email_verified_at,
                user.token,
                user.verification_token,
                user.token_expires,
                user.reset_token,
                user.reset_token_expires,
                user.last_login,
                user.is_completed_profile,
                user.status,
                user.AutoRenew,
                user.created_at
            ];
            db.query(query, values, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    archiveUserSubscriptions(userID) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO user_has_subscriptions_arch (UserID, PlanID, StartDate, EndDate, IsActive, IsAutoRenew)
                SELECT UserID, PlanID, StartDate, EndDate, IsActive, IsAutoRenew
                FROM user_has_subscriptions
                WHERE UserID = ?`;

            db.query(query, [userID], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    deleteUserSubscriptions(userID) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM user_has_subscriptions WHERE UserID = ?';
            db.query(query, [userID], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    deleteUser(userID) {
        return new Promise((resolve, reject) => {
            // First, delete relevant records in the life_books table
            const deleteLifeBooksQuery = 'DELETE FROM life_books WHERE user_id = ?';
            db.query(deleteLifeBooksQuery, [userID], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    // After deleting relevant records, proceed with user deletion
                    const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
                    db.query(deleteUserQuery, [userID], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async updateTFA(data) {
        const { id } = data;
        return new Promise((resolve, reject) => {
            const updateQuery = 'UPDATE users SET two_factor_auth = ? WHERE id = ?';
            const updateValues = ['0', id];

            db.query(updateQuery, updateValues, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating status:', statusUpdateErr);
                    reject(statusUpdateErr);
                } else {
                    if (updateResult && updateResult.affectedRows !== undefined && updateResult.affectedRows > 0) {
                        resolve({
                            success: true,
                            id
                        });
                    } else {
                        resolve({
                            success: false,
                            message: 'Data not found!',
                        });
                    }
                }
            });
        });
    }

    getAllExperinceTitle(userId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT lb.id AS labelid, lb.title AS experince_title,lb.type AS experince_type FROM life_books lb where lb.user_id = ?  ORDER BY lb.type';
            db.query(query, [userId], (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }

    getAllJournalTitles(userId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT jou.id,jou.title,jou.content,jou.status,jou.created_at FROM journals jou WHERE user_id = ? and jou.status != "2"';
            db.query(query, [userId], (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }

    async hasActiveSubscription(userID) {
        const query = `
            SELECT SubscriptionID
            FROM user_has_subscriptions
            WHERE UserID = ?
              AND IsActive = 1
              AND PlanID != (SELECT PlanID FROM subscription_plans WHERE PlanName = 'Free')
              AND CURDATE() BETWEEN StartDate AND EndDate
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userID], (err, results) => {
                if (err) return reject(err);
                resolve(results.length > 0);  // Returns true if active subscription exists, else false
            });
        });
    }

    async isFreePlan(PlanID) {
        const query = `
            SELECT PlanID FROM subscription_plans WHERE PlanName = 'Free' AND PlanID = ?
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [PlanID], (err, results) => {
                if (err) return reject(err);
                resolve(results.length > 0); // True if it is a free plan
            });
        });
    }

    async insertSubscriptionDetails(data, userID, startDate, endDate, PlanID, totalOccurrences) {
        const isFree = await this.isFreePlan(PlanID);

        const activeSubscriptionExists = await this.hasActiveSubscription(userID);
        const isActive = (isFree || !activeSubscriptionExists) ? '1' : '0';
        const totalOccurrencesValue = totalOccurrences == 0 ? '0' : '1';

        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO user_has_subscriptions (TransactionID, UserID, userSubscriptionID, PlanID, StartDate, EndDate, userProfileId, userPaymentProfileId, userAddressId, IsActive, IsAutoRenew ) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
            const values = ['', userID, data.subscriptionId, PlanID, startDate, endDate, data.profile.customerProfileId, data.profile.customerPaymentProfileId, data.profile.customerAddressId, isActive, totalOccurrencesValue];

            db.query(query, values, async (err, result) => {
                if (err) return reject(err);

                if (!isFree) {
                    try {
                        await new Promise((resolve, reject) => {
                            const deactivateFreePlanQuery = `
                                UPDATE user_has_subscriptions 
                                SET IsActive = 0 
                                WHERE UserID = ? 
                                  AND IsActive = 1 
                                  AND PlanID = (SELECT PlanID FROM subscription_plans WHERE PlanName = 'Free')
                            `;
                            db.query(deactivateFreePlanQuery, [userID], (err, result) => {
                                if (err) return reject(err);
                                resolve(result);
                            });
                        });
                    } catch (error) {
                        return reject(error);
                    }
                }

                const insertedUserData = {
                    id: result.insertId,
                    userID: userID,
                    subscriptionId: data.subscriptionId,
                    startDate: startDate,
                    customerProfileId: data.profile.customerProfileId,
                    userPaymentProfileId: data.profile.customerPaymentProfileId,
                    userAddressId: data.profile.customerAddressId,
                    IsActive: isActive
                };
                resolve(insertedUserData);
            });
        });

    }

    async insertPRofileSubscriptionDetaile(data, userID, startDate, endDate, PlanID, isActive, totalOccurrences) {

        const totalOccurrencesValue = totalOccurrences == 0 ? '0' : '1';

        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO user_has_subscriptions (TransactionID, UserID, userSubscriptionID, PlanID, StartDate, EndDate, userProfileId, userPaymentProfileId, userAddressId, IsActive, IsAutoRenew ) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
            const values = ['', userID, data.subscriptionId, PlanID, startDate, endDate, data.profile.customerProfileId, data.profile.customerPaymentProfileId, data.profile.customerAddressId, isActive, totalOccurrencesValue];

            db.query(query, values, async (err, result) => {
                if (err) return reject(err);

                const insertedUserData = {
                    id: result.insertId,
                    userID: userID,
                    subscriptionId: data.subscriptionId,
                    startDate: startDate,
                    customerProfileId: data.profile.customerProfileId,
                    userPaymentProfileId: data.profile.customerPaymentProfileId,
                    userAddressId: data.profile.customerAddressId,
                    IsActive: isActive
                };
                resolve(insertedUserData);
            });
        });

    }

    async insertInvoiceDetails(data, User_Sub_id, userID, invoiceNumber, TotalAmount) {
        const paymentDate = new Date().toISOString().split('T')[0];
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO payment_transactions (User_Sub_id, UserID, SubscriptionID, PaymentDate, InvoiceNumber,TotalAmount, AmountPaid, userProfileId, userPaymentProfileId, userAddressId, status ) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
            const values = [User_Sub_id, userID, data.subscriptionId, paymentDate, invoiceNumber, TotalAmount, TotalAmount, data.profile.customerProfileId, data.profile.customerPaymentProfileId, data.profile.customerAddressId, 'pending'];

            db.query(query, values, async (err, result) => {
                if (err) return reject(err);

                const insertedUserData = {
                    id: result.insertId,
                    userID: userID,
                    subscriptionId: data.subscriptionId,
                    paymentDate: paymentDate,
                    TotalAmount: TotalAmount,
                    AmountPaid: TotalAmount,
                    customerProfileId: data.profile.customerProfileId,
                    userPaymentProfileId: data.profile.customerPaymentProfileId,
                    userAddressId: data.profile.customerAddressId,
                    invoiceNumber: invoiceNumber,
                    status: 'pending'
                };
                resolve(insertedUserData);
            });
        });

    }

    async insertSubPaymentDetails(data, userID) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO customer_payment_profile (UserID, userSubscriptionID, userProfileId, userPaymentProfileId, userAddressId ) VALUES (?,?,?,?,?)';
            const values = [userID, data.subscriptionId, data.profile.customerProfileId, data.profile.customerPaymentProfileId, data.profile.customerAddressId];

            db.query(query, values, async (err, result) => {
                if (err) return reject(err);

                const insertedUserData = {
                    id: result.insertId,
                    userID: userID,
                    subscriptionId: data.subscriptionId,
                    customerProfileId: data.profile.customerProfileId,
                    userPaymentProfileId: data.profile.customerPaymentProfileId,
                    userAddressId: data.profile.customerAddressId,
                };
                resolve(insertedUserData);
            });
        });

    }

    updatePaymentTransactionDetails(data) {
        return new Promise((resolve, reject) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM payment_transactions WHERE InvoiceNumber = ?`;
            const insertQuery = `
                INSERT INTO payment_transactions (
                    User_Sub_id, 
                    InvoiceNumber, 
                    TotalAmount, 
                    AmountPaid, 
                    Status, 
                    PaymentDate, 
                    response, 
                    SubscriptionID, 
                    UserID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const updateQuery = `
                UPDATE payment_transactions 
                SET 
                    User_Sub_id = ?, 
                    TotalAmount = ?, 
                    AmountPaid = ?, 
                    Status = ?, 
                    PaymentDate = ?, 
                    response = ?, 
                    SubscriptionID = ?, 
                    UserID = ? 
                WHERE InvoiceNumber = ?
            `;

            // Check if the record exists
            db.query(checkQuery, [data.InvoiceNumber], (err, results) => {
                if (err) return reject(err);

                const recordExists = results[0]?.count > 0;

                if (recordExists) {
                    // Update the existing record
                    const updateValues = [
                        data.User_Sub_id,
                        data.TotalAmount,
                        data.AmountPaid,
                        data.Status,
                        data.PaymentDate,
                        data.response,
                        data.subscriptionId,
                        data.UserID,
                        data.InvoiceNumber
                    ];

                    db.query(updateQuery, updateValues, (err, result) => {
                        if (err) return reject(err);
                        console.log(result);
                        resolve({ affectedRows: result.affectedRows });
                    });
                } else {
                    // Insert a new record
                    const insertValues = [
                        data.User_Sub_id,
                        data.InvoiceNumber,
                        data.TotalAmount,
                        data.AmountPaid,
                        data.Status,
                        data.PaymentDate,
                        data.response,
                        data.subscriptionId,
                        data.UserID
                    ];

                    db.query(insertQuery, insertValues, (err, result) => {
                        if (err) return reject(err);
                        console.log(result);
                        resolve({ affectedRows: result.affectedRows });
                    });
                }
            });
        });
    }



    updateTransactionIdDetails(data) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE user_has_subscriptions
                SET TransactionID = ? 
                WHERE userProfileId = ?
            `;
            const values = [data.payload.profile.customerPaymentProfileId];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve({
                    affectedRows: result.affectedRows
                });
            });
        });
    }

    async executeQuery(query, values) {
        return new Promise((resolve, reject) => {
            db.query(query, values, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    }

    async getSubscriptionPlanDetails(PlanID) {
        const planQuery = 'SELECT * FROM subscription_plans WHERE PlanID = ?';

        return new Promise((resolve, reject) => {
            db.query(planQuery, [PlanID], (err, results) => {
                if (err) return reject(err);
                const planDetails = results[0]; // Plan details object
                const insertedUserData = {
                    planDetails: {
                        PlanID: planDetails.PlanID,
                        PlanName: planDetails.PlanName,
                        SubscriptionPrice: planDetails.SubscriptionPrice.toFixed(2),
                        TermOptions: planDetails.TermOptions,
                        IsTrial: planDetails.IsTrial,
                        TrialDurationDays: planDetails.TrialDurationDays
                    }
                };
                resolve(insertedUserData);
            });
        });
    }

    async getUserSubscriptionPlanDetails(UserID) {
        const planQuery = `
            SELECT * 
            FROM user_has_subscriptions 
            WHERE UserID = ?
            AND IsActive = 1 
            ORDER BY created_at DESC
            LIMIT 1;
        `;

        return new Promise((resolve, reject) => {
            db.query(planQuery, [UserID], (err, results) => {
                if (err) return reject(err);
                if (results.length > 0) {
                    const userPlanDetails = results[0]; // Latest subscription details

                    // Adjust status if IsActive = 1 and status = 1 (cancelled)
                    if (userPlanDetails.IsActive === 1 && userPlanDetails.status === '1') {
                        userPlanDetails.status = '0'; // Set status to active
                    }

                    const startDate = new Date(userPlanDetails.StartDate);
                    const endDate = new Date(userPlanDetails.EndDate);

                    startDate.setDate(startDate.getDate() + 1);
                    endDate.setDate(endDate.getDate() + 1);

                    const insertedUserData = {
                        userPlanDetails: {
                            SubscriptionID: userPlanDetails.SubscriptionID,
                            TransactionID: userPlanDetails.TransactionID,
                            PlanID: userPlanDetails.PlanID,
                            StartDate: startDate.toISOString().split('T')[0],
                            EndDate: endDate.toISOString().split('T')[0],
                            IsActive: userPlanDetails.IsActive,
                            IsAutoRenew: userPlanDetails.IsAutoRenew,
                            status: userPlanDetails.status,  // Adjusted status
                            userProfileId: userPlanDetails.userProfileId,
                            userPaymentProfileId: userPlanDetails.userPaymentProfileId,
                            userAddressId: userPlanDetails.userAddressId,
                            created_at: userPlanDetails.created_at.toISOString()
                        }
                    };
                    resolve(insertedUserData);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async getSubscriptionDetails(subscriptionId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT UserID, SubscriptionID, StartDate, EndDate 
                FROM user_has_subscriptions
                WHERE userSubscriptionID = ?
            `;

            db.query(query, [subscriptionId], (err, result) => {
                if (err) { reject(err) }
                else if (result.length === 0) {
                    resolve(null);
                } else {
                    resolve(result[0]);
                }
            });
        });
    }

    async cancelCurrentSubscription(userSubscriptionID, isActive) {
        return new Promise((resolve, reject) => {
            let query;
            let values;

            query = `
                    UPDATE user_has_subscriptions
                    SET status = ?, IsAutoRenew = ?, IsActive = ?
                    WHERE userSubscriptionID = ?
                `;
            values = ['1', '0', isActive, userSubscriptionID];

            db.query(query, values, (err, result) => {
                if (err) { return reject(err) }
                resolve(result);
            });

        });
    }

    async deletecustomerProfile(userID) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM customer_payment_profile WHERE UserID = ?`;
            const values = [userID];

            db.query(query, values, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    }

    async cancelCurrentSubscriptions(userSubscriptionID, isStatus) {
        return new Promise((resolve, reject) => {
            let query;
            let values;

            if (isStatus === false) {
                resolve({ affectedRows: 0 });
            } else {
                query = `
                    UPDATE user_has_subscriptions
                    SET status = ?, IsAutoRenew = ?, IsActive = ?
                    WHERE userSubscriptionID = ?
                `;
                values = ['1', '0', '0', userSubscriptionID];

                db.query(query, values, (err, result) => {
                    if (err) { return reject(err) }
                    resolve(result);
                });
            }
        });
    }

    updateCusSubAutoRenewOff(subscriptionId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE user_has_subscriptions
                SET IsAutoRenew = ?
                WHERE userSubscriptionID = ?
            `;
            const values = ['0', subscriptionId];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve({ affectedRows: result.affectedRows });
            });
        });
    }

    updateAutoRenew(subscriptionId, status) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE user_has_subscriptions
                SET IsAutoRenew = ?
                WHERE userSubscriptionID = ?
                AND IsAutoRenew != ?
            `;
            const values = [status, subscriptionId, status];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve({ affectedRows: result.affectedRows });
            });
        });
    }

    async insertWebhookData(eventType, payload) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO webhookdata (eventType, payload) VALUES (?,?)';
            const values = [eventType, JSON.stringify(payload)];

            db.query(query, values, async (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    async getInvoiceDetails(userId, start, size) {
        const query = `
            SELECT PaymentTransactionID, UserID, SubscriptionID, PaymentDate, InvoiceDate, InvoiceNumber,
                TotalAmount, AmountPaid, Status, created_at
            FROM payment_transactions
            WHERE UserID = ?
            ORDER BY PaymentTransactionID DESC
            LIMIT ?, ?
        `;

        const countQuery = `
            SELECT COUNT(*) AS totalRowCount
            FROM payment_transactions
            WHERE UserID = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId, parseInt(start), parseInt(size)], (err, results) => {
                if (err) return reject(err);

                // Fetch the total row count
                db.query(countQuery, [userId], (err, countResults) => {
                    if (err) return reject(err);

                    const totalRowCount = countResults[0].totalRowCount;
                    resolve({
                        data: results,
                        totalRowCount: totalRowCount
                    });
                });
            });
        });
    }
    async getInvoiceDetailsPrint(userid, PaymentTransactionID) {
        const query = `SELECT us.name,us.email,us.phone_number,pts.PaymentTransactionID,pts.UserID AS ptsuserid, pts.PaymentDate,pts.InvoiceNumber,pts.TotalAmount,pts.AmountPaid,uhss.StartDate,uhss.EndDate,uhss.PlanID, CONCAT(UCASE(MID(subp.TermOptions,1,1)),LCASE(MID(subp.TermOptions,2))) AS TermOptions FROM payment_transactions pts JOIN users us ON pts.UserID = us.id JOIN user_has_subscriptions uhss ON uhss.userSubscriptionID = pts.SubscriptionID JOIN subscription_plans subp ON uhss.PlanID = subp.PlanID WHERE us.id = ? AND pts.PaymentTransactionID = ?
`
        return new Promise((resolve, reject) => {
            db.query(query, [userid, PaymentTransactionID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
    async getUserHasSubscriptions(userId) {
        const query = `
            SELECT userSubscriptionID, status
            FROM user_has_subscriptions 
            WHERE UserID = ? AND userSubscriptionID IS NOT NULL
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);

                // Return the full results with `userSubscriptionID` and `status`
                const subscriptions = results.map(row => ({
                    userSubscriptionID: row.userSubscriptionID,
                    status: row.status,
                }));

                resolve(subscriptions);
            });
        });
    }

    async getPaymentProfiles(userId) {
        const query = `
            SELECT id, userProfileId, userPaymentProfileId, userAddressId, created_at
            FROM customer_payment_profile
            WHERE UserID = ?
            ORDER BY created_at DESC
            LIMIT 1
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    updateSubscriptionAndPaymentStatus(subscriptionId, customerPaymentProfileId, subscriptionStatus, paymentStatus) {
        return new Promise((resolve, reject) => {
            const updateSubscriptionQuery = `
            UPDATE user_has_subscriptions
            SET status = ?, IsActive = ?
            WHERE userSubscriptionID = ? AND userPaymentProfileId = ?`;
            const subscriptionValues = [subscriptionStatus, '0', subscriptionId, customerPaymentProfileId];

            const updatePaymentQuery = `
            UPDATE payment_transactions
            SET Status = ?
            WHERE SubscriptionID = ? AND userPaymentProfileId = ?`;
            const paymentValues = [paymentStatus, subscriptionId, customerPaymentProfileId];

            db.query(updateSubscriptionQuery, subscriptionValues, (err, subscriptionResult) => {
                if (err) { return reject(err) }

                db.query(updatePaymentQuery, paymentValues, (err, paymentResult) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve({
                        subscriptionUpdate: subscriptionResult,
                        paymentUpdate: paymentResult,
                    });
                });
            });
        });
    }

    handleCustomerSubscriptionFailed(subscriptionId, customerPaymentProfileId, subscriptionStatus, paymentStatus) {
        return new Promise((resolve, reject) => {
            const updateSubscriptionQuery = `
            UPDATE user_has_subscriptions
            SET status = ?, IsActive = ?
            WHERE userSubscriptionID = ? AND userPaymentProfileId = ?`;
            const subscriptionValues = [subscriptionStatus, '0', subscriptionId, customerPaymentProfileId];

            const updatePaymentQuery = `
            UPDATE payment_transactions
            SET Status = ?
            WHERE SubscriptionID = ? AND userPaymentProfileId = ?`;
            const paymentValues = [paymentStatus, subscriptionId, customerPaymentProfileId];

            db.query(updateSubscriptionQuery, subscriptionValues, (err, subscriptionResult) => {
                if (err) { return reject(err) }

                db.query(updatePaymentQuery, paymentValues, (err, paymentResult) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve({
                        subscriptionUpdate: subscriptionResult,
                        paymentUpdate: paymentResult,
                    });
                });
            });
        });
    }

    handleCustomerSubscriptionTermination(subscriptionId, customerPaymentProfileId, subscriptionStatus, paymentStatus) {
        return new Promise((resolve, reject) => {
            const updateSubscriptionQuery = `
            UPDATE user_has_subscriptions
            SET status = ?, IsActive = ?
            WHERE userSubscriptionID = ? AND userPaymentProfileId = ?`;
            const subscriptionValues = [subscriptionStatus, '0', subscriptionId, customerPaymentProfileId];

            const updatePaymentQuery = `
            UPDATE payment_transactions
            SET Status = ?
            WHERE SubscriptionID = ? AND userPaymentProfileId = ?`;
            const paymentValues = [paymentStatus, subscriptionId, customerPaymentProfileId];

            db.query(updateSubscriptionQuery, subscriptionValues, (err, subscriptionResult) => {
                if (err) { return reject(err) }
                db.query(updatePaymentQuery, paymentValues, (err, paymentResult) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({
                        subscriptionUpdate: subscriptionResult,
                        paymentUpdate: paymentResult,
                    });
                });
            });
        });
    }

    handleCustomerSubscriptionDeclined(subscriptionId, subscriptionStatus, paymentStatus, InvoiceNumber) {
        return new Promise((resolve, reject) => {
            const updateSubscriptionQuery = `UPDATE user_has_subscriptions SET status = ?, IsActive = ? WHERE userSubscriptionID = ?`;
            const subscriptionValues = [subscriptionStatus, '0', subscriptionId];

            const updatePaymentQuery = `UPDATE payment_transactions SET Status = ? WHERE InvoiceNumber = ?`;
            const paymentValues = [paymentStatus, InvoiceNumber];

            db.query(updateSubscriptionQuery, subscriptionValues, (err, subscriptionResult) => {
                if (err) { return reject(err) }
                db.query(updatePaymentQuery, paymentValues, (err, paymentResult) => {
                    if (err) { return reject(err) }
                    resolve({
                        subscriptionUpdate: subscriptionResult,
                        paymentUpdate: paymentResult,
                    });
                });
            });
        });
    }

    async getUserHasSubTransaction(subscriptionId) {
        const query = `
            SELECT PaymentTransactionID, SubscriptionID, Status
            FROM payment_transactions 
            WHERE SubscriptionID = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [subscriptionId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    handleCustomerSubscriptionCancele(subscriptionId, subscriptionStatus) {
        return new Promise((resolve, reject) => {
            const updatePaymentQuery = `UPDATE payment_transactions SET Status = ? WHERE SubscriptionID = ?`;
            const paymentValues = [subscriptionStatus, subscriptionId];

            db.query(updatePaymentQuery, paymentValues, (err, paymentResult) => {
                if (err) { return reject(err) }
                resolve({
                    paymentUpdate: paymentResult,
                });
            });
        });
    }

    async removeSubCustomerInfo(subscriptionId) {
        const query = `
            DELETE FROM customer_payment_profile
            WHERE userSubscriptionID = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [subscriptionId], (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });
    }

    // async updateExpiredSubscriptions() {
    //     return new Promise((resolve, reject) => {
    //         // Step 1: Deactivate expired subscriptions
    //         const deactivateQuery = `
    //             UPDATE user_has_subscriptions
    //             SET IsActive = 0
    //             WHERE EndDate < NOW() AND IsActive = 1
    //         `;

    //         db.query(deactivateQuery, (err, deactivateResult) => {
    //             if (err) return reject(err);

    //             console.log(`${deactivateResult.affectedRows} subscriptions marked as inactive due to expiration.`);

    //             // Step 2: Activate the next valid subscription (excluding free plans and already active plans)
    //             const activateQuery = `
    //                 UPDATE user_has_subscriptions us
    //                 JOIN (
    //                     SELECT 
    //                         UserID, 
    //                         SubscriptionID
    //                     FROM (
    //                         SELECT 
    //                             UserID, 
    //                             SubscriptionID, 
    //                             PlanID,
    //                             ROW_NUMBER() OVER (
    //                                 PARTITION BY UserID 
    //                                 ORDER BY StartDate ASC, EndDate ASC, SubscriptionID ASC
    //                             ) AS RowNum
    //                         FROM user_has_subscriptions
    //                         WHERE IsActive = 0 
    //                           AND status = '0' 
    //                           AND StartDate <= NOW() 
    //                           AND EndDate >= NOW()
    //                           AND PlanID NOT IN (
    //                               SELECT PlanID FROM subscription_plans WHERE PlanName = 'Free'
    //                           )
    //                     ) RankedSubscriptions
    //                     WHERE RowNum = 1
    //                 ) rs ON us.UserID = rs.UserID AND us.SubscriptionID = rs.SubscriptionID
    //                 SET us.IsActive = 1;
    //             `;

    //             db.query(activateQuery, (err, activateResult) => {
    //                 if (err) return reject(err);

    //                 console.log(`${activateResult.affectedRows} subscriptions marked as active based on the earliest valid plan.`);
    //                 resolve({
    //                     deactivatedRows: deactivateResult.affectedRows,
    //                     activatedRows: activateResult.affectedRows,
    //                 });
    //             });
    //         });
    //     });
    // }

    //*** */
    // async updateExpiredSubscriptions() {
    //     return new Promise((resolve, reject) => {
    //         // Step 1: Deactivate expired subscriptions
    //         const deactivateQuery = `
    //             UPDATE user_has_subscriptions
    //             SET IsActive = 0
    //             WHERE EndDate < NOW() AND IsActive = 1
    //         `;

    //         db.query(deactivateQuery, (err, deactivateResult) => {
    //             if (err) return reject(err);

    //             console.log(`${deactivateResult.affectedRows} subscriptions marked as inactive due to expiration.`);

    //             // Step 2: Update auto-renew subscriptions
    //             const autoRenewQuery = `
    //                 UPDATE user_has_subscriptions
    //                 SET StartDate = NOW(),
    //                     EndDate = DATE_ADD(NOW(), INTERVAL (
    //                         CASE PlanID 
    //                             WHEN 2 THEN 7
    //                             WHEN 3 THEN 10
    //                         END
    //                     ) DAY)
    //                 WHERE IsAutoRenew = 1 AND EndDate < NOW()
    //             `;

    //             db.query(autoRenewQuery, (err, autoRenewResult) => {
    //                 if (err) return reject(err);

    //                 console.log(`${autoRenewResult.affectedRows} auto-renew subscriptions updated.`);

    //                 // Step 3: Activate the next valid subscription (only for users without active auto-renew plans)
    //                 const activateQuery = `
    //                     UPDATE user_has_subscriptions us
    //                     JOIN (
    //                         SELECT 
    //                             UserID, 
    //                             SubscriptionID
    //                         FROM (
    //                             SELECT 
    //                                 UserID, 
    //                                 SubscriptionID, 
    //                                 PlanID,
    //                                 ROW_NUMBER() OVER (
    //                                     PARTITION BY UserID 
    //                                     ORDER BY StartDate ASC, EndDate ASC, SubscriptionID ASC
    //                                 ) AS RowNum
    //                             FROM user_has_subscriptions
    //                             WHERE IsActive = 0 
    //                               AND status = '0' 
    //                               AND StartDate <= NOW() 
    //                               AND EndDate >= NOW()
    //                               AND PlanID != 1
    //                         ) RankedSubscriptions
    //                         WHERE RowNum = 1
    //                     ) rs ON us.UserID = rs.UserID AND us.SubscriptionID = rs.SubscriptionID
    //                     SET us.IsActive = 1`;

    //                 db.query(activateQuery, (err, activateResult) => {
    //                     if (err) return reject(err);

    //                     console.log(`${activateResult.affectedRows} subscriptions marked as active based on the earliest valid plan.`);
    //                     resolve({
    //                         deactivatedRows: deactivateResult.affectedRows,
    //                         autoRenewUpdated: autoRenewResult.affectedRows,
    //                         activatedRows: activateResult.affectedRows,
    //                     });
    //                 });
    //             });
    //         });
    //     });
    // }

    async updateExpiredSubscriptions() {
        return new Promise((resolve, reject) => {
            // Step 1: Deactivate expired subscriptions
            const deactivateQuery = `
                UPDATE user_has_subscriptions
                SET IsActive = 0
                WHERE EndDate < CURDATE() AND IsActive = 1
            `;

            db.query(deactivateQuery, (err, deactivateResult) => {
                if (err) return reject(err);

                console.log(`${deactivateResult.affectedRows} subscriptions marked as inactive due to expiration.`);

                // Step 2: Update auto-renew subscriptions
                const autoRenewQuery = `
                    UPDATE user_has_subscriptions
                    SET StartDate = CURDATE(),
                        EndDate = DATE_ADD(CURDATE(), INTERVAL (
                            CASE PlanID 
                                WHEN 2 THEN 6
                                WHEN 3 THEN 9
                            END
                        ) DAY)
                    WHERE IsAutoRenew = 1 AND EndDate < CURDATE()
                `;

                db.query(autoRenewQuery, (err, autoRenewResult) => {
                    if (err) return reject(err);

                    console.log(`${autoRenewResult.affectedRows} auto-renew subscriptions updated.`);

                    // Step 3: Activate the next valid subscription (only for users without active auto-renew plans)
                    const activateQuery = `
                        UPDATE user_has_subscriptions us
                        JOIN (
                            SELECT 
                                UserID, 
                                SubscriptionID
                            FROM (
                                SELECT 
                                    UserID, 
                                    SubscriptionID, 
                                    PlanID,
                                    ROW_NUMBER() OVER (
                                        PARTITION BY UserID 
                                        ORDER BY StartDate ASC, EndDate ASC, SubscriptionID ASC
                                    ) AS RowNum
                                FROM user_has_subscriptions
                                WHERE IsActive = 0 
                                  AND status = '0' 
                                  AND StartDate <= CURDATE() 
                                  AND EndDate >= CURDATE()
                                  AND PlanID != 1
                            ) RankedSubscriptions
                            WHERE RowNum = 1
                        ) rs ON us.UserID = rs.UserID AND us.SubscriptionID = rs.SubscriptionID
                        SET us.IsActive = 1`;

                    db.query(activateQuery, (err, activateResult) => {
                        if (err) return reject(err);

                        console.log(`${activateResult.affectedRows} subscriptions marked as active based on the earliest valid plan.`);
                        resolve({
                            deactivatedRows: deactivateResult.affectedRows,
                            autoRenewUpdated: autoRenewResult.affectedRows,
                            activatedRows: activateResult.affectedRows,
                        });
                    });
                });
            });
        });
    }




    async updatepasswordlimit() {
        const autoupdatequery = `UPDATE admin SET pass_change_count = 0 WHERE TIMESTAMPDIFF(HOUR, last_pass_change, NOW()) > 24`;
        return new Promise((resolve, reject) => {
            db.query(autoupdatequery, (err, result) => {
                if (err) {
                    console.error('Error updating two_factor_auth:', err);
                    return reject(err);
                }
                resolve(result);
            })
        })
    }

    checkSubscriptionLog(data) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO subscription_logs (user_id, subscription_id, action, details) VALUES (?, ?, ?, ?)';
            const values = [data.userId, data.subscription_id, data.action, data.details];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);

                const insertedData = {
                    id: result.insertId,
                    subscription_id: data.subscription_id,
                    action: data.action,
                    details: data.details
                };

                resolve(insertedData);
            });
        });
    }

    // Subscription Logs
    subscriptionLog(subscriptionId, userId, action, details) {
        return new Promise((resolve, reject) => {
            const updateSubscriptionQuery = 'INSERT INTO subscription_logs (user_id, subscription_id, action, details) VALUES (?, ?, ?, ?)';

            const subscriptionValues = [userId, subscriptionId, action, details];

            db.query(updateSubscriptionQuery, subscriptionValues, (err, result) => {
                if (err) { return reject(err) }
                resolve({
                    result: result
                });
            });
        });
    }

}

module.exports = new UserModel();
