const db = require('../../config/database');
const moment = require('moment');

class AdministratorModel {

    async getAllUsers(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = []) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.adminBuildSortConditions(sorting);
        const globalSearchCondition = this.buildGlobalSearch(globalFilter);

        try {
            const totalRowCount = await this.getAdminUserCount(globalSearchCondition);

            let query = `
                SELECT
                    id,
                    name,
                    email,
                    phone_number,
                    country_code,
                    profile_image,
                    email_verified_at,
                    created_at,
                    status,
                    last_pass_change,
                    IFNULL(pass_change_count, 0) AS pass_change_count
                FROM
                admin 
                WHERE is_super_admin = '0'`;

            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;
            const results = await new Promise((resolve, reject) => {
                db.query(query, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
            let passchangecount = "0";

            const data = results.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                phone_number: row.phone_number,
                country_code : row.country_code,
                profile_image: row.profile_image,
                email_verified_at: row.email_verified_at,
                created_at: row.created_at,
                status: row.status,
                last_pass_change: moment(row.last_pass_change).format('D MMMM YYYY'),
                last_pass_complare: row.last_pass_change,
                pass_change_count: row.pass_change_count
            }));

            const meta = {
                totalRowCount: totalRowCount
            };

            const response = {
                data: data,
                meta: meta,
            };
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getClientUsers(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = []) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.adminBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalSearch(globalFilter);
        try {
            const totalRowCount = await this.getClientUserCount(globalSearchCondition);

            let query = `
                SELECT
                    id,
                    name,
                    email,
                    phone_number,
                    profile_image,
                    email_verified_at,
                    created_at,
                    status
                FROM
                users`;

            if (globalSearchCondition) {
                query += ` WHERE ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            const results = await new Promise((resolve, reject) => {
                db.query(query, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            const data = results.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                phone_number: row.phone_number,
                profile_image: row.profile_image,
                email_verified_at: row.email_verified_at,
                created_at: row.created_at,
                status: row.status
            }));

            const meta = {
                totalRowCount: totalRowCount
            };

            const response = {
                data: data,
                meta: meta,
            };
            return response;
        } catch (error) {
            throw error;
        }
    }

    buildGlobalSearch(globalFilter) {
        if (!globalFilter) {
            return ''; // Return an empty string if globalFilter is not provided
        }

        const fields = ['name', 'email', 'phone_number', 'status'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    async getAdminUserCount(globalSearchCondition) {
        try {
            let query = `
                SELECT COUNT(id) AS total FROM admin WHERE is_super_admin = '0'`;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    adminBuildSortConditions(sorting) {
        if (!Array.isArray(sorting) || sorting.length === 0) {
            return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
        }

        console.log(sorting);
        const conditions = sorting.map(sort => {

            const sortBy = sort.id
            const sortOrder = sort.desc ? "DESC" : "ASC"
            return `${sortBy} ${sortOrder}`;

            // if (sort.sortBy && sort.sortOrder) { 

            //     const { sortBy, sortOrder } = sort;
            //     const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            //     return `${sortBy} ${direction}`;
            // }
            return ''; // Skip invalid sorting criteria
        }).filter(condition => condition); // Filter out empty strings

        if (conditions.length > 0) {
            return `ORDER BY ${conditions.join(', ')}`;
        }

        return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
    }

    async getClientUserCount(globalSearchCondition) {
        try {
            let query = `
                SELECT COUNT(id) AS total FROM users`;

            if (globalSearchCondition) {
                query += `
                    WHERE ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    async updateStatus(data) {
        const { id, status } = data;

        return new Promise((resolve, reject) => {
            // Execute SQL update query to update task status
            const updateQuery = 'UPDATE admin SET status = ? WHERE id = ?';
            const updateValues = [status, id];

            db.query(updateQuery, updateValues, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating status:', statusUpdateErr);
                    reject(statusUpdateErr);
                } else {
                    if (updateResult && updateResult.affectedRows !== undefined && updateResult.affectedRows > 0) {
                        resolve({
                            success: true,
                            id,
                            status,
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

    async updateUserAdmin(data) {
        const { id, name } = data;

        return new Promise((resolve, reject) => {
            // Execute SQL update query to update task status
            const updateQuery = 'UPDATE admin SET NAME = ? WHERE id = ?';
            const updateValues = [name, id];

            db.query(updateQuery, updateValues, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating status:', statusUpdateErr);
                    reject(statusUpdateErr);
                } else {
                    if (updateResult && updateResult.affectedRows !== undefined && updateResult.affectedRows > 0) {
                        resolve({
                            success: true,
                            id,
                            name,
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

    async updateClientUserStatus(data) {
        const { id, status } = data;

        return new Promise((resolve, reject) => {
            // Execute SQL update query to update task status
            const updateQuery = 'UPDATE users SET status = ? WHERE id = ?';
            const updateValues = [status, id];

            db.query(updateQuery, updateValues, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating status:', statusUpdateErr);
                    reject(statusUpdateErr);
                } else {
                    if (updateResult && updateResult.affectedRows !== undefined && updateResult.affectedRows > 0) {
                        resolve({
                            success: true,
                            id,
                            status,
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

    async GetDashboardData() {
        const query = `SELECT 
            (SELECT COUNT(*) AS Total_Users FROM users) AS Total_Users,
            (SELECT COUNT(*) AS Total_Tasks FROM life_book_has_tasks) AS Total_Tasks,
            (SELECT COUNT(*) AS Total_Knowledge FROM life_books lb WHERE lb.type = '1' ) AS Total_Knowledge,
            (SELECT COUNT(*) AS Total_Knowledge FROM life_books lb WHERE lb.type = '2' ) AS Total_Dicisions,
            (SELECT COUNT(*) AS Total_Knowledge FROM life_books lb WHERE lb.type = '3' ) AS Total_Awareness,
            (SELECT COUNT(*) AS Total_Life_Assessment FROM life_book_has_assessment) AS Total_Assessment`;

        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results); // Resolve the promise with the query results
            });
        });
    }
    async GetAdminList(page, limit, globalfilter) {
        const offset = (page - 1) * limit;

        const [filter] = globalfilter || [{}]; // Ensure filter is an object or empty object
        let queryParams = [];
        let filterQuery = [];

        let query = `SELECT ad.id, ad.name, ad.email, ad.phone_number, ad.status FROM admin ad`;

        // Initialize the ORDER BY clause
        let orderByClause = [];
        if (filter.search) {
            //orderByClause.push(`ad.name like  '%${filter.search}%'`);
            query += ` where ad.name like  '%${filter.search}%'`
            query += ` or ad.email like  '%${filter.search}%'`
            query += ` or ad.phone_number like  '%${filter.search}%'`
        }
        if (filter.name) {
            orderByClause.push(`ad.name ${filter.name.toUpperCase()}`);
        }
        if (filter.email) {
            orderByClause.push(`ad.email ${filter.email.toUpperCase()}`);
        }
        if (filter.phone_number) {
            orderByClause.push(`ad.phone_number ${filter.phone_number.toUpperCase()}`);
        }

        // If there's anything in orderByClause, join and add to the query
        if (orderByClause.length > 0) {
            query += ` ORDER BY ${orderByClause.join(', ')}`;
        }

        // Add pagination with LIMIT and OFFSET
        query += ` LIMIT ? OFFSET ?`;

        queryParams.push(parseInt(limit), parseInt(offset));

        // Construct filter query (optional WHERE clause)

        // Add the filter query to both the main query and the count query
        if (filterQuery.length > 0) {
            const whereClause = ` WHERE ` + filterQuery.join(' AND ');
            query = query.replace('ORDER BY', whereClause + ' ORDER BY');
        }

        let countQuery = `
            SELECT COUNT(*) AS total_count
            FROM admin ad `;
        if (filter.search) {
            countQuery += ` where ad.name like '%${filter.search}%'`
            countQuery += ` or ad.email like '%${filter.search}%'`
            countQuery += `  or ad.phone_number like '%${filter.search}%'`
        }
        return new Promise((resolve, reject) => {
            db.query(countQuery, queryParams.slice(0, -2), (err, countResults) => { // Pass parameters without LIMIT and OFFSET
                if (err) {
                    console.log('Error in countQuery:', err);
                    reject(err);
                } else {
                    const totalRecords = countResults[0].total_count;
                    db.query(query, queryParams, (err, results) => {
                        if (err) {
                            console.log('Error in main query:', err);
                            reject(err);
                        } else {
                            const adminlist = results.map(row => ({
                                id: row.id,
                                name: row.name,
                                email: row.email,
                                phone_number: row.phone_number,
                                status: row.status
                            }));
                            resolve({ adminlist, totalRecords });
                        }
                    });
                }
            });
        });
    }


    async addNewAdmin(data) {
        const { name, email, phone_number, verification_token, token_expires } = data;
        const addadminQuery = `INSERT INTO admin(name,email,phone_number,verification_token,reset_token_expires)VALUES(?,?,?,?,?)`;

        return new Promise((resolve, reject) => {
            db.query(addadminQuery, [name, email, phone_number, verification_token, token_expires], (err, results) => {
                if (err) {
                    return reject(err);
                }

                const responseData = {
                    id: results.insertId,
                    name: name,
                    email: email,
                    phone_number: phone_number,
                    verification_token: verification_token
                };

                resolve({ success: true, data: responseData });
            });
        });
    }
    async fetchPillarEventCount(userId) {
        const query = `
            SELECT
                type,
                COUNT(*) AS count
            FROM life_books
            WHERE user_id = ?
            GROUP BY type;
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);

                const pillarEventCount = {
                    knowledge: 0,
                    decision: 0,
                    awareness: 0,
                };

                results.forEach((row) => {
                    const { type, count } = row;
                    if (type === '1') pillarEventCount.knowledge = count;
                    else if (type === '2') pillarEventCount.decision = count;
                    else if (type === '3') pillarEventCount.awareness = count;
                });

                resolve(pillarEventCount);
            });
        });
    }

    async fetchPillarTaskCount(userId) {
        const query = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN lb.is_completed_assessment = '1' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN lb.is_completed_assessment = '0' THEN 1 ELSE 0 END) AS pending
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbht ON lb.id = lbht.lb_id
            WHERE lb.user_id = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);

                const [row] = results;
                const pillarTaskCount = {
                    total: row.total,
                    completed: row.completed,
                    active: row.pending,
                };

                resolve(pillarTaskCount);
            });
        });
    }

    async getSelfAssessmentGradeCounts(userId) {
        const gradeMapping = {
            1: 'A',
            2: 'B',
            3: 'C',
            4: 'D',
            5: 'F',
        };

        const query = `
            SELECT
                grade,
                COUNT(*) AS count
            FROM life_book_has_assessment lba
            JOIN life_books lb ON lba.lb_id = lb.id
            WHERE lb.user_id = ?
            GROUP BY grade
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);

                // need to discuss this lenght function
                if (results.length === 0) {
                    resolve({ gradeCounts: 0, maxGrade: 0 });
                    return;
                }

                const gradeCounts = results.reduce((acc, { grade, count }) => {
                    acc[gradeMapping[grade]] = count;
                    return acc;
                }, {});

                const maxGrade = Object.keys(gradeCounts).reduce((a, b) => gradeCounts[a] > gradeCounts[b] ? a : b);
                resolve({ gradeCounts, maxGrade });
            });
        });
    }

    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT email FROM admin WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getUserByPhoneNumber(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT phone_number FROM admin WHERE phone_number = ?';
            db.query(query, [phoneNumber], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    getAdminByResetPasswordToken(token) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM admin WHERE verification_token = ?';
            db.query(query, [token], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    async setAdminPassword(password, userId) {
        console.log("Password:", password, "UserId:", userId);

        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET password = ?, token = NULL WHERE id = ?';

            db.query(query, [password, userId], (err, result) => {
                if (err) {
                    console.error("Database Error:", err);
                    return reject(err);
                }
                console.log("Update Result:", result);
                resolve(result);
            });
        });
    }

    async deleteAdminUser(data) {
        const { id } = data;
        try {
            const deleteUserQuery = 'DELETE FROM admin WHERE id = ?';
            return new Promise((resolve, reject) => {
                db.query(deleteUserQuery, [id], (err, result) => {
                    if (err) { return reject(err); }
                    if (result.affectedRows > 0) {
                        const data = { id: id, message: 'User deleted successfully' };
                        resolve(data);
                    } else {
                        resolve({ success: false, id: id, message: 'User deleted failed' });
                    }
                });
            });

        } catch (error) {
            console.error('Error deleting task', error);
            throw error;
        }

    }

    // Get Admin User Details
    async getAdminByid(userId) {
        try {
            return new Promise((resolve, reject) => {
                const query = 'SELECT id, name, email, phone_number,country_code, password, email_verified_at, token, verification_token, status FROM admin WHERE id = ?';
                db.query(query, [userId], (err, results) => {
                    if (err) {
                        return reject({ success: false, message: 'Database query error', error: err });
                    }
                    if (results.length === 0) {
                        return resolve({ success: false, message: 'Admin not found' });
                    }
                    resolve({ success: true, data: results[0] });
                });
            });
        } catch (error) {
            throw error; // Optionally log the error here
        }
    }

    // Get Admin User Details
    async getAdminByToken(token) {
        try {
            return new Promise((resolve, reject) => {
                const query = 'SELECT id, name, email, phone_number, password, email_verified_at, token, verification_token, status FROM admin WHERE verification_token = ?';
                db.query(query, [token], (err, results) => {
                    if (err) {
                        return reject({ success: false, message: 'Database query error', error: err });
                    }
                    if (results.length === 0) {
                        return resolve({ success: false, message: 'Admin not found' });
                    }
                    resolve({ success: true, data: results[0] });
                });
            });
        } catch (error) {
            throw error; // Optionally log the error here
        }
    }

    async getPasswordadminHistory(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM password_history_admin WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                console.log(results);
                resolve(results);
            });
        });
    }
    //update User Password
    async updateUserPassword(userId, password, newToken) {

        console.log(userId  ,"pwd", password, "token", newToken)
        return new Promise((resolve, reject) => {
            const query = 'UPDATE admin SET password = ?, token = ?, verification_token = ? ,last_pass_change = NOW() WHERE id = ?';
            db.query(query, [password, newToken,newToken, userId], (err, result) => {
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

    // admin verify email_verify_at, status
    async updateVerifyUsers(userId) {
        const query = 'UPDATE admin SET email_verified_at = ?, status = ? WHERE id = ?';
        return new Promise((resolve, reject) => {
            const currentDate = new Date();
            db.query(query, [currentDate, "1", userId], (err, result) => {
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
            ORDER BY PaymentDate DESC
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
    
    async getInvoiceDetailsPrint(userid,PaymentTransactionID){
        const query = `SELECT us.name,us.email,us.phone_number,pts.PaymentTransactionID,pts.UserID AS ptsuserid, pts.PaymentDate,pts.InvoiceNumber,pts.TotalAmount,pts.AmountPaid,uhss.StartDate,uhss.EndDate,uhss.PlanID, CONCAT(UCASE(MID(subp.TermOptions,1,1)),LCASE(MID(subp.TermOptions,2))) AS TermOptions FROM payment_transactions pts JOIN users us ON pts.UserID = us.id JOIN user_has_subscriptions uhss ON uhss.userSubscriptionID = pts.SubscriptionID JOIN subscription_plans subp ON uhss.PlanID = subp.PlanID WHERE pts.PaymentTransactionID = ?`
                        return new Promise((resolve, reject) => {
                        db.query(query, [PaymentTransactionID], (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        });
                    });
    }
    getCurrentSubscriptionDetails(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    uhs.SubscriptionID, 
                    uhs.UserID, 
                    uhs.userSubscriptionID, 
                    uhs.PlanID, 
                    uhs.StartDate, 
                    uhs.EndDate, 
                    uhs.IsActive, 
                    uhs.status, 
                    sp.SubscriptionPrice
                FROM 
                    user_has_subscriptions uhs
                JOIN 
                    subscription_plans sp ON uhs.PlanID = sp.PlanID
                WHERE 
                    uhs.UserID = ? AND uhs.IsActive = 1
            `;
            
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
    
                if (results.length > 0) {
                    // Format dates in '21 Nov 2024' format
                    const formatDate = (date) => {
                        return new Intl.DateTimeFormat('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        }).format(new Date(date));
                    };
    
                    const formattedData = {
                        ...results[0],
                        StartDate: formatDate(results[0].StartDate),
                        EndDate: formatDate(results[0].EndDate),
                        SubscriptionPrice: parseFloat(results[0].SubscriptionPrice).toFixed(2) // Ensure two decimal places
                    };
    
                    resolve(formattedData);
                } else {
                    resolve(null);
                }
            });
        });
    }
    
    
}

module.exports = new AdministratorModel();
