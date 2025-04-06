const db = require('../../config/database');
const moment = require('moment'); // Import the moment library
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
class knowledgePillarModel {

    async getTotalExperienceCounts(userId) {
        const executeQuery = async (query, params) => {
            return new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
        }

        const activeCountQuery = `
            SELECT COUNT(*) AS activeCount
            FROM life_books
            WHERE user_id = ? AND type='1' AND is_completed_assessment = '0';
        `;

        const closedCountQuery = `
            SELECT COUNT(*) AS closedCount
            FROM life_books
            WHERE user_id = ? AND type='1' AND is_completed_assessment = '1';
        `;

        const [activeCountResult, closedCountResult] = await Promise.all([
            executeQuery(activeCountQuery, [userId]),
            executeQuery(closedCountQuery, [userId]),
        ]);

        const activeCount = activeCountResult[0].activeCount;
        const closedCount = closedCountResult[0].closedCount;

        const totalCount = activeCount + closedCount;

        const totalExperienceCounts = {
            active: activeCount,
            closed: closedCount,
            total: totalCount, // Add total count
        };

        return totalExperienceCounts;
    }

    async getTotalExperienceTaskCounts(userId) {
        const executeQuery = async (query, params) => {
            return new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
        };

        const activeTaskCountQuery = `
        SELECT COUNT(*) AS activeTaskCount
        FROM life_book_has_tasks lbt
        JOIN life_books lb ON lbt.lb_id=lb.id
        WHERE lb.user_id = ? AND lb.type = '1' and lbt.status='1'
        `;

        const pendingTaskCountQuery = `
        SELECT COUNT(*) AS pendingTaskCount
        FROM life_book_has_tasks lbt
        JOIN life_books lb ON lbt.lb_id=lb.id
        WHERE lb.user_id = ? AND lb.type = '1' and lbt.status='0'
        `;

        try {
            const [activeTaskCountResult, pendingTaskCountResult] = await Promise.all([
                executeQuery(activeTaskCountQuery, [userId]),
                executeQuery(pendingTaskCountQuery, [userId]),
            ]);

            const activeTaskCount = activeTaskCountResult[0].activeTaskCount;
            const pendingTaskCount = pendingTaskCountResult[0].pendingTaskCount;
            const totalCount = activeTaskCount + pendingTaskCount;

            const totalTaskCounts = {
                active: activeTaskCount,
                pending: pendingTaskCount,
                total: totalCount
            };

            return totalTaskCounts;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getTotalExperienceAssessmentCounts(userId) {
        const executeQuery = async (query, params) => {
            return new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
        };

        const completeAssessmentCountQuery = `
            SELECT COUNT(*) AS completeAssessmentCount
            FROM life_books
            WHERE user_id = ? AND type='1' AND is_completed_assessment = '1';
        `;

        const pendingAssessmentCountQuery = `
            SELECT COUNT(*) AS pendingAssessmentCount
            FROM life_books
            WHERE user_id = ? AND type='1' AND is_completed_assessment = '0';
        `;

        try {
            const [completeAssessmentCountResult, pendingAssessmentCountResult] = await Promise.all([
                executeQuery(completeAssessmentCountQuery, [userId]),
                executeQuery(pendingAssessmentCountQuery, [userId]),
            ]);

            const completeAssessmentCount = completeAssessmentCountResult[0].completeAssessmentCount;
            const pendingAssessmentCount = pendingAssessmentCountResult[0].pendingAssessmentCount;
            const totalCount = completeAssessmentCount + pendingAssessmentCount;

            const totalAssessmentCounts = {
                complete: completeAssessmentCount,
                pending: pendingAssessmentCount,
                total: totalCount
            };

            return totalAssessmentCounts;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getFilteredExperiences({
        userId,
        fromDate,
        toDate,
        status,
        sortBy,
        sortOrder,
        offset,
        perPage,
        search
    }) {
        let query = `
        SELECT
            lb.id AS experienceId,
            Trim(lb.title) AS experienceTitle,
            lb.publish_date AS experiencePublishDate,
            lb.status AS experienceStatus,
            lb.is_completed_assessment AS is_completed_assessment,
            COUNT(lbt.id) AS totalTasks,
            SUM(lbt.status = '1') AS completedTasks
        FROM life_books lb
        LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
        WHERE
            lb.user_id = ${userId} AND lb.type = '1'
            ${search ? `AND lb.id = '${search}'` : ''}
            ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
            ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD')} 23:59:00'` : ''}
            ${status ? `AND lb.status = '${status}'` : ''}
        GROUP BY lb.id, lb.title, lb.publish_date, lb.status
    `;
    
                if (sortBy === "publish_date") {
                    query += `ORDER BY lb.is_completed_assessment ASC, ${sortBy !== '' ? `lb.${sortBy} ${sortOrder}` : 'lb.id DESC'}`;
                } else {
                    query += `ORDER BY lb.is_completed_assessment ASC, ${sortBy !== '' ? `Trim(lb.${sortBy}) ${sortOrder}` : 'lb.id DESC'} 
                    LIMIT ${offset}, ${perPage}`;
                }
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);

                const filteredExperiences = results.map((row) => {
                    const totalTasks = row.totalTasks || 1; // Avoid division by zero
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;
                    const formattedDate = moment(row.experiencePublishDate).format('D MMMM YYYY');
                    return {
                        id: row.experienceId,
                        title: row.experienceTitle,
                        publishDate: formattedDate,
                        status: row.experienceStatus,
                        totalTasks: row.totalTasks,
                        is_completed_assessment: row.is_completed_assessment,
                        completedTasks: row.completedTasks,
                        progressPercentage: progressPercentage.toFixed(0),
                    };
                });

                resolve(filteredExperiences);
            });
        });
    }

    async getTotalExperiences({
        userId,
        fromDate,
        toDate,
        status,
        search
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalExperiences
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '1'
                ${search ? `AND lb.id = '${search}'` : ''}
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                 ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD')} 23:59:00'` : ''}
                ${status ? `AND lb.status = '${status}'` : ''};
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalExperiences = results[0].totalExperiences;
                
                resolve(totalExperiences);
            });
        });
    }

    async getRecentExperiences({
        userId,
        offset,
        perPage,
    }) {
        const query = `
                SELECT
                lb.id AS experienceId,
                lb.title AS experienceTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS experienceStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '1'
            GROUP BY lb.id, lb.title, lb.is_completed_task, lb.status, lb.created_at
            ORDER BY lb.status, lb.id DESC
            LIMIT ?, ?
            `;
        console.log(query);
        
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const experiencesWithTaskProgress = results.map((row) => {
                    const totalTasks = row.totalTasks || 1;
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;

                    const formattedDate = moment(row.createdDate).format('D MMMM YYYY');

                    return {
                        id: row.experienceId,
                        title: row.experienceTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        status: row.experienceStatus,
                        totalTasks: row.totalTasks,
                        completedTasks: row.completedTasks,
                        progressPercentage: progressPercentage.toFixed(0),
                        createdDate: formattedDate,
                    };
                });

                resolve(experiencesWithTaskProgress);
            });
        });
    }

    async getRecentTotalExperiences({
        userId,
        status,
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalExperiences,
                lb.title AS experienceTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS experienceStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '1'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalExperiences = results[0].totalExperiences || 0;
                resolve(totalExperiences);
            });
        });
    }

    async getRecentExperiencesTasks({
        userId,
        offset,
        perPage,
    }) {
        const query = `
            SELECT
                lbt.id AS taskId,
                lbt.name AS taskTitle,
                lb.title AS lifeBookTitle,
                lb.id AS experienceID,
                DATE_FORMAT(lbt.created_at, '%d %M %Y') AS createdDate,
                lb.status AS experienceStatus,
                lb.is_completed_assessment AS is_completed_assessment,
                lbt.status AS taskStatus
            FROM life_book_has_tasks lbt
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lb.user_id = ? AND lb.type = '1'
            ORDER BY lbt.status,lb.id DESC
            LIMIT ?, ?`;

        console.log("query",query);
        console.log("query",userId, offset, perPage);
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const recentActiveTasks = results.map((row) => {
                    return {
                        taskId: row.taskId,
                        taskTitle: row.taskTitle,
                        lifeBookTitle: row.lifeBookTitle,
                        experienceID: row.experienceID,
                        taskStatus: row.taskStatus,
                        is_completed_assessment: row.is_completed_assessment,
                        experienceStatus: row.experienceStatus,
                        createdDate : row.createdDate
                    };
                });
                resolve(recentActiveTasks);
            });
        });
    }

    async getRecentTotalExperiencesTasks({
        userId,
    }) {
        const query = `
        SELECT COUNT(DISTINCT lbt.id) AS totalExperiencesTasks,
            lbt.name AS taskTitle,
            lb.title AS lifeBookTitle,
            lb.id AS experienceID,
            lb.status AS experienceStatus,
            lb.is_completed_assessment AS is_completed_assessment,
            lbt.status AS taskStatus
        FROM life_book_has_tasks lbt
        JOIN life_books lb ON lbt.lb_id = lb.id
        WHERE lb.user_id = ? AND lb.type = '1'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalExperiencesTasks = results[0].totalExperiencesTasks || 0;
                resolve(totalExperiencesTasks);
            });
        });
    }

    async getRecentExperiencesAssessments({
        userId,
        offset,
        perPage,
    }) {
        const query = `
            SELECT
                lb.id AS experienceId,
                lb.title AS experienceTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS experienceStatus,
                DATE_FORMAT(lb.created_at, '%d %M %Y') AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '1'
            ORDER BY lb.status, lb.id DESC
            LIMIT ?, ?`;

        console.log(query);
        console.log(userId, offset, perPage);
        
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const latestAssessments = results.map((row) => {
                    return {
                        experienceId: row.experienceId,
                        experienceTitle: row.experienceTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        experienceStatus: row.experienceStatus,
                        createdDate: row.createdDate,
                    };
                });

                const sortedAssessments = latestAssessments.sort((a, b) => {
                    if (a.isCompletedAssessment && !b.isCompletedAssessment) return 1;
                    if (!a.isCompletedAssessment && b.isCompletedAssessment) return -1;
                    return new Date(b.createdDate) - new Date(a.createdDate);
                });
                resolve(latestAssessments);
            });
        });
    }

    async getRecentTotalExperiencesAssessments({
        userId,
    }) {
        const query = `
        SELECT COUNT(DISTINCT lb.id) AS totalExperiencesAssessments,
           lb.id AS experienceId,
                lb.title AS experienceTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS experienceStatus,
                lb.created_at AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '1'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalExperiencesAssessments = results[0].totalExperiencesAssessments || 0;
                resolve(totalExperiencesAssessments);
            });
        });
    }

    async getFilteredTasks({
        userId,
        fromDate,
        toDate,
        status,
        sortBy,
        sortOrder,
        offset,
        perPage,
        experiencesTitle,
        search
    }) {

        if (sortBy === 'id') {
            sortBy = 'lbt.id'; // Correctly assign a new value to sortBy
        }
        const query = `
    SELECT
        lbt.id AS id,
        lbt.lb_id AS experienceId,
        lb.title AS experiencetitle,
        lb.is_completed_assessment AS is_completed_assessment,
        TRIM(lbt.name) AS name,
        lbt.status AS status,
        lb.status AS experienceStatus,
        DATE_FORMAT(lbt.created_at, '%d %M %Y') AS created_at
    FROM life_books lb
    JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
    WHERE                
        lb.user_id = ${userId} AND lb.type = '1'
        ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
        ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
        ${status ? `AND lbt.status = '${status}'` : ''}
        ${experiencesTitle ? `AND lb.title LIKE '%${experiencesTitle}%'` : ''}
        ${search ? `AND lbt.id = '${search}'` : ''}
    ORDER BY lbt.status ASC, ${sortBy !== '' ? `TRIM(${sortBy}) ${sortOrder}` : 'lbt.id DESC'}
    LIMIT ${offset},${perPage} `;
    
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    experienceId: row.experienceId,
                    experienceTitle: row.experiencetitle,
                    name: row.name,
                    status: row.status,
                    is_completed_assessment: row.is_completed_assessment,
                    experienceStatus: row.experienceStatus,
                    created_at: row.created_at,
                }));
                resolve(tasks);
            });
        });
    }

    async getAutocompleteTasks({ userId, experiencesTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS experienceTitle
            FROM life_books 
                WHERE
                user_id = ? AND type = '1'
                AND title LIKE ?
            ORDER BY id DESC;
        `;
        const searchValue = '%' + experiencesTitle.replace(/%/g, '\\%') + '%';

        return new Promise((resolve, reject) => {
            db.query(query, [userId, searchValue], (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    experienceTitle: row.experienceTitle
                }));
                resolve(tasks);
            });
        });
    }

    async getTotalTasks({
        userId,
        fromDate,
        toDate,
        status,
        search,
        experiencesTitle
    }) {
        const query = `
            SELECT COUNT(*) AS totalTasks
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '1'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${status ? `AND lbt.status = '${status}'` : ''}
                ${experiencesTitle ? `AND lb.title LIKE '%${experiencesTitle}%'` : ''}
                ${search ? `AND lbt.id = '${search}'` : ''};
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
               
                const totalTasks = results[0].totalTasks || 0;
                resolve(totalTasks);
            });
        });
    }

    async getAutocompleteAssessments({ userId, experiencesTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS experiencesTitle
            FROM life_books
            WHERE
                user_id = ? AND title LIKE ? and TYPE = '1'
            ORDER BY id DESC;
        `;
        const searchValue = '%' + experiencesTitle?.replace(/%/g, '\\%') + '%';

        //console.log(searchValue);
        return new Promise((resolve, reject) => {
            db.query(query, [userId,searchValue], (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => ({
                    id: row.id,
                    experiencesTitle: row.experiencesTitle
                }));
                resolve(assessments);
            });
        });
    }

    // async getFilteredAssessments({
    //     userId,
    //     fromDate,
    //     toDate,
    //     status,
    //     sortBy,
    //     sortOrder,
    //     offset,
    //     perPage,
    //     experiencesTitle
    // }) {
    //     const query = `
    //         SELECT
    //             id AS experienceId,
    //             Trim(title) AS experienceTitle,
    //             is_completed_assessment AS completed_assessment
    //         FROM life_books
    //         WHERE
    //             user_id = ${userId} AND
    //             type = '1'
    //             ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
    //             ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
    //             ${status ? `AND is_completed_assessment = '${status}'` : ''}
    //             ${experiencesTitle ? `AND title = '${experiencesTitle}'` : ''} 
    //         ORDER BY completed_assessment ASC, ${sortBy !== '' ? `Trim(${sortBy}) ${sortOrder}` : 'id DESC'} 
    //         LIMIT ${offset}, ${perPage};
    //     `;

    //     console.log("query",query);
    //     return new Promise((resolve, reject) => {
    //         db.query(query, (err, results) => {
    //             if (err) return reject(err);
                
    //             console.log(results);
    //             const assessments = results.map((row) => {
    //                 return {
    //                     experienceId: row.experienceId,
    //                     experienceTitle: row.experienceTitle,
    //                     experienceStatus: row.completed_assessment
    //                 };
    //             });

    //             resolve(assessments);
    //         });
    //     });
    // }

    async getFilteredAssessments({
        userId,
        fromDate,
        toDate,
        status,
        sortBy,
        sortOrder,
        offset,
        perPage,
        experiencesTitle,
        search
    }) {
        const query = `
            SELECT
                id AS experienceId,
                Trim(title) AS experienceTitle,
                DATE_FORMAT(publish_date , '%d %M %Y') AS publish_date,
                is_completed_assessment AS completed_assessment
            FROM life_books
            WHERE
                user_id = ? AND
                type = '1'
                ${fromDate ? `AND publish_date >= ?` : ''}
                ${toDate ? `AND publish_date <= ?` : ''}
                ${status ? `AND is_completed_assessment = ?` : ''}
                ${experiencesTitle ? `AND title = ?` : ''} 
                ${search ? `AND id = ? ` : ''} 
            ORDER BY completed_assessment ASC, ${sortBy ? `Trim(${sortBy}) ${sortOrder}` : 'id DESC'} 
            LIMIT ?, ?;
        `;
    
        // Build the parameters array
        const params = [userId];
        if (fromDate) params.push(moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD'));
        if (toDate) params.push(moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00'));
        if (status) params.push(status);
        if (experiencesTitle) params.push(experiencesTitle);
        if (search) params.push(search);
        params.push(offset, perPage);
    
    
        return new Promise((resolve, reject) => {
            db.query(query, params, (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => ({
                    publish_date : row.publish_date,
                    experienceId: row.experienceId,
                    experienceTitle: row.experienceTitle,
                    experienceStatus: row.completed_assessment,
                }));
    
                resolve(assessments);
            });
        });
    }
    // async getTotalAssessments({
    //     userId,
    //     fromDate,
    //     toDate,
    //     status,
    //     experiencesTitle
    // }) {
    //     const query = `
    //         SELECT COUNT(*) AS totalAssessment
    //         FROM life_books
    //         WHERE
    //             user_id = ? AND
    //             type = '1'
    //             ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
    //             ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
    //             ${status ? `AND is_completed_assessment = '${status}'` : ''}
    //             ${experiencesTitle ? `AND title LIKE '%${experiencesTitle}%'` : ''} `;
                

    //     return new Promise((resolve, reject) => {
    //         db.query(query, [userId], (err, results) => {
    //             if (err) return reject(err);
               
    //             const totalAssessments = results[0].totalAssessment || 0;
    //             resolve(totalAssessments);
    //         });
    //     });
    // }
    async getTotalAssessments({
        userId,
        fromDate,
        toDate,
        status,
        experiencesTitle,
    }) {
        const query = `
            SELECT COUNT(*) AS totalAssessment
            FROM life_books
            WHERE
                user_id = ? AND
                type = '1'
                ${fromDate ? `AND publish_date >= ?` : ''}
                ${toDate ? `AND publish_date <= ?` : ''}
                ${status ? `AND is_completed_assessment = ?` : ''}
                ${experiencesTitle ? `AND title LIKE ?` : ''};
        `;
    
        // Build the parameters array
        const params = [userId];
        if (fromDate) params.push(moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD'));
        if (toDate) params.push(moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00'));
        if (status) params.push(status);
        if (experiencesTitle) params.push(`%${experiencesTitle}%`);
    
    
        return new Promise((resolve, reject) => {
            db.query(query, params, (err, results) => {
                if (err) return reject(err);
    
                const totalAssessments = results[0]?.totalAssessment || 0;
                resolve(totalAssessments);
            });
        });
    }
    
    async getExperienceByNameAndUserId(name, userId) {
        try {
            const query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const groups = await new Promise((resolve, reject) => {
                db.query(query, [name, userId, '1'], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return groups;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async getExperienceByName(name, userId, experienceId = null) {
        try {
            let query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const queryParams = [name, userId, '1'];

            if (experienceId) {
                query += ' AND `id` != ?';
                queryParams.push(experienceId);
            }

            const experiences = await new Promise((resolve, reject) => {
                db.query(query, queryParams, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return experiences;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async createExperience(data) {        

        const { userId, title, status, insights, notes, tasks, tags, files, assessment } = data;

        // for actual grading process
        if (data.assessment && data.assessment.length > 0 && data.assessment[0].grade) {
        
        const front_grade = data.assessment[0].grade;
        let save_grade = "";
        if (Number(front_grade) === 1) {
            save_grade = 4;
        } else if (Number(front_grade) === 2) {
            save_grade = 3;
        } else if (Number(front_grade) === 3) {
            save_grade = 2;
        } else if (Number(front_grade) === 4) {
            save_grade = 1;
        } else if (Number(front_grade) === 5) {
            save_grade = 0;
        } else {
            save_grade = 0;
        }

        assessment[0].grade = save_grade.toString();

        ///////////////////////////////////////

    }
        try {
            const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status) VALUES (?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(lifeBooksQuery, [userId, title, "1", status], function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.insertId);
                    }
                });
            });

            const insertAllInsights = async (insights, lastInsertedId) => {
                for (const insight of insights) {
                    try {
                        const insightQuery = 'INSERT INTO knowledge_experience_insights (lb_id, name) VALUES (?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(insightQuery, [lastInsertedId, insight.name], (insightErr, insightResult) => {
                                if (insightErr) {
                                    console.error('Error inserting into insights table', insightErr);
                                    reject(insightErr); // Reject the promise if there's an error
                                } else {
                                    resolve(insightResult); // Resolve the promise on success
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during insight insertion:', err);
                    }
                }
            };

            insertAllInsights(insights, lastInsertedId);

            const insertAllNotes = async (notes, lastInsertedId) => {
                for (const note of notes) {
                    try {
                        const noteQuery = 'INSERT INTO knowledge_experience_notes (lb_id, name) VALUES (?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(noteQuery, [lastInsertedId, note.name], (noteErr, noteResult) => {
                                if (noteErr) {
                                    console.error('Error inserting into notes table', noteErr);
                                    reject(noteErr);
                                } else {
                                    resolve(noteResult)
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during notes insertion:', err);
                    }
                }
            }

            insertAllNotes(notes, lastInsertedId);

            const insertAllTasks = async (tasks, lastInsertedId) => {
                for (const task of tasks) {
                    try {
                        const taskQuery = 'INSERT INTO life_book_has_tasks (lb_id, name, status) VALUES (?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(taskQuery, [lastInsertedId, task.name, task.status.toString()], (taskErr, taskResult) => {
                                if (taskErr) {
                                    console.error('Error inserting into tasks table', taskErr);
                                    reject(taskErr);
                                } else {
                                    resolve(taskResult)
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during tasks insertion:', err);
                    }
                }
            }

            insertAllTasks(tasks, lastInsertedId);

            tags.forEach(async (task) => {
                const tagsQuery = 'INSERT INTO life_book_has_tags (user_id, lb_id,  name) VALUES (?, ?, ?)';
                db.query(tagsQuery, [userId, lastInsertedId, task.name], (noteErr, noteResult) => {
                    if (noteErr) {
                        console.error('Error inserting into tags table', noteErr);
                    }
                });
            });

            const allTaskStatusesZero = tasks.every(task => task.status === 0);

            if (!(tasks.length === 0 || allTaskStatusesZero)) {
                const allTaskStatusesOne = tasks.every(task => task.status === 1);

                if (allTaskStatusesOne) {
                    if (assessment && assessment.length > 0) {

                        const [assessmentData] = assessment;
                        const progressTowardsLifePurpose = assessmentData?.did_progress_towards_life_purpose === '' ? '0' : assessmentData.did_progress_towards_life_purpose;
                        const did_help_another_person = assessmentData.did_help_another_person === '' ? '0' : assessmentData.did_help_another_person;

                        const allFieldsEmpty = Object.values(assessmentData).every(value => value === '');
                        if (!allFieldsEmpty) {
                            const assessmentQuery = 'INSERT INTO life_book_has_assessment (lb_id, grade, did_progress_towards_life_purpose, did_help_another_person, do_differently, comments) VALUES (?, ?, ?, ?, ?, ?)';
                            const assessmentValues = [lastInsertedId, assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || ''];

                            db.query(assessmentQuery, assessmentValues, (assessmentErr, assessmentResult) => {
                                if (assessmentErr) {
                                    console.error('Error inserting into assessment table', assessmentErr);
                                    return { status: 500, success: false, message: 'Error inserting into assessment table', error: true };
                                }
                            });
                        }
                    }
                }
            }

            if (Array.isArray(files)) {
                files.forEach(file => {
                    const fileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?)';
                    db.query(fileQuery, [lastInsertedId, file.original_filename, file.filename, file.url, file.mimetype, file.size], (fileErr, fileResult) => {
                        if (fileErr) {
                            console.error('Error inserting into file table', fileErr);
                        }
                    });
                });
            }

            return {
                lastInsertedId,
                title,
                status,
                insights,
                notes,
                tasks,
                tags,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                })),
                assessment
            };

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async GetExperienceUserById(userId, experienceId) {
        const setGroupConcatMaxLen = `SET SESSION group_concat_max_len = 1000000;`;
        const separator = '||';  // Unique separator unlikely to appear in data
        const query = `
            SELECT
                lb.id AS experienceId,
                lb.type AS type,
                lb.title AS experienceTitle,
                lb.is_completed_assessment as is_completed_assessment,
                lea.id AS assessmentId,
                lea.grade,
                lea.did_progress_towards_life_purpose,
                lea.did_help_another_person,
                lea.do_differently,
                lea.comments,
                GROUP_CONCAT(DISTINCT ki.name ORDER BY ki.id ASC SEPARATOR '${separator}') AS insights,
                GROUP_CONCAT(DISTINCT ken.name ORDER BY ken.id ASC SEPARATOR '${separator}') AS notes,
                GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id ASC SEPARATOR '${separator}') AS tasks,
                GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC SEPARATOR '${separator}') AS tags,
                GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileNames,
                GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileUrls,
                GROUP_CONCAT(lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileTypes,
                GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileSizes,
                GROUP_CONCAT(lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileOriginalName
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN knowledge_experience_insights ki ON lb.id = ki.lb_id
            LEFT JOIN knowledge_experience_notes ken ON lb.id = ken.lb_id
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            LEFT JOIN life_book_has_tags lbht ON lb.id = lbht.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;
        console.log('query',query)
        console.log('query',[userId, experienceId])
        return new Promise((resolve, reject) => {
            db.query(setGroupConcatMaxLen, (err) => {
                if (err) return reject(err);

                db.query(query, [userId, experienceId], (err, results) => {
                    if (err) return reject(err);
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        const row = results[0];

                        const experience = {
                            id: row.experienceId,
                            title: row.experienceTitle,
                            type: row.type
                        };
                        const assessment = {
                            id: row.assessmentId,
                            grade: row.grade,
                            did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                            did_help_another_person: row.did_help_another_person,
                            do_differently: row.do_differently,
                            comments: row.comments,
                        };
                        const insights = row.insights ? row.insights.split(separator) : [];
                        const notes = row.notes ? row.notes.split(separator) : [];
                        const tasks = row.tasks ? row.tasks.split(separator) : [];
                        const tasksWithStatus = tasks.map(taskString => {
                            const [name, status] = taskString.split(':');
                            return { name, status: parseInt(status) };
                        });

                        const tags = row.tags ? row.tags.split(separator) : [];
                        const fileNames = row.fileNames ? row.fileNames.split(separator) : [];
                        const fileUrls = row.fileUrls ? row.fileUrls.split(separator) : [];
                        const fileTypes = row.fileTypes ? row.fileTypes.split(separator) : [];
                        const fileSizes = row.fileSizes ? row.fileSizes.split(separator) : [];
                        const original_filenames = row.fileOriginalName ? row.fileOriginalName.split(separator) : [];

                        const correctedFiles = fileNames.map((name, index) => {
                            const type = fileTypes[index] || '';
                            const extension = name.split('.').pop().toLowerCase();
                            const extensionToMimetype = {
                                'pdf': 'application/pdf',
                                'jpg': 'image/jpeg',
                                'jpeg': 'image/jpeg',
                                'png': 'image/png',
                                'mpeg': 'audio/mpeg',
                                'm4a': 'audio/m4a',
                                'mp3': 'audio/mp3',
                                'mp4': 'video/mp4',
                            };
                            const correctedType = extensionToMimetype[extension] || type;
                            return {
                                original_filename: original_filenames[index],
                                name,
                                url: fileUrls[index],
                                type: correctedType,
                                size: fileSizes[index]
                            };
                        });

                        const experienceWithTaskProgress = {
                            experience,
                            assessment,
                            insights,
                            notes,
                            tasks: tasksWithStatus,
                            tags,
                            files: correctedFiles,
                            is_completed_assessment: row.is_completed_assessment
                        };
                        resolve([experienceWithTaskProgress]);
                    }
                });
            });
        });
    }

    async GetExperienceUserByIdForPrint(userId, experienceId) {
        const setGroupConcatMaxLen = `SET SESSION group_concat_max_len = 1000000;`;
        const separator = '||';  // Unique separator unlikely to appear in data
        const query = `
            SELECT
                lb.id AS experienceId,
                lb.type AS type,
                lb.title AS experienceTitle,
                lb.created_at AS creatingDate,
                lb.is_completed_assessment as is_completed_assessment,
                lea.id AS assessmentId,
                lea.grade,
                lea.did_progress_towards_life_purpose,
                lea.did_help_another_person,
                lea.do_differently,
                lea.comments,
                GROUP_CONCAT(DISTINCT ki.name ORDER BY ki.id DESC SEPARATOR '${separator}') AS insights,
                GROUP_CONCAT(DISTINCT ken.name ORDER BY ken.id DESC SEPARATOR '${separator}') AS notes,
                GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id DESC SEPARATOR '${separator}') AS tasks,
                GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC SEPARATOR '${separator}') AS tags,
                GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileNames,
                GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileUrls,
                GROUP_CONCAT(DISTINCT lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileTypes,
                GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileSizes,
                GROUP_CONCAT(DISTINCT lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '${separator}') AS fileOriginalName
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN knowledge_experience_insights ki ON lb.id = ki.lb_id
            LEFT JOIN knowledge_experience_notes ken ON lb.id = ken.lb_id
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            LEFT JOIN life_book_has_tags lbht ON lb.id = lbht.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;
        return new Promise((resolve, reject) => {
            db.query(setGroupConcatMaxLen, (err) => {
                if (err) return reject(err);

                db.query(query, [userId, experienceId], (err, results) => {
                    if (err) return reject(err);
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        const row = results[0];

                        const createdon = row.creatingDate
                        
                        const experience = {
                            id: row.experienceId,
                            title: row.experienceTitle,
                            type: row.type
                        };
                        const assessment = {
                            id: row.assessmentId,
                            grade: row.grade,
                            did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                            did_help_another_person: row.did_help_another_person,
                            do_differently: row.do_differently,
                            comments: row.comments,
                        };
                        const insights = row.insights ? row.insights.split(separator) : [];
                        const notes = row.notes ? row.notes.split(separator) : [];
                        const tasks = row.tasks ? row.tasks.split(separator) : [];
                        const tasksWithStatus = tasks.map(taskString => {
                            const [name, status] = taskString.split(':');
                            return { name, status: parseInt(status) };
                        });

                        const tags = row.tags ? row.tags.split(separator) : [];
                        const fileNames = row.fileNames ? row.fileNames.split(separator) : [];
                        const fileUrls = row.fileUrls ? row.fileUrls.split(separator) : [];
                        const fileTypes = row.fileTypes ? row.fileTypes.split(separator) : [];
                        const fileSizes = row.fileSizes ? row.fileSizes.split(separator) : [];
                        const original_filenames = row.fileOriginalName ? row.fileOriginalName.split(separator) : [];

                        const correctedFiles = fileNames.map((name, index) => {
                            const type = fileTypes[index] || '';
                            const extension = name.split('.').pop().toLowerCase();
                            const extensionToMimetype = {
                                'pdf': 'application/pdf',
                                'jpg': 'image/jpeg',
                                'jpeg': 'image/jpeg',
                                'png': 'image/png',
                                'mpeg': 'audio/mpeg',
                                'm4a': 'audio/m4a',
                                'mp3': 'audio/mp3',
                                'mp4': 'video/mp4',
                            };
                            const correctedType = extensionToMimetype[extension] || type;
                            return {
                                original_filename: original_filenames[index],
                                name,
                                url: fileUrls[index],
                                type: correctedType,
                                size: fileSizes[index]
                            };
                        });

                        const experienceWithTaskProgress = {
                            experience,
                            createdon,
                            assessment,
                            insights,
                            notes,
                            tasks: tasksWithStatus,
                            tags,
                            files: correctedFiles,
                            is_completed_assessment: row.is_completed_assessment
                        };
                        resolve([experienceWithTaskProgress]);
                    }
                });
            });
        });
    }
    async updateExperienceUserWise(data) {
        const { userId, id, title, status, insights, notes, tasks, tags, files, assessment } = data;

        // for actual grading process
        if (data.assessment && data.assessment.length > 0 && data.assessment[0].grade) {
        
            const front_grade = data.assessment[0].grade;
            let save_grade = "";
            if (Number(front_grade) === 1) {
                save_grade = 4;
            } else if (Number(front_grade) === 2) {
                save_grade = 3;
            } else if (Number(front_grade) === 3) {
                save_grade = 2;
            } else if (Number(front_grade) === 4) {
                save_grade = 1;
            } else if (Number(front_grade) === 5) {
                save_grade = 0;
            } else {
                save_grade = 0;
            }
          
    
            assessment[0].grade = save_grade.toString();
    
        }
        try {


            const checkIdQuery = 'SELECT id FROM life_books WHERE id = ? AND user_id = ?';
            const idExists = await new Promise((resolve, reject) => {
                db.query(checkIdQuery, [id, userId], (err, result) => {
                    if (err) {
                        console.error('Error checking if id exists', err);
                        reject(err);
                    } else {
                        resolve(result && result.length > 0);
                    }
                });
            });

            if (!idExists) {
                return {
                    success: false,
                    message: 'Experience not found with the specified id and user_id combination.',
                };
            }

            const lifeBooksQuery = 'UPDATE life_books SET title = ?, status = ? WHERE id = ? AND user_id = ?';
            db.query(lifeBooksQuery, [title, status, id, userId], function (err, result) {
                if (err) {
                    console.log('err', err);
                    reject(err);
                }
            });

            const existingInsightsQuery = 'SELECT id FROM knowledge_experience_insights WHERE lb_id = ?';
            const existingInsights = await new Promise((resolve, reject) => {
                db.query(existingInsightsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing insights', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingInsightIds = existingInsights.map(insight => insight.id);

            for (const newInsight of insights) {
                if (newInsight.id) {
                    const updateInsightQuery = 'UPDATE knowledge_experience_insights SET name = ? WHERE lb_id = ? AND id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateInsightQuery, [newInsight.name, id, newInsight.id], (updateInsightErr, updateInsightResult) => {
                            if (updateInsightErr) {
                                console.error('Error updating insight', updateInsightErr);
                                reject(updateInsightErr);
                            } else {
                                resolve(updateInsightResult);
                            }
                        });
                    });
                }
            }

            for (const newInsight of insights.filter(newInsight => !newInsight.id)) {
                const insertInsightQuery = 'INSERT INTO knowledge_experience_insights (lb_id, name) VALUES (?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(insertInsightQuery, [id, newInsight.name], (insertInsightErr, insertInsightResult) => {
                        if (insertInsightErr) {
                            console.error('Error inserting new insight', insertInsightErr);
                            reject(insertInsightErr);
                        } else {
                            resolve(insertInsightResult);
                        }
                    });
                });
            }

            for (const insightIdToDelete of existingInsightIds.filter(existingInsightId => !insights.some(updatedInsight => updatedInsight.id === existingInsightId))) {
                const deleteInsightQuery = 'DELETE FROM knowledge_experience_insights WHERE lb_id = ? AND id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteInsightQuery, [id, insightIdToDelete], (deleteInsightErr, deleteInsightResult) => {
                        if (deleteInsightErr) {
                            console.error('Error deleting insight', deleteInsightErr);
                            reject(deleteInsightErr);
                        } else {
                            resolve(deleteInsightResult);
                        }
                    });
                });
            }

            const existingNotesQuery = 'SELECT id FROM knowledge_experience_notes WHERE lb_id = ?';
            const existingNotes = await new Promise((resolve, reject) => {
                db.query(existingNotesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing notes', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingNoteIds = existingNotes.map(note => note.id);

            for (const newNote of notes.filter(newNote => newNote.id)) {
                const updateNoteQuery = 'UPDATE knowledge_experience_notes SET name = ? WHERE lb_id = ? AND id = ?';
                await new Promise((resolve, reject) => {
                    db.query(updateNoteQuery, [newNote.name, id, newNote.id], (updateNoteErr, updateNoteResult) => {
                        if (updateNoteErr) {
                            console.error('Error updating note', updateNoteErr);
                            reject(updateNoteErr);
                        } else {
                            resolve(updateNoteResult);
                        }
                    });
                });
            }

            for (const newNote of notes.filter(newNote => !newNote.id)) {
                const insertNoteQuery = 'INSERT INTO knowledge_experience_notes (lb_id, name) VALUES (?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(insertNoteQuery, [id, newNote.name], (insertNoteErr, insertNoteResult) => {
                        if (insertNoteErr) {
                            console.error('Error inserting new note', insertNoteErr);
                            reject(insertNoteErr);
                        } else {
                            resolve(insertNoteResult);
                        }
                    });
                });
            }

            for (const noteIdToDelete of existingNoteIds.filter(existingNoteId => !notes.some(updatedNote => updatedNote.id === existingNoteId))) {
                const deleteNoteQuery = 'DELETE FROM knowledge_experience_notes WHERE lb_id = ? AND id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteNoteQuery, [id, noteIdToDelete], (deleteNoteErr, deleteNoteResult) => {
                        if (deleteNoteErr) {
                            console.error('Error deleting note', deleteNoteErr);
                            reject(deleteNoteErr);
                        } else {
                            resolve(deleteNoteResult);
                        }
                    });
                });
            }

            const existingTasksQuery = 'SELECT id FROM life_book_has_tasks WHERE lb_id = ?';
            const existingTasks = await new Promise((resolve, reject) => {
                db.query(existingTasksQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing tasks', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingTaskIds = existingTasks.map(task => task.id);

            for (const newTask of tasks.filter(newTask => newTask.id)) {
                const updateTaskQuery = 'UPDATE life_book_has_tasks SET name = ?, status = ? WHERE lb_id = ? AND id = ?';
                await new Promise((resolve, reject) => {
                    db.query(updateTaskQuery, [newTask.name, newTask.status, id, newTask.id], (updateTaskErr, updateTaskResult) => {
                        if (updateTaskErr) {
                            console.error('Error updating task', updateTaskErr);
                            reject(updateTaskErr);
                        } else {
                            resolve(updateTaskResult);
                        }
                    });
                });
            }

            for (const newTask of tasks.filter(newTask => !newTask.id)) {
                const insertTaskQuery = 'INSERT INTO life_book_has_tasks (lb_id, name, status) VALUES (?, ?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(insertTaskQuery, [id, newTask.name, newTask.status.toString()], (insertTaskErr, insertTaskResult) => {
                        if (insertTaskErr) {
                            console.error('Error inserting new task', insertTaskErr);
                            reject(insertTaskErr);
                        } else {
                            resolve(insertTaskResult);
                        }
                    });
                });
            }

            for (const taskIdToDelete of existingTaskIds.filter(existingTaskId => !tasks.some(updatedTask => updatedTask.id === existingTaskId))) {
                const deleteTaskQuery = 'DELETE FROM life_book_has_tasks WHERE lb_id = ? AND id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteTaskQuery, [id, taskIdToDelete], (deleteTaskErr, deleteTaskResult) => {
                        if (deleteTaskErr) {
                            console.error('Error deleting task', deleteTaskErr);
                            reject(deleteTaskErr);
                        } else {
                            resolve(deleteTaskResult);
                        }
                    });
                });
            }

            const existingTagsQuery = 'SELECT id FROM life_book_has_tags WHERE lb_id = ?';
            const existingTags = await new Promise((resolve, reject) => {
                db.query(existingTagsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing tags', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingTagIds = existingTags.map(tag => tag.id);

            const updateTagPromises = tags.map(async (newTag) => {
                const updateTagQuery = 'UPDATE life_book_has_tags SET name = ?, user_id = ? WHERE lb_id = ? AND id = ?';
                db.query(updateTagQuery, [newTag.name, userId, id, newTag.id], (updateTagErr, updateTagResult) => {
                    if (updateTagErr) {
                        console.error('Error updating tag', updateTagErr);
                    }
                });
            });

            await Promise.all(updateTagPromises);

            const insertTagPromises = tags.filter(newTag => !newTag.id).map(async (newTag) => {
                const insertTagQuery = 'INSERT INTO life_book_has_tags (lb_id, name, user_id) VALUES (?, ?, ?)';
                db.query(insertTagQuery, [id, newTag.name, userId], (insertTagErr, insertTagResult) => {
                    if (insertTagErr) {
                        console.error('Error inserting new tag', insertTagErr);
                    }
                });
            });

            await Promise.all(insertTagPromises);

            const deleteTagPromises = existingTagIds
                .filter(existingTagId => !tags.some(updatedTag => updatedTag.id === existingTagId))
                .map(async (tagIdToDelete) => {
                    const deleteTagQuery = 'DELETE FROM life_book_has_tags WHERE lb_id = ? AND id = ?';
                    db.query(deleteTagQuery, [id, tagIdToDelete], (deleteTagErr, deleteTagResult) => {
                        if (deleteTagErr) {
                            console.error('Error deleting tag', deleteTagErr);
                        }
                    });
                });

            await Promise.all(deleteTagPromises);

            const allTaskStatusesZero = tasks.every(task => task.status === 0);

            if (!(tasks.length === 0 || allTaskStatusesZero)) {
                const allTaskStatusesOne = tasks.every(task => task.status === 1);

                if (allTaskStatusesOne) {
                    if (assessment && assessment.length > 0) {
                        const [assessmentData] = assessment;
                        const progressTowardsLifePurpose = assessmentData.did_progress_towards_life_purpose === '' ? '0' : assessmentData.did_progress_towards_life_purpose;
                        const did_help_another_person = assessmentData.did_help_another_person === '' ? '0' : assessmentData.did_help_another_person;

                        const checkAssessmentQuery = 'SELECT id FROM life_book_has_assessment WHERE lb_id = ?';
                        db.query(checkAssessmentQuery, [id], async (checkAssessmentErr, checkAssessmentResult) => {
                            if (checkAssessmentErr) {
                                console.error('Error checking assessment existence', checkAssessmentErr);
                            } else {
                                if (checkAssessmentResult && checkAssessmentResult.length > 0) {
                                    const updateAssessmentQuery = 'UPDATE life_book_has_assessment SET grade = ?, did_progress_towards_life_purpose = ?, did_help_another_person = ?, do_differently = ?, comments = ? WHERE lb_id = ?';
                                    const assessmentValues = [assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || '', id];

                                    db.query(updateAssessmentQuery, assessmentValues, (updateAssessmentErr, updateAssessmentResult) => {
                                        if (updateAssessmentErr) {
                                            console.error('Error updating assessment table', updateAssessmentErr);
                                        } else {
                                        }
                                    });
                                } else {
                                    const insertAssessmentQuery = 'INSERT INTO life_book_has_assessment (lb_id, grade, did_progress_towards_life_purpose, did_help_another_person, do_differently, comments) VALUES (?, ?, ?, ?, ?, ?)';
                                    const assessmentValues = [id, assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || ''];

                                    db.query(insertAssessmentQuery, assessmentValues, (insertAssessmentErr, insertAssessmentResult) => {
                                        if (insertAssessmentErr) {
                                            console.error('Error inserting new assessment', insertAssessmentErr);
                                        } else {
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            }

            const currentFilesQuery = 'SELECT id, original_filename, name, url, type, size FROM life_book_has_files WHERE lb_id = ?';
            const currentFiles = await new Promise((resolve, reject) => {
                db.query(currentFilesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving current files', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const filesToDelete = currentFiles.filter(file => !files.some(updatedFile => updatedFile.filename === file.name));
            const filesToInsert = files.filter(updatedFile => !currentFiles.some(currentFile => currentFile.name === updatedFile.filename));

            const deleteFilePromises = filesToDelete.map(fileToDelete => {
                const deleteFileQuery = 'DELETE FROM life_book_has_files WHERE lb_id = ? AND id = ?';
                const deleteFileValues = [id, fileToDelete.id];

                return new Promise((resolve, reject) => {
                    db.query(deleteFileQuery, deleteFileValues, (deleteFileErr, deleteFileResult) => {
                        if (deleteFileErr) {
                            console.error('Error deleting file from database', deleteFileErr);
                            reject(deleteFileErr);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            const insertFilePromises = filesToInsert.map(newFile => {

                const insertFileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size) VALUES (?,?, ?, ?, ?, ?)';
                const insertFileValues = [id, newFile.original_filename, newFile.filename, newFile.url, newFile.mimetype, newFile.size];

                return new Promise((resolve, reject) => {
                    db.query(insertFileQuery, insertFileValues, (insertFileErr, insertFileResult) => {
                        if (insertFileErr) {
                            console.error('Error inserting new file', insertFileErr);
                            reject(insertFileErr);
                        } else {
                            resolve()
                        }
                    });
                });
            });

            await Promise.all([...deleteFilePromises, ...insertFilePromises]);

            return {
                id,
                title,
                status,
                insights,
                notes,
                tasks,
                tags,
                files: files.map(file => ({
                    original_filename: file.original_filename,
                    name: file.filename,
                    url: file.url,
                    type: file.mimetype,
                    size: file.size,
                })),
                assessment,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async updateTaskStatusData(data) {
        const { id, status } = data;
        return new Promise((resolve, reject) => {
            const updateQuery = 'UPDATE life_book_has_tasks SET status = ? WHERE id = ?';
            const updateValues = [status, id];

            db.query(updateQuery, updateValues, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating task status:', statusUpdateErr);
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
                            message: 'Task not found',
                        });
                    }
                }
            });
        });
    }

    async deleteExperience(data) {
        const { id } = data;

        try {
            const experienceExists = await this.experienceExists(id);

            if (!experienceExists) {
                return { success: false, message: 'Insight not found.' };
            }

            const imagePaths = await this.getImagePaths(id);

            await this.deleteRecords('knowledge_experience_insights', 'lb_id', id);
            await this.deleteRecords('knowledge_experience_notes', 'lb_id', id);
            await this.deleteRecords('life_book_has_tasks', 'lb_id', id);
            await this.deleteRecords('life_book_has_tags', 'lb_id', id);
            await this.deleteRecords('life_book_has_files', 'lb_id', id);
            await this.deleteRecords('life_book_has_assessment', 'lb_id', id);
            await this.deleteRecords('life_books', 'id', id);

            await this.deleteImageFiles(imagePaths);

            return { success: true, message: 'Insight deleted successfully.' };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getImagePaths(id) {
        const selectQuery = 'SELECT url FROM life_book_has_files WHERE lb_id = ?';
        return new Promise((resolve, reject) => {
            db.query(selectQuery, [id], (err, results) => {
                if (err) {
                    console.error('Error retrieving image paths', err);
                    reject(err);
                } else {
                    const imagePaths = results.map(result => result.url);
                    resolve(imagePaths);
                }
            });
        });
    }

    async deleteImageFiles(imagePaths) {
        try {
            for (const imagePath of imagePaths) {
                const relativePath = new URL(imagePath).pathname;

                const filePath = path.join(process.cwd(), 'public', relativePath);

                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            }
        } catch (error) {
            console.error('Error deleting image files', error);
            throw error;
        }
    }

    async experienceExists(id) {
        const checkQuery = 'SELECT id FROM life_books WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) {
                    console.error('Error checking existence of experience', err);
                    reject(err);
                } else {
                    resolve(result.length > 0);
                }
            });
        });
    }

    async deleteRecords(tableName, conditionColumn, conditionValue) {
        const deleteQuery = `DELETE FROM ${tableName} WHERE ${conditionColumn} = ?`;
        return new Promise((resolve, reject) => {
            db.query(deleteQuery, [conditionValue], (err, result) => {
                if (err) {
                    console.error(`Error deleting records from ${tableName}`, err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async deleteTask(data) {
        const { id } = data;
        try {
            const deleteTaskQuery = 'DELETE FROM life_book_has_tasks WHERE id = ?';
            return new Promise((resolve, reject) => {
                db.query(deleteTaskQuery, [id], (deleteTaskErr, deleteTaskResult) => {
                    if (deleteTaskErr) {
                        console.error('Error deleting existing task', deleteTaskErr);

                        return reject(deleteTaskErr);
                    }

                    if (deleteTaskResult.affectedRows > 0) {
                        const data = { id: id };
                        resolve(data);
                    } else {
                        resolve({ success: false, id: id });
                    }
                });
            });

        } catch (error) {
            console.error('Error deleting task', error);
            throw error;
        }

    }

    async Updateis_completed_task(id, status) {
        return new Promise((resolve, reject) => {
            const updateQuery = `UPDATE life_books SET is_completed_task = '${status}'  WHERE id = ${id}`;
            const updateValues = [id];

            db.query(updateQuery, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating Experince status:', statusUpdateErr);
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
                            message: 'Experince not found',
                        });
                    }
                }
            });
        });
    }
}

module.exports = new knowledgePillarModel();
