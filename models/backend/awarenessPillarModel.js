const db = require('../../config/database');

class AwarenessPillarModel {

    async GetObservationIdWise(observationId) {
        const query = `
        SELECT
            lb.id AS observationId,
            lb.title AS observationTitle,
            lb.status AS observationStatus,
            lb.is_completed_assessment AS isCompletedAssessment,
            lea.id AS assessmentId,
            lea.grade AS assessmentGrade,
            lea.did_progress_towards_life_purpose AS progressTowardsLifePurpose,
            lea.did_help_another_person AS helpAnotherPerson,
            lea.do_differently AS doDifferently,
            lea.comments AS assessmentComments,
            GROUP_CONCAT(DISTINCT CONCAT(a.name, ':', a.insight, ':', a.analysis) ORDER BY a.id ASC) AS actions,
            GROUP_CONCAT(DISTINCT CONCAT(t.name, ':', t.status) ORDER BY t.id ASC) AS tasks,
            GROUP_CONCAT(DISTINCT CONCAT(e.name, ':', e.insight, ':', e.analysis) ORDER BY e.id ASC) AS emotions,
            GROUP_CONCAT(DISTINCT CONCAT(g.name, ':', g.insight, ':', g.analysis) ORDER BY g.id ASC) AS guidepost,
            GROUP_CONCAT(DISTINCT CONCAT(i.name, ':', i.insight, ':', i.analysis) ORDER BY i.id ASC) AS influences,
            GROUP_CONCAT(DISTINCT CONCAT(m.name, ':', m.insight, ':', m.analysis) ORDER BY m.id ASC) AS mindset,
            GROUP_CONCAT(DISTINCT lbht.name ORDER BY lbht.id ASC) AS tags,
            GROUP_CONCAT(DISTINCT CONCAT(lbhf.original_filename, '::', lbhf.name, '::', lbhf.url, '::', lbhf.type, '::', lbhf.size) ORDER BY lbhf.id ASC) AS filesInfo
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
        WHERE lb.id = ?
        GROUP BY lb.id, lea.id
        LIMIT 1
    `;

        try {
            const results = await new Promise((resolve, reject) => {
                db.query(query, [observationId], (err, results) => {
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
                status: row.observationStatus
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
            const actions = row.actions ? row.actions.split(',') : [];
            const actionsWithInsightAndAnalysis = actions.map(actionString => {
                const [name, insight, analysis] = actionString.split(':');
                return { name, insight, analysis };
            });

            const tasks = row.tasks ? row.tasks.split(',') : [];
            const tasksWithStatus = tasks.map(taskString => {
                const [name, status] = taskString.split(':');
                return { name, status: parseInt(status) };
            });

            const emotions = row.emotions ? row.emotions.split(',') : [];
            const emotionsWithInsightAndAnalysis = emotions.map(emotionString => {
                const [name, insight, analysis] = emotionString.split(':');
                return { name, insight, analysis };
            });

            const guidepost = row.guidepost ? row.guidepost.split(',') : [];
            const guidepostWithInsightAndAnalysis = guidepost.map(guidepostString => {
                const [name, insight, analysis] = guidepostString.split(':');
                return { name, insight, analysis };
            });

            const influences = row.influences ? row.influences.split(',') : [];
            const influencesWithInsightAndAnalysis = influences.map(influenceString => {
                const [name, insight, analysis] = influenceString.split(':');
                return { name, insight, analysis };
            });

            const mindset = row.mindset ? row.mindset.split(',') : [];
            const mindsetWithInsightAndAnalysis = mindset.map(mindsetString => {
                const [name, insight, analysis] = mindsetString.split(':');
                return { name, insight, analysis };
            });

            const tags = row.tags ? row.tags.split(',') : [];
            const filesInfo = row.filesInfo ? row.filesInfo.split(',') : [];
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

    async fetchALLCreatedObservationsDetails(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalCreatedExpSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookCount(globalSearchCondition, type);

            let query = `
            SELECT
                lb.id as id,
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
                u.name,
                u.id AS userId
            FROM
                life_books lb
            LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?`;

            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }

            query += `
                ${sortConditions}
                LIMIT ${itemsPerPage}
                OFFSET ${offset};
            `;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            const data = results.map(row => ({
                experienceID: row.id,
                title: row.title,
                is_completed_assessment: row.is_completed_assessment,
                publish_date: row.publish_date,
                status: row.status,
                userId: row.userId,
                username: row.name,
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

    clientBuildSortConditions(sorting) {
        if (!Array.isArray(sorting) || sorting.length === 0) {
            return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
        }

        const conditions = sorting.map(sort => {
            if (sort.sortBy && sort.sortOrder) { // Check if sortBy and sortOrder are not empty strings
                const { sortBy, sortOrder } = sort;
                const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                return `${sortBy} ${direction}`;
            }
            return ''; // Skip invalid sorting criteria
        }).filter(condition => condition); // Filter out empty strings

        if (conditions.length > 0) {
            return `ORDER BY ${conditions.join(', ')}`;
        }

        return 'ORDER BY id DESC'; // Default sorting if no valid sorting criteria are provided
    }

    async getLifebookCount(globalSearchCondition, type) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total,
                u.name
                FROM
                life_books lb
            LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?      
            `;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }

    buildGlobalCreatedExpSearch(globalFilter) {
        if (!globalFilter) {
            return ''; // Return an empty string if globalFilter is not provided
        }
        const fields = ['u.name', 'lb.title', 'lb.publish_date', 'lb.status', 'lb.is_completed_assessment']; // Updated to include only columns from the SELECT clause
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`; // Removed the leading 'AND'
    }

    async fetchALLObservationAllTasks(page = 1, itemsPerPage = 10, filters = [], globalFilter = '', sorting = [], type) {
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        const offset = (page - 1) * itemsPerPage;
        const sortConditions = this.clientBuildSortConditions(sorting); // Build sort conditions based on sorting
        const globalSearchCondition = this.buildGlobalAllTaskSearch(globalFilter);
        try {
            const totalRowCount = await this.getLifebookObservationTaskCount(globalSearchCondition, type);
    
            let query = `
                SELECT
                    lb.id as id,
                    lb.title AS experienceTitle,
                    lbt.name,
                    lbt.created_at,
                    CASE lbt.status
                        WHEN '0' THEN 'active'
                        WHEN '1' THEN 'completed'
                        ELSE 'Unknown'
                    END AS status,
                    u.name AS userName
                FROM
                    life_books lb
                LEFT JOIN
                    life_book_has_tasks lbt ON lb.id = lbt.lb_id
                LEFT JOIN
                    users u ON lb.user_id = u.id
                WHERE
                    lb.type = ? AND lbt.id IS NOT NULL`; // Only include records where lb_id has tasks
    
            if (globalSearchCondition) {
                query += ` AND ${globalSearchCondition}`;
            }
    
            query += `
                ${sortConditions}
                LIMIT ?
                OFFSET ?;
            `;
    
            const params = [type, parseInt(itemsPerPage), offset];
            const results = await new Promise((resolve, reject) => {
                db.query(query, params, (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });
    
            const data = results.map(row => ({
                experienceID: row.id,
                experienceTitle: row.experienceTitle,
                userName: row.userName,
                name: row.name,
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
    

    buildGlobalAllTaskSearch(globalFilter) {
        if (!globalFilter) {
            return '';
        }
        const fields = ['lb.title', 'lbt.name', 'u.name', 'lbt.status', 'lbt.created_at'];
        const conditions = fields.map(field => `${field} LIKE '%${globalFilter}%'`);
        return `(${conditions.join(' OR ')})`;
    }

    async getLifebookObservationTaskCount(globalSearchCondition, type) {
        try {
            let query = `
            SELECT
                COUNT(*) AS total
                FROM
                life_books lb
                    LEFT JOIN
                life_book_has_tasks lbt ON lb.id = lbt.lb_id
                    LEFT JOIN
                users u ON lb.user_id = u.id
            WHERE
                lb.type = ?      
            `;

            if (globalSearchCondition) {
                query += `
                    AND ${globalSearchCondition}`;
            }

            query += `;`;

            const results = await new Promise((resolve, reject) => {
                db.query(query, [type], (err, results) => {
                    if (err) reject(err);
                    resolve(results);
                });
            });

            return results[0].total;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AwarenessPillarModel();
