const db = require('../../config/database');
const moment = require('moment'); // Import the moment library
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

class awarenessPillarModel {

    async getTotalObservationCounts(userId) {
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
            WHERE user_id = ? AND type='3' AND is_completed_assessment = '0';
        `;

        const closedCountQuery = `
            SELECT COUNT(*) AS closedCount
            FROM life_books
            WHERE user_id = ? AND type='3' AND is_completed_assessment = '1';
        `;

        const [activeCountResult, closedCountResult] = await Promise.all([
            executeQuery(activeCountQuery, [userId]),
            executeQuery(closedCountQuery, [userId]),
        ]);

        const activeCount = activeCountResult[0].activeCount;
        const closedCount = closedCountResult[0].closedCount;

        const totalCount = activeCount + closedCount;

        const totalobservationCounts = {
            active: activeCount,
            closed: closedCount,
            total: totalCount, // Add total count
        };

        return totalobservationCounts;
    }

    async getTotalObservationTaskCounts(userId) {
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
            WHERE lb.user_id = ? AND lb.type = '3' AND lbt.status = '1';
        `;

        const pendingTaskCountQuery = `
            SELECT COUNT(*) AS pendingTaskCount
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '3' AND lbt.status = '0';
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

    async getTotalObservationAssessmentCounts(userId) {
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
            WHERE user_id = ? AND type='3' AND is_completed_assessment = '1';
        `;

        const pendingAssessmentCountQuery = `
            SELECT COUNT(*) AS pendingAssessmentCount
            FROM life_books
            WHERE user_id = ? AND type='3' AND is_completed_assessment = '0';
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

    async getObservationByNameAndUserId(name, userId) {
        try {
            const query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const data = await new Promise((resolve, reject) => {
                db.query(query, [name, userId, '3'], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return data;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async getObservationByName(name, userId, observationId = null) {
        try {
            let query = 'SELECT * FROM `life_books` WHERE `title` = ? AND `user_id` = ? AND type = ?';
            const queryParams = [name, userId, '3'];

            if (observationId) {
                query += ' AND `id` != ?';
                queryParams.push(observationId);
            }

            const observations = await new Promise((resolve, reject) => {
                db.query(query, queryParams, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            return observations;
        } catch (error) {
            console.error(error);
            throw error; // Rethrow the error to be handled by the caller
        }
    }

    async getRecentObservations({
        userId,
        offset,
        perPage,
        search
    }) {
        const query = `
                SELECT
                lb.id AS observationId,
                lb.title AS observationTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS observationStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '3'
            ${search ? `AND lb.title = '${search}'` : ''}
            GROUP BY lb.id, lb.title, lb.is_completed_task, lb.status, lb.created_at
            ORDER BY lb.is_completed_assessment, lb.id DESC
            LIMIT ?, ?
            `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const experiencesWithTaskProgress = results.map((row) => {
                    const totalTasks = row.totalTasks || 1; // Avoid division by zero
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;

                    // Format created date using moment.js
                    const formattedDate = moment(row.createdDate).format('D MMMM YYYY');

                    return {
                        id: row.observationId,
                        title: row.observationTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        status: row.observationStatus,
                        totalTasks: row.totalTasks,
                        completedTasks: row.completedTasks,
                        progressPercentage: progressPercentage.toFixed(0),
                        createdDate: formattedDate, // Add formatted date
                    };
                });

                resolve(experiencesWithTaskProgress);
            });
        });
    }

    async getRecentTotalObservation({
        userId,
        status,
        search
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalObservations,
                lb.id AS observationId,
                lb.title AS observationTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS observationStatus,
                lb.publish_date AS createdDate,
                COUNT(lbt.id) AS totalTasks,
                SUM(lbt.status = '1') AS completedTasks
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE lb.user_id = ? AND lb.type = '3'
             ${search ? `AND lb.title = '${search}'` : ''}
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalObservations = results[0].totalObservations || 0;
                resolve(totalObservations);
            });
        });
    }


    async getRecentObservationTasks({
        userId,
        offset,
        perPage,
        search
    }) {
        const query = `
                SELECT
                lbt.id AS taskId,
                lbt.name AS taskTitle,
                lb.title AS experienceTitle,
                lb.id AS experienceID,
                lb.status AS observationStatus,
                lbt.status AS taskStatus,
                DATE_FORMAT(lbt.created_at, '%d %M %Y') AS createdDate
            FROM life_book_has_tasks lbt            
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lb.user_id = ? AND lb.type = '3'
            ${search ? `AND lb.title = '${search}'` : ''}
            ORDER BY lbt.status,lbt.id DESC
            LIMIT ?, ?
            `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                if (err) return reject(err);

                const recentActiveTasks = results.map((row) => {
                    return {
                        experienceID: row.experienceID,
                        taskId: row.taskId,
                        taskTitle: row.taskTitle,
                        experienceTitle: row.experienceTitle,
                        taskStatus: row.taskStatus,
                        observationStatus: row.observationStatus,
                        createdDate: row.createdDate,
                    };
                });

                resolve(recentActiveTasks);
            });
        });
    }

    async getRecentTotalObservationTasks({
        userId,
        search
    }) {
        const query = `
            SELECT COUNT(DISTINCT lbt.id) AS totalObservationTasks,
                lbt.name AS taskTitle,
                lb.title AS experienceTitle,
                lb.id AS experienceID,
                lb.status AS observationStatus,
                lbt.status AS taskStatus
            FROM life_book_has_tasks lbt
            JOIN life_books lb ON lbt.lb_id = lb.id
            WHERE lb.user_id = ? AND lb.type = '3'
            ${search ? `AND lb.title = '${search}'` : ''}
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalObservationTasks = results[0].totalObservationTasks || 0;
                resolve(totalObservationTasks);
            });
        });
    }

    async getRecentObservationAssessments({
        userId,
        offset,
        perPage,
    }) {
        const query = `
                SELECT
                lb.id AS observationId,
                lb.title AS observationTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS observationStatus,
                DATE_FORMAT(lb.created_at, '%d %M %Y') AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '3'
            ORDER BY lb.status ASC, lb.id DESC
            LIMIT ?, ?
            `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId, offset, perPage], (err, results) => {
                console.log("results",results);
                if (err) return reject(err);

                const latestAssessments = results.map((row) => {
                    return {
                        observationId: row.observationId,
                        observationTitle: row.observationTitle,
                        isCompletedAssessment: row.isCompletedAssessment === '1',
                        observationStatus: row.observationStatus,
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

    async getRecentTotalObservationAssessments({
        userId,
        status,
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalObservationAssessments,
                lb.title AS observationTitle,
                lb.is_completed_assessment AS isCompletedAssessment,
                lb.status AS observationStatus,
                lb.created_at AS createdDate
            FROM life_books lb
            WHERE lb.user_id = ? AND lb.type = '3'
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalObservationAssessments = results[0].totalObservationAssessments || 0;
                resolve(totalObservationAssessments);
            });
        });
    }

    async createObservation(data, url) {
        const { userId, title, status, actions, influences, guidePost, emotions, mindset, tasks, tags, files, assessment } = data;


        // for actual grading process
        if (data.assessment && data.assessment.length > 0 && data.assessment[0].grade) {
            
        // for grade proper marking 
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
        ///////////////////////
        try {
            // Insert into life_books table
            const lifeBooksQuery = 'INSERT INTO life_books (user_id, title, type, status) VALUES (?, ?, ?, ?)';
            const lastInsertedId = await new Promise((resolve, reject) => {
                db.query(lifeBooksQuery, [userId, title, "3", status], function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.insertId);
                    }
                });
            });

            const insertAllActions = async (actions, lastInsertedId) => {
                for (const action of actions) {
                    try {
                        const actionQuery = 'INSERT INTO awareness_observation_actions (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(actionQuery, [lastInsertedId, action.name, action.insight, action.analysis], (actionErr, actionResult) => {
                                if (actionErr) {
                                    console.error('Error inserting into action table', actionErr);
                                    reject(actionErr);
                                } else {
                                    resolve(actionResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during action insertion:', err);
                    }
                }
            };

            insertAllActions(actions, lastInsertedId);

            const insertAllInfluences = async (influences, lastInsertedId) => {
                for (const influence of influences) {
                    try {
                        const influenceQuery = 'INSERT INTO awareness_observation_influence (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(influenceQuery, [lastInsertedId, influence.name, influence.insight, influence.analysis], (influenceErr, influenceResult) => {
                                if (influenceErr) {
                                    console.error('Error inserting into influence table', influenceErr);
                                    reject(influenceErr);
                                } else {
                                    resolve(influenceResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during influence insertion:', err);
                    }
                }
            };

            insertAllInfluences(influences, lastInsertedId);

            const insertAllGuidePost = async (guidePost, lastInsertedId) => {
                for (const post of guidePost) {
                    try {
                        const guidePostQuery = 'INSERT INTO awareness_observation_guidepost (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(guidePostQuery, [lastInsertedId, post.name, post.insight, post.analysis], (postErr, postResult) => {
                                if (postErr) {
                                    console.error('Error inserting into GuidePost table', postErr);
                                    reject(postErr);
                                } else {
                                    resolve(postResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during GuidePost insertion:', err);
                    }
                }
            };

            insertAllGuidePost(guidePost, lastInsertedId);

            const insertAllMindset = async (mindset, lastInsertedId) => {
                for (const mind of mindset) {
                    try {
                        const mindsetQuery = 'INSERT INTO awareness_observation_mind_body_spirit (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(mindsetQuery, [lastInsertedId, mind.name, mind.insight, mind.analysis], (mindsetError, mindsetResult) => {
                                if (mindsetError) {
                                    console.error('Error inserting into mindset table', mindsetError);
                                    reject(mindsetError);
                                } else {
                                    resolve(mindsetResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during mindset insertion:', err);
                    }
                }
            };

            insertAllMindset(mindset, lastInsertedId);

            const insertAllEmotions = async (emotions, lastInsertedId) => {
                for (const emotion of emotions) {
                    try {
                        const emotionQuery = 'INSERT INTO awareness_observation_emotions (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                        await new Promise((resolve, reject) => {
                            db.query(emotionQuery, [lastInsertedId, emotion.name, emotion.insight, emotion.analysis], (emotionErr, emotionResult) => {
                                if (emotionErr) {
                                    console.error('Error inserting into emotions table', emotionErr);
                                    reject(emotionErr);
                                } else {
                                    resolve(emotionResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during emotions insertion:', err);
                    }
                }
            };

            insertAllEmotions(emotions, lastInsertedId);

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
                                    resolve(taskResult);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('Error during tasks insertion:', err);
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
                // Check if all tasks have status 1
                const allTaskStatusesOne = tasks?.every(task => task.status === 1);

                if (allTaskStatusesOne) {
                    // Insert assessment data
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
                actions,
                influences,
                guidePost,
                emotions,
                mindset,
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

    async GetObservationIdWise(userId, observationId) {
        const setGroupConcatMaxLen = `SET SESSION group_concat_max_len = 1000000;`;
        const separator = '||';  // Unique separator unlikely to appear in data
        const query = `
            SELECT
                lb.id AS observationId,
                lb.type AS type,
                lb.title AS observationTitle,
                lb.status AS observationStatus,
                lb.is_completed_assessment AS isCompletedAssessment,
                lea.id AS assessmentId,
                lea.grade AS assessmentGrade,
                lea.did_progress_towards_life_purpose AS progressTowardsLifePurpose,
                lea.did_help_another_person AS helpAnotherPerson,
                lea.do_differently AS doDifferently,
                lea.comments AS assessmentComments,
                GROUP_CONCAT(DISTINCT CONCAT(a.name, ':', a.insight, ':', a.analysis) ORDER BY a.id ASC SEPARATOR '${separator}') AS actions,
                GROUP_CONCAT(DISTINCT CONCAT(t.name, ':', t.status) ORDER BY t.id ASC SEPARATOR '${separator}') AS tasks,
                GROUP_CONCAT(DISTINCT CONCAT(e.name, ':', e.insight, ':', e.analysis) ORDER BY e.id ASC SEPARATOR '${separator}') AS emotions,
                GROUP_CONCAT(DISTINCT CONCAT(g.name, ':', g.insight, ':', g.analysis) ORDER BY g.id ASC SEPARATOR '${separator}') AS guidepost,
                GROUP_CONCAT(DISTINCT CONCAT(i.name, ':', i.insight, ':', i.analysis) ORDER BY i.id ASC SEPARATOR '${separator}') AS influences,
                GROUP_CONCAT(DISTINCT CONCAT(m.name, ':', m.insight, ':', m.analysis) ORDER BY m.id ASC SEPARATOR '${separator}') AS mindset,
                GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC SEPARATOR '${separator}') AS tags,
                GROUP_CONCAT(CONCAT(lbhf.original_filename, '::', lbhf.name, '::', lbhf.url, '::', lbhf.type, '::', lbhf.size) ORDER BY lbhf.id ASC SEPARATOR '${separator}') AS filesInfo
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN awareness_observation_actions a ON lb.id = a.lb_id
            LEFT JOIN life_book_has_tasks t ON lb.id = t.lb_id
            LEFT JOIN awareness_observation_emotions e ON lb.id = e.lb_id
            LEFT JOIN awareness_observation_guidepost g ON lb.id = g.lb_id
            LEFT JOIN awareness_observation_influence i ON lb.id = i.lb_id
            LEFT JOIN awareness_observation_mind_body_spirit m ON lb.id = m.lb_id
            LEFT JOIN life_book_has_tags lbht ON lb.id = lbht.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;

        try {
            // Set the session variable for group_concat_max_len
            await new Promise((resolve, reject) => {
                db.query(setGroupConcatMaxLen, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });

            // Execute the main query
            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId, observationId], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            if (results.length === 0) {
                return []; // No records found
            }

            const row = results[0];
            const observation = {
                id: row.observationId,
                title: row.observationTitle,
                status: row.observationStatus,
                type: row.type
            };

            const assessment = {
                id: row.assessmentId,
                grade: row.assessmentGrade,
                progressTowardsLifePurpose: row.progressTowardsLifePurpose,
                helpAnotherPerson: row.helpAnotherPerson,
                doDifferently: row.doDifferently,
                comments: row.assessmentComments
            };

            const isCompletedAssessment = row.isCompletedAssessment;

            // Split and map actions
            const actions = row.actions ? row.actions.split(separator) : [];
            const actionsWithInsightAndAnalysis = actions.map(actionString => {
                const [name, insight, analysis] = actionString.split(':');
                return { name, insight, analysis };
            });

            // Split and map tasks
            const tasks = row.tasks ? row.tasks.split(separator) : [];
            const tasksWithStatus = tasks.map(taskString => {
                const [name, status] = taskString.split(':');
                return { name, status: parseInt(status) };
            });

            // Split and map emotions
            const emotions = row.emotions ? row.emotions.split(separator) : [];
            const emotionsWithInsightAndAnalysis = emotions.map(emotionString => {
                const [name, insight, analysis] = emotionString.split(':');
                return { name, insight, analysis };
            });

            // Split and map guidepost
            const guidepost = row.guidepost ? row.guidepost.split(separator) : [];
            const guidepostWithInsightAndAnalysis = guidepost.map(guidepostString => {
                const [name, insight, analysis] = guidepostString.split(':');
                return { name, insight, analysis };
            });

            // Split and map influences
            const influences = row.influences ? row.influences.split(separator) : [];
            const influencesWithInsightAndAnalysis = influences.map(influenceString => {
                const [name, insight, analysis] = influenceString.split(':');
                return { name, insight, analysis };
            });

            // Split and map mindset
            const mindset = row.mindset ? row.mindset.split(separator) : [];
            const mindsetWithInsightAndAnalysis = mindset.map(mindsetString => {
                const [name, insight, analysis] = mindsetString.split(':');
                return { name, insight, analysis };
            });

            // Split and map tags
            const tags = row.tags ? row.tags.split(separator) : [];

            // Split and map files
            const filesInfo = row.filesInfo ? row.filesInfo.split(separator) : [];
            const files = filesInfo.map(fileInfo => {
                const [original_filename, name, url, type, size] = fileInfo.split('::');
                return { original_filename, name, url, type: type || '', size: size || '' };
            });

            const observationData = {
                observation,
                actions: actionsWithInsightAndAnalysis,
                emotions: emotionsWithInsightAndAnalysis,
                guidepost: guidepostWithInsightAndAnalysis,
                influences: influencesWithInsightAndAnalysis,
                mindset: mindsetWithInsightAndAnalysis,
                tasks: tasksWithStatus,
                tags,
                files,
                isCompletedAssessment,
                assessment
            };

            return [observationData];
        } catch (error) {
            throw error;
        }
    }


    async GetObservationPdfPrint(userId, observationId) {
        const setGroupConcatMaxLen = `SET SESSION group_concat_max_len = 1000000;`;
        const separator = '||';  // Unique separator unlikely to appear in data
        const query = `
            SELECT
                lb.id AS observationId,
                lb.created_at AS CreatedDate,
                lb.type AS type,
                lb.title AS observationTitle,
                lb.status AS observationStatus,
                lb.is_completed_assessment AS isCompletedAssessment,
                lea.id AS assessmentId,
                lea.grade AS assessmentGrade,
                lea.did_progress_towards_life_purpose AS progressTowardsLifePurpose,
                lea.did_help_another_person AS helpAnotherPerson,
                lea.do_differently AS doDifferently,
                lea.comments AS assessmentComments,
                GROUP_CONCAT(DISTINCT CONCAT(a.name, ':', a.insight, ':', a.analysis) ORDER BY a.id DESC SEPARATOR '${separator}') AS actions,
                GROUP_CONCAT(DISTINCT CONCAT(t.name, ':', t.status) ORDER BY t.id DESC SEPARATOR '${separator}') AS tasks,
                GROUP_CONCAT(DISTINCT CONCAT(e.name, ':', e.insight, ':', e.analysis) ORDER BY e.id DESC SEPARATOR '${separator}') AS emotions,
                GROUP_CONCAT(DISTINCT CONCAT(g.name, ':', g.insight, ':', g.analysis) ORDER BY g.id DESC SEPARATOR '${separator}') AS guidepost,
                GROUP_CONCAT(DISTINCT CONCAT(i.name, ':', i.insight, ':', i.analysis) ORDER BY i.id DESC SEPARATOR '${separator}') AS influences,
                GROUP_CONCAT(DISTINCT CONCAT(m.name, ':', m.insight, ':', m.analysis) ORDER BY m.id DESC SEPARATOR '${separator}') AS mindset,
                GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC SEPARATOR '${separator}') AS tags,
                GROUP_CONCAT(DISTINCT CONCAT(lbhf.original_filename, '::', lbhf.name, '::', lbhf.url, '::', lbhf.type, '::', lbhf.size) ORDER BY lbhf.id ASC SEPARATOR '${separator}') AS filesInfo
            FROM life_books lb
            LEFT JOIN life_book_has_assessment lea ON lb.id = lea.lb_id
            LEFT JOIN awareness_observation_actions a ON lb.id = a.lb_id
            LEFT JOIN life_book_has_tasks t ON lb.id = t.lb_id
            LEFT JOIN awareness_observation_emotions e ON lb.id = e.lb_id
            LEFT JOIN awareness_observation_guidepost g ON lb.id = g.lb_id
            LEFT JOIN awareness_observation_influence i ON lb.id = i.lb_id
            LEFT JOIN awareness_observation_mind_body_spirit m ON lb.id = m.lb_id
            LEFT JOIN life_book_has_tags lbht ON lb.id = lbht.lb_id
            LEFT JOIN life_book_has_files lbhf ON lb.id = lbhf.lb_id
            WHERE lb.user_id = ? AND lb.id = ?
            GROUP BY lb.id, lea.id
            LIMIT 1
        `;

        try {
            // Set the session variable for group_concat_max_len
            await new Promise((resolve, reject) => {
                db.query(setGroupConcatMaxLen, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });

            // Execute the main query
            const results = await new Promise((resolve, reject) => {
                db.query(query, [userId, observationId], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            if (results.length === 0) {
                return []; // No records found
            }

            const row = results[0];
            const observation = {
                id: row.observationId,
                title: row.observationTitle,
                status: row.observationStatus,
                type: row.type
            };

            const assessment = {
                id: row.assessmentId,
                grade: row.assessmentGrade,
                progressTowardsLifePurpose: row.progressTowardsLifePurpose,
                helpAnotherPerson: row.helpAnotherPerson,
                doDifferently: row.doDifferently,
                comments: row.assessmentComments
            };

            const isCompletedAssessment = row.isCompletedAssessment;

            // Split and map actions
            const actions = row.actions ? row.actions.split(separator) : [];
            const actionsWithInsightAndAnalysis = actions.map(actionString => {
                const [name, insight, analysis] = actionString.split(':');
                return { name, insight, analysis };
            });

            // Split and map tasks
            const tasks = row.tasks ? row.tasks.split(separator) : [];
            const tasksWithStatus = tasks.map(taskString => {
                const [name, status] = taskString.split(':');
                return { name, status: parseInt(status) };
            });

            // Split and map emotions
            const emotions = row.emotions ? row.emotions.split(separator) : [];
            const emotionsWithInsightAndAnalysis = emotions.map(emotionString => {
                const [name, insight, analysis] = emotionString.split(':');
                return { name, insight, analysis };
            });

            // Split and map guidepost
            const guidepost = row.guidepost ? row.guidepost.split(separator) : [];
            const guidepostWithInsightAndAnalysis = guidepost.map(guidepostString => {
                const [name, insight, analysis] = guidepostString.split(':');
                return { name, insight, analysis };
            });

            // Split and map influences
            const influences = row.influences ? row.influences.split(separator) : [];
            const influencesWithInsightAndAnalysis = influences.map(influenceString => {
                const [name, insight, analysis] = influenceString.split(':');
                return { name, insight, analysis };
            });

            // Split and map mindset
            const mindset = row.mindset ? row.mindset.split(separator) : [];
            const mindsetWithInsightAndAnalysis = mindset.map(mindsetString => {
                const [name, insight, analysis] = mindsetString.split(':');
                return { name, insight, analysis };
            });

            // Split and map tags
            const tags = row.tags ? row.tags.split(separator) : [];

            // Split and map files
            const filesInfo = row.filesInfo ? row.filesInfo.split(separator) : [];
            const files = filesInfo.map(fileInfo => {
                const [original_filename, name, url, type, size] = fileInfo.split('::');
                return { original_filename, name, url, type: type || '', size: size || '' };
            });

            const observationData = {
                observation,
                CreatedDate : row.CreatedDate,
                actions: actionsWithInsightAndAnalysis,
                emotions: emotionsWithInsightAndAnalysis,
                guidepost: guidepostWithInsightAndAnalysis,
                influences: influencesWithInsightAndAnalysis,
                mindset: mindsetWithInsightAndAnalysis,
                tasks: tasksWithStatus,
                tags,
                files,
                isCompletedAssessment,
                assessment
            };

            return [observationData];
        } catch (error) {
            throw error;
        }
    }


    async updateObservation(data) {
        const { userId, id, title, status, actions, influences, guidePost, emotions, mindset, tasks, tags, files, assessment } = data;

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

            const existingActionsQuery = 'SELECT id FROM awareness_observation_actions WHERE lb_id = ?';
            const existingActions = await new Promise((resolve, reject) => {
                db.query(existingActionsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing actions', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingActionIds = existingActions.map(action => action.id);

            for (const newAction of actions) {
                if (newAction.id) {
                    const updateActionQuery = 'UPDATE awareness_observation_actions SET name = ?, insight = ?, analysis = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateActionQuery, [newAction.name, newAction.insight, newAction.analysis, newAction.id], (updateActionErr, updateActionResult) => {
                            if (updateActionErr) {
                                console.error('Error updating action', updateActionErr);
                                reject(updateActionErr);
                            } else {
                                resolve(updateActionResult);
                            }
                        });
                    });
                } else {
                    const insertActionQuery = 'INSERT INTO awareness_observation_actions (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertActionQuery, [id, newAction.name, newAction.insight, newAction.analysis], (insertActionErr, insertActionResult) => {
                            if (insertActionErr) {
                                console.error('Error inserting new action', insertActionErr);
                                reject(insertActionErr);
                            } else {
                                resolve(insertActionResult);
                            }
                        });
                    });
                }
            }

            for (const existingActionId of existingActionIds) {
                if (!actions.some(updatedAction => updatedAction.id === existingActionId)) {
                    const deleteActionQuery = 'DELETE FROM awareness_observation_actions WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteActionQuery, [existingActionId], (deleteActionErr, deleteActionResult) => {
                            if (deleteActionErr) {
                                console.error('Error deleting action', deleteActionErr);
                                reject(deleteActionErr);
                            } else {
                                resolve(deleteActionResult);
                            }
                        });
                    });
                }
            }

            const existingInfluencesQuery = 'SELECT id FROM awareness_observation_influence WHERE lb_id = ?';
            const existingInfluences = await new Promise((resolve, reject) => {
                db.query(existingInfluencesQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing influences', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingInfluenceIds = existingInfluences.map(influence => influence.id);

            for (const newInfluence of influences) {
                if (newInfluence.id) {
                    const updateInfluenceQuery = 'UPDATE awareness_observation_influence SET name = ?, insight = ?, analysis = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateInfluenceQuery, [newInfluence.name, newInfluence.insight, newInfluence.analysis, newInfluence.id], (updateInfluenceErr, updateInfluenceResult) => {
                            if (updateInfluenceErr) {
                                console.error('Error updating influence', updateInfluenceErr);
                                reject(updateInfluenceErr);
                            } else {
                                resolve(updateInfluenceResult);
                            }
                        });
                    });
                } else {
                    const insertInfluenceQuery = 'INSERT INTO awareness_observation_influence (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertInfluenceQuery, [id, newInfluence.name, newInfluence.insight, newInfluence.analysis], (insertInfluenceErr, insertInfluenceResult) => {
                            if (insertInfluenceErr) {
                                console.error('Error inserting new influence', insertInfluenceErr);
                                reject(insertInfluenceErr);
                            } else {
                                resolve(insertInfluenceResult);
                            }
                        });
                    });
                }
            }

            for (const existingInfluenceId of existingInfluenceIds) {
                if (!influences.some(updatedInfluence => updatedInfluence.id === existingInfluenceId)) {
                    const deleteInfluenceQuery = 'DELETE FROM awareness_observation_influence WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteInfluenceQuery, [existingInfluenceId], (deleteInfluenceErr, deleteInfluenceResult) => {
                            if (deleteInfluenceErr) {
                                console.error('Error deleting influence', deleteInfluenceErr);
                                reject(deleteInfluenceErr);
                            } else {
                                resolve(deleteInfluenceResult);
                            }
                        });
                    });
                }
            }

            const existingGuidePostsQuery = 'SELECT id FROM awareness_observation_guidepost WHERE lb_id = ?';
            const existingGuidePosts = await new Promise((resolve, reject) => {
                db.query(existingGuidePostsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing guide posts', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingGuidePostIds = existingGuidePosts.map(guidePost => guidePost.id);

            for (const newGuidePost of guidePost) {
                if (newGuidePost.id) {
                    const updateGuidePostQuery = 'UPDATE awareness_observation_guidepost SET name = ?, insight = ?, analysis = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateGuidePostQuery, [newGuidePost.name, newGuidePost.insight, newGuidePost.analysis, newGuidePost.id], (updateGuidePostErr, updateGuidePostResult) => {
                            if (updateGuidePostErr) {
                                console.error('Error updating guide post', updateGuidePostErr);
                                reject(updateGuidePostErr);
                            } else {
                                resolve(updateGuidePostResult);
                            }
                        });
                    });
                } else {
                    const insertGuidePostQuery = 'INSERT INTO awareness_observation_guidepost (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertGuidePostQuery, [id, newGuidePost.name, newGuidePost.insight, newGuidePost.analysis], (insertGuidePostErr, insertGuidePostResult) => {
                            if (insertGuidePostErr) {
                                console.error('Error inserting new guide post', insertGuidePostErr);
                                reject(insertGuidePostErr);
                            } else {
                                resolve(insertGuidePostResult);
                            }
                        });
                    });
                }
            }

            for (const existingGuidePostId of existingGuidePostIds) {
                if (!guidePost.some(updatedGuidePost => updatedGuidePost.id === existingGuidePostId)) {
                    const deleteGuidePostQuery = 'DELETE FROM awareness_observation_guidepost WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteGuidePostQuery, [existingGuidePostId], (deleteGuidePostErr, deleteGuidePostResult) => {
                            if (deleteGuidePostErr) {
                                console.error('Error deleting guide post', deleteGuidePostErr);
                                reject(deleteGuidePostErr);
                            } else {
                                resolve(deleteGuidePostResult);
                            }
                        });
                    });
                }
            }

            const existingEmotionsQuery = 'SELECT id FROM awareness_observation_emotions WHERE lb_id = ?';
            const existingEmotions = await new Promise((resolve, reject) => {
                db.query(existingEmotionsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing emotions', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingEmotionIds = existingEmotions.map(emotion => emotion.id);

            for (const newEmotion of emotions) {
                if (newEmotion.id) {
                    const updateEmotionQuery = 'UPDATE awareness_observation_emotions SET name = ?, insight = ?, analysis = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateEmotionQuery, [newEmotion.name, newEmotion.insight, newEmotion.analysis, newEmotion.id], (updateEmotionErr, updateEmotionResult) => {
                            if (updateEmotionErr) {
                                console.error('Error updating emotion', updateEmotionErr);
                                reject(updateEmotionErr);
                            } else {
                                resolve(updateEmotionResult);
                            }
                        });
                    });
                } else {
                    const insertEmotionQuery = 'INSERT INTO awareness_observation_emotions (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertEmotionQuery, [id, newEmotion.name, newEmotion.insight, newEmotion.analysis], (insertEmotionErr, insertEmotionResult) => {
                            if (insertEmotionErr) {
                                console.error('Error inserting new emotion', insertEmotionErr);
                                reject(insertEmotionErr);
                            } else {
                                resolve(insertEmotionResult);
                            }
                        });
                    });
                }
            }

            for (const existingEmotionId of existingEmotionIds) {
                if (!emotions.some(updatedEmotion => updatedEmotion.id === existingEmotionId)) {
                    const deleteEmotionQuery = 'DELETE FROM awareness_observation_emotions WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteEmotionQuery, [existingEmotionId], (deleteEmotionErr, deleteEmotionResult) => {
                            if (deleteEmotionErr) {
                                console.error('Error deleting emotion', deleteEmotionErr);
                                reject(deleteEmotionErr);
                            } else {
                                resolve(deleteEmotionResult);
                            }
                        });
                    });
                }
            }

            const existingMindsetsQuery = 'SELECT id FROM awareness_observation_mind_body_spirit WHERE lb_id = ?';
            const existingMindsets = await new Promise((resolve, reject) => {
                db.query(existingMindsetsQuery, [id], (err, result) => {
                    if (err) {
                        console.error('Error retrieving existing mindsets', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingMindsetIds = existingMindsets.map(mindset => mindset.id);

            for (const newMindset of mindset) {
                if (newMindset.id) {
                    const updateMindsetQuery = 'UPDATE awareness_observation_mind_body_spirit SET name = ?, insight = ?, analysis = ? WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(updateMindsetQuery, [newMindset.name, newMindset.insight, newMindset.analysis, newMindset.id], (updateMindsetErr, updateMindsetResult) => {
                            if (updateMindsetErr) {
                                console.error('Error updating mindset', updateMindsetErr);
                                reject(updateMindsetErr);
                            } else {
                                resolve(updateMindsetResult);
                            }
                        });
                    });
                } else {
                    const insertMindsetQuery = 'INSERT INTO awareness_observation_mind_body_spirit (lb_id, name, insight, analysis) VALUES (?, ?, ?, ?)';
                    await new Promise((resolve, reject) => {
                        db.query(insertMindsetQuery, [id, newMindset.name, newMindset.insight, newMindset.analysis], (insertMindsetErr, insertMindsetResult) => {
                            if (insertMindsetErr) {
                                console.error('Error inserting new mindset', insertMindsetErr);
                                reject(insertMindsetErr);
                            } else {
                                resolve(insertMindsetResult);
                            }
                        });
                    });
                }
            }

            for (const existingMindsetId of existingMindsetIds) {
                if (!mindset.some(updatedMindset => updatedMindset.id === existingMindsetId)) {
                    const deleteMindsetQuery = 'DELETE FROM awareness_observation_mind_body_spirit WHERE id = ?';
                    await new Promise((resolve, reject) => {
                        db.query(deleteMindsetQuery, [existingMindsetId], (deleteMindsetErr, deleteMindsetResult) => {
                            if (deleteMindsetErr) {
                                console.error('Error deleting mindset', deleteMindsetErr);
                                reject(deleteMindsetErr);
                            } else {
                                resolve(deleteMindsetResult);
                            }
                        });
                    });
                }
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
                // Check if all tasks have status 1
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

                                    /*   set grades here */

                                    const front_grade = assessmentData.grade;
                                    console.log("front_grade",front_grade);
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

                                    /* */
                                    //const assessmentValues = save_grade;
                                    //const assessmentValues = [assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || '', id];
                                    const assessmentValues = [save_grade , progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || '', id];
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
                                    //const assessmentValues = [id, assessmentData.grade || 1, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || ''];
                                    /*   set grades here */

                                    const front_grade = assessmentData.grade;
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

                                    /* */
                                    const assessmentValues = [id, save_grade, progressTowardsLifePurpose, did_help_another_person, assessmentData.do_differently || '', assessmentData.comments || ''];
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

            // Retrieve the current files associated with the experience ID
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
                actions,
                influences,
                guidePost,
                emotions,
                mindset,
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

    async deleteObservation(data) {
        const { id } = data;

        try {
            // Check if the experience with the specified id exists
            const observationExists = await this.ObservationExists(id);

            if (!observationExists) {
                return { success: false, message: 'Observation not found.' };
            }

            // Get associated image file paths
            const imagePaths = await this.getImagePaths(id);

            // Perform the deletion of database records
            await this.deleteRecords('awareness_observation_emotions', 'lb_id', id);
            await this.deleteRecords('awareness_observation_actions', 'lb_id', id);
            await this.deleteRecords('awareness_observation_guidepost', 'lb_id', id);
            await this.deleteRecords('awareness_observation_influence', 'lb_id', id);
            await this.deleteRecords('awareness_observation_mind_body_spirit', 'lb_id', id);
            await this.deleteRecords('life_book_has_tasks', 'lb_id', id);
            await this.deleteRecords('life_book_has_files', 'lb_id', id);
            await this.deleteRecords('life_book_has_tags', 'lb_id', id);
            await this.deleteRecords('life_book_has_assessment', 'lb_id', id);
            await this.deleteRecords('life_books', 'id', id);

            // Delete associated image files
            await this.deleteImageFiles(imagePaths);

            return { success: true, message: 'Observation deleted successfully.' };
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

    async ObservationExists(id) {
        const checkQuery = 'SELECT id FROM life_books WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) {
                    console.error('Error checking existence of observation', err);
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

    async getFilteredobservation({
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
                    lb.id AS observationId,
                    Trim(lb.title) AS observationTitle,
                    lb.publish_date AS observationPublishDate,
                    lb.status AS observationStatus,
                    lb.is_completed_assessment AS is_completed_assessment,
                    COUNT(lbt.id) AS totalTasks,
                    SUM(lbt.status = '1') AS completedTasks
                FROM life_books lb
                LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
                WHERE
                    lb.user_id = ${userId} AND lb.type = '3'
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
                const filteredObservation = results.map((row) => {
                    const totalTasks = row.totalTasks || 1; // Avoid division by zero
                    const progressPercentage = (row.completedTasks / totalTasks) * 100;
                    const formattedDate = moment(row.observationPublishDate).format('D MMMM YYYY');
                    return {
                        id: row.observationId,
                        title: row.observationTitle,
                        publishDate: formattedDate,
                        status: row.observationStatus,
                        is_completed_assessment: row.is_completed_assessment,
                        totalTasks: row.totalTasks,
                        completedTasks: row.completedTasks,
                        progressPercentage: progressPercentage.toFixed(0),
                    };
                });

                resolve(filteredObservation);
            });
        });
    }

    async getTotalObservation({
        userId,
        fromDate,
        toDate,
        status,
        search
    }) {
        const query = `
            SELECT COUNT(DISTINCT lb.id) AS totalObservations
            FROM life_books lb
            LEFT JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '3'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD')} 23:59:00'` : ''}
                ${search ? `AND lb.id = '${search}'` : ''}
                ${status ? `AND lb.status = '${status}'` : ''};
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalObservations = results[0].totalObservations || 0;
                resolve(totalObservations);
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
        observationTitle,
        search
    }) {
        if (sortBy === 'id') {
            sortBy = 'lbt.id'; // Correctly assign a new value to sortBy
        }
        const query = `
            SELECT
                lbt.id AS id,
                lbt.lb_id AS observationId,
                Trim(lb.title) AS observationTitle,
                lb.status AS observationStatus,
                lbt.name AS name,
                lbt.status AS status,
                lbt.created_at AS created_at
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ${userId} AND lb.type = '3'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${status ? `AND lbt.status = '${status}'` : ''}
                ${observationTitle ? `AND lb.title LIKE '%${observationTitle}%'` : ''}
                ${search ? `AND lbt.id = '${search}'` : ''}
                ORDER BY lbt.status ASC, ${sortBy !== '' ? `Trim(${sortBy}) ${sortOrder}` : 'lb.id DESC'}
            LIMIT ${offset}, ${perPage}
        `;
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    observationId: row.observationId,
                    observationTitle: row.observationTitle,
                    name: row.name,
                    status: row.status,
                    is_completed_assessment: row.is_completed_assessment,
                    observationStatus: row.observationStatus,
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
        observationTitle,
        search
    }) {
        const query = `
            SELECT COUNT(*) AS totalTasks
            FROM life_books lb
            JOIN life_book_has_tasks lbt ON lb.id = lbt.lb_id
            WHERE
                lb.user_id = ? AND lb.type = '3'
                ${fromDate ? `AND lb.publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
                ${toDate ? `AND lb.publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
                ${search ? `AND lbt.name = '${search}'` : ''}
                ${observationTitle ? `AND lb.title LIKE '%${observationTitle}%'` : ''}
                ${status ? `AND lbt.status = '${status}'` : ''};
        `;
        return new Promise((resolve, reject) => {
            db.query(query, [userId], (err, results) => {
                if (err) return reject(err);
                const totalTasks = results[0].totalTasks;
                resolve(totalTasks);
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
    //     observationTitle
    // }) {
    //     const query = `
    //         SELECT
    //             id AS observationId,
    //             Trim(title) AS observationTitle,
    //             is_completed_assessment AS completed_assessment
    //         FROM life_books
    //         WHERE
    //             user_id = ? AND
    //             type = '3'
    //             ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
    //             ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
    //             ${status ? `AND is_completed_assessment = '${status}'` : ''}
    //             ${observationTitle ? `AND title LIKE '%${observationTitle}%'` : ''}
    //             ORDER BY completed_assessment ASC, ${sortBy !== '' ? `Trim(${sortBy}) ${sortOrder}` : 'id DESC'} 
    //         LIMIT ?, ?;`;

    //     console.log("query",query);
    //     return new Promise((resolve, reject) => {
    //         db.query(query, [userId, offset, perPage], (err, results) => {
    //             if (err) return reject(err);
    //             const assessments = results.map((row) => {
    //                 return {
    //                     observationId: row.observationId,
    //                     observationTitle: row.observationTitle,
    //                     observationStatus: row.completed_assessment
    //                 };
    //             });
    //             resolve(assessments);
    //         });
    //     })
    // }

    // async getTotalAssessments({
    //     userId,
    //     fromDate,
    //     toDate,
    //     status,
    //     observationTitle
    // }) {
    //     const query = `
    //         SELECT COUNT(*) AS totalAssessment
    //         FROM life_books
    //         WHERE
    //             user_id = ? AND
    //             type = '3'
    //             ${fromDate ? `AND publish_date >= '${moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD')}'` : ''}
    //             ${toDate ? `AND publish_date <= '${moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:00')}'` : ''}
    //             ${status ? `AND is_completed_assessment = '${status}'` : ''}
    //             ${observationTitle ? `AND title LIKE '%${observationTitle}%'` : ''};`;

    //     return new Promise((resolve, reject) => {
    //         db.query(query, [userId], (err, results) => {
    //             if (err) return reject(err);
    //             const totalAssessments = results[0].totalAssessment || 0;
    //             resolve(totalAssessments);
    //         });
    //     });
    // }

    async getFilteredAssessments({
        userId,
        fromDate,
        toDate,
        status,
        sortBy = 'id',
        sortOrder = 'DESC',
        offset = 0,
        perPage = 10,
        observationTitle,
        search
    }) {
        const query = `
            SELECT
                id AS observationId,
                TRIM(title) AS observationTitle,
                publish_date as publish_date,
                is_completed_assessment AS completed_assessment
            FROM life_books
            WHERE
                user_id = ? AND
                type = '3'
                ${fromDate ? `AND publish_date >= ?` : ''}
                ${toDate ? `AND publish_date <= ?` : ''}
                ${status ? `AND is_completed_assessment = ?` : ''}
                ${observationTitle ? `AND title = ?` : ''}
                ${search ? `AND id = ?` : ''}
            ORDER BY completed_assessment ASC, TRIM(${sortBy}) ${sortOrder}
            LIMIT ?, ?;
        `;
        const queryParams = [userId];
        if (fromDate) queryParams.push(moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD'));
        if (toDate) queryParams.push(moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:59'));
        if (status) queryParams.push(status);
        if (search) queryParams.push(search);
        //if (observationTitle) queryParams.push(`%${observationTitle}%`);
        if (observationTitle) queryParams.push(`${observationTitle}`);
        queryParams.push(offset, perPage);
    
        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => ({
                    observationId: row.observationId,
                    publish_date : moment(row.publish_date).format('D MMMM YYYY'),
                    observationTitle: row.observationTitle,
                    observationStatus: row.completed_assessment
                }));
                resolve(assessments);
            });
        });
    }
    
    async getTotalAssessments({
        userId,
        fromDate,
        toDate,
        status,
        observationTitle
    }) {
        const query = `
            SELECT COUNT(*)
     AS totalAssessment
            FROM life_books
            WHERE
                user_id = ? AND
                type = '3'
                ${fromDate ? `AND publish_date >= ?` : ''}
                ${toDate ? `AND publish_date <= ?` : ''}
                ${status ? `AND is_completed_assessment = ?` : ''}
                ${observationTitle ? `AND title LIKE ?` : ''};
        `;
    
        const queryParams = [userId];
        if (fromDate) queryParams.push(moment(fromDate, 'YYYY-MM-DD').format('YYYY-MM-DD'));
        if (toDate) queryParams.push(moment(toDate, 'YYYY-MM-DD').format('YYYY-MM-DD 23:59:59'));
        if (status) queryParams.push(status);
        if (observationTitle) queryParams.push(`%${observationTitle}%`);
    
        return new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                const totalAssessments = results[0]?.totalAssessment || 0;
                resolve(totalAssessments);
            });
        });
    }

    async getAutocompleteTasks({ userId, observationTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS observationTitle
            FROM life_books 
                WHERE
                user_id = ? AND type = '3'
                AND title LIKE ?
            ORDER BY id DESC;
        `;
        const searchValue = '%' + observationTitle?.replace(/%/g, '\\%') + '%';

        return new Promise((resolve, reject) => {
            db.query(query, [userId, searchValue], (err, results) => {
                if (err) return reject(err);
                const tasks = results.map((row) => ({
                    id: row.id,
                    observationTitle: row.observationTitle
                }));
                resolve(tasks);
            });
        });
    }

    async getAutocompleteAssessments({ userId, observationTitle }) {
        const query = `
            SELECT
                id AS id,
                title AS observationTitle
            FROM life_books
            WHERE
                user_id = ? AND type = '3' 
                AND title LIKE ?
            ORDER BY id DESC;
        `;
        const searchValue = '%' + observationTitle.replace(/%/g, '\\%') + '%';

        return new Promise((resolve, reject) => {
            db.query(query, [userId, searchValue], (err, results) => {
                if (err) return reject(err);
                const assessments = results.map((row) => ({
                    id: row.id,
                    observationTitle: row.observationTitle
                }));
                resolve(assessments);
            });
        });
    }

    async Updateis_completed_task(id, status) {
        return new Promise((resolve, reject) => {
            const updateQuery = `UPDATE life_books SET is_completed_task = '${status}'  WHERE id = ${id}`;

            db.query(updateQuery, (statusUpdateErr, updateResult) => {
                if (statusUpdateErr) {
                    console.error('Error updating Experince status:', statusUpdateErr);
                    reject(statusUpdateErr);
                } else {
                    if (updateResult && updateResult.affectedRows !== undefined && updateResult.affectedRows > 0) {
                        resolve({ success: true, id });
                    } else {
                        resolve({
                            success: false, message: 'Experince not found'
                        });
                    }
                }
            });
        });
    }
}
module.exports = new awarenessPillarModel();