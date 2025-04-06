const db = require('../../config/database');
class AuthUserModel {

    trackFailedLoginAttempt(email, ip) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO admin_login_attempts (email, ip) VALUES (?, ?)';
            db.query(query, [email, ip], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    getFailedLoginAttempts(email) {
        return new Promise((resolve, reject) => {
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const query = 'SELECT COUNT(*) AS count FROM admin_login_attempts WHERE email = ? AND timestamp >= ?';
            db.query(query, [email, oneHourAgo], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].count);
            });
        });
    }
    

    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id, name, email, phone_number, password,country_code, token, profile_image, status, token_expires, is_super_admin , IFNULL(pass_change_count, 0) AS pass_change_count FROM admin WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    async getPasswordadminHistory(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM password_history_admin WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
    updateUserToken(userId, newToken) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?';
            db.query(query, [newToken, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    createUser(user) {
        console.log("user",user);
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO admin (name, email, phone_number,country_code, email_verified_at) VALUES (?, ?, ?, ?, ?)';
            const values = [user.name, user.email, user.phoneNumber,user.countryCode, null];

            db.query(query, values, (err, result) => {
                if (err) return reject(err);

                // Include the user data in the response
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

    getUserByPhoneNumber(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM admin WHERE phone_number = ?';
            db.query(query, [phoneNumber], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getUserByVerificationToken(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM admin WHERE verification_token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    updateUserStatus(userId, Status) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET status = ?, email_verified_at = CURRENT_TIMESTAMP WHERE id = ?';
            db.query(query, [Status, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    //from here
    updateVerificationToken(email, token_expires, verificationToken ,pass_change_count) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET verification_token = ?, token_expires = ?,pass_change_count = ? , last_pass_change = NOW() WHERE email = ?';
            const  passcount = pass_change_count + 1;
            const values = [verificationToken, token_expires,passcount, email];
            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    updateVerificationTokenfrompopup(email, token_expires, verificationToken) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET verification_token = ?, token_expires = ?,last_pass_change = NOW() WHERE email = ?';
            const values = [verificationToken, token_expires, email];
            db.query(query, values, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
    
    updateUserPassword(userId, password) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET password = ?,last_pass_change = NOW() WHERE id = ? ';
            db.query(query, [password, userId], (err, result) => {
                if (err) return reject(err);
                const query = 'INSERT INTO password_history_admin (password, user_id) VALUES (?, ?)';
                db.query(query, [password, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve();
                });
                resolve(result);
            });
        });
    }


    updateUserPasswordprofile(userId, password) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET password = ? WHERE id = ? ';
            db.query(query, [password, userId], (err, result) => {
                if (err) return reject(err);
                const query = 'INSERT INTO password_history_admin (password, user_id) VALUES (?, ?)';
                db.query(query, [password, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve();
                });
                resolve(result);
            });
        });
    }
    

    clearResetPasswordToken(userId) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
            db.query(query, [userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
    updateAdminUserToken(userId, token, token_expires) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET verification_token = ?, token_expires = ? WHERE id = ?';
            db.query(query, [token, token_expires, userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    async updateAdminProfile(userId, profileImageUrl) {

        return new Promise((resolve, reject) => {
            const updateQuery = `UPDATE admin SET profile_image = ? WHERE id = ?`;
            db.query(updateQuery, [profileImageUrl, userId], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result.changedRows > 0) {
                        const validProfileImageUrl = profileImageUrl.replace(/\\/g, '/');
                        resolve(validProfileImageUrl);
                    } else {
                        console.log(err);
                        reject(new Error('User profile update failed'));
                    }
                }
            });
        });
    }
}

module.exports = new AuthUserModel();
