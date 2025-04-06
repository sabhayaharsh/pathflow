const db = require('../../config/database');

class AdministratorModel {

    async getClientUsers(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = []) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalSearch(globalFilter);
        try {
            const totalRowCount = await this.getClientUserCount(globalSearchCondition);

            let query = `
                SELECT
                    id,
                    name,
                    email,
                    phone_number,
                    country_code,
                    profile_image,
                    email_verified_at,
                    status
                FROM
                users`;

            if (globalSearchCondition) {
                query += ` WHERE ${globalSearchCondition}`;
            }
            //console.log("global search",globalSearchCondition);
            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            //console.log("query",query);
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
                country_code : row.country_code,
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
        const fields = ['name', 'email', 'phone_number'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    clientBuildSortConditions(sorting) {
        if (!Array.isArray(sorting) || sorting.length === 0) {
            return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
        }

        const conditions = sorting.map(sort => {
            const sortBy = sort.id
            const sortOrder = sort.desc ? "DESC" : "ASC"
            return `${sortBy} ${sortOrder}`;
            // if (sort.sortBy && sort.sortOrder) { // Check if sortBy and sortOrder are not empty strings
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

    async GetUserDetailsById(userId) {
        const query = `
            SELECT id, name, email, phone_number,country_code, profile_image, status, email_verified_at, created_at, last_login 
            FROM users WHERE id = ?`;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve([]);  // No records found
                } else {
                    const row = results[0];
                    const userDetails = {
                        id: row.id,
                        name: row.name,
                        email: row.email,
                        phone_number: row.phone_number,                        
                        country_code : row.country_code,
                        profile_image: row.profile_image,
                        status: row.status,
                        email_verified_at: row.email_verified_at,
                        created_at: row.created_at,
                        last_login: row.last_login
                    };
                    resolve(userDetails);
                }
            });
        });
    }

    async getAdminByid(userId) {
        try {
            return new Promise((resolve, reject) => {
                const query = 'SELECT name, email, phone_number, password, email_verified_at, token, status FROM admin WHERE id = ?';
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

    //update User Password
    async updateUserPassword(data) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET password = ?, token = null WHERE id = ?';
            db.query(query, [data.password, data.userId], (err, result) => {
                const query = 'INSERT INTO password_history (password, user_id) VALUES (?, ?)';
                db.query(query, [data.password, data.userId], (err, results) => {
                    if (err) return reject(err);
                    resolve();
                });
                if (err) return reject(err);
                resolve();
            });
        });
    }

    // admin verify email_verify_at, status
    async updateVerifyUsers(userId) {
        const query = 'UPDATE users SET email_verified_at = ?, status = ? WHERE id = ?';
        return new Promise((resolve, reject) => {
            const currentDate = new Date();
            db.query(query, [currentDate, "1", userId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    async fetchPillarEventCount(userId) {
        const query = `
            SELECT 
                type,
                SUM(CASE WHEN is_completed_assessment = '0' THEN 1 ELSE 0 END) AS activeCount,
                SUM(CASE WHEN is_completed_assessment = '1' THEN 1 ELSE 0 END) AS completeCount,
                COUNT(*) AS totalCount
            FROM life_books
            WHERE user_id = ? 
            GROUP BY type;
        `;
    
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
    
                const eventDetails = {
                    knowledgeDetails: {
                        totalExperience: 0,
                        activeExperience: 0,
                        completeExperience: 0
                    },
                    opportunityDetails: {
                        totalOpportunity: 0,
                        activeOpportunity: 0,
                        completeOpportunity: 0
                    },
                    observationDetails: {
                        totalObservation: 0,
                        activeObservation: 0,
                        completeObservation: 0
                    }
                };
    
                results.forEach((row) => {
                    const { type, activeCount, completeCount, totalCount } = row;
    
                    if (type === '1') {
                        eventDetails.knowledgeDetails.totalExperience = totalCount;
                        eventDetails.knowledgeDetails.activeExperience = activeCount;
                        eventDetails.knowledgeDetails.completeExperience = completeCount;
                    } else if (type === '2') {
                        eventDetails.opportunityDetails.totalOpportunity = totalCount;
                        eventDetails.opportunityDetails.activeOpportunity = activeCount;
                        eventDetails.opportunityDetails.completeOpportunity = completeCount;
                    } else if (type === '3') {
                        eventDetails.observationDetails.totalObservation = totalCount;
                        eventDetails.observationDetails.activeObservation = activeCount;
                        eventDetails.observationDetails.completeObservation = completeCount;
                    }
                });
    
                resolve(eventDetails);
            });
        });
    }

    async fetchPillarTaskCount(userId) {
        const query = `
            SELECT 
                lb.type,
                SUM(CASE WHEN t.status = '0' THEN 1 ELSE 0 END) AS activeCount,
                SUM(CASE WHEN t.status = '1' THEN 1 ELSE 0 END) AS completedCount,
                COUNT(*) AS totalCount
            FROM life_books lb
            JOIN life_book_has_tasks t ON lb.id = t.lb_id
            WHERE lb.user_id = ?
            GROUP BY lb.type;
        `;
    
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
    
                const taskDetails = {
                    experienceTasksDetails: {
                        totalExperienceTasks: 0,
                        completeExperienceTasks: 0,
                        activeExperienceTasks: 0
                    },
                    opportunityTaskDetails: {
                        totalOpportunityTasks: 0,
                        completeOpportunityTasks: 0,
                        activeOpportunityTasks: 0
                    },
                    observationTaskDetails: {
                        totalObservationTasks: 0,
                        completeObservationTasks: 0,
                        activeObservationTasks: 0
                    }
                };
    
                results.forEach((row) => {
                    const { type, activeCount, completedCount, totalCount } = row;
    
                    if (type === '1') {
                        taskDetails.experienceTasksDetails.totalExperienceTasks = totalCount;
                        taskDetails.experienceTasksDetails.activeExperienceTasks = activeCount;
                        taskDetails.experienceTasksDetails.completeExperienceTasks = completedCount;
                    } else if (type === '2') {
                        taskDetails.opportunityTaskDetails.totalOpportunityTasks = totalCount;
                        taskDetails.opportunityTaskDetails.activeOpportunityTasks = activeCount;
                        taskDetails.opportunityTaskDetails.completeOpportunityTasks = completedCount;
                    } else if (type === '3') {
                        taskDetails.observationTaskDetails.totalObservationTasks = totalCount;
                        taskDetails.observationTaskDetails.activeObservationTasks = activeCount;
                        taskDetails.observationTaskDetails.completeObservationTasks = completedCount;
                    }
                });
    
                resolve(taskDetails);
            });
        });
    }

    async fetchPillarAssessmentCount(userId) {
        const query = `
            SELECT 
                type,
                SUM(CASE WHEN is_completed_assessment = '0' THEN 1 ELSE 0 END) AS activeCount,
                SUM(CASE WHEN is_completed_assessment = '1' THEN 1 ELSE 0 END) AS completedCount, 
                COUNT(*) AS totalCount
            FROM life_books
            WHERE user_id = ?
            GROUP BY type;
        `;
    
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
    
                const assessmentDetails = {
                    experienceAssessmentDetails: {
                        totalAssessments: 0,
                        completeAssessments: 0,
                        pendingAssessments: 0
                    },
                    opportunityAssessmentDetails: {
                        totalAssessments: 0,
                        completeAssessments: 0,
                        pendingAssessments: 0
                    },
                    observationAssessmentDetails: {
                        totalAssessments: 0,
                        completeAssessments: 0,
                        pendingAssessments: 0
                    }
                };
                
                results.forEach((row) => {
                    const { type, activeCount, completedCount, totalCount } = row;
    
                    if (type === '1') {
                        assessmentDetails.experienceAssessmentDetails.totalAssessments = totalCount;
                        assessmentDetails.experienceAssessmentDetails.pendingAssessments = activeCount;
                        assessmentDetails.experienceAssessmentDetails.completeAssessments = completedCount;
                    } else if (type === '2') {
                        assessmentDetails.opportunityAssessmentDetails.totalAssessments = totalCount;
                        assessmentDetails.opportunityAssessmentDetails.pendingAssessments = activeCount;
                        assessmentDetails.opportunityAssessmentDetails.completeAssessments = completedCount;
                    } else if (type === '3') {
                        assessmentDetails.observationAssessmentDetails.totalAssessments = totalCount;
                        assessmentDetails.observationAssessmentDetails.pendingAssessments = activeCount;
                        assessmentDetails.observationAssessmentDetails.completeAssessments = completedCount;
                    }
                });
    
                resolve(assessmentDetails);
            });
        });
    }
    
    async getPasswordadminHistory(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM password_history WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
    
    async fetchAllDataByID(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], userId, type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalExpSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookCount(globalSearchCondition, userId, type);

            let query = `
            SELECT
                lb.id as experienceID,
                lb.title,
                CASE lb.is_completed_assessment
                WHEN '0' THEN 'no'
                WHEN '1' THEN 'yes'
                ELSE 'Unknown'
            END AS is_completed_assessment,
                lb.publish_date,
                CASE lb.status
                    WHEN '1' THEN 'active'
                    WHEN '2' THEN 'closed'
                    ELSE 'Unknown'
                END AS status,
                (SELECT COUNT(id) FROM life_book_has_tasks WHERE lb_id = lb.id) AS task_count
            FROM
                life_books lb
            WHERE
                lb.user_id = ? AND lb.type = ?
            `;

            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId, type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            const data = results.map(row => ({
                experienceID: row.experienceID,
                title: row.title,
                is_completed_assessment: row.is_completed_assessment,
                publish_date: row.publish_date,
                status: row.status,
                task_count: row.task_count
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

    async getLifebookCount(globalSearchCondition, userId, type) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total
            FROM
                life_books
            WHERE
                user_id = ? AND type = ?
            `;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId, type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    buildGlobalExpSearch(globalFilter) {
        if (!globalFilter) {
            return ''; // Return an empty string if globalFilter is not provided
        }

        const fields = ['title', 'publish_date', 'status'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    async fetchAllTasksByID(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], userId) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalTasksSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookTasksCount(globalSearchCondition, userId);

            let query = `
            SELECT
                lb.id AS id,
                lb.title AS experience_title,
                CASE lb.type
                    WHEN '1' THEN 'Knowledge'
                    WHEN '2' THEN 'Decision'
                    WHEN '3' THEN 'Awareness'
                    ELSE 'Unknown'
                END AS type,
                lbt.name AS task_name,
                CASE lbt.status
                    WHEN '1' THEN 'complete'
                    WHEN '0' THEN 'active'
                    ELSE 'Unknown'
                END AS status,
                lbt.created_at AS created_at
            FROM
                life_books lb
            LEFT JOIN
                life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ?
            `;

            // Apply global search
            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            const data = results.map(row => ({
                experience_id: row.id,
                experience_title: row.experience_title,
                type: row.type, // Convert type to label
                task_name: row.task_name,
                task_status: row.status,
                created_at: row.created_at
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

    async getLifebookTasksCount(globalSearchCondition, userId) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total
            FROM
                life_book_has_tasks lbt
            LEFT JOIN
                life_books lb ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ?
            `;

            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    buildGlobalTasksSearch(globalFilter) {
        if (!globalFilter) {
            return '';
        }
        const fields = ['lbt.name', 'lb.title', 'lbt.status', 'lbt.created_at', 'lb.type'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id, name, email, phone_number, password, email_verified_at, token, status FROM admin WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    }

    // updateUserPassword(userId, password) {
    //     return new Promise((resolve, reject) => {
    //         const query = 'UPDATE admin SET password = ? WHERE id = ?';
    //         db.query(query, [password, userId], (err, result) => {
    //             if (err) return reject(err);
    //             resolve(result);
    //         });
    //     });
    // }

}

module.exports = new AdministratorModel();
