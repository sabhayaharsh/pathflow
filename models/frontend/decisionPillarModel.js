const db = require('../../config/database');
const moment = require('moment'); // Import the moment library
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
class DecisionPillarModel {

    async getTotalOppertunityCounts(userId) {
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
            WHERE user_id = ? AND type='2' AND is_completed_assessment = '0';
        `;

        const closedCountQuery = `
            SELECT COUNT(*) AS closedCount
            FROM life_books
            WHERE user_id = ? AND type='2' AND is_completed_assessment = '1';
        `;

        const [activeCountResult, closedCountResult] = await Promise.all([
            executeQuery(activeCountQuery, [userId]),
            executeQuery(closedCountQuery, [userId]),
        ]);

        const activeCount = activeCountResult[0].activeCount;
        const closedCount = closedCountResult[0].closedCount;

        const totalCount = activeCount + closedCount;

        const totaloppertunityCounts = {
            active: activeCount,
            closed: closedCount,
            total: totalCount, // Add total count
        };

        return totaloppertunityCounts;
    }

    async getTotalOppertunityTaskCounts(userId) {
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
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '2' AND lbt.status = '1'
        `;

        const pendingTaskCountQuery = `
            SELECT COUNT(*) AS pendingTaskCount
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '2' AND lbt.status = '0';
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

    async getTotalOppertunityAssessmentCounts(userId) {
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
            WHERE user_id = ? AND type='2' AND is_completed_assessment = '1';
        `;

        const pendingAssessmentCountQuery = `
            SELECT COUNT(*) AS pendingAssessmentCount
            FROM life_books
            WHERE user_id = ? AND type='2' AND is_completed_assessment = '0';
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

    async getOpportunityByNameAndUserId(name, userId) {
        try {
            const query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const groups = await new Promise((resolve, reject) => {
                db.query(query, [name, userId, '2'], (err, result) => {
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

    async getOpportunityByName(name, userId, opportunityId = null) {
        try {
            let query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const queryParams = [name, userId, '2'];

            if (opportunityId) {
                query += ' AND `id` != ?';
                queryParams.push(opportunityId);
            }

            const opportunities = await new Promise((resolve, reject) => {
                db.query(query, queryParams, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return opportunities;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async getRecentOpportunities({
        userId,
        offset,
        perPage,
    }) {
        const query = `
                SELECT
                lb.id AS oppertunityId,
                lb.title AS OppertunityTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS oppertunityStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '2'
            GROUP BY lb.id, lb.title, lb.is_completed_task, lb.status, lb.created_at
            ORDER BY lb.is_completed_assessment, lb.id DESC
            LIMIT ?, ?
            `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const experiencesWithTaskProgress = results.map((row) => {
                    const totalTasks = row.totalTasks || 1;
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;
                    const formattedDate = moment(row.createdDate).format('D MMMM YYYY');
                    return {
                        id: row.oppertunityId,
                        title: row.OppertunityTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        status: row.oppertunityStatus,
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

    async getRecentTotalOpportunities({
        userId,
        status,
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalOpportunities,
                lb.title AS OppertunityTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS oppertunityStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '2'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalOpportunities = results[0].totalOpportunities || 0;
                resolve(totalOpportunities);
            });
        });
    }

    async getRecentOpportunityTaks({
        userId,
        offset,
        perPage,
    }) {
        const query = `
                SELECT
                lbt.id AS taskId,
                lbt.name AS taskTitle,
                lb.title AS oppertunityTitle,
                lb.id AS oppertunityID,
                lb.status AS oppertunityStatus,
                DATE_FORMAT(lbt.created_at, '%d %M %Y') AS createdDate,
                lbt.status AS taskStatus
            FROM life_book_has_tasks lbt
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lb.user_id = ? AND lb.type = '2'
            ORDER BY lbt.status,lbt.id DESC
            LIMIT ?, ?
            `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const recentActiveTasks = results.map((row) => {
                    return {
                        taskId: row.taskId,
                        taskTitle: row.taskTitle,
                        oppertunityTitle: row.oppertunityTitle,
                        taskStatus: row.taskStatus,
                        oppertunityID: row.oppertunityID,
                        oppertunityStatus: row.oppertunityStatus,
                        createdDate : row.createdDate
                    };
                });

                resolve(recentActiveTasks);
            });
        });
    }

    async getRecentTotalOpportunityTasks({
        userId,
        status,
    }) {
        const query = `
            SELECT COUNT(DISTINCT lbt.id) AS totalOpportunitiesTasks,
                lbt.id AS taskId,
                lbt.name AS taskTitle,
                lb.title AS oppertunityTitle,
                lb.id AS oppertunityID,
                lb.status AS oppertunityStatus,
                lbt.status AS taskStatus
            FROM life_book_has_tasks lbt
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lb.user_id = ? AND lb.type = '2'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalOpportunitiesTasks = results[0].totalOpportunitiesTasks || 0;
                resolve(totalOpportunitiesTasks);
            });
        });
    }

    async getRecentOpportunityAssessments({
        userId,
        offset,
        perPage,
    }) {
        const query = `
                SELECT
                lb.id AS oppertunityId,
                lb.title AS oppertunityTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS oppertunityStatus,
                DATE_FORMAT(lb.created_at, '%d %M %Y') AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '2'
            ORDER BY lb.status, lb.id DESC
            LIMIT ?, ?
            `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const latestAssessments = results.map((row) => {
                    return {
                        oppertunityId: row.oppertunityId,
                        oppertunityTitle: row.oppertunityTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        oppertunityStatus: row.oppertunityStatus,
                        createdDate: row.createdDate,
                    };
                });

                // Sort the assessments, placing pending assessments first
                const sortedAssessments = latestAssessments.sort((a, b) => {
                    if (a.isCompletedAssessment && !b.isCompletedAssessment) return 1;
                    if (!a.isCompletedAssessment && b.isCompletedAssessment) return -1;
                    // If both assessments are of the same type, sort by created date
                    return new Date(b.createdDate) - new Date(a.createdDate);
                });

                resolve(sortedAssessments);
            });
        });
    }

    async getRecentTotalOpportunityAssessments({
        userId,
        status,
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalAssessments,
                lb.title AS oppertunityTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS oppertunityStatus,
                lb.created_at AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '2'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalAssessments = results[0].totalAssessments || 0;
                resolve(totalAssessments);
            });
        });
    }

    async createOpportunity(data) {
        const { userId, title, goals, successCriteria, options, decision, tags, tasks, status, files, assessment } = data;

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
            const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status) VALUES (?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(lifeBooksQuery, [userId, title, "2", status], function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.insertId);
                    }
                });
            });

            const insertAllGoals = async (goals, lastInsertedId) => {
                for (const goal of goals) {
                    try {
                        const goalQuery = 'INSERT INTO dicision_opportunities_goals (lb_id, name, description) VALUES (?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(goalQuery, [lastInsertedId, goal.name, goal.description], (goalErr, goalResult) => {
                                if (goalErr) {
                                    console.error('Error inserting into Goal table', goalErr);
                                    reject(goalErr);
                                } else {
                                    resolve(goalResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during Goal insertion:', err);
                    }
                }
            };

            insertAllGoals(goals, lastInsertedId);

            const insertAllSuccessCriteria = async (successCriteria, lastInsertedId) => {
                for (const criteria of successCriteria) {
                    try {
                        const criteriaQuery = 'INSERT INTO dicision_opportunities_success_criteria (lb_id, name, importance, priority) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(criteriaQuery, [lastInsertedId, criteria.name, criteria.importance, criteria.priority], (criteriaErr, criteriaResult) => {
                                if (criteriaErr) {
                                    console.error('Error inserting into criteria table', criteriaErr);
                                    reject(criteriaErr);
                                } else {
                                    resolve(criteriaResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during criteria insertion:', err);
                    }
                }
            };

            insertAllSuccessCriteria(successCriteria, lastInsertedId);

            const insertAllOptions = async (options, lastInsertedId) => {
                for (const option of options) {
                    try {
                        const optionQuery = 'INSERT INTO dicision_opportunities_options (lb_id, name) VALUES (?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(optionQuery, [lastInsertedId, option.name], (optionErr, optionResult) => {
                                if (optionErr) {
                                    console.error('Error inserting into option table', optionErr);
                                    reject(optionErr);
                                } else {
                                    resolve(optionResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during option insertion:', err);
                    }
                }
            };

            insertAllOptions(options, lastInsertedId);

            const insertAllDecision = async (decision, lastInsertedId) => {
                for (const dec of decision) {
                    try {
                        const decisionQuery = 'INSERT INTO dicision_opportunities_decisions (lb_id, name, reason) VALUES (?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(decisionQuery, [lastInsertedId, dec.name, dec.reason], (decErr, decResult) => {
                                if (decErr) {
                                    console.error('Error inserting into decision table', decErr);
                                    reject(decErr);
                                } else {
                                    resolve(decResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during decision insertion:', err);
                    }
                }
            };

            insertAllDecision(decision, lastInsertedId);

            const insertAllTasks = async (tasks, lastInsertedId) => {
                for (const task of tasks) {
                    try {
                        const taskQuery = 'INSERT INTO life_book_has_tasks (lb_id, name, status) VALUES (?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(taskQuery, [lastInsertedId, task.name, task.status.toString()], (taskErr, taskResult) => {
                                if (taskErr) {
                                    console.error('Error inserting into task table', taskErr);
                                    reject(taskErr);
                                } else {
                                    resolve(taskResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during task insertion:', err);
                    }
                }
            };

            insertAllTasks(tasks, lastInsertedId);

            tags.forEach(async (task) => {
                const tagsQuery = 'INSERT INTO life_book_has_tags (user_id, lb_id,  name) VALUES (?, ?, ?)';
                db.query(tagsQuery, [userId, lastInsertedId, task.name], (noteErr, noteResult) => {
                    if (noteErr) {
                        console.error('Error inserting into tags table', noteErr);
                    }
                });
            });

            const allTaskStatusesZero = tasks?.every(task => task.status === 0);

            if (!(tasks?.length === 0 || allTaskStatusesZero)) {
                const allTaskStatusesOne = tasks?.every(task => task.status === 1);

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
                tasks,
                goals,
                successCriteria,
                options,
                decision,
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

    async GetOpportunityIdWise(userId, opportunityId) {
        const query = `
            SELECT
                lb.id AS opportunityId,
                lb.type AS type,
                lb.title AS opportunityTitle,
                lb.is_completed_assessment as is_completed_assessment,
                lea.id AS assessmentId,
                lea.grade,
                lea.did_progress_towards_life_purpose,
                lea.did_help_another_person,
                lea.do_differently,
                lea.comments,
                GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id ASC SEPARATOR '|') AS tasks,
                GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileNames,
                GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileUrls,
                GROUP_CONCAT(lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileTypes,
                GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileSizes,
                GROUP_CONCAT(DISTINCT lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileOriginalName,
                GROUP_CONCAT(DISTINCT CONCAT(lbg.name, ':', lbg.description) SEPARATOR ';') AS goals,
                GROUP_CONCAT(DISTINCT CONCAT(lsc.name, ':', lsc.importance, ':', lsc.priority) SEPARATOR ';') AS successCriteria,
                GROUP_CONCAT(DISTINCT lo.name SEPARATOR '|') AS options,
                GROUP_CONCAT(DISTINCT CONCAT(lc.name, ':', lc.reason) SEPARATOR ';') AS decisions,
                GROUP_CONCAT(DISTINCT lbtg.name SEPARATOR '|') AS tags
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            LEFT JOIN dicision_opportunities_goals lbg ON lb.id = lbg.lb_id
            LEFT JOIN dicision_opportunities_success_criteria lsc ON lb.id = lsc.lb_id
            LEFT JOIN dicision_opportunities_options lo ON lb.id = lo.lb_id
            LEFT JOIN dicision_opportunities_decisions lc ON lb.id = lc.lb_id
            LEFT JOIN life_book_has_tags lbtg ON lb.id = lbtg.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId, opportunityId], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve([]);  // No records found
                } else {
                    const row = results[0];
                    const opportunity = {
                        id: row.opportunityId,
                        title: row.opportunityTitle,
                        type: row.type
                    };
                    const assessment = {
                        grade: row.grade,
                        did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                        did_help_another_person: row.did_help_another_person,
                        do_differently: row.do_differently,
                        comments: row.comments,
                    };
                    const tasks = row.tasks ? row.tasks.split('|') : [];
                    const tasksWithStatus = tasks.map(taskString => {
                        const [name, status] = taskString.split(':');
                        return { name, status: parseInt(status) };
                    });

                    const fileNames = row.fileNames ? row.fileNames.split('|') : [];
                    const fileUrls = row.fileUrls ? row.fileUrls.split('|') : [];
                    const fileTypes = row.fileTypes ? row.fileTypes.split('|') : [];
                    const fileSizes = row.fileSizes ? row.fileSizes.split('|') : [];
                    const original_filenames = row.fileOriginalName ? row.fileOriginalName.split('|') : [];

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
                            size: fileSizes[index],
                        };
                    });

                    const goals = row.goals ? row.goals.split(';') : [];
                    const formattedGoals = goals.map(goalString => {
                        const [name, description] = goalString.split(':');
                        return { name, description };
                    });

                    const successCriteria = row.successCriteria ? row.successCriteria.split(';') : [];
                    const formattedSuccessCriteria = successCriteria.map(scString => {
                        const [name, importance, priority] = scString.split(':');
                        return { name, importance, priority };
                    });

                    const options = row.options ? row.options.split('|') : [];

                    const decisions = [];
                    const decisionStrings = row.decisions ? row.decisions.split(';') : [];
                    decisionStrings.forEach(decisionString => {
                        const [name, reason] = decisionString.split(':');
                        decisions.push({ name, reason });
                    });

                    const tags = row.tags ? row.tags.split('|') : [];

                    const opportunityWithTaskProgress = {
                        opportunity,
                        assessment,
                        tasks: tasksWithStatus,
                        tags,
                        files: correctedFiles,
                        is_completed_assessment: row.is_completed_assessment,
                        goals: formattedGoals,
                        successCriteria: formattedSuccessCriteria,
                        options: options.map(name => ({ name })),
                        decisions
                    };
                    resolve([opportunityWithTaskProgress]);
                }
            });
        });
    }

    async GetOpportunityPdfPrint(userId, opportunityId) {
        const query = `
            SELECT
                lb.id AS opportunityId,
                lb.created_at AS CreatedDate,
                lb.type AS type,
                lb.title AS opportunityTitle,
                lb.is_completed_assessment as is_completed_assessment,
                lea.id AS assessmentId,
                lea.grade,
                lea.did_progress_towards_life_purpose,
                lea.did_help_another_person,
                lea.do_differently,
                lea.comments,
                GROUP_CONCAT(DISTINCT CONCAT(lbt.name, ':', lbt.status) ORDER BY lbt.id DESC SEPARATOR '|') AS tasks,
                GROUP_CONCAT(DISTINCT lbhf.name ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileNames,
                GROUP_CONCAT(DISTINCT lbhf.url ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileUrls,
                GROUP_CONCAT(DISTINCT lbhf.type ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileTypes,
                GROUP_CONCAT(DISTINCT lbhf.size ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileSizes,
                GROUP_CONCAT(DISTINCT lbhf.original_filename ORDER BY CASE WHEN lbhf.name LIKE '%.jpg' THEN 1 ELSE 2 END SEPARATOR '|') AS fileOriginalName,
                GROUP_CONCAT(DISTINCT CONCAT(lbg.name, ':', lbg.description) ORDER BY lbt.id DESC SEPARATOR ';') AS goals,
                GROUP_CONCAT(DISTINCT CONCAT(lsc.name, ':', lsc.importance, ':', lsc.priority) ORDER BY lsc.id DESC SEPARATOR ';') AS successCriteria,
                GROUP_CONCAT(DISTINCT lo.name ORDER BY lo.id DESC SEPARATOR '|') AS options,
                GROUP_CONCAT(DISTINCT CONCAT(lc.name, ':', lc.reason) ORDER BY lc.id DESC SEPARATOR ';') AS decisions,
                GROUP_CONCAT(DISTINCT lbtg.name SEPARATOR '|') AS tags
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            LEFT JOIN dicision_opportunities_goals lbg ON lb.id = lbg.lb_id
            LEFT JOIN dicision_opportunities_success_criteria lsc ON lb.id = lsc.lb_id
            LEFT JOIN dicision_opportunities_options lo ON lb.id = lo.lb_id
            LEFT JOIN dicision_opportunities_decisions lc ON lb.id = lc.lb_id
            LEFT JOIN life_book_has_tags lbtg ON lb.id = lbtg.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, opportunityId], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) {
                    resolve([]);  // No records found
                } else {
                    const row = results[0];
                    const opportunity = {
                        id: row.opportunityId,
                        title: row.opportunityTitle,
                        type: row.type
                    };
                    const assessment = {
                        grade: row.grade,
                        did_progress_towards_life_purpose: row.did_progress_towards_life_purpose,
                        did_help_another_person: row.did_help_another_person,
                        do_differently: row.do_differently,
                        comments: row.comments,
                    };
                    const tasks = row.tasks ? row.tasks.split('|') : [];
                    const tasksWithStatus = tasks.map(taskString => {
                        const [name, status] = taskString.split(':');
                        return { name, status: parseInt(status) };
                    });

                    const fileNames = row.fileNames ? row.fileNames.split('|') : [];
                    const fileUrls = row.fileUrls ? row.fileUrls.split('|') : [];
                    const fileTypes = row.fileTypes ? row.fileTypes.split('|') : [];
                    const fileSizes = row.fileSizes ? row.fileSizes.split('|') : [];
                    const original_filenames = row.fileOriginalName ? row.fileOriginalName.split('|') : [];

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
                            size: fileSizes[index],
                        };
                    });

                    const goals = row.goals ? row.goals.split(';') : [];
                    const formattedGoals = goals.map(goalString => {
                        const [name, description] = goalString.split(':');
                        return { name, description };
                    });

                    const successCriteria = row.successCriteria ? row.successCriteria.split(';') : [];
                    const formattedSuccessCriteria = successCriteria.map(scString => {
                        const [name, importance, priority] = scString.split(':');
                        return { name, importance, priority };
                    });

                    const options = row.options ? row.options.split('|') : [];

                    const decisions = [];
                    const decisionStrings = row.decisions ? row.decisions.split(';') : [];
                    decisionStrings.forEach(decisionString => {
                        const [name, reason] = decisionString.split(':');
                        decisions.push({ name, reason });
                    });

                    const tags = row.tags ? row.tags.split('|') : [];

                    const opportunityWithTaskProgress = {
                        CreatedDate : row.CreatedDate,
                        opportunity,
                        assessment,
                        tasks: tasksWithStatus,
                        tags,
                        files: correctedFiles,
                        is_completed_assessment: row.is_completed_assessment,
                        goals: formattedGoals,
                        successCriteria: formattedSuccessCriteria,
                        options: options.map(name => ({ name })),
                        decisions
                    };
                    resolve([opportunityWithTaskProgress]);
                }
            });
        });
    }

    async updateOppertunity(data, url) {
        const { userId, id, title, status, goals, successCriteria, options, tags, decision, tasks, files, assessment } = data;
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
                    reject(err);
                }
            });

            const existingGoalsQuery = 'SELECT id FROM dicision_opportunities_goals WHERE lb_id = ?';
            const existingGoals = await new Promise((resolve, reject) => {
                db.query(existingGoalsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing goals', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingGoalIds = existingGoals.map(goal => goal.id);

            for (const newGoal of goals) {
                if (newGoal.id) {
                    const updateGoalQuery = 'UPDATE dicision_opportunities_goals SET name = ?, description = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateGoalQuery, [newGoal.name, newGoal.description, newGoal.id], (updateGoalErr, updateGoalResult) => {
                            if (updateGoalErr) {
                                console.error('Error updating goal', updateGoalErr);
                                reject(updateGoalErr);
                            } else {
                                resolve(updateGoalResult);
                            }
                        });
                    });
                } else {
                    const insertGoalQuery = 'INSERT INTO dicision_opportunities_goals (lb_id, name, description) VALUES (?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertGoalQuery, [id, newGoal.name, newGoal.description], (insertGoalErr, insertGoalResult) => {
                            if (insertGoalErr) {
                                console.error('Error inserting new goal', insertGoalErr);
                                reject(insertGoalErr);
                            } else {
                                resolve(insertGoalResult);
                            }
                        });
                    });
                }
            }

            for (const goalIdToDelete of existingGoalIds.filter(existingGoalId => !goals.some(updatedGoal => updatedGoal.id === existingGoalId))) {
                const deleteGoalQuery = 'DELETE FROM dicision_opportunities_goals WHERE id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteGoalQuery, [goalIdToDelete], (deleteGoalErr, deleteGoalResult) => {
                        if (deleteGoalErr) {
                            console.error('Error deleting goal', deleteGoalErr);
                            reject(deleteGoalErr);
                        } else {
                            resolve(deleteGoalResult);
                        }
                    });
                });
            }

            const existingSuccessCriteriaQuery = 'SELECT id FROM dicision_opportunities_success_criteria WHERE lb_id = ?';
            const existingSuccessCriteria = await new Promise((resolve, reject) => {
                db.query(existingSuccessCriteriaQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing success criteria', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingSuccessCriterionIds = existingSuccessCriteria.map(criterion => criterion.id);

            for (const newCriterion of successCriteria) {
                if (newCriterion.id) {
                    // Update existing success criterion
                    const updateCriterionQuery = 'UPDATE dicision_opportunities_success_criteria SET name = ?, importance = ?, priority = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateCriterionQuery, [newCriterion.name, newCriterion.importance, newCriterion.priority, newCriterion.id], (updateCriterionErr, updateCriterionResult) => {
                            if (updateCriterionErr) {
                                console.error('Error updating success criterion', updateCriterionErr);
                                reject(updateCriterionErr);
                            } else {
                                resolve(updateCriterionResult);
                            }
                        });
                    });
                } else {
                    // Insert new success criterion
                    const insertCriterionQuery = 'INSERT INTO dicision_opportunities_success_criteria (lb_id, name, importance, priority) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertCriterionQuery, [id, newCriterion.name, newCriterion.importance, newCriterion.priority], (insertCriterionErr, insertCriterionResult) => {
                            if (insertCriterionErr) {
                                console.error('Error inserting new success criterion', insertCriterionErr);
                                reject(insertCriterionErr);
                            } else {
                                resolve(insertCriterionResult);
                            }
                        });
                    });
                }
            }

            // Sequentially Delete Removed Success Criteria
            for (const criterionIdToDelete of existingSuccessCriterionIds.filter(existingCriterionId => !successCriteria.some(updatedCriterion => updatedCriterion.id === existingCriterionId))) {
                const deleteCriterionQuery = 'DELETE FROM dicision_opportunities_success_criteria WHERE id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteCriterionQuery, [criterionIdToDelete], (deleteCriterionErr, deleteCriterionResult) => {
                        if (deleteCriterionErr) {
                            console.error('Error deleting success criterion', deleteCriterionErr);
                            reject(deleteCriterionErr);
                        } else {
                            resolve(deleteCriterionResult);
                        }
                    });
                });
            }

            const existingDecisionsQuery = 'SELECT id FROM dicision_opportunities_decisions WHERE lb_id = ?';
            const existingDecisions = await new Promise((resolve, reject) => {
                db.query(existingDecisionsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing decisions', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingDecisionIds = existingDecisions.map(decision => decision.id);

            for (const newDecision of decision) {
                if (newDecision.id) {
                    // Update existing decision
                    const updateDecisionQuery = 'UPDATE dicision_opportunities_decisions SET name = ?, reason = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateDecisionQuery, [newDecision.name, newDecision.reason, newDecision.id], (updateDecisionErr, updateDecisionResult) => {
                            if (updateDecisionErr) {
                                console.error('Error updating decision', updateDecisionErr);
                                reject(updateDecisionErr);
                            } else {
                                resolve(updateDecisionResult);
                            }
                        });
                    });
                } else {
                    // Insert new decision
                    const insertDecisionQuery = 'INSERT INTO dicision_opportunities_decisions (lb_id, name, reason) VALUES (?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertDecisionQuery, [id, newDecision.name, newDecision.reason], (insertDecisionErr, insertDecisionResult) => {
                            if (insertDecisionErr) {
                                console.error('Error inserting new decision', insertDecisionErr);
                                reject(insertDecisionErr);
                            } else {
                                resolve(insertDecisionResult);
                            }
                        });
                    });
                }
            }

            // Sequentially Delete Removed Decisions
            for (const decisionIdToDelete of existingDecisionIds.filter(existingDecisionId => !decision.some(updatedDecision => updatedDecision.id === existingDecisionId))) {
                const deleteDecisionQuery = 'DELETE FROM dicision_opportunities_decisions WHERE id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteDecisionQuery, [decisionIdToDelete], (deleteDecisionErr, deleteDecisionResult) => {
                        if (deleteDecisionErr) {
                            console.error('Error deleting decision', deleteDecisionErr);
                            reject(deleteDecisionErr);
                        } else {
                            resolve(deleteDecisionResult);
                        }
                    });
                });
            }

            const existingOptionsQuery = 'SELECT id FROM dicision_opportunities_options WHERE lb_id = ?';
            const existingOptions = await new Promise((resolve, reject) => {
                db.query(existingOptionsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing options', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingOptionIds = existingOptions.map(option => option.id);

            // Sequentially Update or Insert Options
            for (const newOption of options) {
                if (newOption.id) {
                    // Update existing option
                    const updateOptionQuery = 'UPDATE dicision_opportunities_options SET name = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateOptionQuery, [newOption.name, newOption.id], (updateOptionErr, updateOptionResult) => {
                            if (updateOptionErr) {
                                console.error('Error updating option', updateOptionErr);
                                reject(updateOptionErr);
                            } else {
                                resolve(updateOptionResult);
                            }
                        });
                    });
                } else {
                    // Insert new option
                    const insertOptionQuery = 'INSERT INTO dicision_opportunities_options (lb_id, name) VALUES (?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertOptionQuery, [id, newOption.name], (insertOptionErr, insertOptionResult) => {
                            if (insertOptionErr) {
                                console.error('Error inserting new option', insertOptionErr);
                                reject(insertOptionErr);
                            } else {
                                resolve(insertOptionResult);
                            }
                        });
                    });
                }
            }

            // Sequentially Delete Removed Options
            for (const optionIdToDelete of existingOptionIds.filter(existingOptionId => !options.some(updatedOption => updatedOption.id === existingOptionId))) {
                const deleteOptionQuery = 'DELETE FROM dicision_opportunities_options WHERE id = ?';
                await new Promise((resolve, reject) => {
                    db.query(deleteOptionQuery, [optionIdToDelete], (deleteOptionErr, deleteOptionResult) => {
                        if (deleteOptionErr) {
                            console.error('Error deleting option', deleteOptionErr);
                            reject(deleteOptionErr);
                        } else {
                            resolve(deleteOptionResult);
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

            // Delete tags not present in the update
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

                        // Check if the assessment already exists for the lb_id
                        const checkAssessmentQuery = 'SELECT id FROM life_book_has_assessment WHERE lb_id = ?';
                        db.query(checkAssessmentQuery, [id], async (checkAssessmentErr, checkAssessmentResult) => {
                            if (checkAssessmentErr) {
                                console.error('Error checking assessment existence', checkAssessmentErr);
                                // Handle error
                            } else {
                                if (checkAssessmentResult && checkAssessmentResult.length > 0) {
                                    // Update the existing assessment
                                    const updateAssessmentQuery = 'UPDATE life_book_has_assessment SET grade = ?, did_progress_towards_life_purpose = ?, did_help_another_person = ?, do_differently = ?, comments = ? WHERE lb_id = ?';
                                    const assessmentValues = [assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || '', id];

                                    db.query(updateAssessmentQuery, assessmentValues, (updateAssessmentErr, updateAssessmentResult) => {
                                        if (updateAssessmentErr) {
                                            console.error('Error updating assessment table', updateAssessmentErr);
                                            // Handle error
                                        } else {
                                            // Handle successful update
                                        }
                                    });
                                } else {
                                    // Insert a new assessment
                                    const insertAssessmentQuery = 'INSERT INTO life_book_has_assessment (lb_id, grade, did_progress_towards_life_purpose, did_help_another_person, do_differently, comments) VALUES (?, ?, ?, ?, ?, ?)';
                                    const assessmentValues = [id, assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || ''];

                                    db.query(insertAssessmentQuery, assessmentValues, (insertAssessmentErr, insertAssessmentResult) => {
                                        if (insertAssessmentErr) {
                                            console.error('Error inserting new assessment', insertAssessmentErr);
                                            // Handle error
                                        } else {
                                            // Handle successful insertion
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

            // Identify files to delete (present in the database but not in the update)
            const filesToDelete = currentFiles.filter(file => !files.some(updatedFile => updatedFile.filename === file.name));

            // Identify files to insert (present in the update but not in the database)
            const filesToInsert = files.filter(updatedFile => !currentFiles.some(currentFile => currentFile.name === updatedFile.filename));

            // Delete files from the database and experiences folder
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

            // Insert new files into the database and move to experiences folder
            const insertFilePromises = filesToInsert.map(newFile => {
                const insertFileQuery = 'INSERT INTO life_book_has_files (lb_id, original_filename, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?)';
                const insertFileValues = [id, newFile.original_filename, newFile.filename, newFile.url, newFile.mimetype, newFile.size];

                return new Promise((resolve, reject) => {
                    db.query(insertFileQuery, insertFileValues, (insertFileErr, insertFileResult) => {
                        if (insertFileErr) {
                            console.error('Error inserting new file', insertFileErr);
                            reject(insertFileErr);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            await Promise.all([...deleteFilePromises, ...insertFilePromises]);

            return {
                id,
                title,
                status,
                tasks,
                goals,
                successCriteria,
                options,
                decision,
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

    async deleteOppertunity(data) {
        const { id } = data;
        try {
            // Check if the experience with the specified id exists
            const opportunitieExists = await this.OpportunityExists(id);

            if (!opportunitieExists) {
                return { success: false, message: 'Decision not found.' };
            }

            // Get associated image file paths
            const imagePaths = await this.getImagePaths(id);

            // Perform the deletion of database records
            await this.deleteRecords('dicision_opportunities_decisions', 'lb_id', id);
            await this.deleteRecords('dicision_opportunities_goals', 'lb_id', id);
            await this.deleteRecords('dicision_opportunities_options', 'lb_id', id);
            await this.deleteRecords('dicision_opportunities_success_criteria', 'lb_id', id);
            await this.deleteRecords('life_book_has_tasks', 'lb_id', id);
            await this.deleteRecords('life_book_has_files', 'lb_id', id);
            await this.deleteRecords('life_book_has_tags', 'lb_id', id);
            await this.deleteRecords('life_book_has_assessment', 'lb_id', id);
            await this.deleteRecords('life_books', 'id', id);

            // Delete associated image files
            await this.deleteImageFiles(imagePaths);

            return { success: true, message: 'Decision deleted successfully.' };
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

    async OpportunityExists(id) {
        const checkQuery = 'SELECT id FROM life_books WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) {
                    console.error('Error checking existence of opportunity', err);
                    reject(err);
                } else {
                    resolve(result.length > 0);
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

    async getFilteredOppertunities({
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
        const query = `
                SELECT
                    lb.id AS oppertunityId,
                    Trim(lb.title) AS oppertunityTitle,
                    lb.publish_date AS oppertunityPublishDate,
                    lb.status AS oppertunityStatus,
                    lb.is_completed_assessment AS is_completed_assessment,
                    COUNT(lbt.id) AS totalTasks,
                    SUM(lbt.status = '1') AS completedTasks
                FROM life_books lb
                LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
                WHERE
                    lb.user_id = ${userId} AND lb.type = '2'
                     ${search ? `AND lb.id = TRIM('${search}')` : ''}
                    ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                    ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD')} 23:59:00'` : ''}
                    ${status ? `AND lb.status = '${status}'` : ''}
                GROUP BY lb.id, lb.title, lb.publish_date, lb.status
                ORDER BY lb.is_completed_assessment ASC, ${sortBy !== '' ? `Trim(lb.${sortBy}) ${sortOrder}` : 'lb.id DESC'}
                LIMIT ${offset}, ${perPage};
            `;
        console.log("query",query);
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);
                const filteredOppertunity = results.map((row) => {
                    const totalTasks = row.totalTasks || 1; // Avoid division by zero
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;
                    const formattedDate = moment(row.oppertunityPublishDate).format('D MMMM YYYY');
                    return {
                        id: row.oppertunityId,
                        title: row.oppertunityTitle,
                        publishDate: formattedDate,
                        status: row.oppertunityStatus,
                        is_completed_assessment: row.is_completed_assessment,
                        totalTasks: row.totalTasks,
                        completedTasks: row.completedTasks,
                        progressPercentage: progressPercentage.toFixed(0),
                    };
                });

                resolve(filteredOppertunity);
            });
        });
    }

    async getTotalOppertunities({
        userId,
        fromDate,
        toDate,
        status,
        search
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalOppertunities
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '2'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD')} 23:59:00'` : ''}
                 ${search ? `AND lb.id = '${search}'` : ''}
                ${status ? `AND lb.status = '${status}'` : ''};
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalOppertunities = results[0].totalOppertunities || 0;
                resolve(totalOppertunities);
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
        oppertunityTitle,
        search
    }) {
        const query = `
            SELECT
                lbt.id AS id,
                lbt.lb_id AS oppertunityId,
                lb.title AS oppertunityTitle,
                lb.status AS oppertunityStatus,
                lbt.name AS name,
                lbt.status AS status,
                lbt.created_at AS created_at
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ${userId} AND lb.type = '2'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${status ? `AND lbt.status = '${status}'` : ''}

                ${search ? `AND lbt.id = '${search}'` : ''}
                ${oppertunityTitle ? `AND lb.title LIKE '%${oppertunityTitle}%'` : ''}
                ORDER BY lbt.status ASC, ${sortBy !== '' ? `Trim(${sortBy}) ${sortOrder}` : 'lb.id DESC'}
            LIMIT ${offset}, ${perPage}
        `;
        
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    oppertunityId: row.oppertunityId,
                    oppertunityTitle: row.oppertunityTitle,
                    name: row.name,
                    status: row.status,
                    is_completed_assessment: row.is_completed_assessment,
                    oppertunityStatus: row.oppertunityStatus,
                    //created_at: row.created_at,
                    created_at: moment(row.created_at).format('D MMMM YYYY'),
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
        oppertunityTitle
    }) {
        const query = `
            SELECT COUNT(*) AS totalTasks
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '2'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${search ? `AND lbt.id = '${search}'` : ''}
                ${oppertunityTitle ? `AND lb.title LIKE '%${oppertunityTitle}%'` : ''}
                ${status ? `AND lbt.status = '${status}'` : ''};
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalTasks = results[0].totalTasks || 0;
                resolve(totalTasks);
            });
        });
    }

    async getFilteredAssessments({
        userId,
        fromDate,
        toDate,
        status,
        sortBy,
        sortOrder,
        offset,
        perPage,
        oppertunityTitle,
        search
    }) {
        const query = `
            SELECT
                id AS oppertunityId,
                Trim(title) AS oppertunityTitle,
                publish_date as createdDate,
                is_completed_assessment AS completed_assessment
            FROM life_books
            WHERE
                user_id = ${userId} AND
                type = '2'
                ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${status ? `AND is_completed_assessment = '${status}'` : ''}
                ${oppertunityTitle ? `AND title = '${oppertunityTitle}'` : ''}
                ${search ? `AND id = '${search}'` : ''}
                ORDER BY completed_assessment ASC, ${sortBy !== '' ? `Trim(${sortBy}) ${sortOrder}` : 'id DESC'} 
            LIMIT ${offset}, ${perPage};`;

        console.log('query',query);
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => {
                    const formattedDate = moment(row.createdDate).format('D MMMM YYYY');
                   
                    return {
                        oppertunityId: row.oppertunityId,
                        oppertunityTitle: row.oppertunityTitle,
                        publish_date : formattedDate,
                        oppertunityStatus: row.completed_assessment
                    };
                });
                resolve(assessments);
            });
        })
    }

    async getTotalAssessments({
        userId,
        fromDate,
        toDate,
        status,
        oppertunityTitle
    }) {
        const query = `
            SELECT COUNT(*) AS totalAssessment
            FROM life_books
            WHERE
                user_id = ? AND
                type = '2'
                ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${status ? `AND is_completed_assessment = '${status}'` : ''}
                ${oppertunityTitle ? `AND title LIKE '%${oppertunityTitle}%'` : ''};`;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalAssessments = results[0].totalAssessment || 0;
                resolve(totalAssessments);
            });
        });
    }

    async getAutocompleteTasks({ userId, oppertunityTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS oppertunityTitle
            FROM life_books 
                WHERE
                user_id = ? AND type = '2'
                AND title LIKE ?
            ORDER BY id DESC;
        `;
        const searchValue = '%' + oppertunityTitle.replace(/%/g, '\\%') + '%';
       // console.log("search values",searchValue);
        return new Promise((resolve, reject) => {
            db.query(query, [userId, searchValue], (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    oppertunityTitle: row.oppertunityTitle
                }));
                resolve(tasks);
            });
        });
    }

    async getAutocompleteAssessments({ userId, oppertunityTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS oppertunityTitle
            FROM life_books
            WHERE
                user_id = ? AND type = '2' 
                AND title LIKE ?
            ORDER BY id DESC;
        `;
        const searchValue = '%' + oppertunityTitle.replace(/%/g, '\\%') + '%';

        return new Promise((resolve, reject) => {
            db.query(query, [userId, searchValue], (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => ({
                    id: row.id,
                    oppertunityTitle: row.oppertunityTitle
                }));
                resolve(assessments);
            });
        });
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

module.exports = new DecisionPillarModel();
